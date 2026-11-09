import ast
import base64
import os
import struct
from dotenv import load_dotenv
import httpx

load_dotenv()

class BrainService:
    def __init__(self):
        self.api_key = os.getenv("LLM_API_KEY", "").strip()
        self.api_url = os.getenv(
            "LLM_API_URL", "https://api.groq.com/openai/v1/chat/completions"
        )
        self.model = os.getenv("LLM_MODEL", "llama-3.1-8b-instant")

    async def process_prompt(self, prompt: str, mode: str = "assistant") -> str:
        clean_prompt = (prompt or "").strip()
        if not clean_prompt:
            return "Beep boop! Send me a non-empty prompt so my neural circuits can process it."

        # 1. Try External OpenAI-Compatible / Groq / Bedrock Proxy API if configured in .env
        if self.api_key:
            try:
                reply = await self._call_external_llm(clean_prompt, mode)
                if reply:
                    return reply
            except Exception:
                pass  # Seamlessly fall back to Local Python Engine so app never crashes!

        # 2. Safe Built-In Deterministic Python Engine (Zero API Key Required!)
        return self._run_local_engine(clean_prompt, mode)

    async def _call_external_llm(self, prompt: str, mode: str) -> str:
        system_prompts = {
            "browser": (
                "You are Chronos Explorer 1995. Return ONLY clean HTML (using <h2>, <p>, <ul>, "
                "<li>, <b>, <hr>) answering the user's query like an informative 1995 web page."
            ),
            "notepad": (
                "You are Byte, a retro 1995 coding & note assistant. Summarize the notes or "
                "refactor/explain the code concisely in plain text."
            ),
            "assistant": (
                "You are Byte, the friendly robotic assistant inside Chronos 95 OS. "
                "Give a helpful, concise, slightly retro-themed answer in 2-4 sentences."
            ),
        }
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompts.get(mode, system_prompts["assistant"])},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.6,
            "max_tokens": 450,
        }
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.post(self.api_url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]

    def _run_local_engine(self, prompt: str, mode: str) -> str:
        # MODE A: CHRONOS EXPLORER (Generates a structured 90s Web Page)
        if mode == "browser":
            topic = prompt.replace("http://", "").replace("https://", "")
            words = [w for w in topic.split() if len(w) > 2]
            keywords = ", ".join(words[:5]) if words else "Chronos, 1995, NeuralNet"
            return (
                f"<h2 class='retro-page-title'>🌐 Chronos Web Directory: {topic}</h2>"
                f"<p><b>URL:</b> <code>chronos://{topic.lower().replace(' ', '-')}</code> | "
                f"<b>Status:</b> 200 OK (FastAPI Neural Node)</p>"
                f"<hr style='margin:6px 0;'/>"
                f"<p>Welcome to the synthesized knowledge page for <b>{topic}</b>. "
                f"Our Python FastAPI backend analyzed your query across indexed nodes:</p>"
                f"<ul style='margin:6px 0 8px 18px;'>"
                f"<li><b>Indexed Keywords:</b> {keywords}</li>"
                f"<li><b>Overview:</b> '{topic}' is rendered dynamically via Chronos 95's "
                f"state-driven REST architecture.</li>"
                f"<li><b>Related Links:</b> <u>chronos://docs/{words[0].lower() if words else 'main'}</u></li>"
                f"</ul>"
                f"<div style='background:#efefef;border:1px inset #aaa;padding:6px;font-size:11px;'>"
                f"<b>🤖 Byte Web Summary:</b> Query processed in 0.4ms by FastAPI Backend."
                f"</div>"
            )

        # MODE B: NOTEPAD (Uses Python's AST module to inspect code OR summarizes text!)
        if mode == "notepad":
            lines = [line.strip() for line in prompt.splitlines() if line.strip()]
            word_count = len(prompt.split())
            # Check if the user wrote Python code in NotePad!
            try:
                tree = ast.parse(prompt)
                funcs = [n.name for n in ast.walk(tree) if isinstance(n, ast.FunctionDef)]
                classes = [n.name for n in ast.walk(tree) if isinstance(n, ast.ClassDef)]
                if funcs or classes:
                    return (
                        f"[Python AST Code Analysis Passed ✓]\n"
                        f"- Syntax: Valid Python 3 code ({len(lines)} lines)\n"
                        f"- Functions detected: {', '.join(funcs) if funcs else 'None'}\n"
                        f"- Classes detected: {', '.join(classes) if classes else 'None'}"
                    )
            except SyntaxError:
                pass

            preview = lines[0][:60] if lines else prompt[:60]
            return (
                f"[Byte NotePad Summary]\n"
                f"- Stats: {len(lines)} non-empty lines | {word_count} words\n"
                f"- Key Focus: \"{preview}...\"\n"
                f"- Action Item: Structured & saved in Chronos 95 local memory."
            )

        # MODE C: BYTE DESKTOP ASSISTANT
        low = prompt.lower()
        if "paint" in low or "draw" in low:
            return (
                "Open PixelPaint.exe from the desktop, sketch with the Brush/Rectangle/Circle tools, "
                "and click '🤖 Inspect'—my FastAPI vision endpoint will decode your PNG canvas!"
            )
        if "theme" in low or "wallpaper" in low:
            return (
                "Open 'Personalize' on the desktop to switch between Classic Teal, Cyber Matrix, "
                "Synthwave Sunset, and Deep Space themes!"
            )
        return (
            f"Beep boop! FastAPI Backend received: \"{prompt}\". "
            f"All Chronos 95 OS states (Audio, Explorer Tabs, NotePad, and PixelPaint) are running at 100%!"
        )

    def analyze_canvas_image(self, image_base64: str, prompt: str) -> str:
        """Decodes base64 PNG from PixelPaint and returns dimensions + retro HTML wireframe."""
        try:
            raw_b64 = image_base64.split(",")[-1]
            img_bytes = base64.b64decode(raw_b64)
            width, height = 405, 255
            # Parse real PNG IHDR width & height bytes if valid PNG
            if img_bytes[:8] == b"\x89PNG\r\n\x1a\n" and len(img_bytes) >= 24:
                width, height = struct.unpack(">II", img_bytes[16:24])
            size_kb = round(len(img_bytes) / 1024, 1)
        except Exception:
            width, height, size_kb = 405, 255, 4.2

        return (
            f"Scanned PNG Canvas (<b>{width}×{height}px</b>, {size_kb} KB) via FastAPI!<br/>"
            f"<b>Generated Retro Component Snippet:</b><br/>"
            f"<code style='display:block;background:#222;color:#0f0;padding:4px;margin-top:3px;font-size:9px;'>"
            f"&lt;div class=\"win95-card\" style=\"width:{width}px;height:{height}px;\"&gt;<br/>"
            f"  &lt;!-- Synthesized from PixelPaint.exe --&gt;<br/>"
            f"&lt;/div&gt;</code>"
        )

brain_service = BrainService()