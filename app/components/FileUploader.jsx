'use client'; // Importante para componentes que manejan eventos

import { useState } from 'react';

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

    for (let i = currentFileIndex; i < xmlFiles.length; i++) {
      setCurrentFileIndex(i);
      const file = xmlFiles[i];
      
      const result = await uploadFile(file);
      if (result === 'success') {
        successCount++;
      } else if (result === 'pending') {
        setProcessedFiles(i);
        setProgress((i / xmlFiles.length) * 100);
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
      const result = await uploadFile(pendingFile, true);
      if (result === 'success') {
        setCurrentFileIndex(currentFileIndex + 1);
        await continueUpload(); // Continuamos con el siguiente archivo
      } else {
        setUploadStatus('Error al reemplazar el bundle.');
      }
    } else {
      // Si no se confirma, saltamos este archivo y continuamos con el siguiente
      setCurrentFileIndex(currentFileIndex + 1);
      await continueUpload();
    }
    setConfirmReplace(null);
    setPendingFile(null);
  };

  return (
    <div className="p-4 bg-gray-800 rounded-lg">
      <input
        type="file"
        webkitdirectory="true"
        directory="true"
        multiple
        onChange={handleFileChange}
        className="mb-4 text-gray-300"
      />
      <button
        onClick={handleUpload}
        className="w-full bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded"
      >
        Subir Archivos
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
        <div className="mt-4 p-4 bg-gray-700 rounded">
          <p className="text-white mb-3">
            El bundle {confirmReplace.bundleName} del trabajo {confirmReplace.jobNumber} ya existe en la base de datos. ¿Deseas reemplazarlo?
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => handleConfirmReplace(true)}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
            >
              Sí, reemplazar
            </button>
            <button
              onClick={() => handleConfirmReplace(false)}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
            >
              No, omitir
            </button>
          </div>
        </div>
      )}

      <p className="mt-4 text-gray-300">{uploadStatus}</p>
    </div>
  );
}

