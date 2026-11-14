from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from app.services.brain_service import brain_service

app = FastAPI(
    title="Chronos 95 Neural Backend",
    version="1.95.0",
    description="Dual-Engine FastAPI Backend for Chronos 95 Retro OS",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class BrainRequest(BaseModel):
    prompt: str = Field(..., max_length=8000)
    mode: str = Field(default="assistant")

class PaintVisionRequest(BaseModel):
    image_base64: str = Field(..., max_length=2_500_000)
    prompt: str = Field(default="Analyze this drawing", max_length=2000)

@app.get("/health")
async def health_check():
    return {"status": "online", "os": "Chronos 95", "engine": "FastAPI Neural Bridge"}

@app.post("/api/brain")
async def ask_brain(req: BrainRequest):
    reply = await brain_service.process_prompt(req.prompt, req.mode)
    return {"reply": reply, "mode": req.mode}

@app.post("/api/paint-vision")
async def analyze_paint(req: PaintVisionRequest):
    reply = await brain_service.analyze_canvas_image(req.image_base64, req.prompt)
    return {"reply": reply}

# Serve the /frontend folder directly at "/" so 1 cloud link runs the whole app!
FRONTEND_DIR = Path(__file__).resolve().parents[2] / "frontend"
if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")