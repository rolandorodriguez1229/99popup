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
import { FiUpload, FiEdit2, FiSave, FiX } from 'react-icons/fi';

export default function ExcelTables() {
  const [line1Data, setLine1Data] = useState([]);
  const [line2Data, setLine2Data] = useState([]);
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');

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
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 'A' });

      const processedData = jsonData.slice(1).map(row => {
        if (lineNumber === 1) {
          return {
            jobNumber: row['B'],
            bundle: row['C'],
            linealFeet: row['D']
          };
        } else {
          return {
            jobNumber: row['B'],
            bundle: row['C'],
            linealFeet: row['E']
          };
        }
      }).filter(row => row.jobNumber && row.bundle && row.linealFeet); // Filtrar filas vacías

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
    <div className="space-y-8">
      {/* Tabla Línea 1 */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Línea 1</h3>
          <label className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg cursor-pointer transition-colors">
            <FiUpload />
            <span>Subir Excel</span>
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                if (e.target.files[0]) {
                  handleFileUpload(e.target.files[0], 1);
                }
              }}
            />
          </label>
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

      {/* Tabla Línea 2 */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Línea 2</h3>
          <label className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg cursor-pointer transition-colors">
            <FiUpload />
            <span>Subir Excel</span>
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                if (e.target.files[0]) {
                  handleFileUpload(e.target.files[0], 2);
                }
              }}
            />
          </label>
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
    </div>
  );
} 