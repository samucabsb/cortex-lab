import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.router import router as v1_router
from app.services.runtime import runtime

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Opens the SQLite checkpointer (HITL pauses survive restarts) and the event log.
    await runtime.start(settings.DB_PATH)
    try:
        yield
    finally:
        await runtime.stop()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=(
        "Plataforma Multi-Agente de Human Augmentation na Pesquisa Científica. "
        "Orquestração LangGraph com verificação de DOI, auditoria metodológica, "
        "pontos de aprovação humana (HITL) e exportação PRISMA."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(v1_router, prefix="/api")


@app.get("/", summary="Root Health Check")
async def root():
    return {
        "system": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "OPERATIONAL",
        "mode": "Zero-Cost Multi-Agent Scientific Engine",
        "docs": "/docs",
    }


@app.get("/health", summary="Health Probe")
async def health():
    return {"status": "HEALTHY", "environment": settings.ENVIRONMENT}
