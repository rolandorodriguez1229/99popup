'use client'; // Importante para componentes que manejan eventos

import { useState } from 'react';

export default function FileUploader() {
  const [files, setFiles] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');

  const handleFileChange = (event) => {
    setFiles(event.target.files);
  };

  const handleUpload = async () => {
    if (!files || files.length === 0) {
      setUploadStatus('Por favor, selecciona una carpeta con archivos XML.');
      return;
    }

    setUploadStatus('Subiendo archivos...');
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.name.endsWith('.xml')) continue;

      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Error en la subida');
        }
        successCount++;
      } catch (error) {
        console.error('Error:', error);
        errorCount++;
      }
    }

    setUploadStatus(`Proceso completado. ${successCount} archivos subidos correctamente. ${errorCount} errores.`);
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
      <p className="mt-4 text-gray-300">{uploadStatus}</p>
    </div>
  );
}

