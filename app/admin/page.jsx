'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FiArrowLeft, FiChevronDown, FiChevronRight, FiUpload } from 'react-icons/fi';
import JobsList from '@/components/JobsList';

export default function Admin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = searchParams.get('role');
  const [isJobsListExpanded, setIsJobsListExpanded] = useState(false);

  useEffect(() => {
    if (!role || !['super', 'supervisor', 'coordinator'].includes(role)) {
      router.push('/');
    }
  }, [role, router]);

  return (
    <main className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-green-500 hover:text-green-400"
          >
            <FiArrowLeft /> Volver
          </button>
          <div className="text-gray-400">
            Rol: {
              role === 'super' ? 'Super Administrador' :
              role === 'supervisor' ? 'Supervisor' :
              'Coordinador'
            }
          </div>
        </div>

        {/* Panel de Subida de Trabajos */}
        <div className="glass-card rounded-2xl p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-6">Subir Trabajos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => {/* Función para subir trabajos línea 1 */}}
              className="flex items-center justify-center gap-2 p-4 rounded-xl bg-blue-500 hover:bg-blue-600 text-white transition-colors"
            >
              <FiUpload />
              <span>Subir Trabajos Línea 1</span>
            </button>
            <button
              onClick={() => {/* Función para subir trabajos línea 2 */}}
              className="flex items-center justify-center gap-2 p-4 rounded-xl bg-purple-500 hover:bg-purple-600 text-white transition-colors"
            >
              <FiUpload />
              <span>Subir Trabajos Línea 2</span>
            </button>
          </div>
        </div>

        {/* Panel de Lista de Trabajos Colapsable */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <button
            onClick={() => setIsJobsListExpanded(!isJobsListExpanded)}
            className="w-full p-6 flex items-center justify-between text-white hover:bg-gray-800/30 transition-colors"
          >
            <h2 className="text-xl font-semibold">Lista de Trabajos</h2>
            {isJobsListExpanded ? <FiChevronDown /> : <FiChevronRight />}
          </button>
          
          {isJobsListExpanded && (
            <div className="border-t border-gray-700">
              <JobsList />
            </div>
          )}
        </div>
      </div>
    </main>
  );
} 