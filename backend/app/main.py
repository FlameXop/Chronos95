from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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
    prompt: str = Field(..., description="User query or text content")
    mode: str = Field(default="assistant", description="browser | notepad | assistant | paint")

class PaintVisionRequest(BaseModel):
    image_base64: str = Field(..., description="Base64 encoded PNG from PixelPaint canvas")
    prompt: str = Field(default="Analyze this drawing")

@app.get("/health")
async def health_check():
    return {"status": "online", "os": "Chronos 95", "engine": "FastAPI Neural Bridge"}

@app.post("/api/brain")
async def ask_brain(req: BrainRequest):
    reply = await brain_service.process_prompt(req.prompt, req.mode)
    return {"reply": reply, "mode": req.mode}

@app.post("/api/paint-vision")
async def analyze_paint(req: PaintVisionRequest):
    reply = brain_service.analyze_canvas_image(req.image_base64, req.prompt)
    return {"reply": reply}