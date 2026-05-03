"""Tests package.

`main` refuses to import without a JWT_SECRET env var. We set a stable
high-entropy fake secret on package import so every test module that imports
`main` (directly or via `fastapi.testclient`) starts cleanly.

This runs both under `python -m unittest discover -s tests` (which imports
the package as soon as it discovers tests) and under `pytest`.
"""
from __future__ import annotations

import os

os.environ.setdefault("JWT_SECRET", "tests-jwt-secret-" + "x" * 40)
