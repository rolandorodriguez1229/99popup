'use client';
import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { FiArrowLeft, FiChevronDown, FiChevronRight } from 'react-icons/fi';
import JobsList from '@/components/JobsList';
import ExcelTables from '@/components/ExcelTables';

export default function AdminContent({ 
  isJobsListExpanded, 
  setIsJobsListExpanded,
  router 
}) {
  const searchParams = useSearchParams();
  const role = searchParams.get('role');
  
  useEffect(() => {
    if (!role || !['super', 'supervisor', 'coordinator'].includes(role)) {
      router.push('/');
    }
  }, [role, router]);

  return (
    <>
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
      {/* Tablas de Excel */}
      <div className="mb-8">
        <ExcelTables />
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
    </>
  );
}
