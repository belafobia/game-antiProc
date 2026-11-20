from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.api import auth, completions, goals, grants, me, rewards, tasks, weeks
from app.services.errors import DomainError

app = FastAPI(title="Gamificação de Tarefas")


@app.exception_handler(DomainError)
def handle_domain_error(request: Request, exc: DomainError):
    # Traduz erros de regra de negócio (services) para HTTP.
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


app.include_router(auth.router)
app.include_router(me.router)
app.include_router(tasks.router)
app.include_router(completions.router)
app.include_router(weeks.router)
app.include_router(goals.router)
app.include_router(rewards.router)
app.include_router(grants.router)


@app.get("/health")
def health():
    return {"status": "ok"}
