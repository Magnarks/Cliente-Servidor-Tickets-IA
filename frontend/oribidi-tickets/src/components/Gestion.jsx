import { useState, useEffect, useRef } from 'react'
import '../App.css'
import Toast from 'react-bootstrap/Toast';
import ToastContainer from 'react-bootstrap/ToastContainer';
import Container from 'react-bootstrap/Container';
import Navbar from 'react-bootstrap/Navbar';
import Button from 'react-bootstrap/Button';
import Badge from 'react-bootstrap/Badge';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import Form from 'react-bootstrap/Form';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import Modal from 'react-bootstrap/Modal';
import ModalChat from "./ModalChat.jsx";
import ModalTicket from "./ModalTicket.jsx";
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
import DataTable from 'datatables.net-react';
import DT from 'datatables.net-dt';
import { DragDropContext, Droppable, Draggable} from "@hello-pangea/dnd";
import AlertaAviso from '../assets/AlertaAviso.mp3';
import Offcanvas from 'react-bootstrap/Offcanvas';

function Gestion() {
  const [count, setCount] = useState(0)
  const [showToast, setShowToast] = useState(false);
  const [msgToast, setMsgToast] = useState('');
  const [colorToast, setColorToast] = useState('success');
  const [posicionToast, setPosicionToast] = useState('top-end');
  const [userData, setUserData] = useState({});
  const [nuevosMensajes, setNuevosMensajes] = useState([]);
  const [nuevosAlertas, setNuevosAlertas] = useState([]);
  const [mostrarChat, setMostrarChat] = useState(false);
  const [mostrarAlertas, setMostrarAlertas] = useState(false);
  const [mostrarTicket, setMostrarTicket] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [ticketSeleccionado, setTicketSeleccionado] = useState(null);
  const ticketsRef = useRef([]);
  const estados = ["Abierto", "En progreso", "En revisión", "Cerrado"];
  const audioAviso = new Audio(AlertaAviso);

  useEffect(() => {
    ticketsRef.current = tickets;
  }, [tickets]);
  const handleCloseChat = () => setMostrarChat(false);
  const handleCloseAlertas = () => {setMostrarAlertas(false); setNuevosAlertas([]);};
  const handleCloseTicket = () => setMostrarTicket(false);
  const handleShowChat = () => {
    setMostrarChat(true);
    setNuevosMensajes([]);
  };
  const handleShowAlertas = () => {
    setMostrarAlertas(true);
    // setNuevosAlertas([]);
  };
  const handleShowTicket = (ticket) => {
    //buscar el ticket en la lista de tickets por su id
    const ticketEncontrado = tickets.find(t => t.id === Number(ticket));
    setTicketSeleccionado(ticketEncontrado);
    setMostrarTicket(true);
  };

  useEffect(() => {
    const handleClick = (e) => {
      if (e.target.closest(".btn-edit")) {
        const btn = e.target.closest(".btn-edit");
        const id = btn.getAttribute("data-id");

        const ticketEncontrado = ticketsRef.current.find(
          t => t.id === Number(id)
        );

        const ticketProcesado = {
          ...ticketEncontrado,
          adjuntos: ticketEncontrado.adjuntos !== "[]"
            ? JSON.parse(ticketEncontrado.adjuntos)
            : [],
          comentariosJson: ticketEncontrado.comentarios !== "[]"
            ? JSON.parse(ticketEncontrado.comentarios)
            : []
        };

        setTicketSeleccionado(ticketProcesado);
        setMostrarTicket(true);
      }
    };

    document.addEventListener("click", handleClick);

    return () => {
      document.removeEventListener("click", handleClick);
    };
  }, []);

  const validarSizeAdjuntos = (files) => {
    const maxSizeMB = 10;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    for (let i = 0; i < files.length; i++) {
      if (files[i].size > maxSizeBytes) {
        return false;
      }
    }    return true;
  };

  const validarExtensionAdjuntos = (files) => {
    const allowedExtensions = ['pdf', 'png', 'jpg', 'jpeg', 'doc', 'docx', 'xls', 'xlsx'];
    for (let i = 0; i < files.length; i++) {
      const fileExtension = files[i].name.split('.').pop().toLowerCase();
      if (!allowedExtensions.includes(fileExtension)) {
        return false;
      }
    }
    return true;
  };

  const handleSaveTicket = (ticketData) => {
    // Aquí recibes los datos del formulario del ModalTicket
    console.log('Datos del ticket:', ticketData);
    ticketData.autor = userData.user_email; // Asignar el autor del ticket como el usuario actual
    if (ticketData.id){
      fetch('http://127.0.0.1:8000/editar-ticket', {
        method: 'PUT', // PUT si edita, POST si crea
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          ticket: {ticket: ticketData}, 
          login: { datos_usuario: userData }
        })
      })
      .then(response => response.json())
      .then(data => {
        ticketData.edicion = true;
        subirAnexosTicket(ticketData)
        setMsgToast('Ticket actualizado exitosamente');
        setColorToast('success');
        setPosicionToast('top-end');
        setShowToast(true);
        endpointObtenerTickets(userData);
      })
      .catch(error => {
        console.error('Error:', error);
        setMsgToast('Error al guardar el ticket: ' + error.message);
        setColorToast('danger');
        setShowToast(true);
      });
    }else{
      fetch('http://127.0.0.1:8000/crear-ticket', {
        method: 'POST', // PUT si edita, POST si crea
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          ticket: {ticket: ticketData}, 
          login: { datos_usuario: userData }
        })
      })
      .then(response => response.json())
      .then(data => {
        ticketData.edicion = false;
        ticketData.id = data.id_ticket
        subirAnexosTicket(ticketData)
        setMsgToast('Ticket creado exitosamente');
        setColorToast('success');
        setPosicionToast('top-end');
        setShowToast(true);
        endpointObtenerTickets(userData);
      })
      .catch(error => {
        console.error('Error:', error);
        setMsgToast('Error al guardar el ticket: ' + error.message);
        setColorToast('danger');
        setShowToast(true);
      });
    }
  };

  function subirAnexosTicket(ticketData){
    if(ticketData.adjuntos.length > 0) {
      console.log('Archivos adjuntos:', ticketData.adjuntos);
      if (ticketData.adjuntos.length > 0 && !validarSizeAdjuntos(ticketData.adjuntos) || !validarExtensionAdjuntos(ticketData.adjuntos)) {
        setMsgToast('Error: Uno o más archivos adjuntos no tienen una extensión válida o exceden el tamaño máximo de 10MB.');
        setColorToast('danger');
        setShowToast(true);
        return;
      }else{
        // Guardar adjuntos en el backend
        if (ticketData.adjuntos.length > 0) {
          const formData = new FormData();
          for (let i = 0; i < ticketData.adjuntos.length; i++) {
            formData.append('files', ticketData.adjuntos[i]);
          }
          fetch(`http://127.0.0.1:8000/tickets/${ticketData.id}/subir-adjuntos`, {
            method: 'POST',
            body: formData
          })
          .then(response => response.json())
          .then(data => {
            // Procesar la respuesta del backend
          })
          .catch(error => {
            console.error('Error al subir adjuntos:', error);
            setMsgToast('Error al subir adjuntos: ' + error.message);
            setColorToast('danger');
            setShowToast(true);
          });
        }
      }
    }
  }

  function obtenerCookies() {
    if(count === 0){
        const cookies = document.cookie.split(';');
        const cookieObj = {};
        cookies.forEach(cookie => {
        const [name, value] = cookie.trim().split('=');
        cookieObj[name] = value;
        });
        // console.log(cookieObj);
        setCount(count + 1);
        return cookieObj;
    }
  }

  function cerrarSesion() {
    document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'token_type=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'expires_in=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'scope=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'state=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'user_email=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'user_name=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    document.cookie = 'user_picture=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    setUserData({});
    setMsgToast('Sesión cerrada exitosamente');
    setColorToast('success');
    setShowToast(true);
    window.location.href = '/';
  }

  function endpointInicioSesion(datosUser) {
    fetch('http://127.0.0.1:8000/inicio-sesion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({datos_usuario: datosUser}) 
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      if(data.message === "Inicio de sesión exitoso") {
        // console.log('inicio de sesión registrado en backend');
      } else {
        setMsgToast('Error al obtener la URL de inicio de sesión');
        setColorToast('danger');
        setShowToast(true);
      }
    })
    .catch(error => {
      console.error('Error al iniciar sesión:', error);
      setMsgToast('Error al iniciar sesión: ' + error.message);
      setColorToast('danger');
      setShowToast(true);
    });
  }

  function endpointObtenerUsuarios(datosUser) {
    fetch('http://127.0.0.1:8000/obtener-usuarios', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({datos_usuario: datosUser})
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      if(data && Array.isArray(data)) {
        console.log('Usuarios obtenidos del backend:', data);
        setUsuarios(data);
      } else {
        setMsgToast('Error al obtener los usuarios');
        setColorToast('danger');
        setShowToast(true);
      }
    })
    .catch(error => {
      console.error('Error al obtener los usuarios:', error);
      setMsgToast('Error al obtener los usuarios: ' + error.message);
      setColorToast('danger');
      setShowToast(true);
    });
  }

  function endpointObtenerTickets(datosUser) {
    fetch('http://127.0.0.1:8000/tickets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({datos_usuario: datosUser})
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      if(data && Array.isArray(data)) {
        console.log('Tickets obtenidos del backend:', data);
        setTickets(data);
      } else {
        setMsgToast('Error al obtener los tickets');
        setColorToast('danger');
        setShowToast(true);
      }
    })
    .catch(error => {
      console.error('Error al obtener los tickets:', error);
      setMsgToast('Error al obtener los tickets: ' + error.message);
      setColorToast('danger');
      setShowToast(true);
    });
  }

  if(count === 0){
    const datos_sesion = obtenerCookies();

    if(!datos_sesion.access_token) {
        setMsgToast('No se ha encontrado un token de acceso. Por favor, inicie sesión.');
        setColorToast('danger');
        setShowToast(true);
        window.location.href = '/';
    }else{
        setMsgToast('Autenticación exitosa');
        setColorToast('success');
        setShowToast(true);
        setUserData({
            accessToken: datos_sesion.access_token,
            tokenType: datos_sesion.token_type,
            expiresIn: datos_sesion.expires_in,
            scope: datos_sesion.scope,
            state: datos_sesion.state,
            user_email: datos_sesion.user_email,
            user_name: datos_sesion.user_name,
            user_picture: datos_sesion.user_picture,
            fecha_sesion: new Date().toISOString().slice(0, 19).replace('T', ' ')
        });
        let objSesion = {
            accessToken: datos_sesion.access_token,
            tokenType: datos_sesion.token_type,
            expiresIn: datos_sesion.expires_in,
            scope: datos_sesion.scope,
            state: datos_sesion.state,
            user_email: datos_sesion.user_email,
            user_name: datos_sesion.user_name,
            user_picture: datos_sesion.user_picture,
            fecha_sesion: new Date().toISOString().slice(0, 19).replace('T', ' ')
        };
        endpointInicioSesion(objSesion);
        endpointObtenerUsuarios(objSesion);
        endpointObtenerTickets(objSesion);

        const ws = new WebSocket(`ws://localhost:8000/ws/${objSesion.accessToken}`);
          //Verificar conexión WebSocket
          ws.onopen = () => {
              console.log('Conexión WebSocket establecida');
              setIsConnected(true);
          };

          ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === "ticket_created") {
              setNuevosAlertas((prevAlertas) => [...prevAlertas, data]);
              audioAviso.play();
              setMsgToast('Ticket asignado: ' + data.mensaje);
              setColorToast('warning');
              setPosicionToast('bottom-end');
              setShowToast(true);
            }

            if (data.type === "ticket_updated") { //&& data.autor !== userData.email
              setNuevosAlertas((prevAlertas) => [...prevAlertas, data]);
              audioAviso.play();
              setMsgToast('Ticket actualizado: ' + data.mensaje);
              setColorToast('warning');
              setPosicionToast('bottom-end');
              setShowToast(true);
            }
        };

          ws.onerror = (error) => {
              console.error('Error en WebSocket:', error);
              setIsConnected(false);
          };

          ws.onclose = () => {
              console.log('Conexión WebSocket cerrada');
              setIsConnected(false);
          };
    }
  }

  DataTable.use(DT);

  const onDragEnd = (result) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;

    // Si no cambió de columna
    if (source.droppableId === destination.droppableId) return;

    const ticketId = Number(draggableId);
    const nuevoEstado = destination.droppableId;

    // actualizar en frontend
    const nuevosTickets = tickets.map(t =>
      t.id === ticketId ? { ...t, estado: nuevoEstado } : t
    );

    setTickets(nuevosTickets);

    // actualizar en backend
    fetch(`http://127.0.0.1:8000/tickets/${ticketId}/estado/${nuevoEstado}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({datos_usuario: userData}) 
    });
  };

  return (
    <>
      <ToastContainer
        className="p-3"
        position={posicionToast}
        style={{ zIndex: 1050 }}
      >
        <Toast bg={colorToast} onClose={() => setShowToast(false)} show={showToast} delay={3000} autohide>
            <Toast.Header>
                <img src="holder.js/20x20?text=%20" className="rounded me-2" alt="" />
                <strong className="me-auto">Aviso</strong>
            </Toast.Header>
            <Toast.Body>{msgToast}</Toast.Body>
        </Toast>
      </ToastContainer>

      <Offcanvas show={mostrarAlertas} onHide={handleCloseAlertas} placement='end'>
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Alertas</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          {nuevosAlertas.map((alerta, index) => (
            <p key={alerta.ticket_id}>{alerta.mensaje}</p>
          ))}
        </Offcanvas.Body>
      </Offcanvas>

      <Navbar className="bg-body-tertiary" fixed="top" bg="primary" data-bs-theme="dark">
        <Container>
          <Navbar.Brand href="#perfil">
            <img
              src={userData.user_picture}
              width="40"
              height="40"
              className="d-inline-block align-right rounded-circle ms-2"
            />
          </Navbar.Brand>
          <div style={{ 
            width: '10px', 
            height: '10px', 
            backgroundColor: isConnected ? 'green' : 'red', 
            borderRadius: '50%', 
          }}></div>
          <Navbar.Toggle />
          <Navbar.Collapse className="justify-content-end">
            <Navbar.Text>
              Sesión iniciada como: <a href="#perfil">{userData.user_name}</a>
            </Navbar.Text>
          </Navbar.Collapse>
        </Container>
        <Form inline="true">
          <Row>
            <Col xs="auto">
              <OverlayTrigger
                placement="bottom"
                delay={{ show: 250, hide: 400 }}
                overlay={<Tooltip id="button-tooltip-2">Alertas</Tooltip>}
              >
                <Button variant="warning" onClick={handleShowAlertas}>
                  <i className="fa-solid fa-bell"></i>
                  {nuevosAlertas.length > 0 && (
                    <Badge bg="secondary" text="dark">
                      {nuevosAlertas.length}
                    </Badge>
                  )}
                </Button>
              </OverlayTrigger>
            </Col>
            <Col xs="auto">
              <OverlayTrigger
                placement="bottom"
                delay={{ show: 250, hide: 400 }}
                overlay={<Tooltip id="button-tooltip-3">Cerrar sesión</Tooltip>}
              >
                <Button variant="danger" title='Cerrar sesión' style={{marginRight: "50px"}} onClick={cerrarSesion}>
                  <i className="fa-solid fa-power-off"></i>
                </Button>
              </OverlayTrigger>
            </Col>
          </Row>
        </Form>
      </Navbar>

      <div style={{marginTop: "5em", marginBottom: "50em"}}>

        <Tabs
          defaultActiveKey="tabla"
          id="uncontrolled-tab-example"
          className="mb-3"
          justify
        >
          <Tab eventKey="tabla" title="Tabla">
            <DataTable
              key={JSON.stringify(tickets)}
              data={tickets}
              className="display"
              columns={[
                { title: "ID", data: 'id' },
                { title: "Asunto", data: 'asunto' },
                { title: "Autor", data: 'autor' },
                { title: "Estado", data: 'estado' },
                { title: "Prioridad", data: 'prioridad' },
                { 
                  title: "Fecha de creación", 
                  data: 'fechaCreacion',
                  render: (data) => new Date(data).toLocaleString()
                },
                { 
                  title: "Fecha de actualización", 
                  data: 'fechaActualizacion',
                  render: (data) => new Date(data).toLocaleString()
                },
                {
                  title: "Editar",
                  data: null,
                  render: (data, type, row) => {
                    return `<button class="btn btn-primary btn-edit" data-id="${row.id}">
                              <i class="fa-solid fa-pen-to-square"></i>
                            </button>`;
                  }
                },
                // {
                //   title: "Eliminar",
                //   data: null,
                //   render: () => `<button class="btn btn-danger" onclick={handleDeleteTicket}><i class="fa-solid fa-trash"></i></button>`
                // }
              ]}
            />
          </Tab>
          <Tab eventKey="kanban" title="Kanban">
            <DragDropContext onDragEnd={onDragEnd}>
              <div style={{ display: "flex", gap: "20px" }}>
                {estados.map((estado) => (
                  <Droppable droppableId={estado} key={estado}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        style={{
                          background: "linear-gradient(45deg, #000608, #2a3f54) !important",
                          padding: "10px",
                          width: "250px",
                          minHeight: "400px"
                        }}
                      >
                        <h4>{estado}</h4>

                        {tickets
                          .filter(t => t.estado === estado)
                          .map((ticket, index) => (
                            <Draggable
                              key={ticket.id}
                              draggableId={ticket.id.toString()}
                              index={index}
                            >
                              {(provided) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  style={{
                                    padding: "10px",
                                    margin: "10px 0",
                                    borderRadius: "5px",
                                    borderColor: "#0dcaf0",
                                    borderWidth: "2px",
                                    borderStyle: "solid",
                                    ...provided.draggableProps.style
                                  }}
                                >
                                  <strong>{ticket.asunto}</strong>
                                  <p>{ticket.prioridad}</p>
                                </div>
                              )}
                            </Draggable>
                          ))}

                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                ))}
              </div>
            </DragDropContext>
          </Tab>
        </Tabs>

      </div>

      <Navbar className="bg-body-tertiary" fixed="bottom" bg="primary" data-bs-theme="dark">
        <Container>
          <Navbar.Brand>
            <Col xs="auto">
              <OverlayTrigger
                placement="top"
                delay={{ show: 250, hide: 400 }}
                overlay={<Tooltip id="button-tooltip-3">Crear Ticket</Tooltip>}
              >
                <Button variant="info" title='Crear Ticket' style={{marginRight: "50px"}} onClick={handleShowTicket}>
                  <i className="fa-solid fa-plus"></i>
                </Button>
              </OverlayTrigger>
            </Col>
          </Navbar.Brand>
          <Navbar.Toggle />
          <Navbar.Collapse className="justify-content-end">
            <Navbar.Text>
            </Navbar.Text>
          </Navbar.Collapse>
        </Container>
        <Form inline="true">
          <Row>
            <Col xs="auto">
              <OverlayTrigger
                placement="top"
                delay={{ show: 250, hide: 400 }}
                overlay={<Tooltip id="button-tooltip-3">Chat</Tooltip>}
              >
                <Button variant="info" title='Chat' style={{marginRight: "50px"}} onClick={handleShowChat}>
                  <i className="fa-solid fa-message"></i>
                  {nuevosMensajes.length > 0 && (
                    <Badge bg="warning" text="dark">
                      {nuevosMensajes.length}
                    </Badge>
                  )}
                </Button>
              </OverlayTrigger>
            </Col>
          </Row>
        </Form>
      </Navbar>
      <ModalChat show={mostrarChat} handleClose={handleCloseChat} usuario={userData} />
      <ModalTicket show={mostrarTicket} handleClose={handleCloseTicket} ticket={ticketSeleccionado} onSave={handleSaveTicket} usuario={userData} usuarios={usuarios} />
    </>
  )
}

export default Gestion
