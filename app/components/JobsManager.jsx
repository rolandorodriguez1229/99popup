'use client';
import { useState, useEffect } from 'react';
import { FiTrash2, FiRefreshCw, FiAlertTriangle, FiCheck } from 'react-icons/fi';
import { supabase } from '@/lib/supabase';

export default function JobsManager() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState(null);
  const [selectedJobs, setSelectedJobs] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  
  // Cargar trabajos al montar el componente
  useEffect(() => {
    fetchJobs();
  }, []);
  
  // Función para obtener todos los trabajos
  const fetchJobs = async () => {
    setLoading(true);
    setMessage(null);
    
    try {
      // Obtener todos los bundles agrupados por job_number
      const { data, error } = await supabase
        .from('bundle99')
        .select('id, job_number, bundle_name')
        .order('job_number', { ascending: true })
        .order('bundle_name', { ascending: true });
      
      if (error) throw error;
      
      // Agrupar por job_number
      const jobsMap = {};
      data.forEach(bundle => {
        if (!jobsMap[bundle.job_number]) {
          jobsMap[bundle.job_number] = {
            jobNumber: bundle.job_number,
            bundles: []
          };
        }
        jobsMap[bundle.job_number].bundles.push({
          id: bundle.id,
          name: bundle.bundle_name
        });
      });
      
      setJobs(Object.values(jobsMap));
    } catch (error) {
      console.error('Error al cargar trabajos:', error);
      setMessage({
        type: 'error',
        text: 'Error al cargar trabajos: ' + error.message
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Función para eliminar trabajos seleccionados
  const deleteSelectedJobs = async () => {
    if (selectedJobs.length === 0 && !selectAll) {
      setMessage({
        type: 'warning',
        text: 'No hay trabajos seleccionados para eliminar'
      });
      return;
    }
    
    // Confirmar eliminación
    const confirmMessage = selectAll 
      ? '¿Estás seguro de que quieres eliminar TODOS los trabajos? Esta acción no se puede deshacer.'
      : `¿Estás seguro de que quieres eliminar ${selectedJobs.length} trabajos seleccionados? Esta acción no se puede deshacer.`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }
    
    setDeleting(true);
    setMessage(null);
    
    try {
      const response = await fetch('/api/delete-jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobNumbers: selectAll ? null : selectedJobs,
          deleteAll: selectAll
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Error al eliminar trabajos');
      }
      
      setMessage({
        type: 'success',
        text: result.message || 'Trabajos eliminados correctamente'
      });
      
      // Limpiar selección y recargar trabajos
      setSelectedJobs([]);
      setSelectAll(false);
      fetchJobs();
      
    } catch (error) {
      console.error('Error al eliminar trabajos:', error);
      setMessage({
        type: 'error',
        text: 'Error al eliminar trabajos: ' + error.message
      });
    } finally {
      setDeleting(false);
    }
  };
  
  // Manejar selección de trabajos
  const handleJobSelection = (jobNumber) => {
    setSelectedJobs(prev => {
      if (prev.includes(jobNumber)) {
        return prev.filter(j => j !== jobNumber);
      } else {
        return [...prev, jobNumber];
      }
    });
  };
  
  // Manejar selección de todos los trabajos
  const handleSelectAll = () => {
    setSelectAll(!selectAll);
    if (!selectAll) {
      setSelectedJobs(jobs.map(job => job.jobNumber));
    } else {
      setSelectedJobs([]);
    }
  };
  
  return (
    <div className="p-4 bg-gray-800 rounded-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">Administrar Trabajos XML</h2>
        
        <div className="flex gap-2">
          <button
            onClick={fetchJobs}
            disabled={loading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded transition-colors"
          >
            <FiRefreshCw className={loading ? "animate-spin" : ""} />
            <span>Actualizar</span>
          </button>
          
          <button
            onClick={deleteSelectedJobs}
            disabled={deleting || (selectedJobs.length === 0 && !selectAll)}
            className={`flex items-center gap-2 ${
              deleting || (selectedJobs.length === 0 && !selectAll)
                ? "bg-gray-600 cursor-not-allowed"
                : "bg-red-600 hover:bg-red-700"
            } text-white px-3 py-2 rounded transition-colors`}
          >
            <FiTrash2 />
            <span>{deleting ? "Eliminando..." : "Eliminar seleccionados"}</span>
          </button>
        </div>
      </div>
      
      {message && (
        <div className={`mb-4 p-3 rounded flex items-center gap-2 ${
          message.type === 'error' 
            ? 'bg-red-900/30 text-red-300 border border-red-700/50' 
            : message.type === 'success'
              ? 'bg-green-900/30 text-green-300 border border-green-700/50'
              : 'bg-amber-900/30 text-amber-300 border border-amber-700/50'
        }`}>
          {message.type === 'error' && <FiAlertTriangle />}
          {message.type === 'success' && <FiCheck />}
          {message.type === 'warning' && <FiAlertTriangle />}
          <span>{message.text}</span>
        </div>
      )}
      
      <div className="mb-4 flex items-center gap-2">
        <label className="flex items-center gap-2 text-white cursor-pointer">
          <input
            type="checkbox"
            checked={selectAll}
            onChange={handleSelectAll}
            className="w-4 h-4 rounded"
          />
          <span className="font-medium">Seleccionar todos los trabajos</span>
        </label>
        
        {selectedJobs.length > 0 && !selectAll && (
          <span className="text-gray-400 text-sm">
            ({selectedJobs.length} trabajos seleccionados)
          </span>
        )}
      </div>
      
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto"></div>
          <p className="text-gray-400 mt-2">Cargando trabajos...</p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          No hay trabajos disponibles
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.map(job => (
            <div 
              key={job.jobNumber}
              className={`p-4 rounded-lg border ${
                selectedJobs.includes(job.jobNumber) || selectAll
                  ? 'bg-blue-900/20 border-blue-700'
                  : 'bg-gray-800/50 border-gray-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedJobs.includes(job.jobNumber) || selectAll}
                    onChange={() => handleJobSelection(job.jobNumber)}
                    disabled={selectAll}
                    className="w-4 h-4 rounded"
                  />
                  <span className="font-bold text-white">{job.jobNumber}</span>
                </label>
                
                <span className="text-gray-400 text-sm">
                  {job.bundles.length} bundles
                </span>
              </div>
              
              <div className="mt-2 max-h-32 overflow-y-auto text-sm">
                <div className="grid grid-cols-2 gap-1">
                  {job.bundles.map(bundle => (
                    <div key={bundle.id} className="text-gray-300 truncate">
                      {bundle.name}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 