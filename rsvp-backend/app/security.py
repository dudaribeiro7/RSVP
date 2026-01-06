# app/security.py
from __future__ import annotations

import os
from fastapi import Header, HTTPException, status


def require_admin(x_admin_token: str | None = Header(default=None, alias="X-Admin-Token")) -> None:
    """
    Protege endpoints do admin.
    Configure a env var ADMIN_TOKEN (local e no Render).
    """
    expected = os.getenv("ADMIN_TOKEN")

    if not expected:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="ADMIN_TOKEN não configurado no servidor.",
        )

    if x_admin_token != expected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido.",
            headers={"WWW-Authenticate": "Bearer"},
        )
