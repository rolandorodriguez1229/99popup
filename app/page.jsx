'use client';
import React, { useState } from 'react';

export default function UploadPage() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleFileChange = (e) => {
    // Filtrar solo archivos XML
    const xmlFiles = Array.from(e.target.files).filter(file => 
      file.name.toLowerCase().endsWith('.xml')
    );
    setFiles(xmlFiles);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (files.length === 0) {
      setMessage('Por favor selecciona archivos XML');
      return;
    }

    setLoading(true);
    const results = [];

    try {
      // Procesar cada archivo
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();
        results.push({
          fileName: file.name,
          success: data.success,
          message: data.message,
          error: data.error
        });
      }

      // Mostrar resumen de resultados
      const successful = results.filter(r => r.success).length;
      setMessage(`Procesados ${successful} de ${files.length} archivos exitosamente`);
      setFiles([]);
    } catch (error) {
      setMessage('Error al procesar los archivos');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl p-6">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Subir Archivos XML</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Seleccionar Carpeta
            </label>
            <input
              type="file"
              accept=".xml"
              webkitdirectory="true"
              directory="true"
              onChange={handleFileChange}
              className="mt-1 block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-indigo-50 file:text-indigo-700
                hover:file:bg-indigo-100"
            />
          </div>

          {files.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700">Archivos XML encontrados:</h3>
              <ul className="mt-2 text-sm text-gray-600">
                {files.map((file, index) => (
                  <li key={index} className="truncate">
                    {file.webkitRelativePath || file.name}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-sm text-gray-500">
                Total: {files.length} archivos
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || files.length === 0}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
              loading || files.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {loading ? 'Procesando...' : 'Subir Archivos'}
          </button>
        </form>

        {message && (
          <div className={`mt-4 p-4 rounded-md ${
            message.includes('exitosamente') 
              ? 'bg-green-50 text-green-700' 
              : 'bg-red-50 text-red-700'
          }`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}