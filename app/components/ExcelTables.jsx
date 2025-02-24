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
import { FiUpload, FiEdit2, FiSave, FiX, FiFile } from 'react-icons/fi';
import FileUploader from './FileUploader';
import { supabase } from '@/lib/supabase';

export default function ExcelTables() {
  const [line1Data, setLine1Data] = useState([]);
  const [line2Data, setLine2Data] = useState([]);
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [showXmlUploader, setShowXmlUploader] = useState(false);
  const [bundleMembers, setBundleMembers] = useState({});

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
      if (member.type?.toLowerCase().includes('bottom plate') && 
          member.description?.toLowerCase().includes('sill seal')) {
        hasSillSeal = true;
      }
    });

    let summary = Array.from(studSummary).join(', ');
    if (hasSillSeal) {
      summary += ' <span class="text-green-400">(+ SILL SEAL)</span>';
    }
    return summary;
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

  const loadBundleMembers = async (data) => {
    const newBundleMembers = {};
    for (const row of data) {
      const members = await fetchBundleMembers(row.jobNumber, row.bundle);
      if (members) {
        newBundleMembers[`${row.jobNumber}-${row.bundle}`] = members;
      }
    }
    setBundleMembers(newBundleMembers);
  };

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

  const handleCellEdit = (value, row, column) => {
    const newData = [...(row.lineNumber === 1 ? line1Data : line2Data)];
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
        {flexRender(cell.column.columnDef.cell, cell.getContext())}
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

  const renderTable = (lineNumber) => {
    const data = lineNumber === 1 ? line1Data : line2Data;
    
    return (
      <div className="glass-card rounded-2xl p-8 mt-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Línea {lineNumber}</h2>
        </div>

        {data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  {columns.map((column, index) => (
                    <th key={index} className="px-6 py-3 text-left text-sm font-medium text-gray-300">
                      {column.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {data.map((row, index) => {
                  const key = `${row.jobNumber}-${row.bundle}`;
                  const members = bundleMembers[key];
                  return (
                    <tr key={index} className="hover:bg-gray-800/30">
                      <td className="px-6 py-4 text-sm text-gray-300">{row.jobNumber}</td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-4">
                          <span className="text-gray-300">{row.bundle}</span>
                          {members && (
                            <div 
                              className="text-left flex-1"
                              dangerouslySetInnerHTML={{ __html: getStudsSummary(members) }}
                            />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300">{row.linealFeet}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex gap-4 mt-6">
          <label className="flex items-center gap-2 cursor-pointer bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors">
            <FiUpload />
            <span>Subir Excel</span>
            <input
              type="file"
              className="hidden"
              accept=".xlsx,.xls"
              onChange={(e) => handleFileUpload(e.target.files[0], lineNumber)}
            />
          </label>
          <button
            onClick={() => setShowXmlUploader(true)}
            className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded transition-colors"
          >
            <FiFile />
            <span>Subir XML</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-4">
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