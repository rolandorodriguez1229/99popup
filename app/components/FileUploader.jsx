'use client'; // Importante para componentes que manejan eventos

import { useState } from 'react';
import { FiUpload, FiCheckCircle, FiXCircle, FiInfo } from 'react-icons/fi';

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

  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files).filter(file => file.name.endsWith('.xml'));
    setXmlFiles(selectedFiles);
    setFiles(event.target.files);
    setUploadStatus('');
    setConfirmReplace(null);
    setProgress(0);
    setProcessedFiles(0);
    setCurrentFileIndex(0);
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
        setPendingFile(file);
        setConfirmReplace({
          jobNumber: result.jobNumber,
          bundleName: result.bundleName
        });
        return 'pending';
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
    let successCount = 0;
    let errorCount = 0;
    
    setIsUploading(true);
    
    try {
      for (let i = currentFileIndex; i < xmlFiles.length; i++) {
        setCurrentFileIndex(i);
        const file = xmlFiles[i];
        
        const result = await uploadFile(file);
        if (result === 'success') {
          successCount++;
        } else if (result === 'pending') {
          setProcessedFiles(i);
          setProgress((i / xmlFiles.length) * 100);
          setIsUploading(false);
          return; // Pausamos el proceso hasta la confirmación
        } else {
          errorCount++;
        }

        setProcessedFiles(i + 1);
        setProgress(((i + 1) / xmlFiles.length) * 100);
      }

      // Si llegamos aquí, hemos terminado con todos los archivos
      setUploadStatus(`Proceso completado. ${successCount} archivos subidos correctamente. ${errorCount} errores.`);
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
    setUploadStatus('Subiendo archivos...');
    
    await continueUpload();
  };

  const handleConfirmReplace = async (confirm) => {
    if (confirm && pendingFile) {
      setUploadStatus('Reemplazando bundle...');
      
      try {
        const result = await uploadFile(pendingFile, true);
        
        if (result === 'success') {
          // Incrementamos el índice para continuar con el siguiente archivo
          const nextIndex = currentFileIndex + 1;
          setCurrentFileIndex(nextIndex);
          
          // Actualizamos el progreso
          setProcessedFiles(nextIndex);
          setProgress((nextIndex / xmlFiles.length) * 100);
          
          // Continuamos con el resto de la subida
          await continueUpload();
        } else {
          setUploadStatus('Error al reemplazar el bundle.');
        }
      } catch (error) {
        console.error('Error al reemplazar:', error);
        setUploadStatus(`Error al reemplazar: ${error.message}`);
      }
    } else {
      // Si no se confirma, simplemente saltamos este archivo y continuamos con el siguiente
      const nextIndex = currentFileIndex + 1;
      setCurrentFileIndex(nextIndex);
      
      // Actualizamos el progreso
      setProcessedFiles(nextIndex);
      setProgress((nextIndex / xmlFiles.length) * 100);
      
      if (nextIndex < xmlFiles.length) {
        // Continuamos con el resto de la subida si hay más archivos
        await continueUpload();
      } else {
        // Si no hay más archivos, finalizamos
        setUploadStatus('Proceso completado.');
      }
    }
    
    // Limpiamos el estado de confirmación
    setConfirmReplace(null);
    setPendingFile(null);
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
      {progress > 0 && !confirmReplace && (
        <div className="mt-4">
          <div className="w-full bg-gray-700 rounded-full h-2.5">
            <div 
              className="bg-purple-500 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-gray-300 text-sm mt-2">
            Procesando: {processedFiles} de {totalFiles} archivos
          </p>
        </div>
      )}
      
      {/* Diálogo de confirmación */}
      {confirmReplace && (
        <div className="mt-4 p-4 bg-gray-700 rounded-lg border border-yellow-500/30">
          <div className="flex items-start gap-3 mb-3">
            <FiInfo className="text-yellow-400 text-lg flex-shrink-0 mt-1" />
            <p className="text-white">
              El bundle <span className="font-medium text-yellow-300">{confirmReplace.bundleName}</span> del trabajo <span className="font-medium text-yellow-300">{confirmReplace.jobNumber}</span> ya existe en la base de datos. ¿Deseas reemplazarlo?
            </p>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => handleConfirmReplace(true)}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center justify-center gap-2 transition-colors"
              disabled={isUploading}
            >
              <FiCheckCircle />
              <span>Sí, reemplazar</span>
            </button>
            <button
              onClick={() => handleConfirmReplace(false)}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded flex items-center justify-center gap-2 transition-colors"
              disabled={isUploading}
            >
              <FiXCircle />
              <span>No, omitir</span>
            </button>
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
