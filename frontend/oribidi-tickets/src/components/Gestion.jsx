import { useState } from 'react'
import '../App.css'
import Toast from 'react-bootstrap/Toast';
import ToastContainer from 'react-bootstrap/ToastContainer';
import Container from 'react-bootstrap/Container';
import Navbar from 'react-bootstrap/Navbar';
import Button from 'react-bootstrap/Button';
import Col from 'react-bootstrap/Col';
import Row from 'react-bootstrap/Row';
import Form from 'react-bootstrap/Form';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import Modal from 'react-bootstrap/Modal';
import ModalChat from "./ModalChat.jsx";
import ModalTicket from "./ModalTicket.jsx";

function Gestion() {
  const [count, setCount] = useState(0)
  const [showToast, setShowToast] = useState(false);
  const [msgToast, setMsgToast] = useState('');
  const [colorToast, setColorToast] = useState('success');
  const [userData, setUserData] = useState({});
  const [nuevosMensajes, setNuevosMensajes] = useState([]);
  const [mostrarChat, setMostrarChat] = useState(false);
  const [mostrarTicket, setMostrarTicket] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [ticketSeleccionado, setTicketSeleccionado] = useState(null);

  const handleCloseChat = () => setMostrarChat(false);
  const handleCloseTicket = () => setMostrarTicket(false);
  const handleShowChat = () => {
    setMostrarChat(true);
    setNuevosMensajes([]);
  };
  const handleShowTicket = (ticket) => {
    setTicketSeleccionado(ticket);
    setMostrarTicket(true);
  };

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
    if(ticketData.adjuntos) {
      console.log('Archivos adjuntos:', ticketData.adjuntos);
      if (ticketData.adjuntos && !validarSizeAdjuntos(ticketData.adjuntos) || !validarExtensionAdjuntos(ticketData.adjuntos)) {
        setMsgToast('Error: Uno o más archivos adjuntos no tienen una extensión válida o exceden el tamaño máximo de 10MB.');
        setColorToast('danger');
        setShowToast(true);
        return;
      }else{
        // Guardar adjuntos en el backend
        if (ticketData.adjuntos) {
          const formData = new FormData();
          for (let i = 0; i < ticketData.adjuntos.length; i++) {
            formData.append('adjuntos', ticketData.adjuntos[i]);
          }
          fetch('http://127.0.0.1:8000/subir-adjuntos', {
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
    ticketData.autor = userData.user_email; // Asignar el autor del ticket como el usuario actual
    // Ejemplo: puedes enviarlos a tu backend
    fetch('http://127.0.0.1:8000/crear-ticket', {
      method: ticketData.id ? 'PUT' : 'POST', // PUT si edita, POST si crea
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
      if (ticketData.id) {
        setMsgToast('Ticket actualizado exitosamente');
      } else {
        setMsgToast('Ticket creado exitosamente');
      }
      setColorToast('success');
      setShowToast(true);
    })
    .catch(error => {
      console.error('Error:', error);
      setMsgToast('Error al guardar el ticket: ' + error.message);
      setColorToast('danger');
      setShowToast(true);
    });
  };

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
    }
  }

  return (
    <>
      <ToastContainer
        className="p-3"
        position="top-end"
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
                <Button variant="warning"><i className="fa-solid fa-bell"></i></Button>
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
