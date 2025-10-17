// src/services/apiService.js - VERSIÓN SIMPLIFICADA PARA DEBUG

const API_URL = 'https://sistema-ime.onrender.com/api';

console.log('🔍 API_URL configurada:', API_URL);
console.log('🔍 Environment:', import.meta.env.MODE);
console.log('🔍 PROD:', import.meta.env.PROD);

// Obtener instituciones
export const obtenerInstituciones = async () => {
  const url = `${API_URL}/instituciones`;
  console.log('🔍 Llamando a:', url);
  
  try {
    const response = await fetch(url);
    console.log('✅ Response status:', response.status);
    if (!response.ok) throw new Error('Error al obtener instituciones');
    return await response.json();
  } catch (error) {
    console.error('❌ Error completo:', error);
    throw error;
  }
};

// Agregar estudiante
export const agregarEstudiante = async (institucionId, estudiante) => {
  try {
    const response = await fetch(`${API_URL}/instituciones/${institucionId}/estudiantes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(estudiante)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al agregar estudiante');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};

// Eliminar estudiante
export const eliminarEstudiante = async (institucionId, estudianteId) => {
  try {
    const response = await fetch(`${API_URL}/instituciones/${institucionId}/estudiantes/${estudianteId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) throw new Error('Error al eliminar estudiante');
    return await response.json();
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};

// Obtener firmas
export const obtenerFirmas = async () => {
  const url = `${API_URL}/firmas`;
  console.log('🔍 Llamando a firmas:', url);
  
  try {
    const response = await fetch(url);
    console.log('✅ Firmas response status:', response.status);
    if (!response.ok) throw new Error('Error al obtener firmas');
    return await response.json();
  } catch (error) {
    console.error('❌ Error firmas:', error);
    throw error;
  }
};

// Guardar una firma
export const guardarFirma = async (documento, firma) => {
  try {
    const response = await fetch(`${API_URL}/firmas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documento, firma })
    });
    
    if (!response.ok) throw new Error('Error al guardar firma');
    return await response.json();
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};

// Guardar múltiples firmas
export const guardarFirmasBatch = async (firmas) => {
  try {
    const response = await fetch(`${API_URL}/firmas/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firmas })
    });
    
    if (!response.ok) throw new Error('Error al guardar firmas');
    return await response.json();
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};