import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import init_db, engine
from sqlmodel import Session
from app.api import recommendation, feed, alerts, ketones, patients, monitoring, feedback, auth, dosing
from app.services.auth_service import ensure_default_user

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    with Session(engine) as session:
        ensure_default_user(session)
    yield


app = FastAPI(
    title="Enteral Feeding Glycaemic Tool API",
    description="Advisory decision support. NOT FOR CLININCAL USE",
    version="0.1.0",
    lifespan=lifespan
)

# Allowed browser origins. Set FRONTEND_ORIGINS (comma-separated) in production
# to the deployed static site URL; localhost stays allowed for dev.
_default_origins = ["http://localhost:5173"]
_env_origins = [o.strip() for o in os.getenv("FRONTEND_ORIGINS", "").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_default_origins + _env_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(recommendation.router, prefix="/api")
app.include_router(feed.router, prefix="/api")
app.include_router(alerts.router, prefix="/api")
app.include_router(ketones.router, prefix="/api")
app.include_router(patients.router, prefix="/api")
app.include_router(monitoring.router, prefix="/api")
app.include_router(feedback.router, prefix="/api")
app.include_router(dosing.router, prefix="/api")

@app.get("/api/health")
def health():
    return {"status": "ok", "clinical_use": False}