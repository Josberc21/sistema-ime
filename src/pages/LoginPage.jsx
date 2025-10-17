// src/pages/LoginPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Eye, EyeOff } from 'lucide-react';

const LoginPage = () => {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  // Credenciales (en producción deberías usar variables de entorno)
  const USUARIO_ADMIN = import.meta.env.VITE_ADMIN_USER || 'admin';
  const PASSWORD_ADMIN = import.meta.env.VITE_ADMIN_PASS || 'ime2024';

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);

    setTimeout(() => {
      if (usuario === USUARIO_ADMIN && password === PASSWORD_ADMIN) {
        // Guardar sesión
        localStorage.setItem('ime_authenticated', 'true');
        localStorage.setItem('ime_user', usuario);
        localStorage.setItem('ime_login_time', new Date().getTime());
        
        navigate('/docente');
      } else {
        setError('Usuario o contraseña incorrectos');
        setPassword('');
      }
      setCargando(false);
    }, 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-purple-700 to-indigo-800">
      <div className="bg-white rounded-3xl shadow-2xl p-12 max-w-md w-full mx-4">
        {/* Logo/Icono */}
        <div className="flex justify-center mb-8">
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 rounded-full shadow-2xl">
            <Lock className="w-16 h-16 text-white" />
          </div>
        </div>

        {/* Título */}
        <h1 className="text-4xl font-bold text-center text-gray-800 mb-2">
          Inicio de Sesión
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Sistema IME - Asistencia Digital
        </p>

        {/* Formulario */}
        <form onSubmit={handleLogin} className="space-y-6">
          {/* Usuario */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Usuario
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                placeholder="Ingresa tu usuario"
                required
                autoComplete="username"
              />
            </div>
          </div>

          {/* Contraseña */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type={mostrarPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-12 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                placeholder="Ingresa tu contraseña"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setMostrarPassword(!mostrarPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {mostrarPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3">
              <p className="text-red-700 text-sm font-semibold text-center">
                ⚠️ {error}
              </p>
            </div>
          )}

          {/* Botón */}
          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
          >
            {cargando ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Verificando...
              </span>
            ) : (
              'Iniciar Sesión'
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            Alcaldía de Medellín - IME Escuelas Técnicas
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Sistema de Control de Asistencia v1.0
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;