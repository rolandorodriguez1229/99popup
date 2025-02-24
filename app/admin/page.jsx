'use client';
import { useRouter } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { FiArrowLeft, FiChevronDown, FiChevronRight } from 'react-icons/fi';
import JobsList from '@/components/JobsList';
import ExcelTables from '@/components/ExcelTables';
import AdminContent from './AdminContent';

export default function Admin() {
  const [isJobsListExpanded, setIsJobsListExpanded] = useState(false);
  const router = useRouter();

  return (
    <main className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <Suspense fallback={<div className="text-white">Cargando...</div>}>
          <AdminContent 
            isJobsListExpanded={isJobsListExpanded} 
            setIsJobsListExpanded={setIsJobsListExpanded}
            router={router}
          />
        </Suspense>
      </div>
    </main>
  );
}
