import { useNavigate } from 'react-router-dom';
import { BookOpen, LogIn, Scissors } from 'lucide-react';

const HomePage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-purple-700 to-indigo-800">
      <div className="bg-white rounded-3xl shadow-2xl p-12 max-w-2xl w-full mx-4">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-8 rounded-full shadow-2xl">
              <BookOpen className="w-24 h-24 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold text-gray-800 mb-4">
            Sistema de Asistencia Digital
          </h1>
          <p className="text-gray-600 text-xl mb-2">
            IME - Escuelas Técnicas
          </p>
          <p className="text-gray-500">
            Convenio de Asociación Robótica Educación Complementaria
          </p>
        </div>

        {/* Botón principal */}
        <button
          onClick={() => navigate('/docente')}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-2xl p-8 transition-all transform hover:scale-105 shadow-xl hover:shadow-2xl mb-4"
        >
          <LogIn className="w-20 h-20 mx-auto mb-4" />
          <h2 className="text-4xl font-bold mb-3">Acceso Docente</h2>
          <p className="text-purple-100 text-lg">
            Gestionar asistencias y generar planillas
          </p>
        </button>

        {/* Botón extractor (para personal interno) */}
        <button
          onClick={() => navigate('/extraer-firmas')}
          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-2xl p-6 transition-all transform hover:scale-105 shadow-xl hover:shadow-2xl"
        >
          <Scissors className="w-12 h-12 mx-auto mb-3" />
          <h2 className="text-2xl font-bold mb-2">Extractor de Firmas</h2>
          <p className="text-green-100 text-sm">
            🔒 Herramienta interna - Gestión de firmas
          </p>
        </button>
        <button
          onClick={() => {
            localStorage.removeItem('ime_authenticated');
            localStorage.removeItem('ime_user');
            localStorage.removeItem('ime_login_time');
            window.location.href = '/login';
          }}
          className="mt-6 w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-semibold transition-all"
        >
          🚪 Cerrar Sesión
        </button>

        {/* Footer */}
        <div className="mt-10 text-center text-gray-500 text-sm">
          <p>Alcaldía de Medellín - IME Escuelas Técnicas</p>
          <p className="mt-1">Sistema simplificado de control de asistencia</p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;