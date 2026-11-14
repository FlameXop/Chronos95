import base64
import os
from pathlib import Path
from dotenv import load_dotenv
import httpx

class BrainService:
    def __init__(self):
        self.working_model = None

    def _get_config(self):
        backend_dir = Path(__file__).resolve().parents[2]
        root_dir = backend_dir.parent
        for path in [backend_dir / ".env", root_dir / ".env"]:
            if path.exists():
                load_dotenv(dotenv_path=path, override=True)
                break

        api_key = os.getenv("LLM_API_KEY", "").strip().strip('"').strip("'")
        api_url = os.getenv(
            "LLM_API_URL", "https://api.groq.com/openai/v1/chat/completions"
        ).strip()
        model = os.getenv("LLM_MODEL", "openai/gpt-oss-20b").strip()
        return api_key, api_url, model

    async def process_prompt(self, prompt: str, mode: str = "assistant") -> str:
        clean_prompt = (prompt or "").strip()
        if not clean_prompt:
            return "Hey! Tell me what you'd like to open, write, draw, or search."

        api_key, api_url, env_model = self._get_config()
        if api_key:
            reply = await self._call_groq_text(clean_prompt, mode, api_key, api_url, env_model)
            if reply:
                return reply

        # Safe fallback if running without an API key
        return self._local_fallback(clean_prompt, mode)

    async def _call_groq_text(
        self, prompt: str, mode: str, api_key: str, api_url: str, env_model: str
    ) -> str:
        system_prompts = {
            "browser": (
                "You are Chronos Explorer, an AI web encyclopedia. Generate a clean, informative "
                "webpage for the user's query using raw HTML only (no ```html fences). Use:\n"
                "<div class='web-article'>"
                "<div class='web-hero'><h1>Topic Title</h1><p>Brief summary</p></div>"
                "<p>Main explanation paragraph...</p>"
                "<div class='web-grid'>"
                "<div class='web-card'><h3>Key Takeaways</h3><ul><li>Point 1</li><li>Point 2</li></ul></div>"
                "<div class='web-card'><h3>Deep Dive</h3><p>Details...</p></div>"
                "</div>"
                "<p><b>Related:</b> <a href='#' data-search='Related Topic'>Related Topic</a></p>"
                "</div>"
            ),
            "notepad": (
                "You are an AI writer and editor inside NotePad.exe. "
                "Output ONLY the final written text, summary, notes, or code requested by the user. "
                "Do not include conversational filler like 'Here is your text:'."
            ),
            "assistant": (
                "You are Byte, the smart desktop AI assistant inside Chronos 95 OS. "
                "Reply naturally, concisely, and helpfully like a real creative partner. "
                "Never output random HTML/CSS code unless the user specifically asks for code."
            ),
        }

        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
        candidates = []
        if self.working_model:
            candidates.append(self.working_model)
        for m in [
            env_model,
            "openai/gpt-oss-20b",
            "openai/gpt-oss-120b",
            "llama-3.3-70b-versatile",
        ]:
            if m and m not in candidates:
                candidates.append(m)

        async with httpx.AsyncClient(timeout=20.0) as client:
            for model_name in candidates:
                payload = {
                    "model": model_name,
                    "messages": [
                        {"role": "system", "content": system_prompts.get(mode, system_prompts["assistant"])},
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0.65,
                    "max_tokens": 750,
                }
                try:
                    resp = await client.post(api_url, headers=headers, json=payload)
                    if resp.status_code == 200:
                        self.working_model = model_name
                        content = resp.json()["choices"][0]["message"]["content"].strip()
                        if mode == "browser" and "```" in content:
                            content = content.replace("```html", "").replace("```", "").strip()
                        return content
                except Exception:
                    continue
        return ""

    async def analyze_canvas_image(self, image_base64: str, prompt: str) -> str:
        """Uses real Multimodal Vision to actually SEE what is drawn on PixelPaint!"""
        raw_b64 = (image_base64 or "").split(",")[-1]
        user_question = (prompt or "").strip() or (
            "Look at what I drew on the canvas. Tell me what you see, suggest what colors or details "
            "I could add next, and ask me what I want to do with this drawing!"
        )

        api_key, api_url, _ = self._get_config()
        if api_key and raw_b64:
            headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
            vision_models = [
                "meta-llama/llama-4-scout-17b-16e-instruct",
                "meta-llama/llama-4-maverick-17b-128e-instruct",
                "llama-3.2-11b-vision-preview",
            ]
            async with httpx.AsyncClient(timeout=20.0) as client:
                for v_model in vision_models:
                    payload = {
                        "model": v_model,
                        "messages": [
                            {
                                "role": "user",
                                "content": [
                                    {
                                        "type": "text",
                                        "text": (
                                            "You are Byte, a helpful art & design companion looking at the user's "
                                            "PixelPaint canvas. DO NOT output HTML/CSS code. "
                                            "1) Clearly identify what object/scene they drew and what colors they used. "
                                            "2) Answer their question or suggest 2 specific colors (with hex codes) "
                                            "or details that would make the drawing look even better. "
                                            "3) Ask what they want to add next.\n\n"
                                            f"User message: {user_question}"
                                        ),
                                    },
                                    {
                                        "type": "image_url",
                                        "image_url": {"url": f"data:image/png;base64,{raw_b64}"},
                                    },
                                ],
                            }
                        ],
                        "temperature": 0.6,
                        "max_tokens": 350,
                    }
                    try:
                        resp = await client.post(api_url, headers=headers, json=payload)
                        if resp.status_code == 200:
                            return resp.json()["choices"][0]["message"]["content"].strip()
                    except Exception:
                        continue

            # If vision model is unavailable, answer conversationally using text model (NO random code!)
            return await self.process_prompt(
                f"The user is drawing in PixelPaint and asks: '{user_question}'. "
                "Give friendly, practical color and drawing advice (include 2 hex color suggestions) "
                "and ask what they want to draw next. Do NOT output HTML code.",
                mode="assistant",
            )

        return (
            "I see your canvas sketch! Try adding a warm accent color like `#FF6B35` (Sunset Orange) "
            "or `#FFD166` (Gold) for highlights. What are you planning to add to the drawing next?"
        )

    def _local_fallback(self, prompt: str, mode: str) -> str:
        if mode == "browser":
            return (
                f"<div class='web-article'><div class='web-hero'><h1>{prompt.title()}</h1>"
                f"<p>Chronos Local Knowledge Node</p></div>"
                f"<p>Overview article for <b>{prompt}</b> synthesized by Chronos 95.</p></div>"
            )
        return f"Processed: {prompt}"

brain_service = BrainService()