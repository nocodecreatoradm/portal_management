import { Search, Calendar } from 'lucide-react';
import { ChangeEvent } from 'react';

interface FiltersProps {
  onFilterChange: (filters: any) => void;
  filters: {
    marca: string;
    linea: string;
    proveedor: string;
  };
}

export default function Filters({ onFilterChange, filters }: FiltersProps) {
  const handleChange = (e: ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    onFilterChange({ ...filters, [name]: value });
  };

  return (
    <div className="bg-slate-50/50 p-4 md:p-6 border-b border-slate-100">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 items-end">
        {/* Row 1 */}
        <div className="md:col-span-3 flex flex-col gap-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Marca</label>
          <select 
            name="marca"
            value={filters.marca}
            onChange={handleChange}
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 md:py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all shadow-sm"
          >
            <option value="">Todas las Marcas</option>
            <option value="SOLE">SOLE</option>
            <option value="S-Collection">S-Collection</option>
          </select>
        </div>

        <div className="md:col-span-3 flex flex-col gap-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Línea</label>
          <select 
            name="linea"
            value={filters.linea}
            onChange={handleChange}
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 md:py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all shadow-sm"
          >
            <option value="">Todas las Líneas</option>
            <option value="LÍNEA BLANCA">LÍNEA BLANCA</option>
            <option value="AGUA CALIENTE">AGUA CALIENTE</option>
            <option value="CLIMATIZACIÓN">CLIMATIZACIÓN</option>
            <option value="PURIFICACIÓN">PURIFICACIÓN</option>
          </select>
        </div>

        <div className="md:col-span-6 flex flex-col gap-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Proveedor</label>
          <select 
            name="proveedor"
            value={filters.proveedor}
            onChange={handleChange}
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 md:py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all shadow-sm"
          >
            <option value="">Todos los Proveedores</option>
            {/* These should ideally be dynamic like in uniqueProviders in App.tsx but Filters only sees limited props */}
            <option value="NINGBO ETDZ HUIXING TRADE CO., LTD.">NINGBO ETDZ HUIXING TRADE CO., LTD.</option>
          </select>
        </div>
      </div>
    </div>
  );
}
