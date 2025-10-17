import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import DocentePage from './pages/DocentePage';
import ExtractorFirmasVisual from './pages/ExtractorFirmasVisual';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/docente" element={<DocentePage />} />
        <Route path="/extraer-firmas" element={<ExtractorFirmasVisual />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;