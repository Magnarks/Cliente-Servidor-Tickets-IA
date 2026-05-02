import { Modal, Button, Form, ListGroup } from "react-bootstrap";
import { useState, useContext, useEffect } from "react";

function ChatModal({ show, handleClose, usuario }) {
  const [mensaje, setMensaje] = useState("");
  const [messages, setMessages] = useState([]);
  const [mensajeData, setMensajeData] = useState("");
  const [mensajeDataBot, setMensajeDataBot] = useState({});
  const [botPartialMessage, setBotPartialMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (mensajeData) {
      if (mensajeData !== "" && mensajeData !== undefined) {
        // console.warn("MensajeData:", mensajeData);
        const nombre = mensajeData.split(": ")[0];
        const mensaje = mensajeData.split(": ")[1];
        const newMessage = { sender: nombre, text: mensaje };
        setMessages([...messages, newMessage]);
      }
    }
  }, [mensajeData, setMensajeData]);

   useEffect(() => {
        if (mensajeDataBot) {
            if (Object.keys(mensajeDataBot).length > 0 && mensajeDataBot !== undefined) {
                // console.warn("MensajeDataBot:", mensajeDataBot);
                const nombre = mensajeDataBot.sender;
                const mensaje = mensajeDataBot.text;
                const newMessage = { sender: nombre, text: mensaje };
                setMessages([...messages, newMessage]);
            }
        }
  }, [mensajeDataBot, setMensajeDataBot]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      enviarMSG();
    }
  };

  const handleMensajeData = (data) => {
    setIsLoading(true);
    setBotPartialMessage(""); // Limpiar mensaje anterior
    let respuestaCompleta = "";
    
    fetch('http://127.0.0.1:8000/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: data, usuario: usuario?.user_name || "prueba" })
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.body.getReader();
    })
    .then(async (reader) => {
      const decoder = new TextDecoder();
      let done = false;
      
      while (!done) {
        const { value, done: streamDone } = await reader.read();
        done = streamDone;
        
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          // Procesar cada línea del stream
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const jsonData = JSON.parse(line.slice(6));
                
                if (jsonData.done) {
                  //console.log("Respuesta completada");
                  // Agregar mensaje final a la lista
                  setMessages(prevMessages => [...prevMessages, { sender: "Bot 🤖", text: respuestaCompleta }]);
                  setBotPartialMessage("");
                  setIsLoading(false);
                } else if (jsonData.chunk) {
                  respuestaCompleta += jsonData.chunk;
                  // Actualizar el mensaje parcial en tiempo real
                  setBotPartialMessage(respuestaCompleta);
                  //console.log("Chunk recibido:", respuestaCompleta);
                }
              } catch (e) {
                console.error('Error parsing JSON:', e);
              }
            }
          }
        }
      }
    })
    .catch(error => {
      console.error('Error en streaming:', error);
      setIsLoading(false);
    });
  };

  function enviarMSG() {
    if (mensaje.trim() === "") return;

    const newMessage = { sender: "Yo 😀", text: mensaje };
    setMessages([...messages, newMessage]);

    handleMensajeData(mensaje);

    setMensaje("");
  }

  return (
    <Modal
      show={show}
      onHide={handleClose}
      keyboard={false}
      size="md"
      dialogClassName="modalExtendido"
      contentClassName="modal-container"
      className="modalPadding"
    >
      <Modal.Header
        closeButton
        data-bs-theme="dark"
        style={{ minHeight: "50px", height: "10%" }}
      >
        <Modal.Title style={{ color: "white" }}>Chat</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ height: "100%", overflowY: "auto" }}>
        <div id="chat">
          <div id="messages">
            <ListGroup id="message-list">
              {messages.map((msg, index) => (
                <ListGroup.Item
                  key={index}
                  variant={`${msg.sender == "Yo 😀" ? "primary" : "info"}`}
                >
                  {msg.sender}: {msg.text}
                </ListGroup.Item>
              ))}
              {isLoading && !botPartialMessage && (
                <ListGroup.Item variant="info">
                  Bot 🤖: <em>Pensando...</em>
                </ListGroup.Item>
              )}
              {botPartialMessage && (
                <ListGroup.Item variant="info">
                  Bot 🤖: {botPartialMessage}
                </ListGroup.Item>
              )}
            </ListGroup>
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer style={{ minHeight: "50px", height: "10%" }}>
        <Form.Group
          style={{
            display: "flex",
            width: "100%",
            flexWrap: "wrap",
            justifyContent: "space-around",
          }}
        >
          <Form.Control
            type="text"
            id="msg"
            placeholder="Escribe tu mensaje..."
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            style={{
              width: "80%",
              height: "40px",
              outline: "none",
              border: "none",
              boxShadow: "inset 0 0 0 2px #0dcaf0",
            }}
            autoComplete="off"
          />
          <Button
            id="btn-send-msg"
            variant="outline-info"
            style={{ margin: "0" }}
            className="botonAzul"
            onClick={enviarMSG}
          >
            <i className="fa-solid fa-paper-plane"></i>
          </Button>
        </Form.Group>
      </Modal.Footer>
    </Modal>
  );
}

export default ChatModal;
