import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Save, ZoomIn, ZoomOut, CheckCircle, Download, Hand, Wand2, Eraser, RotateCcw, Check, RotateCw, X } from 'lucide-react';
import institucionesData from '../data/instituciones.json';
import firmasDataImport from '../data/firmas.json';
import { fusionarEstudiantes } from '../services/storageService';
import { obtenerInstituciones, guardarFirmasBatch, obtenerFirmas } from '../services/apiService';

const ExtractorFirmasVisual = () => {
    const navigate = useNavigate();
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const editorCanvasRef = useRef(null);

    const [instituciones, setInstituciones] = useState([]);
    const [institucionSeleccionada, setInstitucionSeleccionada] = useState(null);
    const [imagenCargada, setImagenCargada] = useState(null);
    const [estudianteActual, setEstudianteActual] = useState(null);
    const [firmasCapturadas, setFirmasCapturadas] = useState({});
    const [cargando, setCargando] = useState(true);

    // Estado para modo de interacción
    const [modo, setModo] = useState('pan'); // 'pan' o 'select'

    // Estado para navegación (pan)
    const [arrastrando, setArrastrando] = useState(false);
    const [posicionInicial, setPosicionInicial] = useState({ x: 0, y: 0 });

    // Estado para selección de área
    const [seleccionando, setSeleccionando] = useState(false);
    const [puntoInicio, setPuntoInicio] = useState(null);
    const [puntoFin, setPuntoFin] = useState(null);
    const [areaSeleccionada, setAreaSeleccionada] = useState(null);

    // Estado para zoom y posición de la imagen
    const [escala, setEscala] = useState(1);
    const [offset, setOffset] = useState({ x: 0, y: 0 });

    // Nuevo: Estado para procesamiento
    const [procesarAutomatico, setProcesarAutomatico] = useState(true);
    const [umbralTransparencia, setUmbralTransparencia] = useState(210);

    // Estado para editor de firma
    const [modoEditor, setModoEditor] = useState(false);
    const [dibujandoBorrador, setDibujandoBorrador] = useState(false);
    const [tamañoBorrador, setTamañoBorrador] = useState(20);
    const [imagenEditorOriginal, setImagenEditorOriginal] = useState(null);
    const [anguloRotacion, setAnguloRotacion] = useState(0);

    // Estado para firma táctil
    const [mostrarPadFirma, setMostrarPadFirma] = useState(false);
    const padFirmaRef = useRef(null);
    const [firmaDibujada, setFirmaDibujada] = useState(null);
    const [dibujando, setDibujando] = useState(false);
    const [ultimaPosicion, setUltimaPosicion] = useState(null);

    // Cargar datos del backend
    useEffect(() => {
        cargarDatosIniciales();
    }, []);

    const cargarDatosIniciales = async () => {
        try {
            setCargando(true);
            const [dataInstituciones, dataFirmas] = await Promise.all([
                obtenerInstituciones(),
                obtenerFirmas()
            ]);
            setInstituciones(dataInstituciones.instituciones);
            setFirmasCapturadas(dataFirmas.firmas || {});
        } catch (error) {
            console.error('Error al cargar datos:', error);
            alert('⚠️ Error al conectar con el servidor');
        } finally {
            setCargando(false);
        }
    };

    // ============= FUNCIONES DE PROCESAMIENTO AVANZADO =============

    // Método de Otsu para encontrar el umbral óptimo
    const calcularUmbralOtsu = (grayData) => {
        const histogram = new Array(256).fill(0);
        const total = grayData.length;

        for (let i = 0; i < total; i++) {
            histogram[Math.floor(grayData[i])]++;
        }

        let sum = 0;
        for (let i = 0; i < 256; i++) {
            sum += i * histogram[i];
        }

        let sumB = 0;
        let wB = 0;
        let wF = 0;
        let maxVariance = 0;
        let threshold = 0;

        for (let t = 0; t < 256; t++) {
            wB += histogram[t];
            if (wB === 0) continue;

            wF = total - wB;
            if (wF === 0) break;

            sumB += t * histogram[t];

            const mB = sumB / wB;
            const mF = (sum - sumB) / wF;

            const variance = wB * wF * (mB - mF) * (mB - mF);

            if (variance > maxVariance) {
                maxVariance = variance;
                threshold = t;
            }
        }

        return threshold;
    };

    // Binarización adaptativa
    const binarizacionAdaptativa = (grayData, width, height, globalThreshold) => {
        const result = new Uint8Array(grayData.length);
        const windowSize = 15;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;

                let sum = 0;
                let count = 0;

                for (let wy = -windowSize; wy <= windowSize; wy++) {
                    for (let wx = -windowSize; wx <= windowSize; wx++) {
                        const ny = y + wy;
                        const nx = x + wx;

                        if (ny >= 0 && ny < height && nx >= 0 && nx < width) {
                            sum += grayData[ny * width + nx];
                            count++;
                        }
                    }
                }

                const localMean = sum / count;
                const localThreshold = localMean * 0.9;

                result[idx] = grayData[idx] < localThreshold ? 0 : 255;
            }
        }

        return result;
    };

    // Eliminar líneas de la cuadrícula
    const eliminarLineas = (binaryData, width, height) => {
        const result = new Uint8Array(binaryData);
        const minLineLength = Math.min(width, height) * 0.3;

        // Detectar y eliminar líneas horizontales
        for (let y = 0; y < height; y++) {
            let lineLength = 0;
            let linePixels = [];

            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                if (binaryData[idx] === 0) {
                    lineLength++;
                    linePixels.push(idx);
                } else {
                    if (lineLength > minLineLength) {
                        linePixels.forEach(i => result[i] = 255);
                    }
                    lineLength = 0;
                    linePixels = [];
                }
            }

            if (lineLength > minLineLength) {
                linePixels.forEach(i => result[i] = 255);
            }
        }

        // Detectar y eliminar líneas verticales
        for (let x = 0; x < width; x++) {
            let lineLength = 0;
            let linePixels = [];

            for (let y = 0; y < height; y++) {
                const idx = y * width + x;
                if (result[idx] === 0) {
                    lineLength++;
                    linePixels.push(idx);
                } else {
                    if (lineLength > minLineLength) {
                        linePixels.forEach(i => result[i] = 255);
                    }
                    lineLength = 0;
                    linePixels = [];
                }
            }

            if (lineLength > minLineLength) {
                linePixels.forEach(i => result[i] = 255);
            }
        }

        return result;
    };

    // Eliminar ruido usando componentes conectados
    const eliminarRuido = (binaryData, width, height) => {
        const result = new Uint8Array(binaryData);
        const visited = new Array(width * height).fill(false);
        const minComponentSize = 50;

        const floodFill = (startIdx) => {
            const stack = [startIdx];
            const component = [];

            while (stack.length > 0) {
                const idx = stack.pop();
                if (visited[idx] || binaryData[idx] !== 0) continue;

                visited[idx] = true;
                component.push(idx);

                const x = idx % width;
                const y = Math.floor(idx / width);

                const neighbors = [
                    [x - 1, y - 1], [x, y - 1], [x + 1, y - 1],
                    [x - 1, y], [x + 1, y],
                    [x - 1, y + 1], [x, y + 1], [x + 1, y + 1]
                ];

                for (const [nx, ny] of neighbors) {
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        stack.push(ny * width + nx);
                    }
                }
            }

            return component;
        };

        for (let i = 0; i < binaryData.length; i++) {
            if (!visited[i] && binaryData[i] === 0) {
                const component = floodFill(i);

                if (component.length < minComponentSize) {
                    component.forEach(idx => result[idx] = 255);
                }
            }
        }

        return result;
    };

    // Auto-recorte mejorado
    const autoRecortarMejorado = (canvas) => {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        let minX = canvas.width;
        let minY = canvas.height;
        let maxX = 0;
        let maxY = 0;

        for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
                const alpha = data[(y * canvas.width + x) * 4 + 3];
                if (alpha > 0) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }

        const padding = 10;
        minX = Math.max(0, minX - padding);
        minY = Math.max(0, minY - padding);
        maxX = Math.min(canvas.width, maxX + padding);
        maxY = Math.min(canvas.height, maxY + padding);

        const width = maxX - minX;
        const height = maxY - minY;

        const croppedCanvas = document.createElement('canvas');
        croppedCanvas.width = width;
        croppedCanvas.height = height;
        const croppedCtx = croppedCanvas.getContext('2d', { willReadFrequently: true });

        croppedCtx.drawImage(
            canvas,
            minX, minY, width, height,
            0, 0, width, height
        );

        return croppedCanvas.toDataURL('image/png');
    };

    // Función principal de procesamiento avanzado
    const procesarFirmaAvanzada = (imageData) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        canvas.width = imageData.width;
        canvas.height = imageData.height;

        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;

        // Paso 1: Convertir a escala de grises
        const grayData = new Uint8Array(width * height);
        for (let i = 0; i < data.length; i += 4) {
            const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            grayData[i / 4] = gray;
        }

        // Paso 2: Calcular umbral óptimo
        const threshold = calcularUmbralOtsu(grayData);

        // Paso 3: Binarización adaptativa
        const binaryData = binarizacionAdaptativa(grayData, width, height, threshold);

        // Paso 4: Eliminar líneas
        const sinLineas = eliminarLineas(binaryData, width, height);

        // Paso 5: Eliminar ruido
        const limpio = eliminarRuido(sinLineas, width, height);

        // Paso 6: Aplicar con transparencia
        for (let i = 0; i < limpio.length; i++) {
            const pixelIndex = i * 4;
            if (limpio[i] === 0) {
                // Firma (negro)
                data[pixelIndex] = 0;
                data[pixelIndex + 1] = 0;
                data[pixelIndex + 2] = 0;
                data[pixelIndex + 3] = 255;
            } else {
                // Fondo (transparente)
                data[pixelIndex + 3] = 0;
            }
        }

        ctx.putImageData(imageData, 0, 0);

        // Paso 7: Auto-recortar
        return autoRecortarMejorado(canvas);
    };

    // ============= FIN FUNCIONES DE PROCESAMIENTO =============

    // ============= FUNCIONES DEL EDITOR =============

    // Redibujar canvas con rotación aplicada
    const redibujarCanvasConRotacion = (angulo) => {
        if (!imagenEditorOriginal || !editorCanvasRef.current) return;

        const img = new Image();
        img.onload = () => {
            const canvas = editorCanvasRef.current;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });

            // Calcular nuevas dimensiones del canvas rotado
            const radianes = (angulo * Math.PI) / 180;
            const sin = Math.abs(Math.sin(radianes));
            const cos = Math.abs(Math.cos(radianes));
            const newWidth = img.width * cos + img.height * sin;
            const newHeight = img.width * sin + img.height * cos;

            canvas.width = newWidth;
            canvas.height = newHeight;

            // Limpiar y aplicar rotación
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.save();
            ctx.translate(newWidth / 2, newHeight / 2);
            ctx.rotate(radianes);
            ctx.drawImage(img, -img.width / 2, -img.height / 2);
            ctx.restore();
        };
        img.src = imagenEditorOriginal;
    };

    // Inicializar el editor con la firma capturada
    useEffect(() => {
        if (modoEditor && areaSeleccionada && editorCanvasRef.current) {
            const img = new Image();
            img.onload = () => {
                const canvas = editorCanvasRef.current;
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                ctx.drawImage(img, 0, 0);
                setImagenEditorOriginal(areaSeleccionada);
                setAnguloRotacion(0);
            };
            img.src = areaSeleccionada;
        }
    }, [modoEditor, areaSeleccionada]);

    // Aplicar rotación cuando cambia el ángulo
    useEffect(() => {
        if (modoEditor && anguloRotacion !== 0) {
            redibujarCanvasConRotacion(anguloRotacion);
        }
    }, [anguloRotacion]);

    // Manejar dibujo con borrador
    const handleEditorMouseDown = (e) => {
        setDibujandoBorrador(true);
        borrarEnPosicion(e);
    };

    const handleEditorMouseMove = (e) => {
        if (dibujandoBorrador) {
            borrarEnPosicion(e);
        }
    };

    const handleEditorMouseUp = () => {
        setDibujandoBorrador(false);
    };

    const borrarEnPosicion = (e) => {
        const canvas = editorCanvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(x, y, tamañoBorrador, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
    };

    const resetearEdicion = () => {
        setAnguloRotacion(0);
        if (imagenEditorOriginal && editorCanvasRef.current) {
            const img = new Image();
            img.onload = () => {
                const canvas = editorCanvasRef.current;
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
            };
            img.src = imagenEditorOriginal;
        }
    };

    const rotarIzquierda = () => {
        const nuevoAngulo = anguloRotacion - 5;
        setAnguloRotacion(nuevoAngulo);
    };

    const rotarDerecha = () => {
        const nuevoAngulo = anguloRotacion + 5;
        setAnguloRotacion(nuevoAngulo);
    };

    const aplicarEdicion = () => {
        const canvas = editorCanvasRef.current;
        if (canvas) {
            // Recortar automáticamente después de editar
            const firmaEditada = autoRecortarMejorado(canvas);
            setAreaSeleccionada(firmaEditada);
            setModoEditor(false);
            setAnguloRotacion(0);
        }
    };

    // ============= FIN FUNCIONES DEL EDITOR =============

    // Cargar imagen
    const cargarImagen = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    setImagenCargada(img);
                    setEscala(1);

                    // Centrar la imagen
                    const canvas = canvasRef.current;
                    if (canvas) {
                        const offsetX = (canvas.width - img.width) / 2;
                        const offsetY = (canvas.height - img.height) / 2;
                        setOffset({ x: offsetX, y: offsetY });
                    }
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    };
    // ========== FUNCIONES DE FIRMA TÁCTIL ==========

    const iniciarDibujo = (e) => {
    setDibujando(true);
    const canvas = padFirmaRef.current;
    const rect = canvas.getBoundingClientRect();

    // Calcular escala del canvas
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let x, y;
    if (e.type === 'touchstart') {
        const touch = e.touches[0];
        x = (touch.clientX - rect.left) * scaleX;
        y = (touch.clientY - rect.top) * scaleY;
    } else {
        x = (e.clientX - rect.left) * scaleX;
        y = (e.clientY - rect.top) * scaleY;
    }

    setUltimaPosicion({ x, y });
};

const dibujar = (e) => {
    if (!dibujando) return;

    e.preventDefault();
    const canvas = padFirmaRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const rect = canvas.getBoundingClientRect();

    // Calcular escala del canvas
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let x, y;
    if (e.type === 'touchmove') {
        const touch = e.touches[0];
        x = (touch.clientX - rect.left) * scaleX;
        y = (touch.clientY - rect.top) * scaleY;
    } else {
        x = (e.clientX - rect.left) * scaleX;
        y = (e.clientY - rect.top) * scaleY;
    }

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3; // Aumentado para mejor visualización en móvil
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(ultimaPosicion.x, ultimaPosicion.y);
    ctx.lineTo(x, y);
    ctx.stroke();

    setUltimaPosicion({ x, y });
};

const terminarDibujo = () => {
    setDibujando(false);
};

    const limpiarPadFirma = () => {
        const canvas = padFirmaRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        setFirmaDibujada(null);
    };

    const guardarFirmaDibujada = () => {
        const canvas = padFirmaRef.current;

        // Verificar si hay algo dibujado
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;
        let hayTrazo = false;

        for (let i = 0; i < pixels.length; i += 4) {
            if (pixels[i] < 250 || pixels[i + 1] < 250 || pixels[i + 2] < 250) {
                hayTrazo = true;
                break;
            }
        }

        if (!hayTrazo) {
            alert('⚠️ Debes dibujar la firma antes de guardar');
            return;
        }

        // Procesar y guardar
        let firmaBase64 = canvas.toDataURL('image/png');

        if (procesarAutomatico) {
            // Aplicar procesamiento
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
            tempCtx.drawImage(canvas, 0, 0);

            const imageData = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            for (let i = 0; i < data.length; i += 4) {
                const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
                if (brightness > 240) {
                    data[i + 3] = 0;
                }
            }

            tempCtx.putImageData(imageData, 0, 0);
            firmaBase64 = autoRecortarMejorado(tempCanvas);
        }

        setAreaSeleccionada(firmaBase64);
        setMostrarPadFirma(false);
    };

    const abrirPadFirma = () => {
        if (!estudianteActual) {
            alert('⚠️ Primero selecciona un estudiante de la lista');
            return;
        }
        setMostrarPadFirma(true);

        // Inicializar canvas
        setTimeout(() => {
            if (padFirmaRef.current) {
                const canvas = padFirmaRef.current;
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
        }, 100);
    };

    // ========== FIN FUNCIONES DE FIRMA TÁCTIL ==========
    // Dibujar en canvas
    useEffect(() => {
        if (!imagenCargada || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        // Ajustar tamaño del canvas al contenedor
        if (containerRef.current) {
            canvas.width = containerRef.current.clientWidth;
            canvas.height = 600;
        }

        // Limpiar canvas
        ctx.fillStyle = '#f3f4f6';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Guardar estado del contexto
        ctx.save();

        // Aplicar transformaciones
        ctx.translate(offset.x, offset.y);
        ctx.scale(escala, escala);

        // Dibujar imagen
        ctx.drawImage(imagenCargada, 0, 0);

        ctx.restore();

        // Dibujar área de selección si existe
        if (puntoInicio && puntoFin) {
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 3;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(
                puntoInicio.x,
                puntoInicio.y,
                puntoFin.x - puntoInicio.x,
                puntoFin.y - puntoInicio.y
            );
            ctx.setLineDash([]);
        }
    }, [imagenCargada, escala, offset, puntoInicio, puntoFin]);

    // Convertir coordenadas del canvas a coordenadas de la imagen
    const canvasToImageCoords = (canvasX, canvasY) => {
        const imgX = (canvasX - offset.x) / escala;
        const imgY = (canvasY - offset.y) / escala;
        return { x: imgX, y: imgY };
    };

    // Eventos del mouse
    const handleMouseDown = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (modo === 'pan') {
            setArrastrando(true);
            setPosicionInicial({ x: x - offset.x, y: y - offset.y });
        } else if (modo === 'select') {
            if (!estudianteActual) {
                alert('⚠️ Primero selecciona un estudiante de la lista');
                return;
            }
            setSeleccionando(true);
            setPuntoInicio({ x, y });
            setPuntoFin({ x, y });
            setAreaSeleccionada(null);
        }
    };

    const handleMouseMove = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (modo === 'pan' && arrastrando) {
            setOffset({
                x: x - posicionInicial.x,
                y: y - posicionInicial.y
            });
        } else if (modo === 'select' && seleccionando) {
            setPuntoFin({ x, y });
        }
    };

    const handleMouseUp = () => {
        if (modo === 'pan' && arrastrando) {
            setArrastrando(false);
        } else if (modo === 'select' && seleccionando) {
            setSeleccionando(false);

            if (puntoInicio && puntoFin) {
                const x1 = Math.min(puntoInicio.x, puntoFin.x);
                const y1 = Math.min(puntoInicio.y, puntoFin.y);
                const x2 = Math.max(puntoInicio.x, puntoFin.x);
                const y2 = Math.max(puntoInicio.y, puntoFin.y);

                const imgStart = canvasToImageCoords(x1, y1);
                const imgEnd = canvasToImageCoords(x2, y2);

                const imgX = imgStart.x;
                const imgY = imgStart.y;
                const imgWidth = imgEnd.x - imgStart.x;
                const imgHeight = imgEnd.y - imgStart.y;

                if (imgWidth < 10 || imgHeight < 5) {
                    alert('⚠️ El área seleccionada es muy pequeña. Intenta de nuevo.');
                    setPuntoInicio(null);
                    setPuntoFin(null);
                    return;
                }

                // Extraer firma
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = imgWidth;
                tempCanvas.height = imgHeight;
                const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });

                tempCtx.drawImage(
                    imagenCargada,
                    imgX, imgY, imgWidth, imgHeight,
                    0, 0, imgWidth, imgHeight
                );

                let firmaBase64;

                if (procesarAutomatico) {
                    // Procesar la imagen para eliminar fondo
                    const imageData = tempCtx.getImageData(0, 0, imgWidth, imgHeight);
                    const data = imageData.data;

                    // PROCESAMIENTO MEJORADO
                    for (let i = 0; i < data.length; i += 4) {
                        const r = data[i];
                        const g = data[i + 1];
                        const b = data[i + 2];

                        // Calcular brillo del píxel
                        const brightness = (r + g + b) / 3;

                        // Si es muy claro (fondo gris, blanco, cuadrículas), hacerlo transparente
                        if (brightness > umbralTransparencia) {
                            data[i + 3] = 0; // Transparente
                        } else {
                            // Si es oscuro (tinta de firma), convertir a negro puro
                            data[i] = 0;
                            data[i + 1] = 0;
                            data[i + 2] = 0;
                            data[i + 3] = 255; // Opaco
                        }
                    }

                    tempCtx.putImageData(imageData, 0, 0);

                    // Auto-recortar
                    firmaBase64 = autoRecortarMejorado(tempCanvas);
                } else {
                    // Sin procesamiento
                    firmaBase64 = tempCanvas.toDataURL('image/png');
                }

                setAreaSeleccionada(firmaBase64);
            }
        }
    };

    // Guardar firma
    const guardarFirma = async () => {
        if (!estudianteActual || !areaSeleccionada) {
            alert('⚠️ Primero selecciona un área de la imagen');
            return;
        }

        const nuevasFirmas = {
            ...firmasCapturadas,
            [estudianteActual.documento]: areaSeleccionada
        };

        setFirmasCapturadas(nuevasFirmas);

        // Guardar en el backend automáticamente
        try {
            await guardarFirmasBatch(nuevasFirmas);
            console.log('✅ Firma guardada en el servidor');
        } catch (error) {
            console.error('Error al guardar firma:', error);
            alert('⚠️ Error al guardar en el servidor, pero se guardó localmente');
        }

        setPuntoInicio(null);
        setPuntoFin(null);
        setAreaSeleccionada(null);
        setEstudianteActual(null);
        setModo('pan');
        setModoEditor(false);
        setAnguloRotacion(0);

        alert('✅ Firma guardada correctamente');
    };
    // Borrar firma
    const borrarFirma = async (documento) => {
        if (!confirm('¿Estás seguro de que deseas eliminar esta firma?')) {
            return;
        }

        const nuevasFirmas = { ...firmasCapturadas };
        delete nuevasFirmas[documento];

        setFirmasCapturadas(nuevasFirmas);

        // Guardar en el backend automáticamente
        try {
            await guardarFirmasBatch(nuevasFirmas);
            console.log('✅ Firma eliminada del servidor');
            alert('✅ Firma eliminada correctamente');
        } catch (error) {
            console.error('Error al eliminar firma:', error);
            alert('⚠️ Error al eliminar del servidor, pero se eliminó localmente');
        }

        // Si el estudiante actual es el que se borró, limpiar selección
        if (estudianteActual?.documento === documento) {
            setEstudianteActual(null);
            setPuntoInicio(null);
            setPuntoFin(null);
            setAreaSeleccionada(null);
        }
    };
    // Descargar firmas.json
    const descargarJSON = () => {
        const json = JSON.stringify({ firmas: firmasCapturadas }, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'firmas.json';
        a.click();
        URL.revokeObjectURL(url);

        alert(`✅ Archivo descargado con ${Object.keys(firmasCapturadas).length} firmas. Reemplaza src/data/firmas.json`);
    };

    // Zoom
    const aumentarZoom = () => {
        const nuevoZoom = Math.min(escala + 0.3, 4);
        setEscala(nuevoZoom);
    };

    const disminuirZoom = () => {
        const nuevoZoom = Math.max(escala - 0.3, 0.3);
        setEscala(nuevoZoom);
    };

    // Resetear vista
    const resetearVista = () => {
        setEscala(1);
        if (imagenCargada && canvasRef.current) {
            const canvas = canvasRef.current;
            const offsetX = (canvas.width - imagenCargada.width) / 2;
            const offsetY = (canvas.height - imagenCargada.height) / 2;
            setOffset({ x: offsetX, y: offsetY });
        }
    };

    // Vista de selección de institución
    if (!institucionSeleccionada) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8">
                <div className="max-w-5xl mx-auto px-4">
                    <div className="bg-white rounded-2xl shadow-xl p-8">
                        <button
                            onClick={() => navigate('/')}
                            className="flex items-center text-gray-600 hover:text-gray-800 mb-6 transition-colors"
                        >
                            <ArrowLeft className="mr-2" size={20} />
                            Volver al inicio
                        </button>

                        <div className="text-center mb-8">
                            <h1 className="text-4xl font-bold text-gray-800 mb-2">
                                🎨 Extractor Visual de Firmas
                            </h1>
                            <p className="text-gray-600">Selecciona la institución para extraer firmas</p>
                        </div>

                        <div className="space-y-4">
                            {cargando ? (
                                <div className="text-center py-8">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto mb-4"></div>
                                    <p className="text-gray-600">Cargando instituciones...</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {instituciones.map(inst => (
                                        <button
                                            key={inst.id}
                                            onClick={() => setInstitucionSeleccionada(inst)}
                                            className="w-full p-6 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl transition-all transform hover:scale-102 shadow-lg text-left"
                                        >

                                            <h3 className="text-2xl font-bold">{inst.nombre}</h3>
                                            <p className="text-blue-100 text-sm mt-1">
                                                👥 {inst.estudiantes.length} estudiantes
                                            </p>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Vista principal de extracción
    return (
        <div className="min-h-screen bg-gray-50 py-4">
            <div className="max-w-7xl mx-auto px-4">
                <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <button
                            onClick={() => {
                                setInstitucionSeleccionada(null);
                                setImagenCargada(null);
                                setEstudianteActual(null);
                            }}
                            className="flex items-center text-gray-600 hover:text-gray-800"
                        >
                            <ArrowLeft className="mr-2" size={20} />
                            Cambiar institución
                        </button>

                        <button
                            onClick={descargarJSON}
                            disabled={Object.keys(firmasCapturadas).length === 0}
                            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold"
                        >
                            <Download size={20} />
                            Descargar firmas.json ({Object.keys(firmasCapturadas).length})
                        </button>
                    </div>

                    <h2 className="text-2xl font-bold text-gray-800 mb-4">
                        {institucionSeleccionada.nombre}
                    </h2>

                    {/* Cargar imagen */}
                    <div className="mb-6">
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                            📄 Cargar planilla escaneada
                        </label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={cargarImagen}
                            className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500"
                        />
                    </div>

                    {/* Controles de procesamiento */}
                    <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Wand2 className="text-purple-600" size={20} />
                                <span className="font-bold text-purple-900">Procesamiento Automático</span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={procesarAutomatico}
                                    onChange={(e) => setProcesarAutomatico(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                            </label>
                        </div>

                        {procesarAutomatico && (
                            <div>
                                <label className="block text-sm font-semibold text-purple-800 mb-2">
                                    Sensibilidad (eliminar fondo claro): {umbralTransparencia}
                                </label>
                                <input
                                    type="range"
                                    min="180"
                                    max="230"
                                    value={umbralTransparencia}
                                    onChange={(e) => setUmbralTransparencia(Number(e.target.value))}
                                    className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                                />
                                <div className="flex justify-between text-xs text-purple-600 mt-1">
                                    <span>Menos sensible</span>
                                    <span>Más sensible</span>
                                </div>
                            </div>
                        )}

                        <p className="text-xs text-purple-700 mt-2">
                            {procesarAutomatico
                                ? '✨ Las firmas se guardarán con fondo transparente y recortadas automáticamente'
                                : '📷 Las firmas se guardarán tal como se capturan (con fondo)'}
                        </p>
                    </div>
                </div>

                {imagenCargada && (
                    <div className="grid md:grid-cols-3 gap-6">
                        {/* Panel izquierdo: Canvas */}
                        <div className="md:col-span-2 bg-white rounded-2xl shadow-xl p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold text-gray-800">
                                    🖼️ Planilla escaneada
                                </h3>
                                <div className="flex gap-2">
                                    <button
                                        onClick={disminuirZoom}
                                        className="p-2 bg-gray-200 hover:bg-gray-300 rounded-lg"
                                        title="Reducir zoom"
                                    >
                                        <ZoomOut size={20} />
                                    </button>
                                    <span className="px-4 py-2 bg-gray-100 rounded-lg font-mono text-sm">
                                        {Math.round(escala * 100)}%
                                    </span>
                                    <button
                                        onClick={aumentarZoom}
                                        className="p-2 bg-gray-200 hover:bg-gray-300 rounded-lg"
                                        title="Aumentar zoom"
                                    >
                                        <ZoomIn size={20} />
                                    </button>
                                    <button
                                        onClick={resetearVista}
                                        className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-semibold"
                                        title="Resetear vista"
                                    >
                                        Reset
                                    </button>
                                </div>
                            </div>

                            {/* Botones de modo */}
                            <div className="flex gap-2 mb-4">
                                <button
                                    onClick={() => setModo('pan')}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${modo === 'pan'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        }`}
                                >
                                    <Hand size={18} />
                                    Mover (Manita)
                                </button>
                                <button
                                    onClick={() => setModo('select')}
                                    disabled={!estudianteActual}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${modo === 'select'
                                        ? 'bg-green-600 text-white'
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    ✂️ Seleccionar Firma
                                </button>
                                <button
                                    onClick={abrirPadFirma}
                                    disabled={!estudianteActual}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    ✍️ Dibujar Firma (Táctil)
                                </button>
                            </div>

                            <div
                                ref={containerRef}
                                className="border-4 border-gray-300 rounded-lg overflow-hidden bg-gray-100"
                            >
                                <canvas
                                    ref={canvasRef}
                                    onMouseDown={handleMouseDown}
                                    onMouseMove={handleMouseMove}
                                    onMouseUp={handleMouseUp}
                                    onMouseLeave={handleMouseUp}
                                    className={modo === 'pan' ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'}
                                    style={{ width: '100%', display: 'block' }}
                                />
                            </div>

                            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm text-blue-800">
                                    <strong>💡 Modo actual:</strong> {modo === 'pan' ? '🖐️ Mover imagen (arrastra con el mouse)' : '✂️ Seleccionar firma (dibuja un rectángulo)'}
                                </p>
                            </div>

                            {estudianteActual && (
                                <div className="mt-4 p-4 bg-purple-50 border-2 border-purple-300 rounded-lg">
                                    <p className="text-sm font-semibold text-purple-900 mb-2">
                                        🎯 Estudiante seleccionado:
                                    </p>
                                    <p className="text-lg font-bold text-purple-700">
                                        {estudianteActual.primerNombre} {estudianteActual.segundoNombre} {estudianteActual.primerApellido} {estudianteActual.segundoApellido}
                                    </p>
                                    <p className="text-sm text-purple-600">Doc: {estudianteActual.documento}</p>
                                </div>
                            )}

                            {areaSeleccionada && !modoEditor && (
                                <div className="mt-4 p-4 bg-green-50 border-2 border-green-300 rounded-lg">
                                    <p className="text-sm font-semibold text-green-900 mb-2">
                                        ✂️ Vista previa de la firma:
                                    </p>
                                    <div className="bg-white p-4 rounded border-2 border-green-400" style={{
                                        backgroundImage: 'repeating-linear-gradient(45deg, #f0f0f0 25%, transparent 25%, transparent 75%, #f0f0f0 75%, #f0f0f0), repeating-linear-gradient(45deg, #f0f0f0 25%, white 25%, white 75%, #f0f0f0 75%, #f0f0f0)',
                                        backgroundPosition: '0 0, 10px 10px',
                                        backgroundSize: '20px 20px'
                                    }}>
                                        <img
                                            src={areaSeleccionada}
                                            alt="Firma extraída"
                                            className="max-h-32 mx-auto"
                                        />
                                    </div>

                                    <div className="flex gap-2 mt-3">
                                        <button
                                            onClick={() => setModoEditor(true)}
                                            className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-bold flex items-center justify-center gap-2"
                                        >
                                            <Eraser size={20} />
                                            Editar / Rotar
                                        </button>
                                        <button
                                            onClick={guardarFirma}
                                            className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold flex items-center justify-center gap-2"
                                        >
                                            <Save size={20} />
                                            Guardar Firma
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Editor de firma con borrador y rotación */}
                            {modoEditor && (
                                <div className="mt-4 p-4 bg-orange-50 border-2 border-orange-300 rounded-lg">
                                    <div className="flex justify-between items-center mb-3">
                                        <p className="text-sm font-semibold text-orange-900">
                                            🎨 Editor de Firma - Rotar y limpiar
                                        </p>
                                        <button
                                            onClick={() => setModoEditor(false)}
                                            className="text-orange-600 hover:text-orange-800 font-semibold text-sm"
                                        >
                                            ✕ Cerrar
                                        </button>
                                    </div>

                                    {/* Controles de rotación */}
                                    <div className="mb-3 p-3 bg-white rounded-lg border-2 border-blue-300">
                                        <label className="flex items-center gap-2 text-sm font-semibold text-blue-900 mb-2">
                                            <RotateCw size={16} />
                                            Rotación: {anguloRotacion}°
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={rotarIzquierda}
                                                className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold flex items-center gap-1"
                                                title="Rotar 5° izquierda"
                                            >
                                                <RotateCcw size={16} />
                                                -5°
                                            </button>
                                            <input
                                                type="range"
                                                min="-45"
                                                max="45"
                                                value={anguloRotacion}
                                                onChange={(e) => setAnguloRotacion(Number(e.target.value))}
                                                className="flex-1 h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                            />
                                            <button
                                                onClick={rotarDerecha}
                                                className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold flex items-center gap-1"
                                                title="Rotar 5° derecha"
                                            >
                                                +5°
                                                <RotateCw size={16} />
                                            </button>
                                        </div>
                                        <div className="flex justify-between text-xs text-blue-600 mt-1">
                                            <span>-45° Izq</span>
                                            <span>0°</span>
                                            <span>+45° Der</span>
                                        </div>
                                    </div>

                                    {/* Control de tamaño del borrador */}
                                    <div className="mb-3 p-3 bg-white rounded-lg border-2 border-orange-300">
                                        <label className="flex items-center gap-2 text-sm font-semibold text-blue-900 mb-2">
                                            <Eraser size={16} />
                                            Tamaño del borrador: {tamañoBorrador}px
                                        </label>
                                        <input
                                            type="range"
                                            min="5"
                                            max="50"
                                            value={tamañoBorrador}
                                            onChange={(e) => setTamañoBorrador(Number(e.target.value))}
                                            className="w-full h-2 bg-orange-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
                                        />
                                        <div className="flex justify-between text-xs text-orange-600 mt-1">
                                            <span>Pequeño (5px)</span>
                                            <span>Grande (50px)</span>
                                        </div>
                                    </div>

                                    {/* Canvas del editor */}
                                    <div className="bg-white p-4 rounded border-2 border-orange-400 mb-3 overflow-auto max-h-[500px]" style={{
                                        backgroundImage: 'repeating-linear-gradient(45deg, #f0f0f0 25%, transparent 25%, transparent 75%, #f0f0f0 75%, #f0f0f0), repeating-linear-gradient(45deg, #f0f0f0 25%, white 25%, white 75%, #f0f0f0 75%, #f0f0f0)',
                                        backgroundPosition: '0 0, 10px 10px',
                                        backgroundSize: '20px 20px'
                                    }}>
                                        <div className="flex justify-center">
                                            <canvas
                                                ref={editorCanvasRef}
                                                onMouseDown={handleEditorMouseDown}
                                                onMouseMove={handleEditorMouseMove}
                                                onMouseUp={handleEditorMouseUp}
                                                onMouseLeave={handleEditorMouseUp}
                                                className="cursor-crosshair border border-orange-300 shadow-lg"
                                                style={{ maxWidth: '100%' }}
                                            />
                                        </div>
                                    </div>

                                    {/* Botones de control del editor */}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={resetearEdicion}
                                            className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-semibold flex items-center justify-center gap-2"
                                        >
                                            <RotateCcw size={18} />
                                            Reiniciar Todo
                                        </button>
                                        <button
                                            onClick={aplicarEdicion}
                                            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold flex items-center justify-center gap-2"
                                        >
                                            <Check size={18} />
                                            Aplicar y Recortar
                                        </button>
                                    </div>

                                    <p className="text-xs text-orange-700 mt-2">
                                        💡 <strong>Paso 1:</strong> Rota la firma hasta que quede horizontal • <strong>Paso 2:</strong> Usa el borrador para limpiar partes no deseadas
                                    </p>
                                </div>
                            )}
                            {/* Modal Pad de Firma */}
                            {mostrarPadFirma && (
                                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-xl font-bold text-gray-800">
                                                ✍️ Dibujar Firma: {estudianteActual?.primerNombre} {estudianteActual?.primerApellido}
                                            </h3>
                                            <button
                                                onClick={() => setMostrarPadFirma(false)}
                                                className="text-gray-500 hover:text-gray-700"
                                            >
                                                <X size={24} />
                                            </button>
                                        </div>

                                        <p className="text-sm text-gray-600 mb-4">
                                            📱 Dibuja la firma con tu dedo (móvil) o mouse (PC)
                                        </p>

                                        <div className="border-4 border-gray-300 rounded-lg overflow-hidden bg-white mb-4">
                                            <canvas
                                                ref={padFirmaRef}
                                                width={600}
                                                height={300}
                                                onMouseDown={iniciarDibujo}
                                                onMouseMove={dibujar}
                                                onMouseUp={terminarDibujo}
                                                onMouseLeave={terminarDibujo}
                                                onTouchStart={iniciarDibujo}
                                                onTouchMove={dibujar}
                                                onTouchEnd={terminarDibujo}
                                                className="w-full cursor-crosshair touch-none"
                                                style={{ touchAction: 'none' }}
                                            />
                                        </div>

                                        <div className="flex gap-3">
                                            <button
                                                onClick={limpiarPadFirma}
                                                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
                                            >
                                                🗑️ Limpiar
                                            </button>
                                            <button
                                                onClick={guardarFirmaDibujada}
                                                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                                            >
                                                ✓ Usar esta firma
                                            </button>
                                        </div>

                                        <p className="text-xs text-gray-500 mt-3 text-center">
                                            💡 La firma se procesará automáticamente si tienes activada la opción
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Panel derecho: Lista de estudiantes */}
                        <div className="bg-white rounded-2xl shadow-xl p-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">
                                👥 Estudiantes ({institucionSeleccionada.estudiantes.length})
                            </h3>

                            <div className="space-y-2 max-h-[600px] overflow-y-auto">
                                {institucionSeleccionada.estudiantes.map((est, index) => {
                                    const tieneFirma = firmasCapturadas[est.documento];
                                    const esSeleccionado = estudianteActual?.id === est.id;

                                    return (
                                        <div className="w-full">
                                            <button
                                                onClick={() => {
                                                    setEstudianteActual(est);
                                                    setPuntoInicio(null);
                                                    setPuntoFin(null);
                                                    setAreaSeleccionada(null);
                                                    setModoEditor(false);
                                                    setAnguloRotacion(0);
                                                    setModo('select');
                                                }}
                                                className={`w-full p-3 rounded-lg text-left transition-all ${esSeleccionado
                                                    ? 'bg-purple-500 text-white'
                                                    : tieneFirma
                                                        ? 'bg-green-100 hover:bg-green-200'
                                                        : 'bg-gray-100 hover:bg-gray-200'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex-1">
                                                        <p className="font-semibold text-sm">
                                                            {index + 1}. {est.primerNombre} {est.primerApellido}
                                                        </p>
                                                        <p className={`text-xs ${esSeleccionado ? 'text-purple-100' : 'text-gray-600'}`}>
                                                            {est.documento}
                                                        </p>
                                                    </div>
                                                    {tieneFirma && (
                                                        <CheckCircle
                                                            size={20}
                                                            className={esSeleccionado ? 'text-white' : 'text-green-600'}
                                                        />
                                                    )}
                                                </div>
                                            </button>

                                            {/* Botón para borrar firma */}
                                            {tieneFirma && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        borrarFirma(est.documento);
                                                    }}
                                                    className="w-full mt-2 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-xs font-semibold flex items-center justify-center gap-2"
                                                >
                                                    🗑️ Eliminar firma
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                                <p className="text-xs text-yellow-900 font-semibold mb-2">
                                    💡 Instrucciones:
                                </p>
                                <ol className="text-xs text-yellow-800 space-y-1 list-decimal list-inside">
                                    <li>Activa procesamiento automático</li>
                                    <li>Selecciona un estudiante</li>
                                    <li>Usa "Mover" para navegar</li>
                                    <li>Cambia a "Seleccionar"</li>
                                    <li>Dibuja rectángulo GRANDE en la firma</li>
                                    <li>Click "Editar / Rotar"</li>
                                    <li>Rota hasta alinear horizontal</li>
                                    <li>Usa borrador para limpiar</li>
                                    <li>Aplica cambios y guarda</li>
                                </ol>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExtractorFirmasVisual;