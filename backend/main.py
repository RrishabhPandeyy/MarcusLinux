"""
NeuroScanAI | FastAPI Backend
Tumor Detection API with GradCAM Visualization
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import io
import os
from PIL import Image

# Import the detector class from your other file
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
# This ensures it finds the models folder whether you run from /MarcusLinux or /backend
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "models", "brain_tumor_efficientnetb0.keras")

# Initialize the detector and save it to the 'detector' variable
# so the routes below can actually use it.
try:
    detector = TumorDetector(MODEL_PATH)
    print(f"✅ Neural Engine Active: Loaded model from {MODEL_PATH}")
except Exception as e:
    print(f"⚠️ Warning: Could not load model file. Entering DEMO mode. Error: {e}")
    # Fallback to a placeholder if the file is missing so the app doesn't crash
    detector = TumorDetector("models/brain_tumor_efficientnetb0.keras")

# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/health")
def health_check():
    """Ping endpoint — used by dashboard status indicator."""
    return {
        "status": "Neural Engine Active",
        "model_loaded": getattr(detector, 'model_loaded', False),
        "device": getattr(detector, 'device_name', "Unknown")
    }


@app.post("/api/analyze")
async def analyze_scan(file: UploadFile = File(...)):
    """
    Primary inference endpoint.
    Accepts any image (JPEG / PNG).
    Returns JSON with classification, confidence, and GradCAM overlay.
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
        # Use the 'detector' variable defined in the Bootstrap section
        result = detector.predict(image)
        return JSONResponse(content=result)
    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Inference failed: {e}")


# ─── Entry Point ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    # Get port from environment or default to 10000
    port = int(os.environ.get("PORT", 10000))
    print(f"🚀 Starting NeuroScanAI on port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port)