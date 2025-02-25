'use client';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Componente de carga
const Loading = () => (
  <div className="min-h-screen bg-gray-900 p-8 flex items-center justify-center">
    <div className="glass-card rounded-2xl p-8 text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-2 border-green-500 border-t-transparent mx-auto mb-4"></div>
      <h2 className="text-xl text-white">Cargando estación...</h2>
    </div>
  </div>
);

// Importar StationView de forma dinámica para evitar errores de SSR
const StationView = dynamic(() => import('@/components/StationView'), { 
  ssr: false,
  loading: () => <Loading />
});

export default function Station99Page() {
  // Estado para controlar la visibilidad del componente
  const [isMounted, setIsMounted] = useState(false);
  
  // Esperar a que el componente esté montado en el cliente
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Solo renderizar el componente StationView cuando estamos en el cliente
  if (!isMounted) {
    return <Loading />;
  }
  
  return (
    <StationView 
      stationName="99"    // Este valor será "99", "popup", "ventanas" o "mesa"
      lineNumber={1}      // 1 o 2 dependiendo de la línea 
      title="99#1"        // Título que se mostrará en la página
    />
  );
}
