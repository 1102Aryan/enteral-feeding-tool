from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import init_db
from app.api import recommendation, feed, alerts, ketones

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="Enteral Feeding Glycaemic Tool API",
    description="Advisory decision support. NOT FOR CLININCAL USE",
    version="0.1.0",
    lifespan=lifespan
)

# Vite proxy, forwards /api in dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(recommendation.router, prefix="/api")
app.include_router(feed.router, prefix="/api")
app.include_router(alerts.router, prefix="/api")
app.include_router(ketones.router, prefix="/api")

@app.get("/api/health")
def health():
    return {"status": "ok", "clinical_use": False}