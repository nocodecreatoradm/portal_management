import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, Filter, ArrowUp, ArrowDown } from 'lucide-react';

interface HeaderFilterPopoverProps {
  column: string;
  label: string;
  selectedValues: string[];
  onFilterChange: (column: string, values: string[]) => void;
  currentSort: { column: string; direction: 'asc' | 'desc' | null };
  onSortChange: (column: string, direction: 'asc' | 'desc' | null) => void;
  align?: 'left' | 'right' | 'center';
  uniqueValues?: string[];
}

export default function HeaderFilterPopover({
  column,
  label,
  selectedValues = [],
  onFilterChange,
  currentSort,
  onSortChange,
  align = 'left',
  uniqueValues
}: HeaderFilterPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  const filteredOptions = useMemo(() => {
    if (!uniqueValues) return [];
    return uniqueValues
      .filter(Boolean)
      .map(v => String(v))
      .filter(opt => opt.toLowerCase().includes(searchText.toLowerCase()))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }, [uniqueValues, searchText]);

  // Close the popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const isActiveSort = currentSort.column === column && currentSort.direction !== null;
  const isActiveFilter = selectedValues.length > 0;

  return (
    <div className="relative inline-block ml-1 select-none font-sans" ref={popoverRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`inline-flex items-center justify-center p-1 rounded-md transition-all hover:bg-slate-200/60 ${
          isActiveSort || isActiveFilter 
            ? 'text-blue-600 bg-blue-50/80 border border-blue-200' 
            : 'text-slate-400 hover:text-slate-600'
        }`}
        title={`Filtrar y Ordenar por ${label}`}
      >
        <Filter size={12} className={isActiveFilter ? 'fill-blue-600/30' : ''} />
        {isActiveSort && (
          currentSort.direction === 'asc' 
            ? <ArrowUp size={11} className="ml-0.5 text-blue-600 animate-pulse" /> 
            : <ArrowDown size={11} className="ml-0.5 text-blue-600 animate-pulse" />
        )}
      </button>

      {isOpen && (
        <div 
          onClick={(e) => e.stopPropagation()}
          className={`absolute top-full mt-1.5 w-64 bg-white rounded-2xl border border-slate-200 shadow-xl p-4 z-50 animate-in fade-in zoom-in-95 duration-200 text-left normal-case tracking-normal ${
            align === 'right' ? 'right-0' : align === 'center' ? 'left-1/2 -translate-x-1/2' : 'left-0'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <span className="text-xs font-black text-slate-800 tracking-tight">{label}</span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-50 rounded-lg transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          {/* Sort Section */}
          <div className="space-y-2 pb-3 mb-3 border-b border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ordenamiento</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  onSortChange(column, 'asc');
                  setIsOpen(false);
                }}
                className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition-all ${
                  currentSort.column === column && currentSort.direction === 'asc'
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <ArrowUp size={12} />
                <span>Ascendente</span>
              </button>
              <button
                onClick={() => {
                  onSortChange(column, 'desc');
                  setIsOpen(false);
                }}
                className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition-all ${
                  currentSort.column === column && currentSort.direction === 'desc'
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <ArrowDown size={12} />
                <span>Descendente</span>
              </button>
            </div>
            {isActiveSort && (
              <button
                onClick={() => {
                  onSortChange(column, null);
                  setIsOpen(false);
                }}
                className="w-full mt-1 px-3 py-1 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black text-slate-500 uppercase hover:bg-slate-100 transition-all text-center tracking-wider"
              >
                Limpiar Orden
              </button>
            )}
          </div>

          {/* Filter Section */}
          <div className="space-y-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filtros</p>
            <div className="relative">
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Buscar coincidencia..."
                className="w-full pl-8 pr-8 py-2 text-xs font-bold border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-sans bg-slate-50/50"
                onClick={(e) => e.stopPropagation()}
              />
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              {searchText && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchText('');
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100 transition-colors"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* List of Unique Values with Checkboxes */}
            {uniqueValues && uniqueValues.length > 0 && (
              <div className="mt-2 max-h-48 overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-50 custom-scrollbar bg-slate-50/20">
                {/* Select All option */}
                <button
                  type="button"
                  onClick={() => {
                    const allSelected = filteredOptions.every(opt => selectedValues.includes(opt));
                    let newValues: string[];
                    if (allSelected) {
                      // Deselect all filtered options
                      newValues = selectedValues.filter(v => !filteredOptions.includes(v));
                    } else {
                      // Select all filtered options
                      newValues = Array.from(new Set([...selectedValues, ...filteredOptions]));
                    }
                    onFilterChange(column, newValues);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-black text-blue-600 hover:bg-blue-50/40 transition-colors flex items-center gap-2"
                >
                  <input
                    type="checkbox"
                    checked={filteredOptions.length > 0 && filteredOptions.every(opt => selectedValues.includes(opt))}
                    onChange={() => {}}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 cursor-pointer"
                  />
                  <span>
                    {filteredOptions.every(opt => selectedValues.includes(opt)) ? 'Deseleccionar todos' : 'Seleccionar todos'}
                  </span>
                </button>

                {filteredOptions.length > 0 ? (
                  filteredOptions.map((opt) => {
                    const isChecked = selectedValues.includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          const newValues = isChecked
                            ? selectedValues.filter(v => v !== opt)
                            : [...selectedValues, opt];
                          onFilterChange(column, newValues);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-xs font-semibold hover:bg-blue-50/40 transition-colors flex items-center gap-2 ${
                          isChecked ? 'text-blue-600 bg-blue-50/20' : 'text-slate-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 cursor-pointer"
                        />
                        <span className="truncate">{opt}</span>
                      </button>
                    );
                  })
                ) : (
                  <div className="px-3 py-2 text-[10px] text-slate-400 italic text-center">
                    No hay coincidencias
                  </div>
                )}
              </div>
            )}

            {isActiveFilter && (
              <button
                type="button"
                onClick={() => {
                  onFilterChange(column, []);
                  setSearchText('');
                }}
                className="w-full mt-2 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all text-center"
              >
                Limpiar Filtro
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
