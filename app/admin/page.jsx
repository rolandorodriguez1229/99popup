'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FiArrowLeft } from 'react-icons/fi';
import JobsList from '@/components/JobsList';

export default function Admin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = searchParams.get('role');

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

        <JobsList />
      </div>
    </main>
  );
} 