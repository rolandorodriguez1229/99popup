'use client';
import StationView from '@/components/StationView';

export default function Station99Page() {
  return (
    <StationView 
      stationName="99"    // Este valor será "99", "popup", "ventanas" o "mesa"
      lineNumber={1}      // 1 o 2 dependiendo de la línea 
      title="99#1"        // Título que se mostrará en la página
    />
  );
}
