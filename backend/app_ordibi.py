from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.routes import router
import uvicorn

app = FastAPI(
    title="Orbidi API",
    description="API para la prueba técnica de Orbidi",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

@app.get("/health")
async def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    uvicorn.run("app_ordibi:app", port=8000, reload=True)