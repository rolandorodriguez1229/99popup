'use client';
import { useState, useEffect } from 'react';
import { FiChevronDown, FiChevronRight, FiPackage, FiMinus, FiPlus } from 'react-icons/fi';
import { supabase } from '@/lib/supabase';

export default function JobsList() {
  const [jobs, setJobs] = useState([]);
  const [expandedJobs, setExpandedJobs] = useState({});
  const [expandedBundles, setExpandedBundles] = useState({});
  const [expandedTypes, setExpandedTypes] = useState({});
  const [fontSize, setFontSize] = useState(3); // 1-5 para el tamaño de fuente
  const [loading, setLoading] = useState(true);
  const [availableTypes, setAvailableTypes] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);

  useEffect(() => {
    fetchJobs();
  }, []);

  const toggleJob = (jobNumber) => {
    setExpandedJobs(prev => ({
      ...prev,
      [jobNumber]: !prev[jobNumber]
    }));
  };

  const toggleBundle = (bundleId) => {
    setExpandedBundles(prev => ({
      ...prev,
      [bundleId]: !prev[bundleId]
    }));
  };

  const toggleType = (typeId) => {
    setExpandedTypes(prev => ({
      ...prev,
      [typeId]: !prev[typeId]
    }));
  };

  // Función para convertir decimales a fracciones en octavos
  const decimalToFraction = (decimal) => {
    const wholePart = Math.floor(decimal);
    const decimalPart = decimal - wholePart;
    const nearestEighth = Math.round(decimalPart * 8) / 8;
    
    if (nearestEighth === 0) return `${wholePart}`;
    if (nearestEighth === 1) return `${wholePart + 1}`;
    
    const numerator = Math.round(nearestEighth * 8);
    return `${wholePart} ${numerator}/8`;
  };

  // Función para convertir pulgadas a pies-pulgadas-dieciseisavos
  const inchesToFeetFormat = (inches) => {
    let parts = inches.toString().split(' ');
    let totalInches = parseFloat(parts[0]);
    
    if (parts.length > 1) {
      let fraction = parts[1].split('/');
      totalInches += parseInt(fraction[0]) / parseInt(fraction[1]);
    }

    const feet = Math.floor(totalInches / 12);
    const remainingInches = totalInches % 12;
    const wholeInches = Math.floor(remainingInches);
    const fractionalPart = remainingInches - wholeInches;
    const sixteenths = Math.round(fractionalPart * 16);

    return `${feet}-${wholeInches}-${sixteenths}`;
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

  // Función para extraer todos los tipos únicos de los trabajos
  const extractTypes = (jobsData) => {
    const types = new Set();
    jobsData.forEach(job => {
      job.bundles.forEach(bundle => {
        Object.keys(bundle.members).forEach(type => {
          types.add(type);
        });
      });
    });
    return Array.from(types).sort();
  };

  // Función para manejar la selección de tipos
  const handleTypeToggle = (type) => {
    setSelectedTypes(prev => {
      if (prev.includes(type)) {
        return prev.filter(t => t !== type);
      } else {
        return [...prev, type];
      }
    });
  };

  // Función para seleccionar/deseleccionar todos los tipos
  const handleSelectAllTypes = () => {
    if (selectedTypes.length === availableTypes.length) {
      setSelectedTypes([]);
    } else {
      setSelectedTypes([...availableTypes]);
    }
  };

  // Función para determinar el color según el material
  const getDescriptionColor = (description) => {
    if (description.includes('2x4')) return 'text-yellow-400';
    if (description.includes('2x6')) return 'text-blue-400';
    if (description.includes('3-1/2X4')) return 'text-red-400';
    if (description.includes('3.5 x 11.25')) return 'text-purple-400';
    if (description.includes('2x12')) return 'text-pink-400';
    if (description.includes('2x8')) return 'text-cyan-400';
    if (description.includes('2x10')) return 'text-green-400';
    return 'text-gray-300'; // color por defecto
  };

  // Función para obtener el resumen de studs
  const getStudsSummary = (members) => {
    const studSummary = [];
    Object.entries(members).forEach(([type, groups]) => {
      if (type.toLowerCase().includes('stud')) {
        Object.values(groups).forEach(group => {
          const dimension = group.description.match(/(2x\d+|3-1\/2X4|3\.5 x 11\.25)/i)?.[0] || '';
          studSummary.push(
            `<span class="${getDescriptionColor(dimension)}">${group.length}″ ${dimension}</span>`
          );
        });
      }
    });
    return studSummary.join(', ');
  };

  async function fetchJobs() {
    try {
      const { data, error } = await supabase
        .from('bundle99')
        .select(`
          id,
          job_number,
          bundle_name,
          members99 (
            name,
            description,
            length,
            type
          )
        `)
        .order('job_number', { ascending: false });

      if (error) throw error;

      const organizedJobs = data.reduce((acc, bundle) => {
        if (!acc[bundle.job_number]) {
          acc[bundle.job_number] = {
            jobNumber: bundle.job_number,
            bundles: []
          };
        }
        
        const organizedMembers = bundle.members99.reduce((memberAcc, member) => {
          const type = member.type || member.name || 'Sin tipo';
          const description = member.description.trim();
          const length = decimalToFraction(parseFloat(member.length));
          const key = `${description} ${length}`;
          
          if (!memberAcc[type]) {
            memberAcc[type] = {};
          }
          if (!memberAcc[type][key]) {
            memberAcc[type][key] = {
              description,
              length,
              count: 0
            };
          }
          memberAcc[type][key].count++;
          return memberAcc;
        }, {});

        acc[bundle.job_number].bundles.push({
          id: bundle.id,
          name: bundle.bundle_name,
          members: organizedMembers
        });

        return acc;
      }, {});

      const jobsArray = Object.values(organizedJobs);
      setJobs(jobsArray);
      const types = extractTypes(jobsArray);
      setAvailableTypes(types);
      setSelectedTypes(types); // Inicialmente seleccionar todos los tipos
      setLoading(false);
    } catch (error) {
      console.error('Error al cargar los trabajos:', error);
      setLoading(false);
    }
  }

  return (
    <div className="glass-card rounded-2xl p-8 mt-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Trabajos Procesados</h2>
        <div className="flex items-center gap-4">
          {/* Control de tamaño de fuente */}
          <div className="flex items-center gap-3 bg-gray-800/50 rounded-lg p-2">
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

      {/* Filtro de tipos */}
      <div className="mb-6 bg-gray-800/30 p-4 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-medium">Filtrar por tipo:</h3>
          <button
            onClick={handleSelectAllTypes}
            className="text-green-500 hover:text-green-400 text-sm"
          >
            {selectedTypes.length === availableTypes.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {availableTypes.map(type => (
            <button
              key={type}
              onClick={() => handleTypeToggle(type)}
              className={`px-3 py-1 rounded-full text-sm ${
                selectedTypes.includes(type)
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-700 text-gray-300'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-500 border-t-transparent"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map(job => (
            <div key={job.jobNumber} className="border border-gray-700 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleJob(job.jobNumber)}
                className="w-full px-4 py-3 bg-gray-800/50 flex items-center justify-between hover:bg-gray-800/70 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {expandedJobs[job.jobNumber] ? <FiChevronDown className="text-green-500" /> : <FiChevronRight className="text-green-500" />}
                  <span className="text-white font-medium">{job.jobNumber}</span>
                  <span className="text-gray-400 text-sm">({job.bundles.length})</span>
                </div>
              </button>

              {expandedJobs[job.jobNumber] && (
                <div className="p-4 space-y-3">
                  {job.bundles
                    .sort((a, b) => {
                      // Extraer números del nombre del bundle
                      const aNum = parseInt(a.name.match(/\d+/)?.[0] || 0);
                      const bNum = parseInt(b.name.match(/\d+/)?.[0] || 0);
                      return aNum - bNum;
                    })
                    .map(bundle => (
                      <div key={bundle.id} className="border border-gray-700/50 rounded-lg">
                        <button
                          onClick={() => toggleBundle(bundle.id)}
                          className="w-full px-4 py-2 flex items-center justify-between hover:bg-gray-800/30 transition-colors rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            <FiPackage className="text-green-500" />
                            <span className="text-gray-300">{bundle.name}</span>
                          </div>
                          <div 
                            className="text-sm text-left flex-1 ml-4"
                            dangerouslySetInnerHTML={{ __html: getStudsSummary(bundle.members) }}
                          />
                        </button>

                        {expandedBundles[bundle.id] && (
                          <div className="p-4">
                            <div className="grid grid-cols-3 gap-4">
                              {Object.entries(bundle.members)
                                .filter(([type]) => selectedTypes.includes(type))
                                .map(([type, groups]) => (
                                  <div key={type} className="space-y-2">
                                    <button
                                      onClick={() => toggleType(`${bundle.id}-${type}`)}
                                      className="w-full flex items-center gap-2 text-green-500 font-medium text-lg border-b border-gray-700/50 pb-2"
                                    >
                                      {expandedTypes[`${bundle.id}-${type}`] ? <FiChevronDown /> : <FiChevronRight />}
                                      <span>{type}</span>
                                    </button>
                                    {expandedTypes[`${bundle.id}-${type}`] && (
                                      <div className="space-y-1 pl-4">
                                        {Object.values(groups).map((group, idx) => (
                                          <div key={idx} className={`text-gray-300 ${getFontSizeClass()}`}>
                                            <div className="flex items-baseline gap-2">
                                              <span className="text-green-400 font-medium">{group.count} x </span>
                                              <span className={getDescriptionColor(group.description)}>
                                                {inchesToFeetFormat(group.length)} {group.description}
                                              </span>
                                            </div>
                                            <div className={`pl-4 ${getFontSizeClass(2)}`}>
                                              <div className={getDescriptionColor(group.description)}>
                                                {group.length}″
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
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}