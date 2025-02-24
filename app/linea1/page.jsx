'use client';
import { useRouter } from 'next/navigation';
import { FiArrowLeft } from 'react-icons/fi';

export default function Linea1() {
  const router = useRouter();
  const buttons = [
    { name: '99#1', path: 'linea1//99-1' },
    { name: 'PopUp#1', path: '/popup-1' },
    { name: 'Ventanas#1', path: '/ventanas-1' },
    { name: 'Mesa#1', path: '/mesa-1' },
  ];

  return (
    <main className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-green-500 hover:text-green-400 mb-8"
        >
          <FiArrowLeft /> Volver
        </button>

        <h1 className="text-4xl font-bold text-white mb-12">Línea 1</h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {buttons.map((button) => (
            <button
              key={button.name}
              onClick={() => router.push(button.path)}
              className="glass-card p-6 rounded-xl hover:bg-gray-800/50 transition-all"
            >
              <span className="text-xl font-medium text-white">{button.name}</span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
} 
