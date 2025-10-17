// src/components/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('ime_authenticated') === 'true';
  const loginTime = localStorage.getItem('ime_login_time');
  
  // Verificar si la sesión expiró (24 horas)
  if (isAuthenticated && loginTime) {
    const horasTranscurridas = (new Date().getTime() - parseInt(loginTime)) / (1000 * 60 * 60);
    
    if (horasTranscurridas > 24) {
      // Sesión expirada
      localStorage.removeItem('ime_authenticated');
      localStorage.removeItem('ime_user');
      localStorage.removeItem('ime_login_time');
      return <Navigate to="/login" replace />;
    }
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;