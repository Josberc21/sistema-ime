import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import DocentePage from './pages/DocentePage';
import ExtractorFirmasVisual from './pages/ExtractorFirmasVisual';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/docente" 
          element={
            <ProtectedRoute>
              <DocentePage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/extraer-firmas" 
          element={
            <ProtectedRoute>
              <ExtractorFirmasVisual />
            </ProtectedRoute>
          } 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;