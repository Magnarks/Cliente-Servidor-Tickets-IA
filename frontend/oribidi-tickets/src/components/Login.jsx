import { useState } from 'react'
import '../App.css'
import reactLogo from '../assets/react.svg'
import Button from 'react-bootstrap/Button';
import Toast from 'react-bootstrap/Toast';
import ToastContainer from 'react-bootstrap/ToastContainer';

function Login() {

  const [count, setCount] = useState(0)
  const [sesion, setSesion] = useState({})
  const [userData, setUserData] = useState({})
  const [showToast, setShowToast] = useState(false);
  const [msgToast, setMsgToast] = useState('');
  const [colorToast, setColorToast] = useState('success');

  function getAccessTokenFromUrl() {
    if(count === 0){
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        if(hashParams.has('access_token')) {
            const accessToken = hashParams.get('access_token');
            setSesion({
              accessToken: accessToken,
              tokenType: hashParams.get('token_type'),
              expiresIn: hashParams.get('expires_in'),
              scope: hashParams.get('scope'),
              state: hashParams.get('state')
            });
            document.cookie = `access_token=${accessToken}; path=/`;
            document.cookie = `token_type=${hashParams.get('token_type')}; path=/`;
            document.cookie = `expires_in=${hashParams.get('expires_in')}; path=/`;
            document.cookie = `scope=${hashParams.get('scope')}; path=/`;
            document.cookie = `state=${hashParams.get('state')}; path=/`;
            
            // Obtener datos del usuario
            fetchUserData(accessToken);
            
            setCount(count + 1);
        }else{
            if(hashParams.has('error')) {
                console.error('Error during authentication:', hashParams.get('error'));
                setMsgToast('Error durante la autenticación: ' + hashParams.get('error'));
                setColorToast('danger');
                setShowToast(true);
            }
        }
    }
  }

  function fetchUserData(accessToken) {
    fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      setUserData({
        name: data.name,
        email: data.email,
        picture: data.picture,
        id: data.id
      });
      setMsgToast('Autenticación exitosa');
      setColorToast('success');
      setShowToast(true);
      // Guardar datos en cookies o localStorage también si lo necesitas
      document.cookie = `user_name=${data.name}; path=/`;
      document.cookie = `user_email=${data.email}; path=/`;
      document.cookie = `user_picture=${data.picture}; path=/`;
      
      // Redirigir después de obtener los datos
      setTimeout(() => {
        window.location.href = '/gestion';
      }, 1500);
    })
    .catch(error => {
      console.error('Error fetching user data:', error);
      setMsgToast('Error obteniendo datos del usuario: ' + error.message);
      setColorToast('danger');
      setShowToast(true);
    });
  }

  function handleGoogleSignIn() {
    // Aquí puedes implementar la lógica para iniciar sesión con Google
    // Por ejemplo, redirigir al usuario a la página de autenticación de Google
    var oauth2Endpoint = 'https://accounts.google.com/o/oauth2/v2/auth';

    var form = document.createElement('form');
    form.setAttribute('method', 'GET');
    form.setAttribute('action', oauth2Endpoint);

    var params = {'client_id': import.meta.env.VITE_APP_GOOGLE_API_KEY,
                  'redirect_uri': 'http://localhost:5173/',
                  'response_type': 'token',
                  'scope': 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile openid',
                  'include_granted_scopes': 'true',
                  'state': 'pass-through value'};

    for (var p in params) {
      var input = document.createElement('input');
      input.setAttribute('type', 'hidden');
      input.setAttribute('name', p);
      input.setAttribute('value', params[p]);
      form.appendChild(input);
    }

    document.body.appendChild(form);
    form.submit();
  }

  getAccessTokenFromUrl(count);

  return (
    <>
      <div className="Login">
        <img src={reactLogo} className="logo" alt="React logo" style={{ width: '100px' }} />
        <h1 style={{ color: 'white' }}>Inicio de sesión</h1>
        <div> 
          <Button variant="primary" className="login-button" onClick={handleGoogleSignIn}>
            Iniciar sesión con Google
          </Button>
        </div>
      </div>
      <ToastContainer
        className="p-3"
        position="top-end"
        style={{ zIndex: 1 }}
      >
        <Toast bg={colorToast} onClose={() => setShowToast(false)} show={showToast} delay={3000} autohide>
            <Toast.Header>
                <img src="holder.js/20x20?text=%20" className="rounded me-2" alt="" />
                <strong className="me-auto">Aviso</strong>
            </Toast.Header>
            <Toast.Body>{msgToast}</Toast.Body>
        </Toast>
      </ToastContainer>
    </>
  )
}

export default Login