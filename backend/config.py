import os
from dotenv import load_dotenv
import mysql.connector

load_dotenv()


class Settings:
    OPENAI_API_BASE_URL: str = os.getenv("OPENAI_API_BASE_URL", "http://localhost:11434/v1")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "nokeyneeded")
    MODEL_NAME: str = os.getenv("MODEL_NAME", "unsloth/Qwen3.6-35B-A3B-GGUF:IQ3_S")
    SYSTEM_MESSAGE: str = os.getenv("SYSTEM_MESSAGE", "Eres un asistente experto en tickets que ayuda a consultar tickets aplicando filtros, cambiar estados, gestionar asignaciones, colocar comentarios y crear nuevos tickets, no debes proporcionar ninguna información diferente a la proporcionada, si un usuario pregunta algo fuera de ese contexto, simplemente dile que no tienes información sobre eso o que no está en tus funciones, Si es algo diferente al tema de tickets di que no tienes información sobre eso.")
    DB_MYSQL = mysql.connector.connect(
        host=os.getenv("HOST_MYSQL", "localhost"),
        user=os.getenv("USER_MYSQL", "root"),
        password=os.getenv("PASSWORD_MYSQL", ""),
        database=os.getenv("DATABASE_MYSQL", "orbidi")
    )

settings = Settings()