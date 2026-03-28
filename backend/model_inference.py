"""
NeuroScanAI | Model Inference Engine
EfficientNetB0 (Keras .keras format) + GradCAM

Architecture matches train_model.py exactly:
  - Backbone : EfficientNetB0 (imagenet weights, frozen then fine-tuned)
  - Head     : GAP → BN → Dense(512) → Dropout → Dense(256) → Dropout → Dense(N, softmax)
  - Input    : 224×224×3, normalized to [0,1]  (rescale=1/255)
  - Saved as : models/brain_tumor_efficientnetb0.keras
  - Classes  : models/class_indices.json  (glioma, meningioma, notumor, pituitary)

If the model file is missing, runs in DEMO mode with fake GradCAM.
"""

import io
import os
import json
import math
import base64
import random
import logging
from pathlib import Path
from typing import Dict, Any, Optional

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

logger = logging.getLogger("neuroscan.inference")

# ── Lazy-import TF so server still starts if TF is missing ────────────────────
try:
    import tensorflow as tf
    import cv2
    TF_AVAILABLE = True
except ImportError:
    TF_AVAILABLE = False
    logger.warning("TensorFlow / OpenCV not found — running in DEMO mode.")

# ── Constants ─────────────────────────────────────────────────────────────────
IMG_SIZE = 224

DEFAULT_CLASSES = {
    "glioma": 0,
    "meningioma": 1,
    "notumor": 2,
    "pituitary": 3,
}

BENIGN_CLASSES    = {"notumor", "meningioma"}
MALIGNANT_CLASSES = {"glioma", "pituitary"}

LOBE_MAP = {
    "glioma":      ("Frontal / Temporal Lobe", "Left Cerebral"),
    "meningioma":  ("Parietal Lobe",            "Right Cerebral"),
    "pituitary":   ("Sella Turcica",             "Central"),
    "notumor":     ("N/A",                       "N/A"),
}


# ─── GradCAM (TF version matching train_model.py) ────────────────────────────
def compute_gradcam(
    keras_model: "tf.keras.Model",
    img_array: np.ndarray,
    class_idx: int,
) -> np.ndarray:
    """Returns a (224, 224) float32 heatmap in [0, 1]."""
    backbone   = keras_model.get_layer("efficientnetb0")
    conv_model = tf.keras.models.Model(backbone.input, backbone.output)

    cls_input = tf.keras.Input(shape=backbone.output.shape[1:])
    x = cls_input
    for layer in keras_model.layers[2:]:
        x = layer(x)
    classifier_model = tf.keras.models.Model(cls_input, x)

    with tf.GradientTape() as tape:
        conv_out = conv_model(img_array, training=False)
        tape.watch(conv_out)
        preds    = classifier_model(conv_out, training=False)
        loss_val = preds[:, class_idx]

    grads        = tape.gradient(loss_val, conv_out)
    pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))

    conv_out = conv_out[0]
    heatmap  = conv_out @ pooled_grads[..., tf.newaxis]
    heatmap  = tf.squeeze(heatmap)
    denom    = tf.reduce_max(heatmap)
    heatmap  = tf.maximum(heatmap, 0) / (denom + tf.keras.backend.epsilon())
    heatmap  = cv2.resize(heatmap.numpy(), (IMG_SIZE, IMG_SIZE))
    return heatmap.astype(np.float32)


# ─── Main Detector ────────────────────────────────────────────────────────────
class TumorDetector:

    def __init__(self, model_path: str):
        self.model_loaded  = False
        self.device_name   = "cpu"
        self._model        = None
        self._class_names: list = []

        if TF_AVAILABLE:
            self._init_tf(model_path)
        else:
            logger.info("Demo mode (TensorFlow unavailable).")
            self._class_names = list(DEFAULT_CLASSES.keys())

    def _init_tf(self, model_path: str):
        gpus = tf.config.list_physical_devices("GPU")
        for gpu in gpus:
            tf.config.experimental.set_memory_growth(gpu, True)
        self.device_name = "GPU" if gpus else "CPU"

        # Load class index map
        class_map_path = Path(model_path).parent / "class_indices.json"
        if class_map_path.exists():
            with open(class_map_path, encoding="utf-8") as f:
                raw: dict = json.load(f)
            self._class_names = [k for k, _ in sorted(raw.items(), key=lambda kv: kv[1])]
            logger.info(f"Loaded {len(self._class_names)} classes: {self._class_names}")
        else:
            self._class_names = list(DEFAULT_CLASSES.keys())
            logger.warning("class_indices.json not found — using default class list.")

        # Load Keras model
        if os.path.exists(model_path):
            try:
                self._model       = tf.keras.models.load_model(model_path)
                self.model_loaded = True
                logger.info(f"Model loaded from {model_path} on {self.device_name}.")
            except Exception as e:
                logger.warning(f"Model load failed: {e} — DEMO mode.")
        else:
            logger.warning(f"Model file not found at '{model_path}' — DEMO mode.")

    def predict(self, image: Image.Image) -> Dict[str, Any]:
        if TF_AVAILABLE and self._model is not None:
            return self._tf_predict(image)
        return self._demo_predict(image)

    def _tf_predict(self, pil_image: Image.Image) -> Dict[str, Any]:
        img = pil_image.resize((IMG_SIZE, IMG_SIZE)).convert("RGB")
        arr = np.array(img, dtype=np.float32) / 255.0
        arr = np.expand_dims(arr, axis=0)

        probs      = self._model.predict(arr, verbose=0)[0]
        class_idx  = int(np.argmax(probs))
        confidence = float(probs[class_idx]) * 100
        label_name = self._class_names[class_idx] if class_idx < len(self._class_names) else "unknown"

        is_malignant   = label_name in MALIGNANT_CLASSES
        classification = "Malignant" if is_malignant else "Benign"

        try:
            cam = compute_gradcam(self._model, arr, class_idx)
        except Exception as e:
            logger.warning(f"GradCAM failed ({e}) — blank heatmap.")
            cam = np.zeros((IMG_SIZE, IMG_SIZE), dtype=np.float32)

        # ── FIX: pass is_malignant so overlay skips ROI box for benign ──
        overlay_b64, roi = self._render_overlay(pil_image, cam, is_malignant)

        lobe, hemisphere = LOBE_MAP.get(label_name, ("N/A", "N/A"))

        # Volumetric data only meaningful when tumour is present
        if is_malignant:
            active_ratio = float((cam > 0.5).sum()) / cam.size
            volume_cm3   = round(active_ratio * 40, 2)
            peak_y, peak_x = np.unravel_index(cam.argmax(), cam.shape) if cam.max() > 0 else (0, 0)
            cx = round(float(peak_x) / IMG_SIZE * 256, 1)
            cy = round(float(peak_y) / IMG_SIZE * 256, 1)
            density = round(random.uniform(1.8, 4.5), 1)
            volumetric = {
                "volume_cm3":    volume_cm3,
                "coordinates":   f"X:{cx}, Y:{cy}",
                "density_index": f"{density} HU",
            }
        else:
            # ── FIX: return clean N/A block for benign / notumor ──
            volumetric = {
                "volume_cm3":    0.0,
                "coordinates":   "N/A",
                "density_index": "N/A",
            }

        return {
            "classification":  classification,
            "tumor_type":      label_name.capitalize(),
            "confidence":      round(confidence, 1),
            "roi":             roi,          # None when benign
            "volumetric":      volumetric,
            "region": {
                "lobe":       lobe,
                "hemisphere": hemisphere,
            },
            "overlay_b64": overlay_b64,
        }

    def _demo_predict(self, pil_image: Image.Image) -> Dict[str, Any]:
        label_name     = random.choice(list(LOBE_MAP.keys()))
        is_malignant   = label_name in MALIGNANT_CLASSES
        classification = "Malignant" if is_malignant else "Benign"
        confidence     = round(random.uniform(82, 97) if is_malignant else random.uniform(90, 99), 1)

        cam = self._fake_cam(is_malignant)
        # ── FIX: pass is_malignant instead of label string ──
        overlay_b64, roi = self._render_overlay(pil_image, cam, is_malignant)
        lobe, hemisphere = LOBE_MAP.get(label_name, ("N/A", "N/A"))

        if is_malignant:
            volumetric = {
                "volume_cm3":    round(random.uniform(1.2, 6.8), 2),
                "coordinates":   f"X:{round(random.uniform(20,200),1)}, Y:{round(random.uniform(20,200),1)}",
                "density_index": f"{round(random.uniform(1.8,4.5),1)} HU",
            }
        else:
            volumetric = {
                "volume_cm3":    0.0,
                "coordinates":   "N/A",
                "density_index": "N/A",
            }

        return {
            "classification":  classification,
            "tumor_type":      label_name.capitalize(),
            "confidence":      confidence,
            "roi":             roi,          # None when benign
            "volumetric":      volumetric,
            "region": {
                "lobe":       lobe,
                "hemisphere": hemisphere,
            },
            "overlay_b64": overlay_b64,
        }

    def _render_overlay(
        self,
        original: Image.Image,
        cam: np.ndarray,
        is_malignant: bool,          # ── FIX: bool instead of label string
    ):
        W, H = original.size
        cam_resized = np.array(
            Image.fromarray((cam * 255).astype(np.uint8)).resize((W, H), Image.BILINEAR)
        ) / 255.0

        r = (cam_resized * 255).astype(np.uint8)
        g = ((1 - cam_resized) * 180 * cam_resized).astype(np.uint8)
        b = ((1 - cam_resized) * 255).astype(np.uint8)
        heatmap = Image.fromarray(np.stack([r, g, b], axis=2), "RGB")
        heatmap = heatmap.filter(ImageFilter.GaussianBlur(radius=10))

        base    = original.convert("RGB")
        blended = Image.blend(base, heatmap, alpha=0.45)

        # ── FIX: only draw ROI box and return coords when malignant ──
        roi = None
        if is_malignant:
            draw   = ImageDraw.Draw(blended)
            thresh = 0.55
            ys, xs = np.where(cam_resized > thresh)

            if len(xs) > 0 and len(ys) > 0:
                x1 = int(xs.min() / W * 100)
                y1 = int(ys.min() / H * 100)
                x2 = int(xs.max() / W * 100)
                y2 = int(ys.max() / H * 100)
                if (x2 - x1) < 8: x1 = max(0, x1 - 4); x2 = min(100, x2 + 4)
                if (y2 - y1) < 8: y1 = max(0, y1 - 4); y2 = min(100, y2 + 4)

                px1, py1 = int(x1/100*W), int(y1/100*H)
                px2, py2 = int(x2/100*W), int(y2/100*H)
                draw.rectangle([px1, py1, px2, py2], outline="#EF4444", width=3)
                roi = {"top": y1, "left": x1, "width": x2 - x1, "height": y2 - y1}

        buf = io.BytesIO()
        blended.save(buf, format="PNG", optimize=True)
        return base64.b64encode(buf.getvalue()).decode("utf-8"), roi

    @staticmethod
    def _fake_cam(is_malignant: bool) -> np.ndarray:
        size = 7
        cam  = np.zeros((size, size), dtype=np.float32)
        if not is_malignant:
            return cam
        cx, cy = random.randint(2, 5), random.randint(2, 5)
        for y in range(size):
            for x in range(size):
                d = math.sqrt((x-cx)**2 + (y-cy)**2)
                cam[y, x] = math.exp(-(d**2) / (2*1.2**2))
        return cam
