'use client';
import { useState, useRef } from 'react';
import { FiUpload, FiCheckCircle, FiXCircle, FiInfo, FiSkipForward, FiAlertTriangle } from 'react-icons/fi';

export default function FileUploader() {
  const [uploadStatus, setUploadStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [processedFiles, setProcessedFiles] = useState(0);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [xmlFiles, setXmlFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [stats, setStats] = useState({ success: 0, skipped: 0, errors: 0 });
  const [failedFiles, setFailedFiles] = useState([]);
  const [showFailedFiles, setShowFailedFiles] = useState(false);
  
  // Referencia para rastrear si el componente está montado
  const isMounted = useRef(true);
  
  // Asegurarse de que no actualizamos el estado después de desmontar
  useState(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files).filter(file => file.name.endsWith('.xml'));
    setXmlFiles(selectedFiles);
    setUploadStatus('');
    setProgress(0);
    setProcessedFiles(0);
    setCurrentFileIndex(0);
    setStats({ success: 0, skipped: 0, errors: 0 });
    setFailedFiles([]);
    setShowFailedFiles(false);
  };

  // Función mejorada para subir archivos por lotes con manejo de errores robusto
  const uploadFilesInBatches = async () => {
    if (!xmlFiles || xmlFiles.length === 0) {
      setUploadStatus('Por favor, selecciona una carpeta con archivos XML.');
      return;
    }

    setTotalFiles(xmlFiles.length);
    setProcessedFiles(0);
    setProgress(0);
    setCurrentFileIndex(0);
    setStats({ success: 0, skipped: 0, errors: 0 });
    setFailedFiles([]);
    setUploadStatus('Subiendo archivos...');
    setIsUploading(true);
    
    let localStats = { success: 0, skipped: 0, errors: 0 };
    let localFailedFiles = [];
    
    try {
      // Procesar archivos en lotes más pequeños para evitar problemas de conexión
      const batchSize = 1; // Procesar 1 archivo a la vez para mayor estabilidad
      
      for (let i = 0; i < xmlFiles.length; i += batchSize) {
        if (!isMounted.current) return; // Detener si el componente se desmontó
        
        // Tomar un lote de archivos
        const batch = xmlFiles.slice(i, i + batchSize);
        
        // Procesar cada archivo en el lote secuencialmente
        for (const file of batch) {
          if (!isMounted.current) return; // Detener si el componente se desmontó
          
          setCurrentFileIndex(i + batch.indexOf(file));
          const currentIndex = i + batch.indexOf(file);
          
          // Actualizar estado para mostrar el archivo actual
          setUploadStatus(`Procesando archivo ${currentIndex + 1} de ${xmlFiles.length}: ${file.name}`);
          
          // Verificar tamaño del archivo
          if (file.size > 15 * 1024 * 1024) { // 15MB límite
            console.warn(`Archivo ${file.name} excede el límite recomendado de 15MB`);
          }
          
          // Intentar subir el archivo con reintentos
          let result = null;
          let attempts = 0;
          const maxAttempts = 2; // Máximo 2 intentos por archivo
          
          while (attempts < maxAttempts && result !== 'success' && result !== 'skipped') {
            if (attempts > 0) {
              // Esperar antes de reintentar
              await new Promise(resolve => setTimeout(resolve, 1000));
              setUploadStatus(`Reintentando archivo ${currentIndex + 1} (intento ${attempts + 1})...`);
            }
            
            try {
              // Subir el archivo usando la API existente
              result = await uploadFile(file);
              attempts++;
            } catch (fileError) {
              console.error(`Error en intento ${attempts + 1} para ${file.name}:`, fileError);
              attempts++;
              // Continuar con el siguiente intento
            }
          }
          
          if (result === 'success') {
            localStats.success++;
          } else if (result === 'skipped') {
            localStats.skipped++;
          } else {
            localStats.errors++;
            localFailedFiles.push({
              name: file.name,
              path: file.webkitRelativePath || file.name,
              size: file.size,
              error: `No se pudo subir después de ${maxAttempts} intentos`
            });
          }
          
          if (isMounted.current) {
            setStats({...localStats});
            setFailedFiles([...localFailedFiles]);
            setProcessedFiles(currentIndex + 1);
            setProgress(Math.min(100, Math.round(((currentIndex + 1) / xmlFiles.length) * 100)));
          }
          
          // Pequeña pausa entre archivos para evitar sobrecarga
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      if (isMounted.current) {
        const statusMessage = `Proceso completado. ${localStats.success} archivos subidos, ${localStats.skipped} omitidos, ${localStats.errors} errores.`;
        setUploadStatus(statusMessage);
        
        // Si hay archivos fallidos, mostrar opción para ver detalles
        if (localStats.errors > 0) {
          console.error('Archivos fallidos:', localFailedFiles);
        }
      }
    } catch (error) {
      console.error('Error general al subir archivos:', error);
      if (isMounted.current) {
        setUploadStatus(`Error en el proceso: ${error.message}. Se procesaron ${processedFiles} de ${totalFiles} archivos.`);
      }
    } finally {
      if (isMounted.current) {
        setIsUploading(false);
      }
    }
  };

  const uploadFile = async (file, replaceExisting = false) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('replaceExisting', replaceExisting.toString());

    try {
      // Establecer un timeout para la solicitud
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 segundos timeout
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      const result = await response.json();

      if (response.status === 409) {
        console.log(`Bundle ya existe: ${result.jobNumber}-${result.bundleName}, saltando...`);
        return 'skipped';
      }

      if (!response.ok) {
        throw new Error(result.error || 'Error en la subida');
      }

      return 'success';
    } catch (error) {
      console.error(`Error al subir ${file.name}:`, error);
      
      // Manejar errores específicos
      if (error.name === 'AbortError') {
        console.error('La solicitud fue abortada por timeout');
      }
      
      return 'error';
    }
  };

  // Función para reintentar archivos fallidos
  const retryFailedFiles = async () => {
    if (failedFiles.length === 0 || isUploading) return;
    
    setIsUploading(true);
    setUploadStatus('Reintentando archivos fallidos...');
    
    const filesToRetry = failedFiles.map(f => 
      xmlFiles.find(file => file.name === f.name)
    ).filter(Boolean);
    
    setXmlFiles(filesToRetry);
    setFailedFiles([]);
    setShowFailedFiles(false);
    
    // Esperar un momento antes de iniciar la nueva carga
    setTimeout(() => {
      uploadFilesInBatches();
    }, 1000);
  };

  return (
    <div className="p-4 bg-gray-800 rounded-lg">
      <div className="mb-4">
        <label className="flex items-center gap-2 cursor-pointer bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded w-full justify-center transition-colors">
          <FiUpload size={20} />
          <span className="font-medium">Seleccionar carpeta con XML</span>
          <input
            type="file"
            webkitdirectory="true"
            directory="true"
            multiple
            onChange={handleFileChange}
            className="hidden"
            disabled={isUploading}
          />
        </label>
        
        {xmlFiles.length > 0 && (
          <div className="mt-2 text-sm text-gray-300">
            {xmlFiles.length} archivos XML seleccionados
          </div>
        )}
      </div>
      
      <button
        onClick={uploadFilesInBatches}
        disabled={isUploading || xmlFiles.length === 0}
        className={`w-full ${
          isUploading || xmlFiles.length === 0 
            ? 'bg-gray-600 cursor-not-allowed' 
            : 'bg-green-600 hover:bg-green-700'
        } text-white px-4 py-3 rounded font-medium transition-colors flex items-center justify-center gap-2`}
      >
        {isUploading ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
            <span>Subiendo... {processedFiles}/{totalFiles}</span>
          </>
        ) : (
          <>
            <FiUpload />
            <span>Subir Archivos</span>
          </>
        )}
      </button>
      
      {/* Barra de progreso */}
      {progress > 0 && (
        <div className="mt-4">
          <div className="w-full bg-gray-700 rounded-full h-2.5">
            <div 
              className="bg-purple-500 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="flex flex-wrap items-center justify-between text-gray-300 text-sm mt-2">
            <div>Procesando: {processedFiles} de {totalFiles} archivos</div>
            <div className="flex gap-4">
              <span className="text-green-400 flex items-center gap-1">
                <FiCheckCircle />
                {stats.success}
              </span>
              <span className="text-blue-400 flex items-center gap-1">
                <FiSkipForward />
                {stats.skipped}
              </span>
              <span className="text-red-400 flex items-center gap-1">
                <FiXCircle />
                {stats.errors}
              </span>
            </div>
          </div>
        </div>
      )}

      {uploadStatus && (
        <div className={`mt-4 p-3 rounded ${
          uploadStatus.includes('Error') 
            ? 'bg-red-900/30 text-red-300 border border-red-700/50' 
            : uploadStatus.includes('completado') 
              ? 'bg-green-900/30 text-green-300 border border-green-700/50'
              : 'bg-blue-900/30 text-blue-300 border border-blue-700/50'
        }`}>
          {uploadStatus}
        </div>
      )}
      
      {/* Sección de archivos fallidos */}
      {failedFiles.length > 0 && !isUploading && (
        <div className="mt-4">
          <div className="flex justify-between items-center">
            <button 
              onClick={() => setShowFailedFiles(!showFailedFiles)}
              className="text-amber-400 flex items-center gap-2 text-sm"
            >
              <FiAlertTriangle />
              <span>{failedFiles.length} archivos fallidos</span>
              <span>{showFailedFiles ? '(ocultar)' : '(mostrar)'}</span>
            </button>
            
            <button
              onClick={retryFailedFiles}
              className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1 rounded text-sm"
            >
              Reintentar fallidos
            </button>
          </div>
          
          {showFailedFiles && (
            <div className="mt-2 bg-gray-900/50 rounded p-2 max-h-40 overflow-y-auto text-xs">
              {failedFiles.map((file, index) => (
                <div key={index} className="text-red-300 mb-1 border-b border-gray-700 pb-1">
                  {file.path} - {(file.size / 1024).toFixed(1)} KB
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
