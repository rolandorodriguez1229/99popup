'use client';
import React, { useState } from 'react';

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [jobNumber, setJobNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !jobNumber) {
      setMessage('Por favor selecciona un archivo y proporciona el número de trabajo');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('jobNumber', jobNumber);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage('Archivo procesado exitosamente');
        setFile(null);
        setJobNumber('');
      } else {
        setMessage(data.error || 'Error al procesar el archivo');
      }
    } catch (error) {
      setMessage('Error al subir el archivo');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl p-6">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Subir Archivo XML</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Número de Trabajo
            </label>
            <input
              type="text"
              value={jobNumber}
              onChange={(e) => setJobNumber(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Archivo XML
            </label>
            <input
              type="file"
              accept=".xml"
              onChange={(e) => setFile(e.target.files[0])}
              className="mt-1 block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-indigo-50 file:text-indigo-700
                hover:file:bg-indigo-100"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
              loading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {loading ? 'Procesando...' : 'Subir Archivo'}
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
