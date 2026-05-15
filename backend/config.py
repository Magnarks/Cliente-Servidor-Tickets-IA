import os
from dotenv import load_dotenv
import mysql.connector

load_dotenv()


class Settings:
    OPENAI_API_BASE_URL: str = os.getenv("OPENAI_API_BASE_URL", "http://localhost:11434/v1")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "nokeyneeded")
    MODEL_NAME: str = os.getenv("MODEL_NAME", "unsloth/gpt-oss-20b-GGUF:F16")
    SYSTEM_MESSAGE: str = os.getenv("SYSTEM_MESSAGE", "Eres un asistente experto en tickets que ayuda a consultar tickets aplicando filtros, cambiar estados, gestionar asignaciones, colocar comentarios y crear nuevos tickets, si el usuario saluda, responde de forma cordial y amable y dile al usuario tus funciones, no debes proporcionar ninguna información diferente a la proporcionada, si un usuario pregunta algo fuera de ese contexto, simplemente dile que no tienes información sobre eso o que no está en tus funciones, Si es algo diferente al tema de tickets di que no tienes información sobre eso. Si necesitas ejecutar una acción (crear o editar un ticket), debes usar exclusivamente las herramientas disponibles (functions). NO respondas con texto simulando llamadas a funciones. NO generes etiquetas como <tool_call> ni formatos XML. Solo usa el mecanismo de tools proporcionado. Siempre responde al usuario en lenguaje natural y nunca muestres arrays SQL o JSON crudo.")
    DB_MYSQL = mysql.connector.connect(
        host=os.getenv("HOST_MYSQL", "localhost"),
        user=os.getenv("USER_MYSQL", "root"),
        password=os.getenv("PASSWORD_MYSQL", ""),
        database=os.getenv("DATABASE_MYSQL", "orbidi")
    )

settings = Settings()