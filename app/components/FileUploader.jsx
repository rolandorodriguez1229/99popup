'use client'; // Importante para componentes que manejan eventos

import { useState } from 'react';

export default function FileUploader() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return alert('Selecciona un archivo');

    setLoading(true);

    // Aquí se deberían extraer los datos del XML y convertirlos en un formato adecuado
    const jobNumber = '12345'; // Simulación de número de trabajo
    const members = [{ type: 'stud' }, { type: 'other' }]; // Simulación de datos

    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobNumber, fileName: file.name, members })
    });

    setLoading(false);

    if (response.ok) {
      alert('Archivo subido correctamente');
    } else {
      alert('Error al subir el archivo');
    }
  };

  return (
    <div>
      <input type="file" onChange={handleFileChange} />
      <button onClick={handleUpload} disabled={loading}>
        {loading ? 'Subiendo...' : 'Subir Archivo'}
      </button>
    </div>
  );
}
