// src/utils/firmaGenerator.js

// Genera una firma temporal estilo handwriting a partir del nombre
export const generarFirmaTemp = (primerNombre, primerApellido) => {
  const canvas = document.createElement('canvas');
  canvas.width = 250;
  canvas.height = 80;
  const ctx = canvas.getContext('2d');
  
  // SIN FONDO (transparente)
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Estilo handwriting en NEGRO
  ctx.font = "italic bold 28px 'Brush Script MT', 'Segoe Script', cursive";
  ctx.fillStyle = '#000000'; // Negro puro
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Texto de la firma (solo nombre y apellido)
  const textoFirma = `${primerNombre} ${primerApellido}`;
  ctx.fillText(textoFirma, canvas.width / 2, canvas.height / 2);
  
  // SIN línea decorativa (eliminada)
  
  return canvas.toDataURL('image/png');
};

// Verifica si un estudiante tiene firma real cargada
export const tieneFirmaReal = (documento, firmasReales = {}) => {
  return firmasReales[documento] !== undefined && firmasReales[documento] !== null;
};

// Obtiene la firma (real o temporal)
export const obtenerFirma = (estudiante, firmasReales = {}) => {
  // Si tiene firma real, usarla
  if (tieneFirmaReal(estudiante.documento, firmasReales)) {
    return firmasReales[estudiante.documento];
  }
  
  // Si no, generar temporal
  return generarFirmaTemp(estudiante.primerNombre, estudiante.primerApellido);
};