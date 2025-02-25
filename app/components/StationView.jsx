'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FiArrowLeft, FiChevronDown, FiChevronRight, FiCheckSquare, FiFilter, FiClock, FiPackage, FiCalendar, FiMinus, FiPlus } from 'react-icons/fi';
import { supabase } from '@/lib/supabase';

export default function StationView({ 
  stationName,  // Ej: "99", "popup", "ventanas", "mesa"
  lineNumber,   // 1 o 2 
  title         // Ej: "99#1" o "PopUp#2"
}) {
  const router = useRouter();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedJobs, setExpandedJobs] = useState({});
  const [expandedTypes, setExpandedTypes] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [availableDates, setAvailableDates] = useState([]);
  const [fontSize, setFontSize] = useState(3);
  
  // Inicializar el tamaño de fuente desde localStorage una vez que estamos en el cliente
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('stationFontSize');
      if (saved) setFontSize(parseInt(saved));
    }
  }, []);
  const [showCompletedJobs, setShowCompletedJobs] = useState(false);

  // Guardar tamaño de fuente en localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('stationFontSize', fontSize.toString());
    }
  }, [fontSize]);

  // Cargar los datos de asignaciones
  useEffect(() => {
    fetchAssignments();
    fetchAvailableDates();
  }, [stationName, lineNumber, selectedDate, showCompletedJobs]);

  // Función para obtener todas las fechas disponibles
  const fetchAvailableDates = async () => {
    try {
      const { data, error } = await supabase
        .from('line_assignments')
        .select('assignment_date')
        .eq('line_number', lineNumber)
        .order('assignment_date', { ascending: false });
      
      if (error) throw error;
      
      // Extraer fechas únicas
      const uniqueDates = [...new Set(data.map(item => item.assignment_date))];
      setAvailableDates(uniqueDates);
    } catch (error) {
      console.error('Error al cargar fechas:', error);
    }
  };

  // Función para cargar asignaciones de la estación actual
  const fetchAssignments = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('line_assignments')
        .select('*')
        .eq('line_number', lineNumber)
        .eq('assignment_date', selectedDate);
      
      if (!showCompletedJobs) {
        // Filtrar para mostrar solo trabajos pendientes para esta estación
        query = query.contains(`stations`, [{ name: stationName.toLowerCase(), completed: false }]);
      }
      
      const { data, error } = await query.order('job_number');
      
      if (error) throw error;
      
      // Ordenar las asignaciones
      const sortedData = data.sort((a, b) => {
        // Primero ordenar por número de trabajo
        if (a.job_number !== b.job_number) {
          return a.job_number.localeCompare(b.job_number);
        }
        
        // Después ordenar por nombre de bundle
        const bundleNumA = parseInt(a.bundle.match(/\d+/) || [0]);
        const bundleNumB = parseInt(b.bundle.match(/\d+/) || [0]);
        return bundleNumA - bundleNumB;
      });
      
      setAssignments(sortedData);
    } catch (error) {
      console.error(`Error al cargar asignaciones para estación ${stationName}:`, error);
    } finally {
      setLoading(false);
    }
  };

  // Función para marcar un trabajo como completado en esta estación
  const markStationCompleted = async (assignmentId) => {
    try {
      // Primero, obtener la asignación actual
      const { data: currentAssignment, error: fetchError } = await supabase
        .from('line_assignments')
        .select('stations')
        .eq('id', assignmentId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Actualizar el estado de la estación específica
      const updatedStations = currentAssignment.stations.map(station => {
        if (station.name.toLowerCase() === stationName.toLowerCase()) {
          return {
            ...station,
            completed: true,
            completedAt: new Date().toISOString()
          };
        }
        return station;
      });
      
      // Guardar los cambios
      const { error: updateError } = await supabase
        .from('line_assignments')
        .update({ stations: updatedStations })
        .eq('id', assignmentId);
      
      if (updateError) throw updateError;
      
      // Actualizar la UI
      fetchAssignments();
    } catch (error) {
      console.error('Error al marcar como completado:', error);
      alert('Error al actualizar estado. Por favor intente nuevamente.');
    }
  };

  // Función para verificar si esta estación está completada
  const isStationCompleted = (assignment) => {
    if (!assignment.stations) return false;
    
    const station = assignment.stations.find(s => 
      s.name.toLowerCase() === stationName.toLowerCase()
    );
    
    return station?.completed || false;
  };

  // Función para obtener la clase de tamaño de fuente
  const getFontSizeClass = (reduction = 0) => {
    const sizes = {
      1: 'text-xs',
      2: 'text-sm',
      3: 'text-base',
      4: 'text-lg',
      5: 'text-xl'
    };
    const adjustedSize = Math.max(1, fontSize - reduction);
    return sizes[adjustedSize] || 'text-base';
  };

  // Función para alternar la visibilidad de un trabajo
  const toggleJob = (id) => {
    setExpandedJobs(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Función para alternar la visibilidad de un tipo de miembro
  const toggleType = (key) => {
    setExpandedTypes(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Función para determinar color de la descripción
  const getDescriptionColor = (description) => {
    if (description.includes('2x4')) return 'text-yellow-400';
    if (description.includes('2x6')) return 'text-blue-400';
    if (description.includes('3-1/2X4')) return 'text-red-400';
    if (description.includes('3.5 x 11.25')) return 'text-purple-400';
    if (description.includes('2x12')) return 'text-pink-400';
    if (description.includes('2x8')) return 'text-cyan-400';
    if (description.includes('2x10')) return 'text-green-400';
    return 'text-gray-300';
  };

  // Función para agrupar miembros por tipo
  const getMembersByType = (members) => {
    if (!members || !Array.isArray(members)) return {};
    
    return members.reduce((acc, member) => {
      if (!member.type) return acc;
      
      if (!acc[member.type]) {
        acc[member.type] = [];
      }
      
      // Buscar si ya existe un miembro igual
      const existingMember = acc[member.type].find(m => 
        m.length === member.length && 
        m.description === member.description
      );
      
      if (existingMember) {
        existingMember.count = (existingMember.count || 1) + 1;
      } else {
        acc[member.type].push({ ...member, count: 1 });
      }
      
      return acc;
    }, {});
  };
  
  // Convertir pulgadas a formato pies-pulgadas-dieciseisavos
  const convertToFeetInches = (inches) => {
    if (!inches) return '';
    const parsedInches = parseFloat(inches);
    
    const feet = Math.floor(parsedInches / 12);
    const remainingInches = parsedInches % 12;
    const sixteenths = Math.round((remainingInches % 1) * 16);
    const wholeInches = Math.floor(remainingInches);

    let result = '';
    if (feet > 0) result += `${feet}-`;
    result += `${wholeInches}-${sixteenths}`;
    
    return result;
  };
  
  // Función para convertir decimal a fracción
  const decimalToFraction = (decimal) => {
    if (!decimal) return '';
    const parsedDecimal = parseFloat(decimal);
    
    if (Number.isInteger(parsedDecimal)) return `${parsedDecimal}`;
    
    const fractionMap = {
      '.125': '1/8',
      '.25': '1/4',
      '.375': '3/8',
      '.5': '1/2',
      '.625': '5/8',
      '.75': '3/4',
      '.875': '7/8',
    };

    const wholePart = Math.floor(parsedDecimal);
    const decimalPart = parsedDecimal - wholePart;
    const rounded = Math.round(decimalPart * 1000) / 1000;
    const key = `.${rounded.toString().split('.')[1]}`;
    const fraction = fractionMap[key] || decimalPart.toFixed(3).substring(1);
    
    return `${wholePart} ${fraction}`;
  };

  return (
    <main className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Navegación y título */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => router.push(`/linea${lineNumber}`)}
            className="flex items-center gap-2 text-green-500 hover:text-green-400"
          >
            <FiArrowLeft /> Volver
          </button>
          <h1 className="text-3xl font-bold text-white">{title}</h1>
        </div>
        
        {/* Filtros y controles */}
        <div className="glass-card rounded-2xl p-6 mb-6">
          <div className="flex flex-wrap items-center gap-4 mb-4">
            {/* Selector de fecha */}
            <div className="flex items-center gap-2 bg-gray-800/50 p-2 rounded-lg">
              <FiCalendar className="text-green-500" />
              <select 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-gray-800 text-white p-2 rounded"
              >
                {availableDates.map(date => (
                  <option key={date} value={date}>
                    {new Date(date).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Control de mostrar completados */}
            <label className="flex items-center gap-2 text-gray-300">
              <input
                type="checkbox"
                checked={showCompletedJobs}
                onChange={() => setShowCompletedJobs(!showCompletedJobs)}
                className="rounded bg-gray-700 border-gray-600"
              />
              Mostrar trabajos completados
            </label>
            
            {/* Control de tamaño de fuente */}
            <div className="flex items-center gap-3 bg-gray-800/50 rounded-lg p-2 ml-auto">
              <span className="text-gray-300">Tamaño de texto:</span>
              <button
                onClick={() => setFontSize(prev => Math.max(1, prev - 1))}
                className="text-green-500 hover:text-green-400 disabled:text-gray-500"
                disabled={fontSize <= 1}
              >
                <FiMinus size={20} />
              </button>
              <span className="text-white min-w-[1.5rem] text-center">{fontSize}</span>
              <button
                onClick={() => setFontSize(prev => Math.min(5, prev + 1))}
                className="text-green-500 hover:text-green-400 disabled:text-gray-500"
                disabled={fontSize >= 5}
              >
                <FiPlus size={20} />
              </button>
            </div>
          </div>
        </div>
        
        {/* Lista de trabajos */}
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">
            Trabajos asignados - {new Date(selectedDate).toLocaleDateString()}
          </h2>
          
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-500 border-t-transparent"></div>
            </div>
          ) : assignments.length === 0 ? (
            <div className="text-center p-8 text-gray-400">
              No hay trabajos asignados para esta estación en la fecha seleccionada.
            </div>
          ) : (
            <div className="space-y-4">
              {assignments.map(assignment => {
                const isCompleted = isStationCompleted(assignment);
                
                return (
                  <div 
                    key={assignment.id} 
                    className={`border border-gray-700 rounded-lg overflow-hidden ${
                      isCompleted ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="w-full px-4 py-3 bg-gray-800/50 flex items-center justify-between">
                      <button
                        onClick={() => toggleJob(assignment.id)}
                        className="flex items-center gap-3 hover:bg-gray-800/70 transition-colors px-3 py-2 rounded-lg"
                      >
                        {expandedJobs[assignment.id] ? 
                          <FiChevronDown className="text-green-500" /> : 
                          <FiChevronRight className="text-green-500" />
                        }
                        <span className={`font-medium ${getFontSizeClass()}`}>
                          {assignment.job_number} - {assignment.bundle}
                        </span>
                        {assignment.has_sill_seal && 
                          <span className="text-green-400 text-sm">(SILL SEAL)</span>
                        }
                      </button>
                      
                      <div className="flex items-center gap-4">
                        <span className={`text-gray-300 ${getFontSizeClass(1)}`}>
                          {assignment.lineal_feet} pies
                        </span>
                        
                        {/* Botón de completar tarea */}
                        {!isCompleted ? (
                          <button
                            onClick={() => markStationCompleted(assignment.id)}
                            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded transition-colors"
                          >
                            <FiCheckSquare />
                            <span>Completar</span>
                          </button>
                        ) : (
                          <div className="flex items-center gap-2 bg-gray-700 text-gray-300 px-3 py-2 rounded">
                            <FiClock />
                            <span>Completado</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {expandedJobs[assignment.id] && (
                      <div className={`p-4 ${getFontSizeClass()}`}>
                        {/* Resumen de studs */}
                        {assignment.studs_summary && (
                          <div 
                            className="mb-4 p-3 bg-gray-800/30 rounded-lg"
                            dangerouslySetInnerHTML={{ __html: assignment.studs_summary }}
                          />
                        )}
                        
                        {/* Detalles de miembros */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {Object.entries(getMembersByType(assignment.members_data)).map(([type, members]) => (
                            <div key={type} className="space-y-2">
                              <button
                                onClick={() => toggleType(`${assignment.id}-${type}`)}
                                className="w-full flex items-center gap-2 text-green-500 font-medium border-b border-gray-700/50 pb-2"
                              >
                                {expandedTypes[`${assignment.id}-${type}`] ? 
                                  <FiChevronDown /> : 
                                  <FiChevronRight />
                                }
                                <span>{type}</span>
                                <span className="text-gray-400 text-sm ml-2">({members.length})</span>
                              </button>
                              
                              {expandedTypes[`${assignment.id}-${type}`] && (
                                <div className="space-y-1 pl-4">
                                  {members.map((member, idx) => (
                                    <div key={idx} className="text-gray-300">
                                      <div className="flex items-baseline gap-2">
                                        <span className="text-green-400 font-medium">{member.count} x </span>
                                        <span className={getDescriptionColor(member.description)}>
                                          {convertToFeetInches(member.length)} {member.description}
                                        </span>
                                      </div>
                                      <div className="pl-4 text-sm">
                                        <div className={getDescriptionColor(member.description)}>
                                          {decimalToFraction(member.length)}″
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
