import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Filter, ArrowUp, ArrowDown } from 'lucide-react';

interface HeaderFilterPopoverProps {
  column: string;
  label: string;
  currentFilter: string;
  onFilterChange: (column: string, value: string) => void;
  currentSort: { column: string; direction: 'asc' | 'desc' | null };
  onSortChange: (column: string, direction: 'asc' | 'desc' | null) => void;
  align?: 'left' | 'right' | 'center';
}

export default function HeaderFilterPopover({
  column,
  label,
  currentFilter,
  onFilterChange,
  currentSort,
  onSortChange,
  align = 'left'
}: HeaderFilterPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

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
  const isActiveFilter = currentFilter !== '';

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
        <div className={`absolute top-full mt-1.5 w-64 bg-white rounded-2xl border border-slate-200 shadow-xl p-4 z-50 animate-in fade-in zoom-in-95 duration-200 text-left normal-case tracking-normal ${
          align === 'right' ? 'right-0' : align === 'center' ? 'left-1/2 -translate-x-1/2' : 'left-0'
        }`}>
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
                value={currentFilter}
                onChange={(e) => onFilterChange(column, e.target.value)}
                placeholder="Buscar coincidencia..."
                className="w-full pl-8 pr-8 py-2 text-xs font-bold border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-sans bg-slate-50/50"
                onClick={(e) => e.stopPropagation()}
              />
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              {currentFilter && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onFilterChange(column, '');
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100 transition-colors"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
