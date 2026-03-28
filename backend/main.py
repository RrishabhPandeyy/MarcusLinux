"""
NeuroScanAI | FastAPI Backend
Tumor Detection API with GradCAM Visualization
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import uvicorn
import io
import os
from PIL import Image

from model_inference import TumorDetector

# ─── App Setup ────────────────────────────────────────────────────────────────
app = FastAPI(
    title="NeuroScanAI",
    description="Deep learning tumor detection API for radiological imaging",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # Tighten to your domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Model Bootstrap ──────────────────────────────────────────────────────────
MODEL_PATH = os.environ.get("MODEL_PATH", "model.pth")
detector = TumorDetector(MODEL_PATH)


# ─── Routes ───────────────────────────────────────────────────────────────────
@app.get("/health")
def health_check():
    """Ping endpoint — used by dashboard status indicator."""
    return {
        "status": "Neural Engine Active",
        "model_loaded": detector.model_loaded,
        "device": detector.device_name
    }


@app.post("/api/analyze")
async def analyze_scan(file: UploadFile = File(...)):
    """
    Primary inference endpoint.
    Accepts any image (DICOM proxy / JPEG / PNG).
    Returns JSON with:
      - classification  : "Malignant" | "Benign"
      - confidence      : float  (0-100)
      - roi             : {top, left, width, height}  — percentage CSS values
      - volumetric      : {volume_cm3, coordinates, density_index}
      - region          : {lobe, hemisphere}
      - overlay_b64     : base64 GradCAM heatmap overlay image (PNG)
    """
    # ── Validate ──
    if not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported media type: {file.content_type}. Upload an image."
        )

    # ── Read Image ──
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not decode image: {e}")

    # ── Run Inference ──
    try:
        result = detector.predict(image)
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference failed: {e}")


# ─── Entry Point ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 10000))
    uvicorn.run(app, host="0.0.0.0", port=port)
