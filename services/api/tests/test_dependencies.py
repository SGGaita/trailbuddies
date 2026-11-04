"""Vercel installs the API's packages from pyproject.toml; Docker, CI and migrate.yml use
requirements.txt. Both lists must stay identical, or one of them deploys without a package."""

import tomllib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_pyproject_and_requirements_list_the_same_packages():
    project = tomllib.loads((ROOT / "pyproject.toml").read_text())["project"]
    lines = (ROOT / "requirements.txt").read_text().splitlines()
    reqs = [line.strip() for line in lines if line.strip() and not line.lstrip().startswith("#")]
    assert sorted(project["dependencies"]) == sorted(reqs)
