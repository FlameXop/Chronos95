import base64
import os
import re
from pathlib import Path
from dotenv import load_dotenv
import httpx

class BrainService:
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
        model = os.getenv("LLM_MODEL", "llama-3.3-70b-versatile").strip()
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

        return self._smart_local_brain(clean_prompt, mode)

    def _clean_llm_output(self, text: str, mode: str) -> str:
        # Remove any <think>...</think> reasoning blocks from reasoning models
        cleaned = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()
        if mode == "browser" and "```" in cleaned:
            cleaned = cleaned.replace("```html", "").replace("```", "").strip()
        if mode == "notepad" and cleaned.startswith("```"):
            lines = cleaned.splitlines()
            cleaned = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:]).strip()
        return cleaned

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
                "<div class='web-card'><h3>Step-by-Step / Details</h3><p>Details...</p></div>"
                "</div>"
                "<p><b>Related:</b> <a href='#' data-search='Related Topic'>Related Topic</a></p>"
                "</div>"
            ),
            "notepad": (
                "You are a direct text generator for NotePad.exe. "
                "Fulfill the user's writing or bullet-point request directly and output ONLY the final text—no intro, no outro, and never repeat the prompt."
            ),
            
            "assistant": (
                "You are Byte, the smart desktop AI assistant inside Chronos 95 OS. "
                "Reply naturally, concisely, and helpfully like a real creative partner."
            ),
        }

        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

        # Prioritize fast instruction-following Llama models before reasoning models!
        candidates = [
            "llama-3.3-70b-versatile",
            "llama-3.1-8b-instant",
            env_model,
            "openai/gpt-oss-120b",
            "openai/gpt-oss-20b",
        ]
        unique_candidates = []
        for m in candidates:
            if m and m not in unique_candidates:
                unique_candidates.append(m)

        async with httpx.AsyncClient(timeout=22.0) as client:
            for model_name in unique_candidates:
                payload = {
                    "model": model_name,
                    "messages": [
                        {"role": "system", "content": system_prompts.get(mode, system_prompts["assistant"])},
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0.5 if mode == "notepad" else 0.65,
                    "max_tokens": 900,
                }
                try:
                    resp = await client.post(api_url, headers=headers, json=payload)
                    if resp.status_code == 200:
                        raw = resp.json()["choices"][0]["message"].get("content") or ""
                        cleaned = self._clean_llm_output(raw, mode)
                        if cleaned:
                            return cleaned
                except Exception:
                    continue

        return ""

    def _smart_local_brain(self, prompt: str, mode: str) -> str:
        """Fallback if offline: respects requested pointer count (e.g., '5 pointers')!"""
        if mode == "notepad":
            # Check if user asked for a specific number of pointers/bullets (e.g. "5 pointers")
            num_match = re.search(r"\b(\d+)\s*(?:pointer|point|bullet|step|line|item)", prompt.lower())
            limit = int(num_match.group(1)) if num_match else 5

            source = prompt
            if "REFERENCE WEBPAGE CONTENT:" in prompt:
                source = prompt.split("REFERENCE WEBPAGE CONTENT:")[-1].strip()

            raw_sentences = [
                s.strip() for s in re.split(r"(?<=[.!?])\s+|\n+", source)
                if len(s.strip()) > 15 and not s.strip().startswith("USER INSTRUCTION")
            ]
            selected = raw_sentences[:limit] if raw_sentences else [prompt]
            return "\n".join(f"• {s}" for s in selected)

        return "Processed your request!"

    async def analyze_canvas_image(self, image_base64: str, prompt: str) -> str:
        raw_b64 = (image_base64 or "").split(",")[-1]
        user_question = (prompt or "").strip() or (
            "Look at what I drew on the canvas. Tell me what you see and suggest colors or details!"
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
                                            "You are Byte, a helpful art companion looking at the user's "
                                            "PixelPaint canvas. DO NOT output HTML/CSS code. "
                                            "1) Identify what they drew and what colors they used. "
                                            "2) Answer their question and suggest 2 hex colors or details to add next.\n\n"
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

            return await self.process_prompt(
                f"The user is drawing in PixelPaint and asks: '{user_question}'. "
                "Give friendly color and drawing advice (with 2 hex color suggestions).",
                mode="assistant",
            )

        return "Awesome sketch! Try adding `#FF6B35` (warm orange) or `#FFD166` (gold) for highlights."

brain_service = BrainService()