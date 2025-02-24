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

  // Función mejorada para convertir pulgadas a pies-pulgadas-dieciseisavos
  const inchesToFeetFormat = (inches) => {
    // Convertir el string de pulgadas y fracciones a un número decimal
    let parts = inches.toString().split(' ');
    let totalInches = parseFloat(parts[0]);
    
    // Si hay una fracción, agregarla al total
    if (parts.length > 1) {
      let fraction = parts[1].split('/');
      totalInches += parseInt(fraction[0]) / parseInt(fraction[1]);
    }

    // Calcular pies
    const feet = Math.floor(totalInches / 12);
    
    // Calcular pulgadas restantes
    const remainingInches = totalInches % 12;
    const wholeInches = Math.floor(remainingInches);
    
    // Convertir la parte decimal a dieciseisavos
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

      setJobs(Object.values(organizedJobs));
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
                  {job.bundles.map(bundle => (
                    <div key={bundle.id} className="border border-gray-700/50 rounded-lg">
                      <button
                        onClick={() => toggleBundle(bundle.id)}
                        className="w-full px-4 py-2 flex items-center gap-2 hover:bg-gray-800/30 transition-colors rounded-lg"
                      >
                        <FiPackage className="text-green-500" />
                        <span className="text-gray-300">{bundle.name}</span>
                      </button>

                      {expandedBundles[bundle.id] && (
                        <div className="p-4">
                          <div className="grid grid-cols-3 gap-4">
                            {Object.entries(bundle.members).map(([type, groups]) => (
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
                                          <span>{group.description}</span>
                                        </div>
                                        <div className={`pl-4 ${getFontSizeClass(2)}`}>
                                          <div className="text-gray-400">{group.length}″</div>
                                          <div className="text-gray-400">{inchesToFeetFormat(group.length)}</div>
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