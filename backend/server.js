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

// ========== CONFIGURACIÓN DE CORS ==========
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  /\.vercel\.app$/, // Permite cualquier subdominio de vercel.app
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') return allowed === origin;
      if (allowed instanceof RegExp) return allowed.test(origin);
      return false;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('⚠️ Origen bloqueado por CORS:', origin);
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// ========== RUTAS DE ARCHIVOS JSON ==========
const INSTITUCIONES_PATH = path.join(__dirname, 'data', 'instituciones.json');
const FIRMAS_PATH = path.join(__dirname, 'data', 'firmas.json');
const ASISTENCIAS_PATH = path.join(__dirname, 'data', 'asistencias.json');

// ========== INICIALIZACIÓN DE ARCHIVOS ==========
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('✅ Carpeta data creada');
}

// Crear instituciones.json inicial si no existe
if (!fs.existsSync(INSTITUCIONES_PATH)) {
  const institucionesIniciales = { instituciones: [] };
  fs.writeFileSync(INSTITUCIONES_PATH, JSON.stringify(institucionesIniciales, null, 2));
  console.log('✅ Creado instituciones.json inicial');
}

// Crear firmas.json inicial si no existe
if (!fs.existsSync(FIRMAS_PATH)) {
  const firmasIniciales = { firmas: {} };
  fs.writeFileSync(FIRMAS_PATH, JSON.stringify(firmasIniciales, null, 2));
  console.log('✅ Creado firmas.json inicial');
}

// Crear asistencias.json inicial si no existe
if (!fs.existsSync(ASISTENCIAS_PATH)) {
  const asistenciasIniciales = { asistencias: {} };
  fs.writeFileSync(ASISTENCIAS_PATH, JSON.stringify(asistenciasIniciales, null, 2));
  console.log('✅ Creado asistencias.json inicial');
}

// ========== FUNCIONES DE FECHA/HORA COLOMBIA ==========
const obtenerFechaHoraColombia = () => {
  const ahora = new Date();
  const opciones = { timeZone: 'America/Bogota' };
  
  const fechaISO = ahora.toLocaleString('sv-SE', opciones).split(' ')[0];
  const hora = ahora.toLocaleTimeString('es-CO', { 
    ...opciones, 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });
  const fechaLegible = ahora.toLocaleDateString('es-CO', opciones);
  
  return {
    fechaISO,
    hora,
    fechaLegible,
    timestamp: ahora.toLocaleString('es-CO', opciones)
  };
};

// ========== FUNCIONES AUXILIARES ==========
const leerJSON = (rutaArchivo) => {
  try {
    if (!fs.existsSync(rutaArchivo)) return null;
    const data = fs.readFileSync(rutaArchivo, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`❌ Error al leer ${rutaArchivo}:`, error.message);
    return null;
  }
};

const escribirJSON = (rutaArchivo, data) => {
  try {
    fs.writeFileSync(rutaArchivo, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`❌ Error al escribir ${rutaArchivo}:`, error.message);
    return false;
  }
};

// ========== ENDPOINTS DE INSTITUCIONES ==========

// Obtener todas las instituciones
app.get('/api/instituciones', (req, res) => {
  const instituciones = leerJSON(INSTITUCIONES_PATH);
  if (instituciones) {
    res.json(instituciones);
  } else {
    res.status(500).json({ error: 'Error al leer instituciones' });
  }
});

// Agregar estudiante a una institución
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

  const existe = institucion.estudiantes.find(e => e.documento === nuevoEstudiante.documento);
  if (existe) {
    return res.status(400).json({ error: 'Estudiante ya existe' });
  }

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

// Eliminar estudiante de una institución
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

// ========== ENDPOINTS DE FIRMAS ==========

// Obtener todas las firmas
app.get('/api/firmas', (req, res) => {
  const firmas = leerJSON(FIRMAS_PATH);
  if (firmas) {
    res.json(firmas);
  } else {
    res.status(500).json({ error: 'Error al leer firmas' });
  }
});

// Guardar firma individual
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

// Guardar múltiples firmas (REPLACE COMPLETO)
app.post('/api/firmas/batch', (req, res) => {
  const { firmas } = req.body;

  if (!firmas || typeof firmas !== 'object') {
    return res.status(400).json({ error: 'Formato de firmas inválido' });
  }

  const data = leerJSON(FIRMAS_PATH);
  if (!data) {
    return res.status(500).json({ error: 'Error al leer firmas' });
  }

  // REPLACE COMPLETO - Sobrescribe todas las firmas
  data.firmas = firmas;

  if (escribirJSON(FIRMAS_PATH, data)) {
    console.log(`✅ Firmas guardadas: ${Object.keys(firmas).length} total`);
    res.json({ 
      success: true, 
      message: 'Firmas guardadas', 
      total: Object.keys(data.firmas).length 
    });
  } else {
    res.status(500).json({ error: 'Error al guardar firmas' });
  }
});

// ========== ENDPOINTS DE ASISTENCIAS ==========

// Guardar asistencia
app.post('/api/asistencias', (req, res) => {
  const { documento, institucionId, presente, observaciones } = req.body;
  
  if (!documento || !institucionId) {
    return res.status(400).json({ error: 'Documento e institución son requeridos' });
  }

  const { fechaISO, hora } = obtenerFechaHoraColombia();

  let data = leerJSON(ASISTENCIAS_PATH);
  if (!data) {
    data = { asistencias: {} };
  }

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

// Obtener asistencias del día actual
app.get('/api/asistencias/:institucionId', (req, res) => {
  const { institucionId } = req.params;
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

// Obtener asistencias de una fecha específica
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

// Obtener historial completo de asistencias
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

// ========== ENDPOINTS DE UTILIDAD ==========

// Endpoint raíz con información del servidor
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
      'GET /api/asistencias/historial/:institucionId'
    ]
  });
});

// Verificar fecha/hora actual
app.get('/api/fecha-actual', (req, res) => {
  const fechaHora = obtenerFechaHoraColombia();
  res.json({
    ...fechaHora,
    zonaHoraria: 'America/Bogota (UTC-5)',
    mensaje: 'Fecha y hora actual de Colombia'
  });
});

// ========== INICIAR SERVIDOR ==========
app.listen(PORT, () => {
  const { fechaISO, hora } = obtenerFechaHoraColombia();
  console.log('='.repeat(50));
  console.log('🚀 Backend IME iniciado correctamente');
  console.log('='.repeat(50));
  console.log(`📡 Puerto: ${PORT}`);
  console.log(`🕐 Zona horaria: America/Bogota`);
  console.log(`📅 Fecha y hora: ${fechaISO} ${hora}`);
  console.log('-'.repeat(50));
  console.log('📁 Archivos de datos:');
  
  [
    { nombre: 'Instituciones', path: INSTITUCIONES_PATH },
    { nombre: 'Firmas', path: FIRMAS_PATH },
    { nombre: 'Asistencias', path: ASISTENCIAS_PATH }
  ].forEach(({ nombre, path }) => {
    const existe = fs.existsSync(path);
    console.log(`${existe ? '✅' : '❌'} ${nombre}: ${existe ? 'OK' : 'NO EXISTE'}`);
  });
  
  console.log('='.repeat(50));
});