'use client';
import { useState } from 'react';
import { FiUpload, FiCheckCircle, FiXCircle, FiInfo, FiSkipForward } from 'react-icons/fi';

export default function FileUploader() {
  const [files, setFiles] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [confirmReplace, setConfirmReplace] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [processedFiles, setProcessedFiles] = useState(0);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [xmlFiles, setXmlFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [stats, setStats] = useState({ success: 0, skipped: 0, errors: 0 });

  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files).filter(file => file.name.endsWith('.xml'));
    setXmlFiles(selectedFiles);
    setFiles(event.target.files);
    setUploadStatus('');
    setConfirmReplace(null);
    setProgress(0);
    setProcessedFiles(0);
    setCurrentFileIndex(0);
    setStats({ success: 0, skipped: 0, errors: 0 });
  };

  const uploadFile = async (file, replaceExisting = false) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('replaceExisting', replaceExisting.toString());

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.status === 409) {
        // Si el bundle ya existe, ahora automáticamente lo saltamos
        // en lugar de pedir confirmación
        console.log(`Bundle ya existe: ${result.jobNumber}-${result.bundleName}, saltando...`);
        return 'skipped';
      }

      if (!response.ok) {
        throw new Error(result.error || 'Error en la subida');
      }

      return 'success';
    } catch (error) {
      console.error('Error:', error);
      return 'error';
    }
  };

  const continueUpload = async () => {
    let localStats = { ...stats };
    
    setIsUploading(true);
    
    try {
      for (let i = currentFileIndex; i < xmlFiles.length; i++) {
        setCurrentFileIndex(i);
        const file = xmlFiles[i];
        
        const result = await uploadFile(file);
        
        if (result === 'success') {
          localStats.success++;
        } else if (result === 'skipped') {
          localStats.skipped++;
        } else {
          localStats.errors++;
        }

        setStats(localStats);
        setProcessedFiles(i + 1);
        setProgress(((i + 1) / xmlFiles.length) * 100);
      }

      // Si llegamos aquí, hemos terminado con todos los archivos
      setUploadStatus(`Proceso completado. ${localStats.success} archivos subidos, ${localStats.skipped} omitidos, ${localStats.errors} errores.`);
      setCurrentFileIndex(0); // Reseteamos para futuras subidas
    } catch (error) {
      console.error('Error en continueUpload:', error);
      setUploadStatus(`Error en el proceso: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpload = async () => {
    if (!files || xmlFiles.length === 0) {
      setUploadStatus('Por favor, selecciona una carpeta con archivos XML.');
      return;
    }

    setTotalFiles(xmlFiles.length);
    setProcessedFiles(0);
    setProgress(0);
    setCurrentFileIndex(0);
    setStats({ success: 0, skipped: 0, errors: 0 });
    setUploadStatus('Subiendo archivos...');
    
    await continueUpload();
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
          />
        </label>
        
        {xmlFiles.length > 0 && (
          <div className="mt-2 text-sm text-gray-300">
            {xmlFiles.length} archivos XML seleccionados
          </div>
        )}
      </div>
      
      <button
        onClick={handleUpload}
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
            <span>Subiendo...</span>
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
    </div>
  );
}
