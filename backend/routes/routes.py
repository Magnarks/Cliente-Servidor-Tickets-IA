from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
import os
from dotenv import load_dotenv
import openai
import json
from models.models import Consulta, Ticket, Login, Usuario, NuevoTicket
from config import settings
from websocket_manager import manager

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

def ejecutarConsultaMySQL(query):
    #Cursor para ejecutar consultas en MySQL
    cursor_mysql = settings.DB_MYSQL.cursor()
    cursor_mysql.execute(query)
    resultados = cursor_mysql.fetchall()
    # Cerrar la conexión a la base de datos MySQL
    cursor_mysql.close()
    return resultados

def ejecutarQueryMySQL(query):
    cursor_mysql = settings.DB_MYSQL.cursor()
    cursor_mysql.execute(query)
    settings.DB_MYSQL.commit()
    cursor_mysql.close()

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

            print(token_asignado)
            print(token_autor)
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

def obtener_ticket_IA(ticket_id):
    query = f"SELECT * FROM tickets WHERE id = {ticket_id}"
    resultados = ejecutarConsultaMySQL(query)
    if resultados:
        return resultados[0]  # Retorna el primer resultado encontrado
    else:
        return None  # Retorna None si no se encuentra el ticket
    
def obtener_tickets_IA():
    query = "SELECT * FROM tickets"
    resultados = ejecutarConsultaMySQL(query)
    return resultados

def crear_ticket_IA(asunto, descripcion, autor):
    query = f"INSERT INTO tickets (asunto, descripcion, autor) VALUES ('{asunto}', '{descripcion}', '{autor}')"
    ejecutarQueryMySQL(query)
    return "Ticket creado exitosamente"

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
            "description": "Permite crear un nuevo ticket en el sistema.",
            "parameters": {
                "type": "object",
                "properties": {
                    "asunto": {"type": "string", "description": "El asunto del ticket"},
                    "descripcion": {"type": "string", "description": "La descripción detallada del problema"},
                    "autor": {"type": "string", "description": "El nombre del autor del ticket"}
                },
                "required": ["asunto", "descripcion", "autor"]
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
        ejecutarQueryMySQL(query)
        return {"message": "Inicio de sesión exitoso"}
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
    query = f"INSERT INTO tickets (asunto, descripcion, autor, asignado_a, estado, prioridad, fechaCreacion, fechaActualizacion, comentarios, adjuntos) VALUES ('{ticket_data.get('asunto')}', '{ticket_data.get('descripcion')}', '{ticket_data.get('autor')}', '{ticket_data.get('asignado_a')}', '{ticket_data.get('estado')}', '{ticket_data.get('prioridad')}', '{ticket_data.get('fechaCreacion')}', '{ticket_data.get('fechaActualizacion')}', '{ticket_data.get('comentarios')}', '{ticket_data.get('adjuntos')}')"
    ejecutarQueryMySQL(query)
    return {"message": "Ticket creado exitosamente"}

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
    query = f"UPDATE tickets SET asunto='{ticket_data.get('asunto')}', descripcion='{ticket_data.get('descripcion')}', autor='{ticket_data.get('autor')}', asignado_a='{ticket_data.get('asignado_a')}', estado='{ticket_data.get('estado')}', prioridad='{ticket_data.get('prioridad')}', fechaCreacion='{ticket_data.get('fechaCreacion')}', fechaActualizacion='{ticket_data.get('fechaActualizacion')}', comentarios='{ticket_data.get('comentarios')}', adjuntos='{ticket_data.get('adjuntos')}' WHERE idtickets={int(ticket_data.get('id'))}"
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
    
@router.post("/upload-file")
async def upload_file(file: UploadFile = File(...)):
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")
    return {"filename": file.filename}

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
        def generate():
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
                            tool_args.get("asunto"),
                            tool_args.get("descripcion"),
                            tool_args.get("autor")
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