from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    database_url: str

    # Segredo que assina os JWTs. Quem tiver esse valor consegue gerar tokens
    # válidos para qualquer usuário: nunca commitar, nunca reaproveitar.
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    # 7 dias: no celular (PWA) não dá para pedir login toda hora. Sem refresh
    # token, este é o tempo máximo que um token vazado continua valendo.
    jwt_expire_minutes: int = 60 * 24 * 7

    # Origens (sites) que podem chamar a API pelo navegador. Em produção,
    # incluir a URL da Vercel. No .env, em JSON:
    #   CORS_ORIGINS=["https://seu-app.vercel.app"]
    cors_origins: list[str] = ["http://localhost:5173"]


settings = Settings()
