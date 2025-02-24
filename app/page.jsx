'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiLock, FiGrid } from 'react-icons/fi';

export default function Home() {
  const router = useRouter();
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleAdminAccess = () => {
    if (password === 'R4606rola') {
      router.push('/admin?role=super');
    } else if (password === 'Superday87') {
      router.push('/admin?role=supervisor');
    } else if (password === 'Lumber123') {
      router.push('/admin?role=coordinator');
    } else {
      setError('Contraseña incorrecta');
    }
  };

  return (
    <main className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Botón Admin */}
        <button
          onClick={() => setShowAdminModal(true)}
          className="glass-card p-8 rounded-xl hover:bg-gray-800/50 transition-all flex flex-col items-center gap-4"
        >
          <FiLock className="w-12 h-12 text-green-500" />
          <span className="text-xl font-medium text-white">Admin</span>
        </button>

        {/* Botón Línea 1 */}
        <button
          onClick={() => router.push('/linea1')}
          className="glass-card p-8 rounded-xl hover:bg-gray-800/50 transition-all flex flex-col items-center gap-4"
        >
          <FiGrid className="w-12 h-12 text-blue-500" />
          <span className="text-xl font-medium text-white">Línea 1</span>
        </button>

        {/* Botón Línea 2 */}
        <button
          onClick={() => router.push('/linea2')}
          className="glass-card p-8 rounded-xl hover:bg-gray-800/50 transition-all flex flex-col items-center gap-4"
        >
          <FiGrid className="w-12 h-12 text-purple-500" />
          <span className="text-xl font-medium text-white">Línea 2</span>
        </button>

        {/* Modal de Admin */}
        {showAdminModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
            <div className="bg-gray-800 p-8 rounded-xl w-full max-w-md">
              <h2 className="text-2xl font-bold text-white mb-6">Acceso Administrativo</h2>
              <input
                type="password"
                placeholder="Ingresa la contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-green-500 focus:outline-none mb-4"
              />
              {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => {
                    setShowAdminModal(false);
                    setPassword('');
                    setError('');
                  }}
                  className="px-4 py-2 rounded-lg text-gray-300 hover:bg-gray-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAdminAccess}
                  className="px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600"
                >
                  Acceder
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}