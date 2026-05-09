import os
import time
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv(".env")
genai.configure(api_key=os.environ["GEMINI_API_KEY"])

print("Uploading dummy text file as video to test File API...")
with open("test.webm", "wb") as f:
    f.write(b"dummy")

try:
    video_file = genai.upload_file(path="test.webm", mime_type="video/webm")
    print("Uploaded:", video_file.name)
    print("State:", video_file.state.name)
    genai.delete_file(video_file.name)
    print("Deleted.")
except Exception as e:
    print("Error:", e)
