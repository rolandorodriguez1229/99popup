'use client';
import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FiUploadCloud, FiCheck, FiAlertCircle, FiFile, FiFolder } from 'react-icons/fi';
import JobsList from './components/JobsList';

export default function Home() {
  const [uploadStatus, setUploadStatus] = useState('idle');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [currentJobNumber, setCurrentJobNumber] = useState(null);

  const extractJobNumber = (folderPath) => {
    // Extraer el último segmento del path como número de trabajo
    const parts = folderPath.split('/');
    const lastPart = parts[parts.length - 1];
    return lastPart;
  };

  const handleFolderSelect = async (event) => {
    const directory = event.target.files;
    if (directory.length === 0) return;

    // Obtener el job number del nombre de la carpeta
    const folderPath = directory[0].webkitRelativePath.split('/')[0];
    const jobNumber = extractJobNumber(folderPath);
    
    setCurrentJobNumber(jobNumber);
    setUploadStatus('uploading');

    try {
      const uploads = Array.from(directory).map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('jobNumber', jobNumber);
        formData.append('relativePath', file.webkitRelativePath);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) throw new Error('Upload failed');
        
        const data = await response.json();
        return {
          name: file.name,
          size: file.size,
          type: file.type,
          jobNumber: jobNumber,
          path: file.webkitRelativePath,
          uploadedAt: new Date(),
          ...data
        };
      });

      const results = await Promise.all(uploads);
      setUploadedFiles(prev => [...prev, ...results]);
      setUploadStatus('success');
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('error');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <main className="min-h-screen py-8 bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            99popup File Upload
          </h1>
          <p className="text-gray-300 max-w-2xl mx-auto">
            Selecciona la carpeta del trabajo para subir todos sus archivos automáticamente.
          </p>
        </div>

        {/* Upload Section */}
        <div className="glass-card rounded-2xl p-8 mb-8">
          <div className="border-2 border-dashed rounded-xl p-8 text-center transition-all hover:border-green-500 hover:bg-green-500/5">
            <div className="flex flex-col items-center gap-4">
              <FiFolder className="w-12 h-12 text-green-500" />
              <div className="space-y-2">
                <label htmlFor="folder-input" className="text-lg font-medium text-white cursor-pointer hover:text-green-400 transition-colors inline-block">
                  Seleccionar Carpeta de Trabajo
                </label>
                <input
                  id="folder-input"
                  type="file"
                  // Atributos para selección de carpeta
                  {...{
                    webkitdirectory: "",
                    mozdirectory: "",
                    directory: "",
                  }}
                  className="hidden"
                  onChange={handleFolderSelect}
                />
                <p className="text-gray-400">
                  El sistema subirá todos los archivos de la carpeta seleccionada
                </p>
              </div>
            </div>
          </div>

          {/* Lista de archivos subidos */}
          {uploadedFiles.length > 0 && (
            <div className="mt-6">
              <h3 className="text-white font-medium mb-3">
                Archivos subidos al trabajo #{currentJobNumber}:
              </h3>
              <div className="space-y-2">
                {uploadedFiles.map((file, index) => (
                  <div 
                    key={`${file.path}-${index}`}
                    className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50"
                  >
                    <FiFile className="text-green-500 w-5 h-5" />
                    <div className="flex-1">
                      <p className="text-white text-sm">{file.name}</p>
                      <p className="text-gray-400 text-xs">
                        {formatFileSize(file.size)} - {file.path}
                      </p>
                    </div>
                    <FiCheck className="text-green-500 w-5 h-5" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status Indicators */}
          {uploadStatus === 'uploading' && (
            <div className="mt-6 p-4 bg-green-500/10 rounded-lg flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-green-500 border-t-transparent"></div>
              <span className="text-green-400">
                Subiendo archivos del trabajo #{currentJobNumber}...
              </span>
            </div>
          )}

          {uploadStatus === 'success' && uploadedFiles.length > 0 && (
            <div className="mt-6 p-4 bg-green-500/10 rounded-lg flex items-center gap-3">
              <FiCheck className="text-green-500 w-5 h-5" />
              <span className="text-green-400">
                ¡Archivos subidos exitosamente al trabajo #{currentJobNumber}!
              </span>
            </div>
          )}

          {uploadStatus === 'error' && (
            <div className="mt-6 p-4 bg-red-500/10 rounded-lg flex items-center gap-3">
              <FiAlertCircle className="text-red-500 w-5 h-5" />
              <span className="text-red-400">Error al subir los archivos. Por favor, intenta nuevamente.</span>
            </div>
          )}
        </div>

        {/* Jobs List Section */}
        <JobsList />

        {/* Features Section */}
        <div className="grid md:grid-cols-3 gap-6 mt-8">
          <FeatureCard 
            title="Selección de Carpeta"
            description="Sube todos los archivos de una carpeta de trabajo con un solo clic"
            icon="📁"
          />
          <FeatureCard 
            title="Detección Automática"
            description="Identificación automática del número de trabajo"
            icon="🔍"
          />
          <FeatureCard 
            title="Carga Múltiple"
            description="Procesa múltiples archivos simultáneamente"
            icon="⚡"
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