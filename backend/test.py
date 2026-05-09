from fastapi.testclient import TestClient
from main import app

client = TestClient(app)
try:
    response = client.post("/api/analyze", json={"message": "Hola"})
    print("STATUS:", response.status_code)
    print("BODY:", response.json())
except Exception as e:
    import traceback
    traceback.print_exc()
