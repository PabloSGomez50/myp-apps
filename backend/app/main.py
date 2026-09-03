from contextlib import asynccontextmanager

from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import async_engine, init_db_schemas
from app.modules.core.router import auth_router, core_router
from app.modules.finanzas.router import finanzas_router
from app.modules.inventario.router import inventario_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure PostgreSQL schemas exist
    try:
        await init_db_schemas()
    except Exception as e:
        print(f"[Warning] Could not initialize database schemas on startup: {e}")
    yield
    # Shutdown
    await async_engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Modular Monolith Backend for Household Management, Finances & Inventory",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Domain Routers
app.include_router(auth_router)
app.include_router(core_router)
app.include_router(finanzas_router)
app.include_router(inventario_router)


@app.get("/health", status_code=status.HTTP_200_OK, tags=["Health"])
async def health_check():
    """Healthcheck endpoint for Docker Compose and monitoring."""
    return {
        "status": "healthy",
        "environment": settings.ENVIRONMENT,
        "service": settings.PROJECT_NAME,
        "version": "0.1.0",
    }


@app.get("/", status_code=status.HTTP_200_OK, tags=["Root"])
async def root():
    """Root endpoint with suite metadata."""
    return {
        "message": "Welcome to myp-apps API Suite",
        "docs_url": "/docs",
        "modules": {
            "auth": "/api/v1/auth",
            "core": "/api/v1/core",
            "finanzas": "/api/v1/finanzas",
            "inventario": "/api/v1/inventario",
        },
    }
