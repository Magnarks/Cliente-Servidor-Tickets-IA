import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import Form from 'react-bootstrap/Form';
import Toast from 'react-bootstrap/Toast';
import ToastContainer from 'react-bootstrap/ToastContainer';
import Table from 'react-bootstrap/Table';
import { useState, useEffect } from 'react';

function ModalTicket({ show, handleClose, ticket, onSave, usuario, usuarios }) {
  const [showToast, setShowToast] = useState(false);
  const [msgToast, setMsgToast] = useState('');
  const [colorToast, setColorToast] = useState('success');
  const [adjuntos, setAdjuntos] = useState([]);

  const [formData, setFormData] = useState({
    id: '',
    asunto: '',
    descripcion: '',
    estado: 'Abierto',
    prioridad: 'Media',
    asignado_a: '',
    fechaCreacion: '',
    fechaActualizacion: ''
  });

  const isEditing = ticket && ticket.id;

  useEffect(() => {
    if (isEditing && ticket) {
      // Modo edición: llenar con datos del ticket
      ticket.comentarios = ''
      setFormData(ticket);
    } else {
      // Modo creación: limpiar formulario
      setFormData({
        id: '',
        asunto: '',
        descripcion: '',
        estado: 'Abierto',
        prioridad: 'Media',
        asignado_a: usuarios.length > 0 ? usuarios[0].id : '',
        comentarios: '',
        fechaCreacion: new Date().toISOString().slice(0, 19).replace('T', ' '),
        fechaActualizacion: new Date().toISOString().slice(0, 19).replace('T', ' ')
      });
    }
  }, [show, ticket, isEditing, usuarios]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      fechaActualizacion: new Date().toISOString().slice(0, 19).replace('T', ' ')
    }));
  };

  const handleSave = () => {
    if (!formData.asunto.trim() || !formData.descripcion.trim()) {
      setMsgToast('Por favor completa todos los campos requeridos');
      setColorToast('danger');
      setShowToast(true);
      return;
    }

    if (onSave) {
      formData.adjuntos = adjuntos;
      onSave(formData);
    }
    handleClose();
  };

  function eliminarArchivo(idticket, file) {
    fetch(`http://127.0.0.1:8000/eliminar-adjunto/${idticket}?nombre_guardado=${file.guardado}`, {
        method: 'DELETE'
    })
    .then(res => res.json())
    .then(data => {
        setMsgToast('Adjunto eliminado correctamente');
        setColorToast('success');
        setShowToast(true);
        // refrescar ticket
        // endpointObtenerTickets(userData);
    })
    .catch(err => {
        console.error(err);
        setMsgToast('Error al eliminar adjunto');
        setColorToast('danger');
        setShowToast(true);
    });
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

        <Modal show={show} onHide={handleClose} size="lg" contentClassName="modal-container">
            <Modal.Header closeButton data-bs-theme="dark">
                <Modal.Title style={{ color: "white" }}>{isEditing ? 'Editar Ticket' : 'Crear Nuevo Ticket'}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
            <Form>
                {isEditing && (
                <Form.Group className="mb-3">
                    <Form.Label style={{ color: "white" }}><strong>ID</strong></Form.Label>
                    <Form.Control type="text" value={formData.id} readOnly />
                </Form.Group>
                )}
                
                <Form.Group className="mb-3">
                <Form.Label style={{ color: "white" }}><strong>Asunto</strong></Form.Label>
                <Form.Control 
                    type="text" 
                    name="asunto"
                    value={formData.asunto}
                    onChange={handleChange}
                    placeholder="Ingresa el asunto del ticket"
                />
                </Form.Group>

                <Form.Group className="mb-3">
                <Form.Label style={{ color: "white" }}><strong>Descripción</strong></Form.Label>
                <Form.Control 
                    as="textarea"
                    rows={4}
                    name="descripcion"
                    value={formData.descripcion}
                    onChange={handleChange}
                    placeholder="Ingresa la descripción del problema"
                />
                </Form.Group>

                {!isEditing && (
                    <Form.Group className="mb-3">
                    <Form.Label style={{ color: "white" }}><strong>Autor</strong></Form.Label>
                        <img
                            src={usuario.user_picture}
                            width="40"
                            height="40"
                            className="d-inline-block align-right rounded-circle ms-2"
                        />
                    <Form.Label style={{ color: "white", marginLeft: "10px" }}><strong>{usuario.user_name + " (" + usuario.user_email + ")" || ""}</strong></Form.Label>
                    </Form.Group> 
                )};

                {isEditing && (
                    <Form.Group className="mb-3">
                    <Form.Label style={{ color: "white" }}><strong>Autor</strong></Form.Label>
                        {/* <img
                            src={formData.user_picture}
                            width="40"
                            height="40"
                            className="d-inline-block align-right rounded-circle ms-2"
                        /> */}
                    <Form.Label style={{ color: "white", marginLeft: "10px" }}><strong>{formData.autor }</strong></Form.Label>
                    </Form.Group> 
                )};


                <Form.Group className="mb-3">
                    <Form.Label style={{ color: "white" }}><strong>Asignar a</strong></Form.Label>
                    <Form.Select 
                        name="asignado_a"
                        value={formData.asignado_a || ''}
                        onChange={handleChange}
                    >
                        <option value="">Selecciona un usuario</option>
                        {usuarios.map((user) => (
                            <option key={user.id} value={user.id}>
                                {user.nombre} ({user.email})
                            </option>
                        ))}
                    </Form.Select>
                </Form.Group>

                <div className="row">
                <div className="col-md-6">
                    <Form.Group className="mb-3">
                    <Form.Label style={{ color: "white" }}><strong>Estado</strong></Form.Label>
                    <Form.Select 
                        name="estado"
                        value={formData.estado}
                        onChange={handleChange}
                    >
                        <option>Abierto</option>
                        <option>En Progreso</option>
                        <option>En Revisión</option>
                        <option>Cerrado</option>
                    </Form.Select>
                    </Form.Group>
                </div>

                <div className="col-md-6">
                    <Form.Group className="mb-3">
                    <Form.Label style={{ color: "white" }}><strong>Prioridad</strong></Form.Label>
                    <Form.Select 
                        name="prioridad"
                        value={formData.prioridad}
                        onChange={handleChange}
                    >
                        <option>Baja</option>
                        <option>Media</option>
                        <option>Alta</option>
                        <option>Crítica</option>
                    </Form.Select>
                    </Form.Group>
                </div>
                </div>
                 
                <Form.Group className="mb-3">
                <Form.Label style={{ color: "white" }}><strong>Agregar Comentario</strong></Form.Label>
                <Form.Control 
                    as="textarea"
                    rows={4}
                    name="comentarios"
                    value={formData.comentarios}
                    onChange={handleChange}
                    placeholder="Ingresa tu comentario"
                />
                </Form.Group>

                {isEditing && (
                    <Form.Group className="mb-3">
                    <Form.Label style={{ color: "white" }}><strong>Comentarios</strong></Form.Label>
                    <Table striped bordered hover responsive> 
                        <thead>
                            <tr>
                            <th>Autor</th>
                            <th>Fecha</th>
                            <th>Comentario</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Array.isArray(formData.comentariosJson) && formData.comentariosJson.map((valor, index) => (
                            <tr key={index}>
                                <td>{valor.autor}</td>
                                <td>{new Date(valor.fecha).toLocaleString()}</td>
                                <td>{valor.comentario}</td>
                            </tr>
                            ))}
                        </tbody>
                    </Table>
                    </Form.Group>
                )}

                {isEditing && (
                <div className="row">
                    <div className="col-md-6">
                    <Form.Group className="mb-3">
                        <Form.Label style={{ color: "white" }}><strong>Fecha de Creación</strong></Form.Label>
                        <Form.Control type="text" value={formData.fechaCreacion} readOnly />
                    </Form.Group>
                    </div>

                    <div className="col-md-6">
                    <Form.Group className="mb-3">
                        <Form.Label style={{ color: "white" }}><strong>Última Actualización</strong></Form.Label>
                        <Form.Control type="text" value={formData.fechaActualizacion} readOnly />
                    </Form.Group>
                    </div>
                </div>
                )}

                <Form.Group controlId="formFileMultiple" className="mb-3">
                    <Form.Label style={{ color: "white" }}><strong>Archivos Adjuntos</strong></Form.Label>
                    <Form.Control 
                        type="file" 
                        multiple 
                        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                        onChange={(e) => {
                            setAdjuntos(e.target.files);
                            console.log("Archivos seleccionados:", e.target.files);
                        }}
                    />
                </Form.Group>

                {isEditing && (            
                    <Table striped bordered hover>
                        <thead>
                            <tr>
                            <th>Nombre</th>
                            <th>Ver</th>
                            <th>Descargar</th>
                            <th>Eliminar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Array.isArray(formData.adjuntos) && formData.adjuntos.map((file, index) => (
                            <tr key={index}>
                                <td>{file.original}</td>
                                <td>
                                    <a 
                                        href={`http://127.0.0.1:8000${file.url}`} 
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title="Ver archivo"
                                    >
                                        <i 
                                        className="fa-solid fa-eye" 
                                        style={{ color: "rgb(116, 192, 252)", cursor: "pointer" }}
                                        ></i>
                                    </a>
                                </td>
                                <td>
                                    <a 
                                        href={`http://127.0.0.1:8000${file.url}`} 
                                        download
                                        title="Descargar archivo"
                                    >
                                        <i 
                                        className="fa-solid fa-download" 
                                        style={{ color: "rgb(99, 230, 190)", cursor: "pointer" }}
                                        ></i>
                                    </a>
                                </td>
                                <td>
                                    <a 
                                        title="Eliminar archivo"
                                        onClick={eliminarArchivo(formData.id, file)}
                                    >
                                        <i 
                                        className="fa-solid fa-trash" 
                                        style={{ color: "rgb(255, 59, 59)", cursor: "pointer" }}
                                        ></i>
                                    </a>
                                </td>
                            </tr>
                            ))}
                        </tbody>
                    </Table>
                )}
            </Form>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={handleClose}>
                    Cancelar
                </Button>
                <Button variant="primary" onClick={handleSave}>
                    {isEditing ? 'Actualizar' : 'Crear'} Ticket
                </Button>
            </Modal.Footer>
        </Modal>
    </>
  );
}

export default ModalTicket;