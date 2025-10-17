// src/services/storageService.js

const STORAGE_KEY = 'ime_estudiantes_nuevos';

// Obtener estudiantes nuevos del localStorage
export const obtenerEstudiantesNuevos = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Error al leer estudiantes nuevos:', error);
    return {};
  }
};

// Guardar un estudiante nuevo
export const guardarEstudianteNuevo = (institucionId, estudiante) => {
  try {
    const estudiantesNuevos = obtenerEstudiantesNuevos();
    
    if (!estudiantesNuevos[institucionId]) {
      estudiantesNuevos[institucionId] = [];
    }
    
    // Verificar que no exista ya (por documento)
    const existe = estudiantesNuevos[institucionId].find(
      e => e.documento === estudiante.documento
    );
    
    if (!existe) {
      estudiantesNuevos[institucionId].push(estudiante);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(estudiantesNuevos));
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error al guardar estudiante:', error);
    return false;
  }
};

// Eliminar un estudiante nuevo
export const eliminarEstudianteNuevo = (institucionId, estudianteId) => {
  try {
    const estudiantesNuevos = obtenerEstudiantesNuevos();
    
    if (estudiantesNuevos[institucionId]) {
      estudiantesNuevos[institucionId] = estudiantesNuevos[institucionId].filter(
        e => e.id !== estudianteId
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(estudiantesNuevos));
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error al eliminar estudiante:', error);
    return false;
  }
};

// Fusionar estudiantes originales con nuevos
export const fusionarEstudiantes = (institucionId, estudiantesOriginales) => {
  const estudiantesNuevos = obtenerEstudiantesNuevos();
  const nuevos = estudiantesNuevos[institucionId] || [];
  
  return [...estudiantesOriginales, ...nuevos];
};

// Exportar JSON actualizado para descarga
export const exportarInstitucionesActualizadas = (institucionesOriginales) => {
  const estudiantesNuevos = obtenerEstudiantesNuevos();
  
  const institucionesActualizadas = institucionesOriginales.map(inst => {
    const nuevos = estudiantesNuevos[inst.id] || [];
    return {
      ...inst,
      estudiantes: [...inst.estudiantes, ...nuevos]
    };
  });
  
  return {
    instituciones: institucionesActualizadas
  };
};

// Limpiar estudiantes nuevos de una institución
export const limpiarEstudiantesNuevos = (institucionId) => {
  try {
    const estudiantesNuevos = obtenerEstudiantesNuevos();
    delete estudiantesNuevos[institucionId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(estudiantesNuevos));
    return true;
  } catch (error) {
    console.error('Error al limpiar estudiantes:', error);
    return false;
  }
};