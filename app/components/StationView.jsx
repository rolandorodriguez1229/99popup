'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FiArrowLeft, FiChevronDown, FiChevronRight, FiCheckSquare, FiFilter, FiClock, FiPackage, FiCalendar, FiMinus, FiPlus, FiRefreshCw } from 'react-icons/fi';
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
  // Declarar las variables de estado faltantes
  const [availableTypes, setAvailableTypes] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [expandedFilters, setExpandedFilters] = useState(false);
  // Datos de resumen
  const [completedFeet, setCompletedFeet] = useState(0);
  const [pendingFeet, setPendingFeet] = useState(0);
  const [totalFeet, setTotalFeet] = useState(0);
  // Estado para controlar operaciones optimistas
  const [updatingAssignmentId, setUpdatingAssignmentId] = useState(null);
  
  // Inicializar el tamaño de fuente desde localStorage una vez que estamos en el cliente
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('stationFontSize');
      if (saved) setFontSize(parseInt(saved));
      
      const savedTypes = localStorage.getItem('selectedTypes');
      if (savedTypes) {
        try {
          setSelectedTypes(JSON.parse(savedTypes));
        } catch (e) {
          console.error('Error parsing saved types:', e);
          setSelectedTypes([]);
        }
      }
    }
  }, []);

  // Guardar tamaño de fuente en localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('stationFontSize', fontSize.toString());
    }
  }, [fontSize]);
  
  // Guardar tipos seleccionados en localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && selectedTypes) {
      localStorage.setItem('selectedTypes', JSON.stringify(selectedTypes));
    }
  }, [selectedTypes]);

  // Cargar los datos de asignaciones
  useEffect(() => {
    fetchAssignments();
    fetchAvailableDates();
  }, [stationName, lineNumber, selectedDate]);
  
  // Extraer todos los tipos de miembros disponibles
  useEffect(() => {
    if (assignments && assignments.length > 0) {
      const types = new Set();
      assignments.forEach(assignment => {
        if (assignment.members_data && Array.isArray(assignment.members_data)) {
          assignment.members_data.forEach(member => {
            if (member.type) types.add(member.type);
          });
        }
      });
      const typesArray = Array.from(types).sort();
      setAvailableTypes(typesArray);
      
      // Si no hay tipos seleccionados, seleccionar todos por defecto
      if (!selectedTypes || selectedTypes.length === 0) {
        setSelectedTypes(typesArray);
      }
      
      // Calcular los pies completados y pendientes
      calculateTotals(assignments);
    }
  }, [assignments]);

  // Función para calcular los totales de pies lineales
  const calculateTotals = (assignments) => {
    let completed = 0;
    let pending = 0;
    let total = 0;
    
    assignments.forEach(assignment => {
      const linealFeet = parseFloat(assignment.lineal_feet) || 0;
      total += linealFeet;
      
      if (isStationCompleted(assignment)) {
        completed += linealFeet;
      } else {
        pending += linealFeet;
      }
    });
    
    setCompletedFeet(completed);
    setPendingFeet(pending);
    setTotalFeet(total);
  };

  // Función para alternar selección de tipo
  const handleTypeSelect = (type) => {
    setSelectedTypes(prev => {
      if (!prev) return [type];
      if (prev.includes(type)) {
        return prev.filter(t => t !== type);
      } else {
        return [...prev, type];
      }
    });
  };
  
  // Función para seleccionar todos los tipos
  const handleSelectAllTypes = () => {
    setSelectedTypes(availableTypes);
  };
  
  // Función para deseleccionar todos los tipos
  const handleDeselectAllTypes = () => {
    setSelectedTypes([]);
  };
  
  // Función para alternar el panel de filtros
  const toggleFilters = () => {
    setExpandedFilters(prev => !prev);
  };

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
      const { data, error } = await supabase
        .from('line_assignments')
        .select('*')
        .eq('line_number', lineNumber)
        .eq('assignment_date', selectedDate)
        .order('job_number');
      
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

  // Encontrar la última completada para calcular tiempo
  const findLastCompletedTime = () => {
    // Si no hay asignaciones completadas, usar 6:00 AM
    const today = new Date(selectedDate);
    today.setHours(6, 0, 0, 0);
    
    const completed = assignments
      .filter(a => {
        const station = a.stations?.find(s => s.name.toLowerCase() === stationName.toLowerCase());
        return station?.completed && station?.completedAt;
      })
      .map(a => {
        const station = a.stations.find(s => s.name.toLowerCase() === stationName.toLowerCase());
        return new Date(station.completedAt);
      })
      .sort((a, b) => b - a); // Ordenar descendiente

    return completed.length > 0 ? completed[0] : today;
  };

  // Función optimizada para marcar un trabajo como completado sin recargar todos los datos
  const toggleStationCompletion = async (assignmentId) => {
    // Prevenir múltiples clics
    if (updatingAssignmentId === assignmentId) return;
    setUpdatingAssignmentId(assignmentId);
    
    try {
      // Encontrar la asignación en el estado actual
      const assignmentIndex = assignments.findIndex(a => a.id === assignmentId);
      if (assignmentIndex === -1) {
        console.error('Asignación no encontrada');
        return;
      }
      
      const currentAssignment = assignments[assignmentIndex];
      
      // Encontrar la estación específica
      const stationIndex = currentAssignment.stations.findIndex(s => 
        s.name.toLowerCase() === stationName.toLowerCase()
      );
      
      if (stationIndex === -1) {
        console.error("Estación no encontrada");
        return;
      }
      
      // Crear copias profundas para no mutar el estado directamente
      const updatedAssignments = [...assignments];
      const updatedAssignment = { ...currentAssignment };
      const updatedStations = [...updatedAssignment.stations];
      const isCurrentlyCompleted = updatedStations[stationIndex].completed;
      
      // Preparar los cambios en la estación
      let updatedStation;
      if (!isCurrentlyCompleted) {
        // Si no está completada, marcarla como completada
        const lastCompletedTime = findLastCompletedTime();
        const now = new Date();
        const minutesDiff = Math.floor((now - lastCompletedTime) / (1000 * 60));
        
        updatedStation = {
          ...updatedStations[stationIndex],
          completed: true,
          completedAt: now.toISOString(),
          previousCompletedAt: lastCompletedTime.toISOString(),
          timeTaken: minutesDiff
        };
      } else {
        // Si ya está completada, deshacer
        updatedStation = {
          ...updatedStations[stationIndex],
          completed: false,
          completedAt: null,
          previousCompletedAt: null,
          timeTaken: null
        };
      }
      
      // Actualizar el estado local inmediatamente para UX responsiva
      updatedStations[stationIndex] = updatedStation;
      updatedAssignment.stations = updatedStations;
      updatedAssignments[assignmentIndex] = updatedAssignment;
      
      // Actualizar el estado de forma optimista
      setAssignments(updatedAssignments);
      
      // Recalcular totales
      calculateTotals(updatedAssignments);
      
      // Enviar la actualización a la base de datos en segundo plano
      const { error: updateError } = await supabase
        .from('line_assignments')
        .update({ stations: updatedStations })
        .eq('id', assignmentId);
      
      if (updateError) {
        console.error('Error en la actualización:', updateError);
        // Si ocurre un error, revertir los cambios en la UI
        fetchAssignments();
      }
    } catch (error) {
      console.error('Error al actualizar estado:', error);
      alert('Error al actualizar estado. Por favor intente nuevamente.');
      // En caso de error, recargar los datos
      fetchAssignments();
    } finally {
      setUpdatingAssignmentId(null);
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

  // Función para obtener la información de tiempo completado
  const getCompletionInfo = (assignment) => {
    if (!assignment.stations) return null;
    
    const station = assignment.stations.find(s => 
      s.name.toLowerCase() === stationName.toLowerCase()
    );
    
    if (!station || !station.completed) return null;
    
    const completedAt = new Date(station.completedAt);
    const timeTaken = station.timeTaken !== undefined ? station.timeTaken : 0;
    
    return {
      time: completedAt.toLocaleTimeString(),
      duration: timeTaken
    };
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
    if (!description) return 'text-gray-300';
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
        
        {/* Resumen de pies lineales */}
        <div className="glass-card rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Resumen de Producción</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-900/30 p-4 rounded-lg">
              <div className="text-green-400 text-sm font-medium mb-1">Completados</div>
              <div className="text-2xl font-bold text-white">{completedFeet.toFixed(2)} pies</div>
              <div className="text-gray-400 text-sm">{((completedFeet / totalFeet) * 100).toFixed(1)}% del total</div>
            </div>
            <div className="bg-blue-900/30 p-4 rounded-lg">
              <div className="text-blue-400 text-sm font-medium mb-1">Pendientes</div>
              <div className="text-2xl font-bold text-white">{pendingFeet.toFixed(2)} pies</div>
              <div className="text-gray-400 text-sm">{((pendingFeet / totalFeet) * 100).toFixed(1)}% del total</div>
            </div>
            <div className="bg-purple-900/30 p-4 rounded-lg">
              <div className="text-purple-400 text-sm font-medium mb-1">Total Asignado</div>
              <div className="text-2xl font-bold text-white">{totalFeet.toFixed(2)} pies</div>
              <div className="text-gray-400 text-sm">{assignments.length} trabajos</div>
            </div>
          </div>
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
                {availableDates.length > 0 ? (
                  availableDates.map(date => (
                    <option key={date} value={date}>
                      {new Date(date).toLocaleDateString()}
                    </option>
                  ))
                ) : (
                  <option value={selectedDate}>
                    {new Date(selectedDate).toLocaleDateString()}
                  </option>
                )}
              </select>
            </div>
            
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
          
          {/* Filtro de tipos de miembros */}
          <div className="mt-4">
            <button
              onClick={toggleFilters}
              className="flex items-center gap-2 text-gray-200 hover:text-white bg-gray-800/50 px-4 py-2 rounded-lg w-full"
            >
              <FiFilter />
              <span>Filtros de Tipos</span>
              {expandedFilters ? <FiChevronDown /> : <FiChevronRight />}
            </button>
            
            {expandedFilters && (
              <div className="mt-2 p-4 bg-gray-800/30 rounded-lg">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-gray-300">Tipos de miembros:</h4>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSelectAllTypes}
                      className="text-sm text-blue-400 hover:text-blue-300"
                    >
                      Seleccionar todos
                    </button>
                    <span className="text-gray-600">|</span>
                    <button
                      onClick={handleDeselectAllTypes}
                      className="text-sm text-blue-400 hover:text-blue-300"
                    >
                      Deseleccionar todos
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {availableTypes.map(type => (
                    <label key={type} className="flex items-center gap-2 text-gray-400">
                      <input
                        type="checkbox"
                        checked={selectedTypes && selectedTypes.includes(type)}
                        onChange={() => handleTypeSelect(type)}
                        className="rounded bg-gray-700 border-gray-600"
                      />
                      {type}
                    </label>
                  ))}
                </div>
              </div>
            )}
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
                const completionInfo = getCompletionInfo(assignment);
                const isProcessing = updatingAssignmentId === assignment.id;
                
                return (
                  <div 
                    key={assignment.id} 
                    className={`border border-gray-700 rounded-lg overflow-hidden ${
                      isCompleted ? 'bg-green-900/20' : 'bg-gray-800/20'
                    } ${isProcessing ? 'opacity-70' : ''}`}
                  >
                    <div className="w-full px-4 py-3 bg-gray-800/50 flex flex-col md:flex-row md:items-center justify-between">
                      <div className="flex-1">
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
                      </div>
                      
                      <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-4 mt-2 md:mt-0">
                        <div className={`text-gray-300 ${getFontSizeClass(1)}`}>
                          {assignment.lineal_feet} pies
                        </div>
                        
                        {/* Información de completado si aplica */}
                        {completionInfo && (
                          <div className="flex items-center gap-2 text-gray-300 px-3 py-1 rounded bg-gray-800/50">
                            <FiClock className="text-green-400" />
                            <span>
                              {completionInfo.time} 
                              <span className="ml-1 text-sm">
                                ({completionInfo.duration} min)
                              </span>
                            </span>
                          </div>
                        )}
                        
                        {/* Botón de completar/deshacer */}
                        <button
                          onClick={() => toggleStationCompletion(assignment.id)}
                          disabled={isProcessing}
                          className={`flex items-center gap-2 ${
                            isCompleted 
                              ? 'bg-orange-600 hover:bg-orange-700' 
                              : 'bg-green-600 hover:bg-green-700'
                          } text-white px-3 py-2 rounded transition-colors ${
                            isProcessing ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          {isProcessing ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                              <span>Procesando...</span>
                            </>
                          ) : isCompleted ? (
                            <>
                              <FiRefreshCw />
                              <span>Deshacer</span>
                            </>
                          ) : (
                            <>
                              <FiCheckSquare />
                              <span>Completar</span>
                            </>
                          )}
                        </button>
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
                          {Object.entries(getMembersByType(assignment.members_data))
                            .filter(([type]) => {
                              // Comprobación segura para evitar errores cuando selectedTypes aún no está definido
                              return !selectedTypes || selectedTypes.length === 0 || selectedTypes.includes(type);
                            })
                            .map(([type, members]) => (
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
                                        <span className="font-medium text-gray-300">{member.count} x</span>
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
