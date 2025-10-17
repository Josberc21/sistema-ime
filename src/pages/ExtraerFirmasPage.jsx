import { useState } from 'react';
import { Upload, Scissors, Save, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ExtraerFirmasPage = () => {
  const navigate = useNavigate();
  const [imagenCargada, setImagenCargada] = useState(null);
  const [coordenadas, setCoordenadas] = useState({ x: 0, y: 0, width: 200, height: 80 });
  const [firmasExtraidas, setFirmasExtraidas] = useState([]);
  const [documentoActual, setDocumentoActual] = useState('');

  const cargarImagen = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImagenCargada(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const extraerFirma = () => {
    if (!imagenCargada || !documentoActual) {
      alert('Carga una imagen y especifica el documento del estudiante');
      return;
    }

    const canvas = document.createElement('canvas');
    const img = new Image();
    img.src = imagenCargada;
    
    img.onload = () => {
      canvas.width = coordenadas.width;
      canvas.height = coordenadas.height;
      const ctx = canvas.getContext('2d');
      
      // Extraer la región de la firma
      ctx.drawImage(
        img,
        coordenadas.x, coordenadas.y, // posición origen
        coordenadas.width, coordenadas.height, // tamaño origen
        0, 0, // posición destino
        coordenadas.width, coordenadas.height // tamaño destino
      );
      
      const firmaBase64 = canvas.toDataURL('image/png');
      
      setFirmasExtraidas([
        ...firmasExtraidas,
        {
          documento: documentoActual,
          firma: firmaBase64,
          timestamp: new Date().toISOString()
        }
      ]);
      
      setDocumentoActual('');
      alert('¡Firma extraída! Continúa con la siguiente o guarda.');
    };
  };

  const guardarFirmas = () => {
    // Convertir a formato para firmas.json
    const firmasObj = {};
    firmasExtraidas.forEach(f => {
      firmasObj[f.documento] = f.firma;
    });
    
    const json = JSON.stringify({ firmas: firmasObj }, null, 2);
    
    // Descargar como archivo
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'firmas.json';
    a.click();
    
    alert(`Se guardaron ${firmasExtraidas.length} firmas. Reemplaza el archivo src/data/firmas.json`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <button
            onClick={() => navigate('/docente')}
            className="flex items-center text-gray-600 hover:text-gray-800 mb-6"
          >
            <ArrowLeft className="mr-2" size={20} />
            Volver
          </button>

          <h1 className="text-3xl font-bold mb-6">✂️ Extractor de Firmas</h1>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Panel izquierdo: Cargar imagen */}
            <div>
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  1️⃣ Cargar planilla escaneada
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={cargarImagen}
                  className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-purple-500"
                />
              </div>

              {imagenCargada && (
                <div className="border-2 border-gray-300 rounded-lg p-4 overflow-auto max-h-96">
                  <img src={imagenCargada} alt="Planilla" className="w-full" />
                </div>
              )}
            </div>

            {/* Panel derecho: Extraer */}
            <div>
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  2️⃣ Documento del estudiante
                </label>
                <input
                  type="text"
                  value={documentoActual}
                  onChange={(e) => setDocumentoActual(e.target.value)}
                  placeholder="Ej: 1032026682"
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  3️⃣ Coordenadas de la firma
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    placeholder="X"
                    value={coordenadas.x}
                    onChange={(e) => setCoordenadas({...coordenadas, x: parseInt(e.target.value)})}
                    className="px-3 py-2 border border-gray-300 rounded"
                  />
                  <input
                    type="number"
                    placeholder="Y"
                    value={coordenadas.y}
                    onChange={(e) => setCoordenadas({...coordenadas, y: parseInt(e.target.value)})}
                    className="px-3 py-2 border border-gray-300 rounded"
                  />
                  <input
                    type="number"
                    placeholder="Ancho"
                    value={coordenadas.width}
                    onChange={(e) => setCoordenadas({...coordenadas, width: parseInt(e.target.value)})}
                    className="px-3 py-2 border border-gray-300 rounded"
                  />
                  <input
                    type="number"
                    placeholder="Alto"
                    value={coordenadas.height}
                    onChange={(e) => setCoordenadas({...coordenadas, height: parseInt(e.target.value)})}
                    className="px-3 py-2 border border-gray-300 rounded"
                  />
                </div>
              </div>

              <button
                onClick={extraerFirma}
                className="w-full mb-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold flex items-center justify-center gap-2"
              >
                <Scissors size={20} />
                Extraer Firma
              </button>

              {/* Lista de firmas extraídas */}
              <div className="mb-4">
                <h3 className="font-semibold text-gray-700 mb-2">
                  Firmas extraídas ({firmasExtraidas.length})
                </h3>
                <div className="space-y-2 max-h-60 overflow-auto">
                  {firmasExtraidas.map((f, index) => (
                    <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                      <img src={f.firma} alt="Firma" className="w-20 h-10 object-contain border" />
                      <span className="text-sm font-mono">{f.documento}</span>
                    </div>
                  ))}
                </div>
              </div>

              {firmasExtraidas.length > 0 && (
                <button
                  onClick={guardarFirmas}
                  className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold flex items-center justify-center gap-2"
                >
                  <Save size={20} />
                  Guardar todas ({firmasExtraidas.length})
                </button>
              )}
            </div>
          </div>

          {/* Instrucciones */}
          <div className="mt-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-bold text-blue-900 mb-2">📋 Instrucciones:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
              <li>Sube una planilla escaneada con firmas</li>
              <li>Ingresa el documento del estudiante cuya firma vas a extraer</li>
              <li>Ajusta las coordenadas para seleccionar la región de la firma</li>
              <li>Haz clic en "Extraer Firma"</li>
              <li>Repite para cada estudiante</li>
              <li>Al final, descarga el archivo firmas.json y reemplázalo en src/data/</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExtraerFirmasPage;