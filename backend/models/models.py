from pydantic import BaseModel

class Login(BaseModel):
    datos_usuario: dict

class Usuario(BaseModel):
    id: int
    nombre: str
    email: str
    avatar: str

class Consulta(BaseModel):
    message: str
    usuario: str

class NuevoTicket(BaseModel):
    ticket: dict

class Ticket(BaseModel):
    id: int
    asunto: str
    descripcion: str
    autor: str
    asignado_a: str
    estado: str
    prioridad: str
    fechaCreacion: object
    fechaActualizacion: object
    comentarios: str
    adjuntos: str   

