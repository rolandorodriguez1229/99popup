'use client'; // Importante para componentes que manejan eventos

import { useState } from 'react';

export default function FileUploader() {
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) {
      setUploadStatus('Por favor, selecciona un archivo.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setUploadStatus('Subiendo archivo...');

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error en la subida');
      }

      setUploadStatus('Archivo subido y procesado correctamente.');
    } catch (error) {
      console.error('Error:', error);
      setUploadStatus(`Error: ${error.message}`);
    }
  };

  return (
    <div className="file-uploader">
      <input type="file" accept=".xml" onChange={handleFileChange} />
      <button onClick={handleUpload}>Subir Archivo</button>
      <p>{uploadStatus}</p>
    </div>
  );
}

