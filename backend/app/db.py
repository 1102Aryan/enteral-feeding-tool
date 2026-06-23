from sqlmodel import SQLModel, create_engine, Session

from app.config import REPO_ROOT

DATA_DIR = REPO_ROOT / "backend" / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DATA_DIR / "app.db"

engine = create_engine(
    f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False}
)

def init_db() -> None:
    import app.models.db_models
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session