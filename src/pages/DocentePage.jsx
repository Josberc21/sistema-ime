import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Users, Calendar, FileText, CheckCircle, Plus, X, Trash2, RefreshCw } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { obtenerInstituciones, agregarEstudiante as agregarEstudianteAPI, eliminarEstudiante as eliminarEstudianteAPI, obtenerFirmas } from '../services/apiService';
import { obtenerFirma, tieneFirmaReal } from '../utils/firmaGenerator';
import logoAlcaldia from '../images/Alcaldia.png';
import logoIme from '../images/Ime.png';

const DocentePage = () => {
  const navigate = useNavigate();
  const [instituciones, setInstituciones] = useState([]);
  const [firmasData, setFirmasData] = useState({ firmas: {} });
  const [cargando, setCargando] = useState(true);
  const [institucionSeleccionada, setInstitucionSeleccionada] = useState(null);
  const [estudiantesActuales, setEstudiantesActuales] = useState([]);
 const [fechaSesion, setFechaSesion] = useState(
  new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Bogota' })
);
  const [numeroSesion, setNumeroSesion] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [asistencia, setAsistencia] = useState({});
  const [mostrarFormNuevo, setMostrarFormNuevo] = useState(false);
  const [nuevoEstudiante, setNuevoEstudiante] = useState({
    primerApellido: '',
    segundoApellido: '',
    primerNombre: '',
    segundoNombre: '',
    documento: ''
  });

  // Cargar datos iniciales del backend
  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setCargando(true);
      const [dataInstituciones, dataFirmas] = await Promise.all([
        obtenerInstituciones(),
        obtenerFirmas()
      ]);
      setInstituciones(dataInstituciones.instituciones);
      setFirmasData(dataFirmas);
    } catch (error) {
      console.error('Error al cargar datos:', error);
     alert('⚠️ Error al conectar con el servidor. Verifica tu conexión.');
    } finally {
      setCargando(false);
    }
  };

  const seleccionarInstitucion = (institucion) => {
    setInstitucionSeleccionada(institucion);
    setEstudiantesActuales([...institucion.estudiantes]);
    setAsistencia({});
  };

  const toggleAsistencia = (estudianteId) => {
    setAsistencia(prev => ({
      ...prev,
      [estudianteId]: !prev[estudianteId]
    }));
  };

  const agregarNuevoEstudiante = async () => {
    if (!nuevoEstudiante.primerNombre || !nuevoEstudiante.primerApellido || !nuevoEstudiante.documento) {
      alert('Por favor completa al menos: Primer Nombre, Primer Apellido y Documento');
      return;
    }

    // Verificar duplicados localmente
    const existe = estudiantesActuales.find(e => e.documento === nuevoEstudiante.documento);
    if (existe) {
      alert('⚠️ Ya existe un estudiante con ese número de documento');
      return;
    }

    try {
      const resultado = await agregarEstudianteAPI(institucionSeleccionada.id, nuevoEstudiante);
      
      if (resultado.success) {
        // Actualizar estado local
        setEstudiantesActuales([...estudiantesActuales, resultado.estudiante]);
        setAsistencia({ ...asistencia, [resultado.estudiante.id]: true });
        
        // Actualizar instituciones
        const instActualizada = instituciones.map(inst => {
          if (inst.id === institucionSeleccionada.id) {
            return {
              ...inst,
              estudiantes: [...inst.estudiantes, resultado.estudiante]
            };
          }
          return inst;
        });
        setInstituciones(instActualizada);
        
        // Limpiar formulario
        setNuevoEstudiante({
          primerApellido: '',
          segundoApellido: '',
          primerNombre: '',
          segundoNombre: '',
          documento: ''
        });
        setMostrarFormNuevo(false);
        alert('✅ Estudiante agregado y guardado permanentemente');
      }
    } catch (error) {
      alert(`⚠️ Error: ${error.message}`);
    }
  };

  const eliminarEstudianteHandler = async (estudianteId, nombreCompleto) => {
    const confirmacion = window.confirm(
      `¿Estás seguro de eliminar a:\n\n${nombreCompleto}?\n\nEsta acción es permanente.`
    );
    
    if (confirmacion) {
      try {
        await eliminarEstudianteAPI(institucionSeleccionada.id, estudianteId);
        
        // Actualizar estado local
        setEstudiantesActuales(estudiantesActuales.filter(e => e.id !== estudianteId));
        
        // Actualizar instituciones
        const instActualizada = instituciones.map(inst => {
          if (inst.id === institucionSeleccionada.id) {
            return {
              ...inst,
              estudiantes: inst.estudiantes.filter(e => e.id !== estudianteId)
            };
          }
          return inst;
        });
        setInstituciones(instActualizada);
        
        // Eliminar de asistencia
        const nuevaAsistencia = { ...asistencia };
        delete nuevaAsistencia[estudianteId];
        setAsistencia(nuevaAsistencia);
        
        alert('✅ Estudiante eliminado permanentemente');
      } catch (error) {
        alert(`⚠️ Error al eliminar: ${error.message}`);
      }
    }
  };

  const generarPDF = () => {
    if (!institucionSeleccionada) return;

    const doc = new jsPDF('landscape', 'mm', 'a4');
    const institucion = institucionSeleccionada;

    // ENCABEZADO CON RECUADROS GRISES
    const topHeaderHeight = 18;
    const marginX = 10;
    const logoLeftWidth = 45;
    const logoRightWidth = 50;
    const titleWidth = 277 - logoLeftWidth - logoRightWidth;

    doc.setFillColor(220, 220, 220);
    doc.rect(marginX, 5, logoLeftWidth, topHeaderHeight, 'FD');
    doc.rect(marginX + logoLeftWidth, 5, titleWidth, topHeaderHeight, 'FD');
    doc.rect(marginX + logoLeftWidth + titleWidth, 5, logoRightWidth, topHeaderHeight, 'FD');

    try {
      doc.addImage(logoAlcaldia, 'PNG', 17, 8, 25, 12);
    } catch (error) {
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text('Alcaldía de', 22, 13);
      doc.text('Medellín', 22, 17);
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('CONVENIO DE ASOCIACIÓN ROBOTICA EDUCACIÓN COMPLEMENTARIA', 148.5, 12, { align: 'center' });
    try {
      doc.addImage(logoIme, 'PNG', 260, 8, 25, 12);
    } catch (error) {
      doc.setFontSize(9);
      doc.text('IME', 262, 10);
      doc.setFontSize(7);
      doc.text('ESCUELAS', 256, 14);
      doc.text('TÉCNICAS', 256, 17);
    }

    // Tabla de información institucional
    const infoStartY = 24;
    const rowHeight = 6;
    const col1LabelWidth = 78;
    const col1ValueWidth = 112;
    const col2LabelWidth = 47;
    const col2ValueWidth = 40;
    const startX = 10;
    const col2StartX = 200;

    // Filas de información
    const filas = [
      {
        izq: { label: 'INSTITUCIÓN EDUCATIVA:', value: institucion.nombre },
        der: { label: 'COMUNA:', value: institucion.comuna || '' }
      },
      {
        izq: { label: 'FORMADOR IME:', value: institucion.formador },
        der: { label: 'DOCENTE ENLACE INSTITUCIÓN:', value: institucion.docente || '' }
      },
      {
        izq: { label: 'HORARIO DE CLASE (DÍA Y HORA):', value: institucion.horario },
        der: { label: 'NÚMERO DE SESIÓN:', value: numeroSesion || '' }
      },
      {
        izq: { label: 'OBSERVACIONES:', value: observaciones || '' },
        der: { label: 'FECHA DE LA SESIÓN:', value: fechaSesion }
      }
    ];

    filas.forEach((fila, index) => {
      const y = infoStartY + (rowHeight * index);
      
      doc.setFillColor(220, 220, 220);
      doc.rect(startX, y, col1LabelWidth, rowHeight, 'FD');
      doc.rect(startX + col1LabelWidth, y, col1ValueWidth, rowHeight, index === 3 ? 'F' : 'FD');
      doc.rect(col2StartX, y, col2LabelWidth, rowHeight, 'FD');
      doc.rect(col2StartX + col2LabelWidth, y, col2ValueWidth, rowHeight, 'F');

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(fila.izq.label, startX + 2, y + 4.5);
      doc.text(fila.der.label, col2StartX + 2, y + 4.5);

      doc.setFont('helvetica', 'normal');
      doc.text(fila.izq.value, startX + col1LabelWidth + 2, y + 4.5);
      doc.text(fila.der.value, col2StartX + col2LabelWidth + 2, y + 4.5);
    });

    // Preparar datos de la tabla
    const estudiantesPresentes = estudiantesActuales.filter(e => asistencia[e.id]);
    
    if (estudiantesPresentes.length === 0) {
      alert('⚠️ No hay estudiantes marcados como presentes');
      return;
    }

    const tableData = estudiantesPresentes.map((est, index) => [
      index + 1,
      est.primerApellido || '',
      est.segundoApellido || '',
      est.primerNombre || '',
      est.segundoNombre || '',
      est.documento || '',
      '',
      ''
    ]);

    const tableStartY = infoStartY + (rowHeight * 4) + 2;
    const pageHeight = 210;
    const maxTableHeight = pageHeight - tableStartY - 10;
    const numFilas = estudiantesPresentes.length;
    const headerHeight = 8;
    const alturaPorFila = (maxTableHeight - headerHeight) / numFilas;

    doc.autoTable({
      startY: tableStartY,
      head: [[
        '#',
        'PRIMER\nAPELLIDO',
        'SEGUNDO\nAPELLIDO',
        'PRIMER\nNOMBRE',
        'SEGUNDO\nNOMBRE',
        'DOC.\nIDENTIDAD',
        'TELÉFONO',
        'FIRMA DEL\nESTUDIANTE'
      ]],
      body: tableData,
      margin: { left: 10, right: 10, top: tableStartY, bottom: 10 },
      tableWidth: 277,
      styles: {
        fontSize: numFilas > 25 ? 6 : 7,
        cellPadding: { top: 0.2, right: 1, bottom: 0.2, left: 1 },
        halign: 'center',
        valign: 'middle',
        lineColor: [0, 0, 0],
        lineWidth: 0.1
      },
      headStyles: {
        fillColor: [200, 200, 200],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 7,
        minCellHeight: headerHeight
      },
      bodyStyles: {
        minCellHeight: alturaPorFila
      },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 36 },
        2: { cellWidth: 36 },
        3: { cellWidth: 30 },
        4: { cellWidth: 30 },
        5: { cellWidth: 28 },
        6: { cellWidth: 22 },
        7: { cellWidth: 87 }
      },
      theme: 'grid',
      didDrawCell: (data) => {
        if (data.column.index === 7 && data.section === 'body') {
          const estudiante = estudiantesPresentes[data.row.index];
          const firmaImg = obtenerFirma(estudiante, firmasData.firmas);

          try {
            const img = new Image();
            img.src = firmaImg;
            
            const maxWidth = data.cell.width - 4;
            const maxHeight = data.cell.height - 2;
            
            let width = img.width || maxWidth;
            let height = img.height || maxHeight;
            
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = width * ratio;
            height = height * ratio;
            
            const x = data.cell.x + (data.cell.width - width) / 2;
            const y = data.cell.y + (data.cell.height - height) / 2;
            
            doc.addImage(firmaImg, 'PNG', x, y, width, height, undefined, 'FAST');
          } catch (error) {
            console.error('Error al insertar firma:', error);
          }
        }
      }
    });
    const fecha = new Date(fechaSesion).toLocaleDateString('es-CO').replace(/\//g, '-');
    const nombreArchivo = `Asistencia_${institucion.nombre.replace(/\s+/g, '_')}_${fecha}.pdf`;
    doc.save(nombreArchivo);
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Cargando datos del servidor...</p>
        </div>
      </div>
    );
  }

  if (!institucionSeleccionada) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-8">
        <div className="max-w-5xl mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex justify-between items-center mb-6">
              <button
                onClick={() => navigate('/')}
                className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
              >
                <ArrowLeft className="mr-2" size={20} />
                Volver al inicio
              </button>
              
              <button
                onClick={cargarDatos}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                title="Recargar datos del servidor"
              >
                <RefreshCw size={18} />
                Recargar
              </button>
            </div>

            <div className="text-center mb-8">
              <FileText className="w-20 h-20 mx-auto text-purple-600 mb-4" />
              <h1 className="text-4xl font-bold text-gray-800 mb-2">Panel del Docente</h1>
              <p className="text-gray-600">Selecciona tu institución educativa</p>
              <p className="text-xs text-green-600 mt-2">✅ Conectado al servidor</p>
            </div>

            <div className="space-y-4">
              {instituciones.map(inst => (
                <button
                  key={inst.id}
                  onClick={() => seleccionarInstitucion(inst)}
                  className="w-full p-6 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-xl transition-all transform hover:scale-102 shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <h3 className="text-2xl font-bold">{inst.nombre}</h3>
                      {inst.comuna && (
                        <p className="text-purple-100 text-sm mt-1">📍 {inst.comuna}</p>
                      )}
                      <p className="text-purple-100 text-sm">🕐 {inst.horario}</p>
                      <p className="text-purple-100 text-xs mt-2">
                        👥 {inst.estudiantes.length} estudiantes registrados
                      </p>
                    </div>
                    <Users className="w-12 h-12 opacity-50" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const presentes = Object.values(asistencia).filter(Boolean).length;
  const total = estudiantesActuales.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 py-4">
      <div className="max-w-7xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <button
            onClick={() => setInstitucionSeleccionada(null)}
            className="flex items-center text-gray-600 hover:text-gray-800 mb-4 transition-colors"
          >
            <ArrowLeft className="mr-2" size={20} />
            Cambiar institución
          </button>

          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">{institucionSeleccionada.nombre}</h1>
              {institucionSeleccionada.comuna && (
                <p className="text-gray-600 mt-1">📍 {institucionSeleccionada.comuna}</p>
              )}
              <p className="text-gray-600">👨‍🏫 {institucionSeleccionada.formador}</p>
              <p className="text-gray-600">🕐 {institucionSeleccionada.horario}</p>
            </div>
            <div className="text-right">
              <div className="bg-purple-100 px-6 py-3 rounded-lg">
                <p className="text-sm text-purple-600 font-medium">Asistencia</p>
                <p className="text-3xl font-bold text-purple-700">{presentes}/{total}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline w-4 h-4 mr-1" />
                Fecha de Sesión
              </label>
              <input
                type="date"
                value={fechaSesion}
                onChange={(e) => setFechaSesion(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Número de Sesión
              </label>
              <input
                type="text"
                value={numeroSesion}
                onChange={(e) => setNumeroSesion(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Ej: 1, 2, 3..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observaciones
              </label>
              <input
                type="text"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Opcional"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">📋 Llamado a Lista</h2>
            <button
              onClick={() => setMostrarFormNuevo(!mostrarFormNuevo)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
            >
              <Plus size={20} />
              Agregar Estudiante
            </button>
          </div>

          {mostrarFormNuevo && (
            <div className="mb-6 p-6 bg-green-50 border-2 border-green-300 rounded-xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800">✨ Nuevo Estudiante</h3>
                <button
                  onClick={() => setMostrarFormNuevo(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Primer Apellido *"
                  value={nuevoEstudiante.primerApellido}
                  onChange={(e) => setNuevoEstudiante({ ...nuevoEstudiante, primerApellido: e.target.value.toUpperCase() })}
                  className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
                <input
                  type="text"
                  placeholder="Segundo Apellido"
                  value={nuevoEstudiante.segundoApellido}
                  onChange={(e) => setNuevoEstudiante({ ...nuevoEstudiante, segundoApellido: e.target.value.toUpperCase() })}
                  className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
                <input
                  type="text"
                  placeholder="Primer Nombre *"
                  value={nuevoEstudiante.primerNombre}
                  onChange={(e) => setNuevoEstudiante({ ...nuevoEstudiante, primerNombre: e.target.value.toUpperCase() })}
                  className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
                <input
                  type="text"
                  placeholder="Segundo Nombre"
                  value={nuevoEstudiante.segundoNombre}
                  onChange={(e) => setNuevoEstudiante({ ...nuevoEstudiante, segundoNombre: e.target.value.toUpperCase() })}
                  className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
                <input
                  type="text"
                  placeholder="Documento *"
                  value={nuevoEstudiante.documento}
                  onChange={(e) => setNuevoEstudiante({ ...nuevoEstudiante, documento: e.target.value })}
                  className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>

              <button
                onClick={agregarNuevoEstudiante}
                className="mt-4 w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold"
              >
                ✓ Agregar y Marcar Presente
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">#</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Apellidos</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Nombres</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Documento</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Firma</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Asistencia</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {estudiantesActuales.map((estudiante, index) => {
                  const tieneFirma = tieneFirmaReal(estudiante.documento, firmasData.firmas);
                  return (
                    <tr key={estudiante.id} className={asistencia[estudiante.id] ? 'bg-green-50' : 'hover:bg-gray-50'}>
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">{index + 1}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {estudiante.primerApellido} {estudiante.segundoApellido}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {estudiante.primerNombre} {estudiante.segundoNombre}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{estudiante.documento}</td>
                      <td className="px-4 py-3 text-center">
                        {tieneFirma ? (
                          <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-semibold">✓ Real</span>
                        ) : (
                          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-semibold">✎ Temporal</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleAsistencia(estudiante.id)}
                          className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                            asistencia[estudiante.id]
                              ? 'bg-green-600 text-white hover:bg-green-700'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {asistencia[estudiante.id] ? (
                            <span className="flex items-center justify-center gap-2">
                              <CheckCircle size={16} />
                              Presente
                            </span>
                          ) : (
                            'Ausente'
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => eliminarEstudianteHandler(
                            estudiante.id,
                            `${estudiante.primerNombre} ${estudiante.segundoNombre} ${estudiante.primerApellido} ${estudiante.segundoApellido}`.trim()
                          )}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all flex items-center justify-center gap-2 mx-auto"
                          title="Eliminar estudiante"
                        >
                          <Trash2 size={16} />
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={generarPDF}
            disabled={presentes === 0}
            className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-lg font-bold rounded-xl hover:from-purple-700 hover:to-blue-700 shadow-xl transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            <Download size={24} />
            Generar Planilla PDF ({presentes} estudiantes)
          </button>
          {presentes === 0 && (
            <p className="text-sm text-red-600 mt-2 font-semibold">
              ⚠️ Debes marcar al menos un estudiante presente
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocentePage;