# Mesma versão de Python da .venv local, para o container se comportar igual.
FROM python:3.15-slim

# Copia só o binário do uv da imagem oficial (mesma versão usada localmente).
COPY --from=ghcr.io/astral-sh/uv:0.13.8 /uv /usr/local/bin/uv

# PYTHONUNBUFFERED: logs aparecem na hora (sem buffer) no `docker logs`.
# UV_COMPILE_BYTECODE: gera os .pyc no build, então o container sobe mais rápido.
# UV_LINK_MODE=copy: evita avisos do uv quando o cache está em outro sistema de arquivos.
ENV PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

WORKDIR /app

# 1) Instala só as dependências. Como copiamos apenas pyproject.toml e uv.lock,
#    esta camada fica em cache e só é refeita quando as dependências mudam,
#    não a cada alteração no código.
#    --locked: falha se o uv.lock estiver desatualizado (build reprodutível).
#    --no-dev: deixa pytest/httpx de fora da imagem de produção.
COPY pyproject.toml uv.lock ./
RUN uv sync --locked --no-dev --no-install-project

# 2) Agora copia o código (o .dockerignore impede .env, .venv etc. de entrarem).
COPY . .

# Usa o Python da .venv criada pelo uv sem precisar "ativar" nada.
ENV PATH="/app/.venv/bin:$PATH"

# Roda como usuário sem privilégios: se a app for comprometida,
# o atacante não é root dentro do container.
RUN useradd --create-home appuser && chown -R appuser /app
USER appuser

EXPOSE 8000

# 0.0.0.0 é obrigatório: com o padrão (127.0.0.1) a app só aceitaria
# conexões de dentro do próprio container.
# As migrations (alembic upgrade head) NÃO rodam aqui de propósito: são um
# passo separado do deploy, para não rodarem em paralelo se houver várias réplicas.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
