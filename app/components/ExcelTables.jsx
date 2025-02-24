'use client';
import { useState } from 'react';
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

export default function ExcelTables() {
  const [line1Data, setLine1Data] = useState([]);
  const [line2Data, setLine2Data] = useState([]);
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [showXmlUploader, setShowXmlUploader] = useState(false);

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
    },
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

  return (
    <div className="container mx-auto p-4">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">Línea 1</h2>
        <div className="flex gap-4 mb-4">
          <label className="flex items-center gap-2 cursor-pointer bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
            <FiUpload />
            <span>Subir Excel</span>
            <input
              type="file"
              className="hidden"
              accept=".xlsx,.xls"
              onChange={(e) => handleFileUpload(e.target.files[0], 1)}
            />
          </label>
          <button
            onClick={() => setShowXmlUploader(true)}
            className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded"
          >
            <FiFile />
            <span>Subir XML</span>
          </button>
        </div>
        {line1Data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                {table1.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id} className="border-b border-gray-700">
                    {headerGroup.headers.map(header => (
                      <th key={header.id} className="px-4 py-2 text-left text-gray-400">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table1.getRowModel().rows.map(row => (
                  <tr key={row.id} className="border-b border-gray-700/50 hover:bg-gray-800/30">
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-4 py-2 text-gray-300">
                        {renderCell(cell, 1)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Línea 2</h2>
        <div className="flex gap-4 mb-4">
          <label className="flex items-center gap-2 cursor-pointer bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
            <FiUpload />
            <span>Subir Excel</span>
            <input
              type="file"
              className="hidden"
              accept=".xlsx,.xls"
              onChange={(e) => handleFileUpload(e.target.files[0], 2)}
            />
          </label>
          <button
            onClick={() => setShowXmlUploader(true)}
            className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded"
          >
            <FiFile />
            <span>Subir XML</span>
          </button>
        </div>
        {line2Data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                {table2.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id} className="border-b border-gray-700">
                    {headerGroup.headers.map(header => (
                      <th key={header.id} className="px-4 py-2 text-left text-gray-400">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table2.getRowModel().rows.map(row => (
                  <tr key={row.id} className="border-b border-gray-700/50 hover:bg-gray-800/30">
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-4 py-2 text-gray-300">
                        {renderCell(cell, 2)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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