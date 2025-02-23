'use client';
import { useState, useEffect } from 'react';
import { FiChevronDown, FiChevronRight, FiPackage, FiGrid } from 'react-icons/fi';
import { supabase } from '@/lib/supabase';

export default function JobsList() {
  const [jobs, setJobs] = useState([]);
  const [expandedJobs, setExpandedJobs] = useState({});
  const [expandedBundles, setExpandedBundles] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobs();
  }, []);

  async function fetchJobs() {
    try {
      // Obtener todos los bundles agrupados por job_number
      const { data, error } = await supabase
        .from('bundle99')
        .select(`
          id,
          job_number,
          bundle_name,
          members99 (
            id,
            type,
            height,
            width,
            length,
            actual_height,
            actual_width
          )
        `)
        .order('job_number', { ascending: false });

      if (error) throw error;

      // Organizar los datos por trabajo
      const organizedJobs = data.reduce((acc, bundle) => {
        if (!acc[bundle.job_number]) {
          acc[bundle.job_number] = {
            jobNumber: bundle.job_number,
            bundles: []
          };
        }
        
        // Organizar miembros por tipo y medidas
        const organizedMembers = bundle.members99.reduce((memberAcc, member) => {
          const type = member.type || 'Sin tipo';
          const key = `${type}-${member.height}-${member.width}-${member.length}`;
          
          if (!memberAcc[type]) {
            memberAcc[type] = {};
          }
          if (!memberAcc[type][key]) {
            memberAcc[type][key] = {
              type,
              height: member.height,
              width: member.width,
              length: member.length,
              count: 0,
              actualHeight: member.actual_height,
              actualWidth: member.actual_width
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

  return (
    <div className="glass-card rounded-2xl p-8 mt-8">
      <h2 className="text-2xl font-bold text-white mb-6">Trabajos Procesados</h2>
      
      {loading ? (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-500 border-t-transparent"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map(job => (
            <div key={job.jobNumber} className="border border-gray-700 rounded-lg overflow-hidden">
              {/* Job Header */}
              <button
                onClick={() => toggleJob(job.jobNumber)}
                className="w-full px-4 py-3 bg-gray-800/50 flex items-center justify-between hover:bg-gray-800/70 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {expandedJobs[job.jobNumber] ? <FiChevronDown className="text-green-500" /> : <FiChevronRight className="text-green-500" />}
                  <span className="text-white font-medium">Trabajo #{job.jobNumber}</span>
                  <span className="text-gray-400 text-sm">({job.bundles.length} bundles)</span>
                </div>
              </button>

              {/* Bundles List */}
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

                      {/* Members by Type */}
                      {expandedBundles[bundle.id] && (
                        <div className="p-4 space-y-4">
                          {Object.entries(bundle.members).map(([type, members]) => (
                            <div key={type} className="space-y-2">
                              <h4 className="text-green-500 font-medium flex items-center gap-2">
                                <FiGrid />
                                {type}
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {Object.values(members).map((group, idx) => (
                                  <div key={idx} className="bg-gray-800/30 p-3 rounded-lg">
                                    <div className="text-gray-300 text-sm">
                                      <span className="font-medium">{group.count}x</span> - 
                                      {group.height && ` ${group.height}h`}
                                      {group.width && ` ${group.width}w`}
                                      {group.length && ` ${group.length}l`}
                                    </div>
                                    {(group.actualHeight || group.actualWidth) && (
                                      <div className="text-gray-400 text-xs mt-1">
                                        Actual: 
                                        {group.actualHeight && ` ${group.actualHeight}h`}
                                        {group.actualWidth && ` ${group.actualWidth}w`}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
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