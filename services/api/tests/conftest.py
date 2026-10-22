import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db import get_session
from app.main import create_app


@pytest.fixture()
def client(tmp_path):
    """App wired to a throwaway SQLite database (CI also runs the migrations on Postgres)."""
    engine = create_engine(f"sqlite:///{tmp_path / 'test.db'}")
    factory = sessionmaker(bind=engine)

    def session_override():
        with factory() as s:
            yield s

    app = create_app()
    app.dependency_overrides[get_session] = session_override
    return TestClient(app)
