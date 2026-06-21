from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import recommendation, feed

app = FastAPI(
    title="Enteral Feeding Glycaemic Tool API",
    description="Advisory decision support. NOT FOR CLININCAL USE",
    version="0.1.0"
)

# Vite proxy, forwards /api in dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(recommendation.router, prefix="/api")

@app.get("/api/health")
def health():
    return {"status": "ok", "clinical_use": False}