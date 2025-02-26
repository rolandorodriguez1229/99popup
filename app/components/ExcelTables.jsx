'use client';
import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  getPaginationRowModel,
  getSortedRowModel,
} from '@tanstack/react-table';
import { FiUpload, FiEdit2, FiSave, FiX, FiFile, FiChevronDown, FiChevronRight, FiFilter, FiSearch, FiTrash2, FiRotateCcw, FiShare, FiPlus, FiMinus, FiType, FiMove, FiCalendar } from 'react-icons/fi';
import FileUploader from './FileUploader';
import { supabase } from '@/lib/supabase';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

export default function ExcelTables() {
  const [line1Data, setLine1Data] = useState([]);
  const [line2Data, setLine2Data] = useState([]);
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [showXmlUploader, setShowXmlUploader] = useState(false);
  const [bundleMembers, setBundleMembers] = useState({});
  const [expandedBundles, setExpandedBundles] = useState({});
  const [expandedTypes, setExpandedTypes] = useState({});
  const [expandedFilters, setExpandedFilters] = useState({});
  const [availableTypes, setAvailableTypes] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  
  // Inicializar los tipos seleccionados desde localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('selectedTypes');
      if (saved) setSelectedTypes(JSON.parse(saved));
    }
  }, []);
  const [isLoading, setIsLoading] = useState(false);
  // Historial de acciones para la función de deshacer
  const [actionHistory, setActionHistory] = useState([]);
  // Control de tamaño de fuente (1-5)
  const [fontSize, setFontSize] = useState(3);
  
  // Inicializar el tamaño de fuente desde localStorage una vez que estamos en el cliente
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tableFontSize');
      if (saved) setFontSize(parseInt(saved));
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedTypes', JSON.stringify(selectedTypes));
    }
  }, [selectedTypes]);
  
  // Guardar el tamaño de la fuente en localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('tableFontSize', fontSize.toString());
    }
  }, [fontSize]);

  useEffect(() => {
    // Actualizar tipos disponibles cuando cambian los datos
    const updateAvailableTypes = () => {
      const types = new Set();
      Object.values(bundleMembers).forEach(members => {
        members.forEach(member => {
          if (member.type) types.add(member.type);
        });
      });
      setAvailableTypes(Array.from(types).sort());
    };
    updateAvailableTypes();
  }, [bundleMembers]);

  const toggleFilters = (lineNumber) => {
    setExpandedFilters(prev => ({
      ...prev,
      [lineNumber]: !prev[lineNumber]
    }));
  };

  const handleTypeSelect = (type) => {
    setSelectedTypes(prev => {
      if (prev.includes(type)) {
        return prev.filter(t => t !== type);
      } else {
        return [...prev, type];
      }
    });
  };

  const handleSelectAllTypes = () => {
    setSelectedTypes(availableTypes);
  };

  const handleDeselectAllTypes = () => {
    setSelectedTypes([]);
  };

  const decimalToFraction = (decimal) => {
    if (Number.isInteger(decimal)) return `${decimal}`;
    
    const fractionMap = {
      '.125': '1/8',
      '.25': '1/4',
      '.375': '3/8',
      '.5': '1/2',
      '.625': '5/8',
      '.75': '3/4',
      '.875': '7/8',
    };

    const decimalPart = decimal.toString().split('.')[1];
    if (!decimalPart) return `${decimal}`;

    const mappedFraction = fractionMap[`.${decimalPart}`];
    if (!mappedFraction) return `${decimal}`;

    const wholePart = Math.floor(decimal);
    return `${wholePart} ${mappedFraction}`;
  };

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

  const getStudsSummary = (members) => {
    if (!members) return null;
    
    const studSummary = new Set();
    let hasSillSeal = false;

    members.forEach(member => {
      if (member.type?.toLowerCase().includes('stud')) {
        const length = parseFloat(member.length);
        if (length >= 70) {
          const dimension = member.description.match(/(2x\d+|3-1\/2X4|3\.5 x 11\.25)/i)?.[0] || '';
          // Convertir la longitud a formato fraccionario
          const lengthFraction = decimalToFraction(length);
          studSummary.add(
            `<span class="${getDescriptionColor(dimension)}">${lengthFraction}″ ${dimension}</span>`
          );
        }
      }
      
      // Comprobar si hay sill seal - ampliado para incluir más casos
      if ((member.type?.toLowerCase().includes('bottom plate') || 
           member.type?.toLowerCase().includes('bottom_plate')) && 
          (member.description?.toLowerCase().includes('sill seal') ||
           member.description?.toLowerCase().includes('sill_seal'))) {
        hasSillSeal = true;
      }
    });

    let summary = Array.from(studSummary).join(', ');
    if (hasSillSeal) {
      summary += ' <span class="text-green-400">(+ SILL SEAL)</span>';
    }
    return summary;
  };
  
  // Función para verificar si un grupo de miembros contiene sill seal
  const hasSillSeal = (members) => {
    if (!members) return false;
    
    return members.some(member => 
      (member.type?.toLowerCase().includes('bottom plate') || 
       member.type?.toLowerCase().includes('bottom_plate')) && 
      (member.description?.toLowerCase().includes('sill seal') ||
       member.description?.toLowerCase().includes('sill_seal'))
    );
  };

  const fetchBundleMembers = async (jobNumber, bundleName) => {
    const { data: bundle, error: bundleError } = await supabase
      .from('bundle99')
      .select('id')
      .eq('job_number', jobNumber)
      .eq('bundle_name', bundleName)
      .single();

    if (bundleError || !bundle) return null;

    const { data: members, error: membersError } = await supabase
      .from('members99')
      .select('*')
      .eq('bundle_id', bundle.id);

    if (membersError) return null;

    return members;
  };

  // Modificación clave: ahora esta función mantiene los datos existentes
  const loadBundleMembers = async (data) => {
    setIsLoading(true);
    // Preserva los datos existentes copiando el estado actual
    const newBundleMembers = { ...bundleMembers };
    
    for (const row of data) {
      const key = `${row.jobNumber}-${row.bundle}`;
      
      // Solo busca miembros si no existen ya en el estado
      if (!newBundleMembers[key]) {
        const members = await fetchBundleMembers(row.jobNumber, row.bundle);
        if (members) {
          newBundleMembers[key] = members;
        }
      }
    }
    
    setBundleMembers(newBundleMembers);
    setIsLoading(false);
  };

  // Esta función busca coincidencias para todas las tablas cargadas
  const searchAllMatches = async () => {
    setIsLoading(true);
    const allData = [...line1Data, ...line2Data];
    const newBundleMembers = { ...bundleMembers };
    
    for (const row of allData) {
      const key = `${row.jobNumber}-${row.bundle}`;
      const members = await fetchBundleMembers(row.jobNumber, row.bundle);
      if (members) {
        newBundleMembers[key] = members;
      }
    }
    
    setBundleMembers(newBundleMembers);
    setIsLoading(false);
  };

  // Ya no necesitamos estos efectos individuales que sobrescriben datos
  // Los mantendré comentados para referencia
  /*
  useEffect(() => {
    if (line1Data.length > 0) {
      loadBundleMembers(line1Data);
    }
  }, [line1Data]);

  useEffect(() => {
    if (line2Data.length > 0) {
      loadBundleMembers(line2Data);
    }
  }, [line2Data]);
  */

  const columns = [
    {
      header: 'Job Number',
      accessorKey: 'jobNumber',
    },
    {
      header: 'Bundle',
      accessorKey: 'bundle',
    },
    {
      header: 'Lineal Feet',
      accessorKey: 'linealFeet',
    }
  ];

  const handleFileUpload = (file, lineNumber) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: ['A', 'B', 'C', 'D', 'E', 'F'],
        raw: false,
        defval: ''
      });

      console.log('Raw Excel Data:', jsonData);

      const processedData = jsonData.slice(1).map(row => {
        console.log('Processing row:', row);
        
        let rowData;
        if (lineNumber === 1) {
          rowData = {
            jobNumber: row['C'] || '',
            bundle: row['D'] || '',
            linealFeet: row['E'] || ''
          };
          console.log('Line 1 processed row:', rowData);
        } else {
          rowData = {
            jobNumber: row['B'] || '',
            bundle: row['C'] || '',
            linealFeet: row['E'] || ''
          };
          console.log('Line 2 processed row:', rowData);
        }
        return rowData;
      }).filter(row => {
        const isValid = Boolean(row.jobNumber && row.bundle && row.linealFeet);
        console.log('Row validation:', row, isValid);
        return isValid;
      });

      console.log('Final processed data:', processedData);

      if (lineNumber === 1) {
        setLine1Data(processedData);
      } else {
        setLine2Data(processedData);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const table1 = useReactTable({
    data: line1Data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const table2 = useReactTable({
    data: line2Data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  // Función para eliminar una fila
  const handleDeleteRow = (lineNumber, rowIndex) => {
    const currentData = lineNumber === 1 ? line1Data : line2Data;
    const deletedRow = currentData[rowIndex];
    const newData = currentData.filter((_, index) => index !== rowIndex);
    
    // Guardar acción en el historial para poder deshacer
    setActionHistory(prev => [...prev, {
      type: 'DELETE_ROW',
      lineNumber,
      rowIndex,
      row: deletedRow
    }]);
    
    if (lineNumber === 1) {
      setLine1Data(newData);
    } else {
      setLine2Data(newData);
    }
  };
  
  // Función para obtener trabajos del día actual
  const fetchTodayAssignments = async (lineNumber) => {
    setIsLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('line_assignments')
        .select('*')
        .eq('line_number', lineNumber)
        .eq('assignment_date', today);
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        // Transformar los datos al formato que necesitamos
        const formattedData = data.map(item => ({
          jobNumber: item.job_number,
          bundle: item.bundle,
          linealFeet: item.lineal_feet,
          id: item.id // Guardar el ID para futuras operaciones
        }));
        
        // Cargar también los datos de los miembros
        const newBundleMembers = { ...bundleMembers };
        
        for (const item of data) {
          const key = `${item.job_number}-${item.bundle}`;
          if (!newBundleMembers[key] && item.members_data) {
            newBundleMembers[key] = item.members_data;
          }
        }
        
        // Actualizar estados
        setBundleMembers(newBundleMembers);
        
        if (lineNumber === 1) {
          setLine1Data(formattedData);
        } else {
          setLine2Data(formattedData);
        }
        
        alert(`¡Se han cargado ${formattedData.length} trabajos asignados hoy a la Línea ${lineNumber}!`);
      } else {
        alert(`No hay trabajos asignados hoy a la Línea ${lineNumber}.`);
      }
    } catch (error) {
      console.error('Error al cargar trabajos del día:', error);
      alert('Error al cargar los trabajos. Por favor intente nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Función para añadir trabajos sin duplicar
  const addNonDuplicateJobs = async (file, lineNumber) => {
    setIsLoading(true);
    try {
      const data = await readExcelFile(file);
      if (!data) return;
      
      // Formatear datos nuevos
      const newJobs = data.map(row => ({
        jobNumber: row.Job ? row.Job.toString() : '',
        bundle: row.Bundle ? row.Bundle.toString() : '',
        linealFeet: row['Lineal Feet'] ? parseFloat(row['Lineal Feet']) : 0,
      }));
      
      // Obtener trabajos actuales
      const currentJobs = lineNumber === 1 ? line1Data : line2Data;
      
      // Filtrar para añadir solo trabajos que no existen
      const nonDuplicateJobs = newJobs.filter(newJob => 
        !currentJobs.some(currentJob => 
          currentJob.jobNumber === newJob.jobNumber && 
          currentJob.bundle === newJob.bundle
        )
      );
      
      if (nonDuplicateJobs.length === 0) {
        alert('No hay nuevos trabajos para añadir. Todos ya existen en la tabla.');
        setIsLoading(false);
        return;
      }
      
      // Combinar trabajos existentes con nuevos
      const combinedJobs = [...currentJobs, ...nonDuplicateJobs];
      
      // Actualizar estado
      if (lineNumber === 1) {
        setLine1Data(combinedJobs);
      } else {
        setLine2Data(combinedJobs);
      }
      
      // Cargar miembros para los nuevos trabajos
      await loadBundleMembers(nonDuplicateJobs);
      
      alert(`¡Se han añadido ${nonDuplicateJobs.length} nuevos trabajos a la tabla!`);
    } catch (error) {
      console.error('Error al añadir trabajos:', error);
      alert('Error al añadir trabajos. Por favor intente nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Manejar el arrastre y soltura para reordenar filas
  const handleDragEnd = (result, lineNumber) => {
    if (!result.destination) return;
    
    const items = lineNumber === 1 ? [...line1Data] : [...line2Data];
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    if (lineNumber === 1) {
      setLine1Data(items);
    } else {
      setLine2Data(items);
    }
  };
  
  // Modificación de la función assignToLine para primero eliminar los trabajos existentes
  const assignToLine = async (lineNumber) => {
    setIsLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const tableData = lineNumber === 1 ? line1Data : line2Data;
      
      // Si no estamos en modo agregar, primero eliminamos las asignaciones existentes
      if (!addMode) {
        const { error: deleteError } = await supabase
          .from('line_assignments')
          .delete()
          .eq('line_number', lineNumber)
          .eq('assignment_date', today);
        
        if (deleteError) throw deleteError;
      }
      
      // Preparar datos completos incluyendo miembros
      const completeData = tableData.map(row => {
        const key = `${row.jobNumber}-${row.bundle}`;
        return {
          jobNumber: row.jobNumber,
          bundle: row.bundle,
          linealFeet: row.linealFeet,
          members: bundleMembers[key] || [],
          hasSillSeal: bundleMembers[key] ? hasSillSeal(bundleMembers[key]) : false,
          studsSummary: bundleMembers[key] ? getStudsSummary(bundleMembers[key]) : "",
          lineNumber: lineNumber,
          date: today,
          completed: false,
          stations: ["99", "popup", "ventanas", "mesa"].map(station => ({
            name: station,
            completed: false,
            completedAt: null
          }))
        };
      });
      
      // Guardar en Supabase
      for (const item of completeData) {
        const { error } = await supabase
          .from('line_assignments')
          .insert({
            job_number: item.jobNumber,
            bundle: item.bundle,
            lineal_feet: item.linealFeet,
            members_data: item.members,
            has_sill_seal: item.hasSillSeal,
            studs_summary: item.studsSummary,
            line_number: item.lineNumber,
            assignment_date: item.date,
            completed: item.completed,
            stations: item.stations
          });
        
        if (error) {
          console.error('Error al guardar asignación:', error);
          throw error;
        }
      }
      
      alert(`¡Datos ${addMode ? 'añadidos' : 'enviados'} exitosamente a Línea ${lineNumber}!`);
      // Reiniciar el modo después de enviar
      setAddMode(false);
    } catch (error) {
      console.error('Error al asignar a línea:', error);
      alert('Error al enviar datos a la línea. Por favor intente nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // Función para deshacer la última acción
  const handleUndo = () => {
    if (actionHistory.length === 0) return;
    
    const lastAction = actionHistory[actionHistory.length - 1];
    
    if (lastAction.type === 'DELETE_ROW') {
      // Restaurar la fila eliminada
      if (lastAction.lineNumber === 1) {
        const newData = [...line1Data];
        // Insertamos en la posición original si es posible
        if (lastAction.rowIndex <= newData.length) {
          newData.splice(lastAction.rowIndex, 0, lastAction.row);
        } else {
          newData.push(lastAction.row);
        }
        setLine1Data(newData);
      } else {
        const newData = [...line2Data];
        if (lastAction.rowIndex <= newData.length) {
          newData.splice(lastAction.rowIndex, 0, lastAction.row);
        } else {
          newData.push(lastAction.row);
        }
        setLine2Data(newData);
      }
    } else if (lastAction.type === 'EDIT_CELL') {
      // Restaurar el valor anterior de la celda
      if (lastAction.lineNumber === 1) {
        const newData = [...line1Data];
        newData[lastAction.rowIndex][lastAction.columnId] = lastAction.oldValue;
        setLine1Data(newData);
      } else {
        const newData = [...line2Data];
        newData[lastAction.rowIndex][lastAction.columnId] = lastAction.oldValue;
        setLine2Data(newData);
      }
    }
    
    // Eliminar la acción del historial
    setActionHistory(prev => prev.slice(0, -1));
  };

  const handleCellEdit = (value, row, column) => {
    const currentData = row.lineNumber === 1 ? line1Data : line2Data;
    const oldValue = currentData[row.index][column.id];
    
    // Guardar acción en el historial para poder deshacer
    setActionHistory(prev => [...prev, {
      type: 'EDIT_CELL',
      lineNumber: row.lineNumber,
      rowIndex: row.index,
      columnId: column.id,
      oldValue: oldValue,
      newValue: value
    }]);
    
    const newData = [...currentData];
    newData[row.index][column.id] = value;
    
    if (row.lineNumber === 1) {
      setLine1Data(newData);
    } else {
      setLine2Data(newData);
    }
    
    setEditingCell(null);
  };

  const renderCell = (cell, lineNumber) => {
    const isEditing = editingCell?.row === cell.row.index && 
                     editingCell?.column === cell.column.id &&
                     editingCell?.line === lineNumber;

    if (isEditing) {
      return (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-full bg-gray-700 text-white rounded px-2 py-1"
          />
          <button
            onClick={() => handleCellEdit(editValue, {...cell.row, lineNumber}, cell.column)}
            className="text-green-500 hover:text-green-400"
          >
            <FiSave size={16} />
          </button>
          <button
            onClick={() => setEditingCell(null)}
            className="text-red-500 hover:text-red-400"
          >
            <FiX size={16} />
          </button>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-between group">
        <span>{cell.getValue()}</span>
        <button
          onClick={() => {
            setEditingCell({ row: cell.row.index, column: cell.column.id, line: lineNumber });
            setEditValue(cell.getValue());
          }}
          className="invisible group-hover:visible text-blue-500 hover:text-blue-400"
        >
          <FiEdit2 size={16} />
        </button>
      </div>
    );
  };

  const getMembersByType = (members) => {
    return members.reduce((acc, member) => {
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

  const toggleBundle = (key) => {
    setExpandedBundles(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const toggleType = (key) => {
    setExpandedTypes(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const convertToFeetInches = (inches) => {
    const feet = Math.floor(inches / 12);
    const remainingInches = inches % 12;
    const sixteenths = Math.round((remainingInches % 1) * 16);
    const wholeInches = Math.floor(remainingInches);

    let result = '';
    if (feet > 0) result += `${feet}-`;
    result += `${wholeInches}-${sixteenths}`;
    
    return result;
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

  const renderFiltersPanel = (lineNumber) => {
    return (
      <div className="mb-4">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          {/* Control de tamaño de fuente */}
          <div className="flex items-center gap-3 bg-gray-800/50 rounded-lg p-2">
            <span className="text-gray-300 mr-2">Tamaño de texto:</span>
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
        
        <button
          onClick={() => toggleFilters(lineNumber)}
          className="flex items-center gap-2 text-gray-200 hover:text-white bg-gray-800/50 px-4 py-2 rounded-lg w-full"
        >
          <FiFilter />
          <span>Filtros</span>
          {expandedFilters[lineNumber] ? <FiChevronDown /> : <FiChevronRight />}
        </button>
        {expandedFilters[lineNumber] && (
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
            <div className="grid grid-cols-2 gap-2">
              {availableTypes.map(type => (
                <label key={type} className="flex items-center gap-2 text-gray-400">
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes(type)}
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
    );
  };

  // Estado para controlar si estamos en modo "agregar" o "reemplazar"
  const [addMode, setAddMode] = useState(false);

  const renderTable = (lineNumber) => {
    const tableData = lineNumber === 1 ? line1Data : line2Data;
    
    return (
      <div className="glass-card mb-10 p-6 rounded-lg">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Tabla de Línea {lineNumber}</h2>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const fontSize = window.prompt("Ingrese el tamaño de fuente (1-5):", "3");
                if (fontSize && !isNaN(parseInt(fontSize)) && parseInt(fontSize) >= 1 && parseInt(fontSize) <= 5) {
                  setFontSize(parseInt(fontSize));
                }
              }}
              className="text-blue-400 hover:text-blue-300"
            >
              <FiType size={20} />
            </button>
            {actionHistory.length > 0 && (
              <button
                onClick={handleUndo}
                className="text-amber-500 hover:text-amber-400"
              >
                <FiRotateCcw size={20} />
              </button>
            )}
          </div>
        </div>
        
        {renderFiltersPanel(lineNumber)}

        {tableData.length > 0 && (
          <div className="overflow-x-auto mt-4">
            <DragDropContext onDragEnd={(result) => handleDragEnd(result, lineNumber)}>
              <Droppable droppableId={`table-${lineNumber}`}>
                {(provided) => (
                  <table className="w-full text-left table-auto" {...provided.droppableProps} ref={provided.innerRef}>
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="p-3"></th> {/* Columna para el ícono de arrastrar */}
                        {columns.map(column => (
                          <th key={column.accessorKey} className="p-3 font-medium text-gray-400">
                            {column.header}
                          </th>
                        ))}
                        <th className="p-3"></th> {/* Columna para acciones */}
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.map((row, index) => (
                        <Draggable key={`${row.jobNumber}-${row.bundle}-${index}`} draggableId={`${row.jobNumber}-${row.bundle}-${index}`} index={index}>
                          {(provided) => (
                            <tr 
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className="border-b border-gray-700/50 hover:bg-gray-800/30"
                            >
                              <td className="p-3 text-gray-400" {...provided.dragHandleProps}>
                                <FiMove className="cursor-move" />
                              </td>
                              {columns.map(column => (
                                <td 
                                  key={column.accessorKey} 
                                  className={`p-3 ${getFontSizeClass()}`}
                                  onClick={() => {
                                    if (editingCell?.rowIndex === index && editingCell?.columnId === column.accessorKey) {
                                      return;
                                    }
                                    setEditingCell({ rowIndex: index, columnId: column.accessorKey, lineNumber });
                                    setEditValue(row[column.accessorKey]);
                                  }}
                                >
                                  {editingCell?.rowIndex === index && editingCell?.columnId === column.accessorKey ? (
                                    <input
                                      type="text"
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      onBlur={() => handleCellEdit(editValue, { index, lineNumber }, { id: column.accessorKey })}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          handleCellEdit(editValue, { index, lineNumber }, { id: column.accessorKey });
                                        } else if (e.key === 'Escape') {
                                          setEditingCell(null);
                                        }
                                      }}
                                      className="bg-gray-700 text-white p-1 w-full outline-none rounded"
                                      autoFocus
                                    />
                                  ) : (
                                    <span>{row[column.accessorKey]}</span>
                                  )}
                                </td>
                              ))}
                              <td className="p-3">
                                <button
                                  onClick={() => handleDeleteRow(lineNumber, index)}
                                  className="text-red-500 hover:text-red-400 transition-colors"
                                >
                                  <FiTrash2 />
                                </button>
                              </td>
                            </tr>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </tbody>
                  </table>
                )}
              </Droppable>
            </DragDropContext>
          </div>
        )}
        
        <div className="flex flex-wrap gap-4 mt-6">
          {/* Botón para obtener la tabla del día */}
          <button
            onClick={() => fetchTodayAssignments(lineNumber)}
            className="flex items-center gap-2 bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded transition-colors shadow-md"
            disabled={isLoading}
          >
            <FiCalendar />
            <span>Obtener tabla del día</span>
          </button>
          
          {/* Botón para subir Excel (normal o agregar) */}
          <label className="flex items-center gap-2 cursor-pointer bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors shadow-md">
            <FiUpload />
            <span>Subir Excel</span>
            <input
              type="file"
              className="hidden"
              accept=".xlsx,.xls"
              onChange={(e) => handleFileUpload(e.target.files[0], lineNumber)}
            />
          </label>
          
          {/* Botón para agregar trabajos */}
          <label className="flex items-center gap-2 cursor-pointer bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded transition-colors shadow-md">
            <FiPlus />
            <span>Agregar trabajos</span>
            <input
              type="file"
              className="hidden"
              accept=".xlsx,.xls"
              onChange={(e) => {
                addNonDuplicateJobs(e.target.files[0], lineNumber);
                setAddMode(true);
              }}
            />
          </label>
          
          <button
            onClick={() => loadBundleMembers(lineNumber === 1 ? line1Data : line2Data)}
            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded transition-colors shadow-md"
            disabled={isLoading || (lineNumber === 1 ? !line1Data.length : !line2Data.length)}
          >
            <FiSearch />
            <span>Buscar coincidencias</span>
          </button>
          
          <button
            onClick={() => setShowXmlUploader(true)}
            className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded transition-colors shadow-md"
          >
            <FiFile />
            <span>Subir XML</span>
          </button>
          
          {/* Botón para enviar a línea */}
          {(lineNumber === 1 ? line1Data.length > 0 : line2Data.length > 0) && (
            <button
              onClick={() => assignToLine(lineNumber)}
              className={`flex items-center gap-2 ${addMode ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-500 hover:bg-indigo-600'} text-white px-4 py-2 rounded transition-colors shadow-md`}
              disabled={isLoading}
            >
              <FiShare className="transform -rotate-90" />
              <span>{addMode ? 'Agregar a' : 'Reemplazar'} línea {lineNumber}</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-4">
      {/* Botón global de búsqueda y deshacer */}
      {(line1Data.length > 0 || line2Data.length > 0) && (
        <div className="mb-6 flex justify-center gap-4">
          <button
            onClick={searchAllMatches}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg text-lg font-medium transition-colors shadow-lg"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                <span>Buscando coincidencias...</span>
              </>
            ) : (
              <>
                <FiSearch />
                <span>Buscar coincidencias para todas las tablas</span>
              </>
            )}
          </button>
          
          {/* Botón de deshacer */}
          {actionHistory.length > 0 && (
            <button
              onClick={handleUndo}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-lg text-lg font-medium transition-colors shadow-lg"
            >
              <FiRotateCcw />
              <span>Deshacer</span>
            </button>
          )}
        </div>
      )}
      
      {renderTable(1)}
      {renderTable(2)}
      {showXmlUploader && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-lg w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Subir carpeta de archivos XML</h3>
              <button
                onClick={() => setShowXmlUploader(false)}
                className="text-gray-400 hover:text-gray-200"
              >
                <FiX size={24} />
              </button>
            </div>
            <FileUploader />
          </div>
        </div>
      )}
    </div>
  );
}
