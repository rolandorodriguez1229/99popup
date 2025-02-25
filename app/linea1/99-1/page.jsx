'use client';
import dynamic from 'next/dynamic';

// Importar el componente dinámicamente con { ssr: false } para evitar renderizado en el servidor
const StationView = dynamic(() => import('@/components/StationView'), { 
  ssr: false,
  loading: () => <div className="min-h-screen bg-gray-900 p-8 flex items-center justify-center text-white">Cargando...</div>
});

export default function Station99Page() {
  return (
    <StationView 
      stationName="99"    // Este valor será "99", "popup", "ventanas" o "mesa"
      lineNumber={1}      // 1 o 2 dependiendo de la línea 
      title="99#1"        // Título que se mostrará en la página
    />
  );
}

// Este es un ejemplo para app/99-1/page.jsx
// Para crear cada estación, debes:
// 1. Crear una carpeta correspondiente (ej: app/99-1)
// 2. Crear un page.jsx dentro con este contenido
// 3. Ajustar los parámetros según cada estación
//
// Ejemplo para popup de la línea 2:
//
// export default function PopupPage() {
//   return (
//     <StationView 
//       stationName="popup"
//       lineNumber={2}
//       title="PopUp#2"
//     />
//   );
// }
