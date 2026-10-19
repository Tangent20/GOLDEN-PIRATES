import asyncio
import os
import base64
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage

load_dotenv("/app/backend/.env")

PROMPT = """Painterly illustration, dark pirate tavern scene. A jolly crew of TRUE PIRATES —
rugged sailors with tricorn hats, eye patches, bandanas, beards, scars, long coats —
sitting around a heavy wooden table, raising golden beer mugs high in a cheerful toast,
laughing warmly together. Warm candlelight and lantern glow, treasure gold coins and a
treasure chest on the table, wooden barrels, ship rigging in the shadows.
Strict color palette: aged antique gold (#D4AF37) highlights on deep ink-black background (#06090E),
blood-red accents. Gothic painterly style, dramatic chiaroscuro, rich golden glow,
epic and inviting mood of brotherhood and victory.
No text, no letters, no watermark, no border."""

async def main():
    api_key = os.getenv("EMERGENT_LLM_KEY")
    chat = LlmChat(api_key=api_key, session_id="feast-gen-1", system_message="You are a master illustrator.")
    chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(modalities=["image", "text"])
    msg = UserMessage(text=PROMPT)
    text, images = await chat.send_message_multimodal_response(msg)
    if not images:
        print("NO IMAGE. text:", (text or "")[:200])
        return
    for i, img in enumerate(images):
        image_bytes = base64.b64decode(img["data"])
        out = f"/app/frontend/public/feast-pirates{i if len(images) > 1 else ''}.png"
        with open(out, "wb") as f:
            f.write(image_bytes)
        print("SAVED:", out, len(image_bytes), "bytes")

asyncio.run(main())