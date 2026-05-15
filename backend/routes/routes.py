from fastapi import APIRouter, File, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
import os
from dotenv import load_dotenv
import openai
import json
from models.models import Consulta, Ticket, Login, Usuario, NuevoTicket
from config import settings
from websocket_manager import manager
import uuid
import shutil
from typing import List
from pathlib import Path
from datetime import datetime

CREDENTIALS_PATH = os.path.join(os.path.dirname(__file__), 'client_secret_535675449174-m8c7a5hpgtihgnlslpi07jbi9er08s4v.apps.googleusercontent.com.json')
if not os.path.exists(CREDENTIALS_PATH):
    GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
    GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
else:
    import json
    with open(CREDENTIALS_PATH) as f:
        credentials = json.load(f)
        GOOGLE_CLIENT_ID = credentials.get("installed", {}).get("client_id")
        GOOGLE_CLIENT_SECRET = credentials.get("installed", {}).get("client_secret")


load_dotenv(override=True)

client = openai.OpenAI(base_url=settings.OPENAI_API_BASE_URL, api_key=settings.OPENAI_API_KEY)
MODEL_NAME = settings.MODEL_NAME

SYSTEM_MESSAGE = settings.SYSTEM_MESSAGE

historial_conversacion = {}

router = APIRouter()

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"

def ejecutarConsultaMySQL(query, valores = None):
    #Cursor para ejecutar consultas en MySQL
    cursor_mysql = settings.DB_MYSQL.cursor()
    cursor_mysql.execute(query, valores or ())
    resultados = cursor_mysql.fetchall()
    # Cerrar la conexión a la base de datos MySQL
    cursor_mysql.close()
    return resultados

def ejecutarQueryMySQL(query, operacion = "UPDATE", valores = None):
    cursor_mysql = settings.DB_MYSQL.cursor()
    cursor_mysql.execute(query, valores or ())
    if(operacion == "INSERT"):
        insert_id = cursor_mysql.lastrowid
    settings.DB_MYSQL.commit()
    cursor_mysql.close()
    if(operacion == "INSERT"):
        return insert_id
    else:
        return

async def notify_ticket_created(ticket, ticket_id):
    token_autor = ""
    token_asignado = ""
    resultado_token_autor = ejecutarConsultaMySQL(f"SELECT token FROM usuarios WHERE correousuario = '{ticket.get("autor")}'")
    if not resultado_token_autor:
        raise HTTPException(status_code=401, detail="No se encontró el autor")
    else:
        token_autor = resultado_token_autor[0][0]
    resultado_token_asignado = ejecutarConsultaMySQL(f"SELECT token FROM usuarios WHERE idusuarios = '{ticket.get("asignado_a")}'")
    if not resultado_token_asignado:
        raise HTTPException(status_code=401, detail="No se encontró el asignado")
    else:
        token_autor = resultado_token_asignado[0][0]

    if (token_autor == token_asignado):
        users = set([token_autor, token_asignado])

        message = {
            "type": "ticket_created",
            "ticket_id": ticket_id,
            "estado": ticket.get("estado"),
            "mensaje": f"Se ha creado el ticket '{ticket.get("asunto")}' y fue asignado a este"
        }

        for user_id in users:
            await manager.send_to_user(user_id, message)
    else:
        users = set([token_autor])

        message = {
            "type": "ticket_created",
            "ticket_id": "",
            "estado":  ticket.get("estado"),
            "mensaje": f"Se ha creado el ticket '{ticket.get("asunto")}' y fue asignado a este"
        }

        for user_id in users:
            await manager.send_to_user(user_id, message)


async def notify_ticket_updated(ticket_id):
    token_autor = ""
    token_asignado = ""
    resultado_ticket = ejecutarConsultaMySQL(f"SELECT * FROM tickets WHERE idtickets = '{ticket_id}'")
    if not resultado_ticket:
        raise HTTPException(status_code=401, detail="No se encontró el ticket")
    else:
        for resultado in resultado_ticket:
            correo_autor = resultado[3]
            id_asignado = resultado[4]
            resultado_token_autor = ejecutarConsultaMySQL(f"SELECT token FROM usuarios WHERE correousuario = '{correo_autor}'")
            if not resultado_token_autor:
                raise HTTPException(status_code=401, detail="No se encontró el autor")
            else:
                token_autor = resultado_token_autor[0][0]
            resultado_token_asignado = ejecutarConsultaMySQL(f"SELECT token FROM usuarios WHERE idusuarios = '{id_asignado}'")
            if not resultado_token_asignado:
                raise HTTPException(status_code=401, detail="No se encontró el asignado")
            else:
                token_autor = resultado_token_asignado[0][0]

            if (token_autor == token_asignado):
                users = set([token_autor, token_asignado])

                message = {
                    "type": "ticket_updated",
                    "ticket_id": resultado[0],
                    "estado": resultado[5],
                    "mensaje": f"Tu ticket '{resultado[1]}' fue actualizado"
                }

                for user_id in users:
                    await manager.send_to_user(user_id, message)
            else:
                users = set([token_autor])

                message = {
                    "type": "ticket_updated",
                    "ticket_id": resultado[0],
                    "estado": resultado[5],
                    "mensaje": f"Tu ticket '{resultado[1]}' fue actualizado"
                }

                for user_id in users:
                    await manager.send_to_user(user_id, message)

ESTADOS_VALIDOS = ["Abierto", "En Progreso", "En Revisión" "Cerrado"]
PRIORIDADES_VALIDAS = ["Baja", "Media", "Alta", "Crítica"]

def obtener_ticket_IA(ticket_id):
    query = f"SELECT * FROM tickets WHERE idtickets = {int(ticket_id)}"
    resultados = ejecutarConsultaMySQL(query)
    if resultados:
        t = resultados[0]
        return {
            "id": t[0],
            "asunto": t[1],
            "descripcion": t[2],
            "autor": t[3],
            "asignado_a": t[4],
            "estado": t[5],
            "prioridad": t[6],
            "fecha_creacion": str(t[7]),
            "fecha_actualizacion": str(t[8]),
            "comentarios": json.loads(t[9]) if t[9] else [],
            "adjuntos": json.loads(t[10]) if t[10] else []
        } # Retorna el primer resultado encontrado
    else:
        return {"error": "Ticket no encontrado"}  # Retorna None si no se encuentra el ticket
    
def obtener_tickets_IA():
    query = "SELECT * FROM tickets"
    resultados = ejecutarConsultaMySQL(query)
    return resultados

def crear_ticket_IA(asunto, descripcion, autor_email, asignado_email, prioridad="Media", estado="Abierto", comentario=None):
    if estado not in ESTADOS_VALIDOS:
        return f"Estado inválido. Usa uno de estos: {', '.join(ESTADOS_VALIDOS)}"

    if prioridad not in PRIORIDADES_VALIDAS:
        return f"Prioridad inválida. Usa una de estas: {', '.join(PRIORIDADES_VALIDAS)}"

    
    # resultado_autor = ejecutarConsultaMySQL(
    #     "SELECT idusuarios FROM usuarios WHERE correousuario = %s",
    #     (autor_email,)
    # )
    # if not resultado_autor:
    #     return "El usuario autor no existe"
    # else:
    #     autor_id = autor_email

    #autor_id = resultado_autor[0][0]
    autor_id = autor_email

    asignado_id = None
    if asignado_email:
        resultado_asignado = ejecutarConsultaMySQL(
            "SELECT idusuarios FROM usuarios WHERE correousuario = %s",
            (asignado_email,)
        )
        if not resultado_asignado:
            return "El usuario asignado no existe"
        asignado_id = resultado_asignado[0][0]

    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    comentarios_guardados = []
    if comentario:
        comentarios_guardados.append({
            "autor": autor_email,
            "fecha": now,
            "comentario": comentario
        })

    query = """
        INSERT INTO tickets 
        (asunto, descripcion, autor, asignado_a, estado, prioridad, fechaCreacion, fechaActualizacion, comentarios, adjuntos)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """

    valores = (
        asunto,
        descripcion,
        autor_id,
        asignado_id,
        estado,
        prioridad,
        now,
        now,
        json.dumps(comentarios_guardados),
        json.dumps([])  # adjuntos vacíos
    )

    id_ticket = ejecutarQueryMySQL(query, "INSERT", valores)

    try:
        notify_ticket_created({
            "asunto": asunto,
            "autor": autor_email,
            "asignado_a": asignado_email
        }, id_ticket)
    except Exception as e:
        print("Error notificando:", e)

    return f"Ticket #{id_ticket} creado correctamente con prioridad {prioridad} y estado {estado}"

async def editar_ticket_IA(ticket_id,asunto=None,descripcion=None,asignado_email=None,estado=None,prioridad=None,comentario=None):
    resultado_ticket = ejecutarConsultaMySQL(
        "SELECT * FROM tickets WHERE idtickets = %s",
        (ticket_id,)
    )
    if not resultado_ticket:
        return f"El ticket #{ticket_id} no existe"

    if estado and estado not in ESTADOS_VALIDOS:
        return f"Estado inválido. Usa: {', '.join(ESTADOS_VALIDOS)}"

    if prioridad and prioridad not in PRIORIDADES_VALIDAS:
        return f"Prioridad inválida. Usa: {', '.join(PRIORIDADES_VALIDAS)}"

    asignado_id = None
    if asignado_email:
        resultado_usuario = ejecutarConsultaMySQL(
            "SELECT idusuarios FROM usuarios WHERE correousuario = %s",
            (asignado_email,)
        )
        if not resultado_usuario:
            return "Usuario asignado no válido"
        asignado_id = resultado_usuario[0][0]

    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    comentarios_finales = None
    if comentario:
        resultado_comentarios = ejecutarConsultaMySQL(
            "SELECT comentarios FROM tickets WHERE idtickets = %s",
            (ticket_id,)
        )

        try:
            comentarios_previos = json.loads(resultado_comentarios[0][0]) if resultado_comentarios[0][0] else []
        except:
            comentarios_previos = []

        comentarios_previos.append({
            "autor": "IA",
            "fecha": now,
            "comentario": comentario
        })

        comentarios_finales = json.dumps(comentarios_previos)

    campos = []
    valores = []

    if asunto:
        campos.append("asunto=%s")
        valores.append(asunto)

    if descripcion:
        campos.append("descripcion=%s")
        valores.append(descripcion)

    if asignado_id is not None:
        campos.append("asignado_a=%s")
        valores.append(asignado_id)

    if estado:
        campos.append("estado=%s")
        valores.append(estado)

    if prioridad:
        campos.append("prioridad=%s")
        valores.append(prioridad)

    if comentarios_finales is not None:
        campos.append("comentarios=%s")
        valores.append(comentarios_finales)

    campos.append("fechaActualizacion=%s")
    valores.append(now)

    if not campos:
        return "No se proporcionaron campos para actualizar"

    query = f"""
        UPDATE tickets 
        SET {', '.join(campos)}
        WHERE idtickets = %s
    """

    valores.append(ticket_id)

    ejecutarQueryMySQL(query, None, valores)

    try:
        await notify_ticket_updated(ticket_id)
    except Exception as e:
        print("Error notificando:", e)

    return f"Ticket #{ticket_id} actualizado correctamente"

herramientas = [
    {
        "type": "function",
        "function": {
            "name": "obtener_ticket_IA",
            "description": "Permite obtener la información de un ticket específico en el sistema.",
            "parameters": {
                "type": "object",
                "properties": {
                    "id": {
                        "type": "integer",
                        "description": "El ID del ticket que se desea obtener."
                    }
                },
                "required": ["id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "obtener_tickets_IA",
            "description": "Permite obtener la lista de tickets disponibles en el sistema.",
            "parameters": {
                "type": "object",
                "properties": {}
            }
        }
    },
    {
    "type": "function",
        "function": {
            "name": "crear_ticket_IA",
            "description": "Permite crear un nuevo ticket en el sistema con validación de estado, prioridad y usuarios.",
            "parameters": {
                "type": "object",
                "properties": {
                    "asunto": {
                        "type": "string",
                        "description": "El asunto del ticket"
                    },
                    "descripcion": {
                        "type": "string",
                        "description": "La descripción detallada del problema"
                    },
                    "autor_email": {
                        "type": "string",
                        "description": "Correo del autor del ticket"
                    },
                    "asignado_email": {
                        "type": "string",
                        "description": "Correo del usuario asignado al ticket (opcional)"
                    },
                    "prioridad": {
                        "type": "string",
                        "enum": ["Baja", "Media", "Alta"],
                        "description": "Nivel de prioridad del ticket"
                    },
                    "estado": {
                        "type": "string",
                        "enum": ["Abierto", "En progreso", "Cerrado"],
                        "description": "Estado inicial del ticket"
                    },
                    "comentario": {
                        "type": "string",
                        "description": "Comentario inicial opcional del ticket"
                    }
                },
                "required": ["asunto", "descripcion", "autor_email"]
            }
        }
    },
    {
    "type": "function",
        "function": {
            "name": "editar_ticket_IA",
            "description": "Permite actualizar un ticket existente parcialmente (estado, prioridad, asignación, etc.)",
            "parameters": {
                "type": "object",
                "properties": {
                    "ticket_id": {
                        "type": "integer",
                        "description": "ID del ticket a editar"
                    },
                    "asunto": {
                        "type": "string",
                        "description": "Nuevo asunto del ticket"
                    },
                    "descripcion": {
                        "type": "string",
                        "description": "Nueva descripción del ticket"
                    },
                    "asignado_email": {
                        "type": "string",
                        "description": "Correo del usuario a asignar"
                    },
                    "estado": {
                        "type": "string",
                        "enum": ["Abierto", "En progreso", "Cerrado"],
                        "description": "Nuevo estado del ticket"
                    },
                    "prioridad": {
                        "type": "string",
                        "enum": ["Baja", "Media", "Alta"],
                        "description": "Nueva prioridad"
                    },
                    "comentario": {
                        "type": "string",
                        "description": "Comentario a agregar al ticket"
                    }
                },
                "required": ["ticket_id"]
            }
        }
    }
]

@router.websocket("/ws/{access_token}")
async def websocket_endpoint(websocket: WebSocket, access_token: str):
    await manager.connect(access_token, websocket)
    try:
        while True:
            await websocket.receive_text()
    except Exception as e:
        print(f"WebSocket error: {e}")
    except WebSocketDisconnect:
        print(f"Usuario desconectado: {access_token}")
        manager.disconnect(access_token)
    finally:
        manager.disconnect(access_token) 

@router.post("/inicio-sesion")
async def inicio_sesion(login: Login):
    login_data = login.datos_usuario
    print(f"Intento de inicio de sesión: {login}")
    if not login_data.get("user_email") or not login_data.get("accessToken"):
        raise HTTPException(status_code=400, detail="Email y token son requeridos")
    resultados = ejecutarConsultaMySQL(f"SELECT * FROM usuarios WHERE correousuario = '{login_data.get('user_email')}'")
    if not resultados:
        query = f"INSERT INTO usuarios (nombreusuario, correousuario, avatarusuario, token, expiracion_token, permisos, ultimo_logeo) VALUES ('{login_data.get('user_name')}', '{login_data.get('user_email')}', '{login_data.get('user_picture')}', '{login_data.get('accessToken')}', '{login_data.get('expiresIn')}', '{login_data.get('scope')}', '{login_data.get('fecha_sesion')}')"
        id_usuario = ejecutarQueryMySQL(query, "INSERT")
        return {"message": f"Inicio de sesión exitoso, {id_usuario}"}
    else:
        query = f"UPDATE usuarios SET token='{login_data.get('accessToken')}', expiracion_token='{login_data.get('expiresIn')}', ultimo_logeo='{login_data.get('fecha_sesion')}', avatarusuario='{login_data.get('user_picture')}', nombreusuario='{login_data.get('user_name')}' WHERE correousuario='{login_data.get('user_email')}'"
        ejecutarQueryMySQL(query)
        return {"message": "Inicio de sesión exitoso"}
    
@router.post("/tickets")
async def obtener_tickets(login: Login):
    login_data = login.datos_usuario
    if not login_data.get("user_email") or not login_data.get("accessToken"):
        raise HTTPException(status_code=400, detail="Email y token son requeridos")
    # Verificar que el usuario exista y el token sea válido
    resultados_usuario = ejecutarConsultaMySQL(f"SELECT * FROM usuarios WHERE correousuario = '{login_data.get('user_email')}' AND token = '{login_data.get('accessToken')}'")
    if not resultados_usuario:
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    resultados = ejecutarConsultaMySQL("SELECT * FROM tickets")
    tickets = []
    for resultado in resultados:
        ticket = Ticket(
            id=resultado[0],
            asunto=resultado[1],
            descripcion=resultado[2],
            autor=resultado[3],
            asignado_a=resultado[4],
            estado=resultado[5],
            prioridad=resultado[6],
            fechaCreacion=resultado[7],
            fechaActualizacion=resultado[8],
            comentarios=resultado[9],
            adjuntos=resultado[10]
        )
        tickets.append(ticket)
    return tickets

@router.post("/obtener-usuarios")
async def obtener_usuarios(login: Login):
    login_data = login.datos_usuario
    if not login_data.get("user_email") or not login_data.get("accessToken"):
        raise HTTPException(status_code=400, detail="Email y token son requeridos")
    # Verificar que el usuario exista y el token sea válido
    resultados_usuario = ejecutarConsultaMySQL(f"SELECT * FROM usuarios WHERE correousuario = '{login_data.get('user_email')}' AND token = '{login_data.get('accessToken')}'")
    if not resultados_usuario:
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    resultados = ejecutarConsultaMySQL("SELECT * FROM usuarios")
    usuarios = []
    for resultado in resultados:
        usuario = Usuario(
            id=resultado[0],
            nombre=resultado[1],
            email=resultado[2],
            avatar=resultado[3]
        )
        usuarios.append(usuario)
    return usuarios

@router.post("/crear-ticket")
async def crear_ticket(ticket: NuevoTicket, login: Login):
    print(f"Intento de creación de ticket: {ticket} por usuario: {login}")
    login_data = login.datos_usuario
    ticket_data = ticket.ticket
    if not login_data.get("user_email") or not login_data.get("accessToken"):
        raise HTTPException(status_code=400, detail="Email y token son requeridos")
    # Verificar que el usuario exista y el token sea válido
    resultados_usuario = ejecutarConsultaMySQL(f"SELECT * FROM usuarios WHERE correousuario = '{login_data.get('user_email')}' AND token = '{login_data.get('accessToken')}'")
    if not resultados_usuario:
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    if ticket_data.get('comentarios') is not None:
        comentarios_guardados = []
        comentarios_guardados.append({
            "autor": ticket_data.get('autor'),
            "fecha": ticket_data.get('fechaCreacion'),
            "comentario": ticket_data.get('comentarios')
        })
        query = f"INSERT INTO tickets (asunto, descripcion, autor, asignado_a, estado, prioridad, fechaCreacion, fechaActualizacion, comentarios, adjuntos) VALUES ('{ticket_data.get('asunto')}', '{ticket_data.get('descripcion')}', '{ticket_data.get('autor')}', '{ticket_data.get('asignado_a')}', '{ticket_data.get('estado')}', '{ticket_data.get('prioridad')}', '{ticket_data.get('fechaCreacion')}', '{ticket_data.get('fechaActualizacion')}', '{json.dumps(comentarios_guardados)}', '[]')"
    else:
        query = f"INSERT INTO tickets (asunto, descripcion, autor, asignado_a, estado, prioridad, fechaCreacion, fechaActualizacion, comentarios, adjuntos) VALUES ('{ticket_data.get('asunto')}', '{ticket_data.get('descripcion')}', '{ticket_data.get('autor')}', '{ticket_data.get('asignado_a')}', '{ticket_data.get('estado')}', '{ticket_data.get('prioridad')}', '{ticket_data.get('fechaCreacion')}', '{ticket_data.get('fechaActualizacion')}', '[]', '[]')"
    id_ticket = ejecutarQueryMySQL(query, "INSERT")
    notify_ticket_created(ticket_data, id_ticket)
    return {"id_ticket": id_ticket, "message": f"Ticket #{id_ticket} creado exitosamente"}

@router.put("/editar-ticket")
async def editar_ticket(ticket: NuevoTicket, login: Login):
    print(f"Intento de edición de ticket: {ticket} por usuario: {login}")
    login_data = login.datos_usuario
    ticket_data = ticket.ticket
    if not login_data.get("user_email") or not login_data.get("accessToken"):
        raise HTTPException(status_code=400, detail="Email y token son requeridos")
    # Verificar que el usuario exista y el token sea válido
    resultados_usuario = ejecutarConsultaMySQL(f"SELECT * FROM usuarios WHERE correousuario = '{login_data.get('user_email')}' AND token = '{login_data.get('accessToken')}'")
    if not resultados_usuario:
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    if ticket_data.get('comentarios') is not None:
        comentarios_guardados = []
        comentarios_guardados.append({
            "autor": ticket_data.get('autor'),
            "fecha": ticket_data.get('fechaActualizacion'),
            "comentario": ticket_data.get('comentarios')
        })
        resultados_comentarios = ejecutarConsultaMySQL(f"SELECT comentarios FROM tickets WHERE idtickets={int(ticket_data.get('id'))}")
        if not resultados_comentarios:
            query = f"UPDATE tickets SET asunto='{ticket_data.get('asunto')}', descripcion='{ticket_data.get('descripcion')}', autor='{ticket_data.get('autor')}', asignado_a='{ticket_data.get('asignado_a')}', estado='{ticket_data.get('estado')}', prioridad='{ticket_data.get('prioridad')}', fechaCreacion='{ticket_data.get('fechaCreacion')}', fechaActualizacion='{ticket_data.get('fechaActualizacion')}', comentarios='{json.dumps(comentarios_guardados)}' WHERE idtickets={int(ticket_data.get('id'))}"
            ejecutarQueryMySQL(query)
        else:
            comentarios_guardados.extend(json.loads(resultados_comentarios[0][0]))
            query = f"UPDATE tickets SET asunto='{ticket_data.get('asunto')}', descripcion='{ticket_data.get('descripcion')}', autor='{ticket_data.get('autor')}', asignado_a='{ticket_data.get('asignado_a')}', estado='{ticket_data.get('estado')}', prioridad='{ticket_data.get('prioridad')}', fechaCreacion='{ticket_data.get('fechaCreacion')}', fechaActualizacion='{ticket_data.get('fechaActualizacion')}', comentarios='{json.dumps(comentarios_guardados)}' WHERE idtickets={int(ticket_data.get('id'))}"
            ejecutarQueryMySQL(query)
    else:
        query = f"UPDATE tickets SET asunto='{ticket_data.get('asunto')}', descripcion='{ticket_data.get('descripcion')}', autor='{ticket_data.get('autor')}', asignado_a='{ticket_data.get('asignado_a')}', estado='{ticket_data.get('estado')}', prioridad='{ticket_data.get('prioridad')}', fechaCreacion='{ticket_data.get('fechaCreacion')}', fechaActualizacion='{ticket_data.get('fechaActualizacion')}' WHERE idtickets={int(ticket_data.get('id'))}"
    ejecutarQueryMySQL(query)
    await notify_ticket_updated(int(ticket_data.get('id')))
    return {"message": "Ticket creado exitosamente"}

@router.put("/tickets/{ticket_id}/estado/{nuevo_estado}")
async def actualizar_estado_ticket(ticket_id: int, nuevo_estado: str, login: Login):
    login_data = login.datos_usuario
    if not login_data.get("user_email") or not login_data.get("accessToken"):
        raise HTTPException(status_code=400, detail="Email y token son requeridos")
    # Verificar que el usuario exista y el token sea válido
    resultados_usuario = ejecutarConsultaMySQL(f"SELECT * FROM usuarios WHERE correousuario = '{login_data.get('user_email')}' AND token = '{login_data.get('accessToken')}'")
    if not resultados_usuario:
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    query = f"UPDATE tickets SET estado='{nuevo_estado}', fechaActualizacion=NOW() WHERE idtickets={ticket_id}"
    ejecutarQueryMySQL(query)
    await notify_ticket_updated(ticket_id)
    return {"message": "Estado del ticket actualizado exitosamente"}
    
@router.post("/tickets/{ticket_id}/subir-adjuntos")
async def upload_file(ticket_id: int, files: List[UploadFile] = File(...)):
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")

    archivos_guardados = []

    for file in files:
        # 🧠 nombre único
        extension = file.filename.split(".")[-1]
        unique_filename = f"{uuid.uuid4()}.{extension}"
        ticket_folder = UPLOAD_DIR / str(ticket_id)
        ticket_folder.mkdir(parents=True, exist_ok=True)

        file_path = ticket_folder / unique_filename

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        archivos_guardados.append({
            "original": file.filename,
            "guardado": unique_filename,
            "url": f"/uploads/{ticket_id}/{unique_filename}"
        })

    resultados_adjuntos = ejecutarConsultaMySQL(f"SELECT adjuntos FROM tickets WHERE idtickets={ticket_id}")
    if not resultados_adjuntos:
        query = f"UPDATE tickets SET adjuntos='{json.dumps(archivos_guardados)}' WHERE idtickets={ticket_id}"
        ejecutarQueryMySQL(query)
    else:
        archivos_guardados.extend(json.loads(resultados_adjuntos[0][0]))
        query = f"UPDATE tickets SET adjuntos='{json.dumps(archivos_guardados)}' WHERE idtickets={ticket_id}"
        ejecutarQueryMySQL(query)
    return {
        "message": "Archivos subidos correctamente",
        "files": archivos_guardados
    }

@router.delete("/eliminar-adjunto/{ticket_id}")
async def eliminar_adjunto(ticket_id: int, nombre_guardado: str):

    resultado = ejecutarConsultaMySQL(
        "SELECT adjuntos FROM tickets WHERE idtickets = %s",
        (ticket_id,)
    )

    if not resultado:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")

    try:
        adjuntos = json.loads(resultado[0][0]) if resultado[0][0] else []
    except:
        adjuntos = []

    archivo_encontrado = None
    nuevos_adjuntos = []

    for file in adjuntos:
        if file["guardado"] == nombre_guardado:
            archivo_encontrado = file
        else:
            nuevos_adjuntos.append(file)

    if not archivo_encontrado:
        raise HTTPException(status_code=404, detail="Archivo no encontrado en el ticket")

    ruta_archivo = os.path.join(UPLOAD_DIR, str(ticket_id), nombre_guardado)

    if os.path.exists(ruta_archivo):
        os.remove(ruta_archivo)

    ejecutarQueryMySQL(
        "UPDATE tickets SET adjuntos = %s WHERE idtickets = %s",
        None,
        (json.dumps(nuevos_adjuntos), ticket_id)
    )

    try:
        await notify_ticket_updated(ticket_id)
    except Exception as e:
        print("Error notificando:", e)

    return {"message": "Adjunto eliminado correctamente"}

@router.post("/chat")
async def chat(consulta: Consulta):
    usuario = consulta.usuario
    historial_conversacion[usuario] = historial_conversacion.get(usuario, [])
    historial_conversacion[usuario].append({"role": "system", "content": SYSTEM_MESSAGE})
    historial_conversacion[usuario].append({"role": "user", "content": consulta.message})
    
    try:
        user_input = consulta.message.strip()

        if not user_input:
            return {"response": "Por favor, envía un mensaje válido."}
  
        # Crear generador para el streaming
        async def generate():
            respuesta_completa = ""
            
            # Primera llamada al modelo (sin streaming) para detectar tool_calls
            response = client.chat.completions.create(
                model=MODEL_NAME, 
                messages=historial_conversacion[usuario],
                tools=herramientas
            )
            
            # Procesar si hay tool_calls
            if response.choices[0].message.tool_calls:
                # Agregar el mensaje con tool_calls al historial
                historial_conversacion[usuario].append({
                    "role": "assistant",
                    "content": response.choices[0].message.content,
                    "tool_calls": [
                        {
                            "id": tc.id,
                            "type": "function",
                            "function": {
                                "name": tc.function.name,
                                "arguments": tc.function.arguments
                            }
                        }
                        for tc in response.choices[0].message.tool_calls
                    ]
                })
                
                # Ejecutar cada herramienta
                for tool_call in response.choices[0].message.tool_calls:
                    tool_name = tool_call.function.name
                    tool_args = json.loads(tool_call.function.arguments)
                    
                    print(f"Ejecutando herramienta: {tool_name} con args: {tool_args}")
                    
                    # Ejecutar la función correspondiente
                    if tool_name == "obtener_ticket_IA":
                        resultado = obtener_ticket_IA(tool_args.get("id"))
                    elif tool_name == "obtener_tickets_IA":
                        resultado = obtener_tickets_IA()
                    elif tool_name == "crear_ticket_IA":
                        resultado = crear_ticket_IA(
                            asunto=tool_args.get("asunto"),
                            descripcion=tool_args.get("descripcion"),
                            autor_email=usuario,
                            asignado_email=tool_args.get("asignado_email") or tool_args.get("autor_email"),
                            prioridad=tool_args.get("prioridad", "Media"),
                            estado=tool_args.get("estado", "Abierto"),
                            comentario=tool_args.get("comentario")
                        )
                    elif tool_name == "editar_ticket_IA":
                        resultado = await editar_ticket_IA(
                            ticket_id=tool_args.get("ticket_id"),
                            asunto=tool_args.get("asunto"),
                            descripcion=tool_args.get("descripcion"),
                            asignado_email=tool_args.get("asignado_email"),
                            estado=tool_args.get("estado"),
                            prioridad=tool_args.get("prioridad"),
                            comentario=tool_args.get("comentario")
                        )
                    else:
                        resultado = "Función no reconocida"
                    
                    # Agregar el resultado al historial
                    historial_conversacion[usuario].append({
                        "role": "user",
                        "content": f"Resultado de {tool_name}: {json.dumps(resultado, default=str)}"
                    })
                
                # Segunda llamada al modelo para generar respuesta final CON STREAMING
                final_response = client.chat.completions.create(
                    model=MODEL_NAME,
                    messages=historial_conversacion[usuario],
                    stream=True
                )
                
                for chunk in final_response:
                    if chunk.choices[0].delta.content is not None:
                        contenido = chunk.choices[0].delta.content
                        respuesta_completa += contenido
                        print(contenido, end="", flush=True)
                        yield f"data: {json.dumps({'chunk': contenido})}\n\n"
            else:
                # Si no hay tool_calls, hacer streaming directamente CON STREAMING
                stream = client.chat.completions.create(
                    model=MODEL_NAME,
                    messages=historial_conversacion[usuario],
                    stream=True
                )
                
                for chunk in stream:
                    if chunk.choices[0].delta.content is not None:
                        contenido = chunk.choices[0].delta.content
                        respuesta_completa += contenido
                        print(contenido, end="", flush=True)
                        yield f"data: {json.dumps({'chunk': contenido})}\n\n"
            
            print()  # Salto de línea en consola
            # Guardar la respuesta completa en el historial
            historial_conversacion[usuario].append({"role": "assistant", "content": respuesta_completa})
            # Enviar señal de fin
            yield f"data: {json.dumps({'done': True})}\n\n"
        
        return StreamingResponse(generate(), media_type="text/event-stream")
    
    except Exception as e:
        return {"error": str(e)}