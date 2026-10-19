import asyncio
import os
import base64
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage

load_dotenv("/app/backend/.env")

PROMPT = """Painterly illustration, dark pirate treasury scene. A gleaming OPEN treasure chest overflowing
with glowing gold coins, pearls and jeweled rings, TWO golden beer mugs with foam resting beside it on
a wooden barrel, a few scattered gold coins on the deck planks, warm lantern light from above.
Strict color palette: aged antique gold (#D4AF37) highlights on deep ink-black background (#06090E),
blood-red accents. Gothic painterly style, dramatic chiaroscuro, rich golden glow, epic inviting mood
of generosity and legend. Vertical composition. No text, no letters, no watermark, no border."""

async def main():
    api_key = os.getenv("EMERGENT_LLM_KEY")
    chat = LlmChat(api_key=api_key, session_id="butin-gen-1", system_message="You are a master illustrator.")
    chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(modalities=["image", "text"])
    msg = UserMessage(text=PROMPT)
    text, images = await chat.send_message_multimodal_response(msg)
    if not images:
        print("NO IMAGE. text:", (text or "")[:200])
        return
    for i, img in enumerate(images):
        image_bytes = base64.b64decode(img["data"])
        out = f"/app/frontend/public/butin-tresor{i if len(images) > 1 else ''}.png"
        with open(out, "wb") as f:
            f.write(image_bytes)
        print("SAVED:", out, len(image_bytes), "bytes")

asyncio.run(main())