import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import Form from 'react-bootstrap/Form';
import Toast from 'react-bootstrap/Toast';
import ToastContainer from 'react-bootstrap/ToastContainer';
import { useState, useEffect } from 'react';

function ModalTicket({ show, handleClose, ticket, onSave, usuario, usuarios }) {
  const [showToast, setShowToast] = useState(false);
  const [msgToast, setMsgToast] = useState('');
  const [colorToast, setColorToast] = useState('success');

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
      onSave(formData);
    }
    handleClose();
  };

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
                    <Form.Label><strong>ID</strong></Form.Label>
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
                        <option>En Proceso</option>
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
                 
                {isEditing && (
                    <Form.Group className="mb-3">
                    <Form.Label style={{ color: "white" }}><strong>Comentario</strong></Form.Label>
                    <Form.Control 
                        as="textarea"
                        rows={4}
                        name="comentario"
                        value={formData.comentario}
                        onChange={handleChange}
                        placeholder="Ingresa tu comentario"
                    />
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
                    />
                </Form.Group>
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