// backend/server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

// ========== CONFIGURAR ZONA HORARIA DE COLOMBIA ==========
process.env.TZ = 'America/Bogota';

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
// Configuración de CORS para producción
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://tu-app-frontend.vercel.app', // Cambiarás esto con la URL real de Vercel
  /\.vercel\.app$/, // Permite cualquier subdominio de vercel.app
];

app.use(cors({
  origin: function(origin, callback) {
    // Permitir requests sin origin (mobile apps, curl, postman, etc)
    if (!origin) return callback(null, true);
    
    // Verificar si el origin está en la lista permitida
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') return allowed === origin;
      if (allowed instanceof RegExp) return allowed.test(origin);
      return false;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('❌ Origen bloqueado por CORS:', origin);
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Rutas de los archivos JSON
const INSTITUCIONES_PATH = path.join(__dirname, '..', 'frontend', 'src', 'data', 'instituciones.json');
const FIRMAS_PATH = path.join(__dirname, '..', 'frontend', 'src', 'data', 'firmas.json');
const ASISTENCIAS_PATH = path.join(__dirname, 'data', 'asistencias.json');

// Crear carpeta data si no existe
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// ========== FUNCIONES DE FECHA/HORA COLOMBIA ==========
const obtenerFechaHoraColombia = () => {
  const ahora = new Date();
  const opciones = { timeZone: 'America/Bogota' };
  
  // Formato YYYY-MM-DD
  const fechaISO = ahora.toLocaleString('sv-SE', opciones).split(' ')[0];
  
  // Formato HH:MM (24 horas)
  const hora = ahora.toLocaleTimeString('es-CO', { 
    ...opciones, 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });
  
  // Formato legible DD/MM/YYYY
  const fechaLegible = ahora.toLocaleDateString('es-CO', opciones);
  
  return {
    fechaISO,        // "2025-10-16"
    hora,            // "14:30"
    fechaLegible,    // "16/10/2025"
    timestamp: ahora.toLocaleString('es-CO', opciones)
  };
};

// Función auxiliar para leer JSON
const leerJSON = (rutaArchivo) => {
  try {
    if (!fs.existsSync(rutaArchivo)) {
      return null;
    }
    const data = fs.readFileSync(rutaArchivo, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error al leer ${rutaArchivo}:`, error);
    return null;
  }
};

// Función auxiliar para escribir JSON
const escribirJSON = (rutaArchivo, data) => {
  try {
    fs.writeFileSync(rutaArchivo, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`Error al escribir ${rutaArchivo}:`, error);
    return false;
  }
};

// ========== ENDPOINTS EXISTENTES ==========

// 1. Obtener todas las instituciones
app.get('/api/instituciones', (req, res) => {
  const instituciones = leerJSON(INSTITUCIONES_PATH);
  if (instituciones) {
    res.json(instituciones);
  } else {
    res.status(500).json({ error: 'Error al leer instituciones' });
  }
});

// 2. Agregar estudiante a una institución
app.post('/api/instituciones/:id/estudiantes', (req, res) => {
  const { id } = req.params;
  const nuevoEstudiante = req.body;

  const data = leerJSON(INSTITUCIONES_PATH);
  if (!data) {
    return res.status(500).json({ error: 'Error al leer instituciones' });
  }

  const institucion = data.instituciones.find(inst => inst.id === id);
  if (!institucion) {
    return res.status(404).json({ error: 'Institución no encontrada' });
  }

  // Verificar duplicados
  const existe = institucion.estudiantes.find(
    e => e.documento === nuevoEstudiante.documento
  );
  if (existe) {
    return res.status(400).json({ error: 'Estudiante ya existe' });
  }

  // Generar nuevo ID
  const nuevoId = Math.max(...institucion.estudiantes.map(e => e.id), 0) + 1;
  const estudianteCompleto = {
    ...nuevoEstudiante,
    id: nuevoId,
    firma: null
  };

  institucion.estudiantes.push(estudianteCompleto);

  if (escribirJSON(INSTITUCIONES_PATH, data)) {
    res.json({ success: true, estudiante: estudianteCompleto });
  } else {
    res.status(500).json({ error: 'Error al guardar estudiante' });
  }
});

// 3. Eliminar estudiante de una institución
app.delete('/api/instituciones/:id/estudiantes/:estudianteId', (req, res) => {
  const { id, estudianteId } = req.params;

  const data = leerJSON(INSTITUCIONES_PATH);
  if (!data) {
    return res.status(500).json({ error: 'Error al leer instituciones' });
  }

  const institucion = data.instituciones.find(inst => inst.id === id);
  if (!institucion) {
    return res.status(404).json({ error: 'Institución no encontrada' });
  }

  const indexEstudiante = institucion.estudiantes.findIndex(
    e => e.id === parseInt(estudianteId)
  );

  if (indexEstudiante === -1) {
    return res.status(404).json({ error: 'Estudiante no encontrado' });
  }

  institucion.estudiantes.splice(indexEstudiante, 1);

  if (escribirJSON(INSTITUCIONES_PATH, data)) {
    res.json({ success: true, message: 'Estudiante eliminado' });
  } else {
    res.status(500).json({ error: 'Error al eliminar estudiante' });
  }
});

// 4. Obtener todas las firmas
app.get('/api/firmas', (req, res) => {
  const firmas = leerJSON(FIRMAS_PATH);
  if (firmas) {
    res.json(firmas);
  } else {
    res.status(500).json({ error: 'Error al leer firmas' });
  }
});

// 5. Guardar firma de un estudiante
app.post('/api/firmas', (req, res) => {
  const { documento, firma } = req.body;

  if (!documento || !firma) {
    return res.status(400).json({ error: 'Documento y firma son requeridos' });
  }

  const data = leerJSON(FIRMAS_PATH);
  if (!data) {
    return res.status(500).json({ error: 'Error al leer firmas' });
  }

  data.firmas[documento] = firma;

  if (escribirJSON(FIRMAS_PATH, data)) {
    res.json({ success: true, message: 'Firma guardada' });
  } else {
    res.status(500).json({ error: 'Error al guardar firma' });
  }
});

// 6. Guardar múltiples firmas (REPLACE COMPLETO)
app.post('/api/firmas/batch', (req, res) => {
  const { firmas } = req.body;

  if (!firmas || typeof firmas !== 'object') {
    return res.status(400).json({ error: 'Formato de firmas inválido' });
  }

  const data = leerJSON(FIRMAS_PATH);
  if (!data) {
    return res.status(500).json({ error: 'Error al leer firmas' });
  }

  // REPLACE COMPLETO - Sobrescribir todas las firmas
  data.firmas = firmas;

  if (escribirJSON(FIRMAS_PATH, data)) {
    console.log('✅ Firmas guardadas (REPLACE completo):', Object.keys(firmas).length);
    res.json({ 
      success: true, 
      message: 'Firmas guardadas', 
      total: Object.keys(data.firmas).length 
    });
  } else {
    res.status(500).json({ error: 'Error al guardar firmas' });
  }
});

// ========== NUEVOS ENDPOINTS PARA ASISTENCIAS ==========

// 7. Guardar asistencia
app.post('/api/asistencias', (req, res) => {
  const { documento, institucionId, presente, observaciones } = req.body;
  
  if (!documento || !institucionId) {
    return res.status(400).json({ error: 'Documento e institución son requeridos' });
  }

  // Obtener fecha y hora de Colombia
  const { fechaISO, hora } = obtenerFechaHoraColombia();

  // Leer archivo de asistencias
  let data = leerJSON(ASISTENCIAS_PATH);
  if (!data) {
    data = { asistencias: {} };
  }

  // Estructura: asistencias[institucionId][fecha][documento]
  if (!data.asistencias[institucionId]) {
    data.asistencias[institucionId] = {};
  }

  if (!data.asistencias[institucionId][fechaISO]) {
    data.asistencias[institucionId][fechaISO] = {};
  }

  data.asistencias[institucionId][fechaISO][documento] = {
    presente: presente !== undefined ? presente : true,
    hora,
    observaciones: observaciones || '',
    registradoEn: new Date().toISOString()
  };

  if (escribirJSON(ASISTENCIAS_PATH, data)) {
    res.json({ 
      success: true, 
      message: 'Asistencia guardada',
      fecha: fechaISO,
      hora
    });
  } else {
    res.status(500).json({ error: 'Error al guardar asistencia' });
  }
});

// 8. Obtener asistencias de una institución en una fecha
// 8. Obtener asistencias de una institución en la fecha actual
app.get('/api/asistencias/:institucionId', (req, res) => {
  const { institucionId } = req.params;
  
  // Usar fecha actual de Colombia
  const { fechaISO } = obtenerFechaHoraColombia();

  const data = leerJSON(ASISTENCIAS_PATH);
  if (!data || !data.asistencias) {
    return res.json({ asistencias: {}, fecha: fechaISO });
  }

  const asistenciasInstitucion = data.asistencias[institucionId];
  if (!asistenciasInstitucion) {
    return res.json({ asistencias: {}, fecha: fechaISO });
  }

  const asistenciasFecha = asistenciasInstitucion[fechaISO] || {};
  
  res.json({ 
    asistencias: asistenciasFecha,
    fecha: fechaISO
  });
});

// 8b. Obtener asistencias de una institución en una fecha específica
app.get('/api/asistencias/:institucionId/:fecha', (req, res) => {
  const { institucionId, fecha } = req.params;

  const data = leerJSON(ASISTENCIAS_PATH);
  if (!data || !data.asistencias) {
    return res.json({ asistencias: {}, fecha });
  }

  const asistenciasInstitucion = data.asistencias[institucionId];
  if (!asistenciasInstitucion) {
    return res.json({ asistencias: {}, fecha });
  }

  const asistenciasFecha = asistenciasInstitucion[fecha] || {};
  
  res.json({ 
    asistencias: asistenciasFecha,
    fecha
  });
});

// 9. Obtener historial de asistencias de una institución
app.get('/api/asistencias/historial/:institucionId', (req, res) => {
  const { institucionId } = req.params;

  const data = leerJSON(ASISTENCIAS_PATH);
  if (!data || !data.asistencias) {
    return res.json({ historial: {} });
  }

  const historial = data.asistencias[institucionId] || {};
  
  res.json({ 
    historial,
    totalDias: Object.keys(historial).length
  });
});

// 10. Endpoint de prueba para verificar fecha/hora
app.get('/api/fecha-actual', (req, res) => {
  const fechaHora = obtenerFechaHoraColombia();
  res.json({
    ...fechaHora,
    zonaHoraria: 'America/Bogota (UTC-5)',
    mensaje: 'Fecha y hora actual de Colombia'
  });
});

// Ruta de prueba
app.get('/', (req, res) => {
  const { fechaISO, hora } = obtenerFechaHoraColombia();
  res.json({ 
    message: 'Backend IME funcionando correctamente ✅',
    fechaActual: fechaISO,
    horaActual: hora,
    zonaHoraria: 'America/Bogota',
    endpoints: [
      'GET /api/instituciones',
      'POST /api/instituciones/:id/estudiantes',
      'DELETE /api/instituciones/:id/estudiantes/:estudianteId',
      'GET /api/firmas',
      'POST /api/firmas',
      'POST /api/firmas/batch',
      'POST /api/asistencias',
      'GET /api/asistencias/:institucionId',
      'GET /api/asistencias/:institucionId/:fecha',
      'GET /api/asistencias/historial/:institucionId',
      'GET /api/fecha-actual'
    ]
  });
});

console.log('Verificando archivos JSON...');
const rutas = [INSTITUCIONES_PATH, FIRMAS_PATH];
rutas.forEach(ruta => {
  console.log('→ Revisando:', ruta);
  if (!fs.existsSync(ruta)) {
    console.error('⚠️  No existe:', ruta);
  } else {
    console.log('✅ Existe:', ruta);
    try {
      const contenido = fs.readFileSync(ruta, 'utf8');
      console.log('   Contenido:', contenido.slice(0, 100) || '(vacío)');
    } catch (err) {
      console.error('   ❌ Error al leer:', err.message);
    }
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  const { fechaISO, hora } = obtenerFechaHoraColombia();
  console.log(`🚀 Backend corriendo en http://localhost:${PORT}`);
  console.log(`🕐 Zona horaria: America/Bogota (Colombia)`);
  console.log(`📅 Fecha actual: ${fechaISO} ${hora}`);
  console.log(`📂 Instituciones: ${INSTITUCIONES_PATH}`);
  console.log(`🖊️  Firmas: ${FIRMAS_PATH}`);
  console.log(`📋 Asistencias: ${ASISTENCIAS_PATH}`);
});