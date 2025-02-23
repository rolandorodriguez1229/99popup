'use client';
import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FiUploadCloud, FiCheck, FiAlertCircle } from 'react-icons/fi';
import JobsList from './components/JobsList';

export default function Home() {
  const [uploadStatus, setUploadStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const onDrop = useCallback(async (acceptedFiles) => {
    try {
      setUploadStatus('uploading');
      setMessage('Subiendo archivo...');
      
      const file = acceptedFiles[0];
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (response.ok) {
        setUploadStatus('success');
        setMessage(`¡Archivo procesado! Se guardaron ${result.membersCount} miembros.`);
      } else {
        throw new Error(result.error || 'Error al procesar el archivo');
      }
    } catch (error) {
      setUploadStatus('error');
      setMessage(error.message);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/xml': ['.xml']
    },
    multiple: false
  });

  return (
    <main className="min-h-screen py-8 bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            99popup File Upload
          </h1>
          <p className="text-gray-300 max-w-2xl mx-auto">
            Sube tus archivos de forma segura y rápida. Admitimos múltiples formatos para tu conveniencia.
          </p>
        </div>

        {/* Upload Section */}
        <div className="glass-card rounded-2xl p-8 mb-8">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer
              ${isDragActive 
                ? 'border-green-500 bg-green-500/10' 
                : 'border-gray-600 hover:border-green-500 hover:bg-green-500/5'}`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-4">
              <FiUploadCloud className="w-12 h-12 text-green-500" />
              <div className="space-y-2">
                <p className="text-lg font-medium text-white">
                  Arrastra archivos aquí o haz clic para seleccionar
                </p>
                <p className="text-gray-400">
                  Soportamos archivos PDF, DOCX, XLSX y más
                </p>
              </div>
            </div>
          </div>

          {/* Status Indicators */}
          {uploadStatus === 'uploading' && (
            <div className="mt-6 p-4 bg-green-500/10 rounded-lg flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-green-500 border-t-transparent"></div>
              <span className="text-green-400">Subiendo archivo...</span>
            </div>
          )}

          {uploadStatus === 'success' && (
            <div className="mt-6 p-4 bg-green-500/10 rounded-lg flex items-center gap-3">
              <FiCheck className="text-green-500 w-5 h-5" />
              <span className="text-green-400">¡Archivo subido exitosamente!</span>
            </div>
          )}

          {uploadStatus === 'error' && (
            <div className="mt-6 p-4 bg-red-500/10 rounded-lg flex items-center gap-3">
              <FiAlertCircle className="text-red-500 w-5 h-5" />
              <span className="text-red-400">Error al subir el archivo. Por favor, intenta nuevamente.</span>
            </div>
          )}
        </div>

        {/* Jobs List Section */}
        <JobsList />

        {/* Features Section */}
        <div className="grid md:grid-cols-3 gap-6 mt-8">
          <FeatureCard 
            title="Seguridad Avanzada"
            description="Encriptación de extremo a extremo para máxima protección"
            icon="🔐"
          />
          <FeatureCard 
            title="Velocidad Óptima"
            description="Transferencia de archivos ultra rápida"
            icon="⚡"
          />
          <FeatureCard 
            title="Compatibilidad Total"
            description="Soporte para todos los formatos principales"
            icon="📁"
          />
        </div>
      </div>
    </main>
  );
}

function FeatureCard({ title, description, icon }) {
  return (
    <div className="feature-card rounded-xl p-6">
      <div className="text-2xl mb-3">{icon}</div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-400 text-sm">{description}</p>
    </div>
  );
}