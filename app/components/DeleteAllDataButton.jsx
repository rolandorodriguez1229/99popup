'use client';
import { useState } from 'react';
import { FiTrash2, FiAlertTriangle } from 'react-icons/fi';
import { supabase } from '@/lib/supabase';

const DeleteAllDataButton = () => {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState(null);
  const [confirmText, setConfirmText] = useState('');

  const handleOpenConfirmation = () => {
    setShowConfirmation(true);
    setConfirmText('');
    setDeleteResult(null);
  };

  const handleCloseConfirmation = () => {
    setShowConfirmation(false);
    setConfirmText('');
    setDeleteResult(null);
  };

  const handleDeleteAllData = async () => {
    if (confirmText !== 'CONFIRMAR BORRADO') {
      setDeleteResult({
        success: false,
        message: 'Por favor, escribe "CONFIRMAR BORRADO" exactamente para continuar.'
      });
      return;
    }

    setIsDeleting(true);
    setDeleteResult(null);

    try {
      // Primero eliminar los miembros (debido a la restricción de clave foránea)
      const { error: membersError } = await supabase
        .from('members99')
        .delete()
        .neq('id', 0); // Usar .neq para eliminar todos

      if (membersError) throw membersError;

      // Luego eliminar los bundles
      const { error: bundlesError } = await supabase
        .from('bundle99')
        .delete()
        .neq('id', 0); // Usar .neq para eliminar todos

      if (bundlesError) throw bundlesError;

      setDeleteResult({
        success: true,
        message: 'Todos los datos han sido eliminados correctamente'
      });
      
      // Opcional: Recargar la página después de un breve retraso
      setTimeout(() => {
        window.location.reload();
      }, 3000);
      
    } catch (error) {
      console.error('Error al eliminar datos:', error);
      setDeleteResult({
        success: false,
        message: `Error al eliminar datos: ${error.message}`
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      {/* Botón para mostrar el diálogo de confirmación */}
      <button
        onClick={handleOpenConfirmation}
        className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors shadow-md"
      >
        <FiTrash2 />
        <span>Borrar todos los datos</span>
      </button>

      {/* Diálogo de confirmación */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full border border-red-500">
            <div className="flex items-start gap-4 mb-6">
              <FiAlertTriangle className="text-yellow-500 text-3xl flex-shrink-0" />
              <div>
                <h3 className="text-xl font-bold text-white mb-2">¡Advertencia! Operación destructiva</h3>
                <p className="text-gray-300 mb-4">
                  Está a punto de eliminar <span className="text-red-400 font-bold">TODOS los datos</span> de las tablas 
                  bundle99 y members99. Esta acción no se puede deshacer.
                </p>
                <p className="text-gray-300">
                  Para confirmar, escriba "CONFIRMAR BORRADO" exactamente como se muestra:
                </p>
              </div>
            </div>

            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full bg-gray-700 text-white p-3 rounded mb-4 border border-gray-600"
              placeholder="CONFIRMAR BORRADO"
              disabled={isDeleting}
            />

            {deleteResult && (
              <div className={`p-3 rounded mb-4 ${
                deleteResult.success 
                  ? 'bg-green-800/50 text-green-300 border border-green-700' 
                  : 'bg-red-800/50 text-red-300 border border-red-700'
              }`}>
                {deleteResult.message}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={handleCloseConfirmation}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
                disabled={isDeleting}
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteAllData}
                className={`px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded flex items-center gap-2 ${
                  isDeleting ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                disabled={isDeleting || confirmText !== 'CONFIRMAR BORRADO'}
              >
                {isDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <>
                    <FiTrash2 />
                    <span>Eliminar todos los datos</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeleteAllDataButton;
