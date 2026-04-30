import React, { useState, useEffect } from 'react';
import { Wind, Circle, Square, Save, Download, FileSpreadsheet, FileText, Trash2, Plus, Upload, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { exportToExcel, exportToPDF, exportToPPT } from '../lib/exportUtils';
import { saveCalculationRecord, generateModuleCorrelative } from '../lib/api';
import { currentUser } from '../data/mockData';
import ModuleActions from './ModuleActions';

type OutletType = 'circular' | 'quadrangular';
type UnitType = 'm3/h' | 'm3/s' | 'm3/min' | 'cfm';

interface VelocityData {
  power: number;
  withFilter: number[];
  withoutFilter: number[];
}

const AbsorptionCalculator: React.FC<{ initialData?: any; onExportPPT?: () => void }> = ({ initialData, onExportPPT }) => {
  const [outletType, setOutletType] = useState<OutletType>(initialData?.outletType || 'circular');
  const [diameter, setDiameter] = useState<number>(initialData?.diameter || 150); // mm
  const [height, setHeight] = useState<number>(initialData?.height || 100); // mm
  const [width, setWidth] = useState<number>(initialData?.width || 100); // mm
  const [velocities, setVelocities] = useState<VelocityData[]>(initialData?.velocities || [
    { power: 1, withFilter: [0, 0, 0], withoutFilter: [0, 0, 0] },
    { power: 2, withFilter: [0, 0, 0], withoutFilter: [0, 0, 0] },
    { power: 3, withFilter: [0, 0, 0], withoutFilter: [0, 0, 0] },
  ]);
  const [outputUnit, setOutputUnit] = useState<UnitType>(initialData?.outputUnit || 'm3/h');
  const [productDescription, setProductDescription] = useState<string>(initialData?.productDescription || 'Referencia visual para la ubicación de los puntos de medición de velocidad en la salida de aire (Ducto).');
  const [productImage, setProductImage] = useState<string>(initialData?.productImage || 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=600');
  const [isDragging, setIsDragging] = useState(false);

  // Load initial data if provided
  useEffect(() => {
    if (initialData) {
      if (initialData.outletType) setOutletType(initialData.outletType);
      if (initialData.diameter) setDiameter(initialData.diameter);
      if (initialData.height) setHeight(initialData.height);
      if (initialData.width) setWidth(initialData.width);
      if (initialData.velocities) setVelocities(initialData.velocities);
      if (initialData.outputUnit) setOutputUnit(initialData.outputUnit);
      if (initialData.productDescription) setProductDescription(initialData.productDescription);
      if (initialData.productImage) setProductImage(initialData.productImage);
    }
  }, [initialData]);

  const calculateArea = (): number => {
    if (outletType === 'circular') {
      const r = diameter / 2000; // convert to meters
      return Math.PI * Math.pow(r, 2);
    } else {
      return (height / 1000) * (width / 1000); // convert to meters
    }
  };

  const convertAbsorption = (absM3s: number): number => {
    switch (outputUnit) {
      case 'm3/h': return absM3s * 3600;
      case 'm3/min': return absM3s * 60;
      case 'm3/s': return absM3s;
      case 'cfm': return absM3s * 2118.88;
      default: return absM3s;
    }
  };

  const area = calculateArea();

  const calculateAverage = (values: number[]): number => {
    if (values.length === 0) return 0;
    const sum = values.reduce((a, b) => a + b, 0);
    return sum / values.length;
  };

  const calculateStdDev = (values: number[]): number => {
    if (values.length === 0) return 0;
    const avg = calculateAverage(values);
    const squareDiffs = values.map(v => Math.pow(v - avg, 2));
    const avgSquareDiff = calculateAverage(squareDiffs);
    return Math.sqrt(avgSquareDiff);
  };

  const handleVelocityChange = (powerIdx: number, field: 'withFilter' | 'withoutFilter', measurementIdx: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    const newVelocities = [...velocities];
    newVelocities[powerIdx][field][measurementIdx] = numValue;
    setVelocities(newVelocities);
  };

  const handleAddPower = () => {
    setVelocities([...velocities, { power: velocities.length + 1, withFilter: [0, 0, 0], withoutFilter: [0, 0, 0] }]);
  };

  const handleRemovePower = (index: number) => {
    if (velocities.length <= 1) return;
    const newVelocities = velocities.filter((_, i) => i !== index).map((v, i) => ({ ...v, power: i + 1 }));
    setVelocities(newVelocities);
  };

  const handleReset = () => {
    setOutletType('circular');
    setDiameter(150);
    setHeight(100);
    setWidth(100);
    setVelocities([
      { power: 1, withFilter: [0, 0, 0], withoutFilter: [0, 0, 0] },
      { power: 2, withFilter: [0, 0, 0], withoutFilter: [0, 0, 0] },
      { power: 3, withFilter: [0, 0, 0], withoutFilter: [0, 0, 0] },
    ]);
    setOutputUnit('m3/h');
    setProductDescription('Referencia visual para la ubicación de los puntos de medición de velocidad en la salida de aire (Ducto).');
    setProductImage('https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=600');
    toast.info('Formulario restablecido');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    let file: File | null = null;
    if ('files' in e.target && e.target.files) {
      file = e.target.files[0];
    } else if ('dataTransfer' in e && e.dataTransfer.files) {
      file = e.dataTransfer.files[0];
    }

    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor, sube solo archivos de imagen');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setProductImage(event.target.result as string);
          toast.success('Imagen cargada correctamente');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (details: { projectName: string; sampleId: string; description: string }) => {
    const data = {
      outletType,
      diameter,
      height,
      width,
      velocities,
      outputUnit,
      productDescription,
      productImage
    };
    
    try {
      const recordName = await generateModuleCorrelative('absorption_calculation', details.projectName);
      
      await saveCalculationRecord(
        'absorption_calculation', 
        'save', 
        { ...data, recordName }, 
        currentUser.email,
        recordName,
        details.sampleId,
        details.description
      );
      toast.success('Cálculo de absorción guardado correctamente');
    } catch (error) {
      console.error('Error saving absorption record:', error);
      toast.error('Error al guardar el registro');
    }
  };

  const handleExportExcel = () => {
    const exportData = velocities.flatMap(v => {
      const avgWith = calculateAverage(v.withFilter);
      const avgWithout = calculateAverage(v.withoutFilter);
      const stdWith = calculateStdDev(v.withFilter);
      const stdWithout = calculateStdDev(v.withoutFilter);

      return [
        {
          'Potencia': v.power,
          'Condición': 'Con Filtro',
          'M1 (m/s)': v.withFilter[0],
          'M2 (m/s)': v.withFilter[1],
          'M3 (m/s)': v.withFilter[2],
          'Promedio (m/s)': avgWith.toFixed(2),
          'Desv. Est.': stdWith.toFixed(3),
          [`Flujo (${outputUnit})`]: convertAbsorption(avgWith * area).toFixed(2)
        },
        {
          'Potencia': v.power,
          'Condición': 'Sin Filtro',
          'M1 (m/s)': v.withoutFilter[0],
          'M2 (m/s)': v.withoutFilter[1],
          'M3 (m/s)': v.withoutFilter[2],
          'Promedio (m/s)': avgWithout.toFixed(2),
          'Desv. Est.': stdWithout.toFixed(3),
          [`Flujo (${outputUnit})`]: convertAbsorption(avgWithout * area).toFixed(2)
        }
      ];
    });
    exportToExcel(exportData, 'Calculo_Absorcion', 'Resultados');
    saveCalculationRecord('absorption_calculation', 'export_excel', { velocities, area, outputUnit }, currentUser.email);
  };

  const handleExportPDF = () => {
    toast.promise(
      exportToPDF('absorption-calculator-content', 'Calculo_Absorcion', 'Cálculo de Absorción de Aire', currentUser.email),
      {
        loading: 'Generando informe PDF...',
        success: 'Informe PDF generado correctamente',
        error: 'Error al generar el PDF'
      }
    );
    saveCalculationRecord('absorption_calculation', 'export_pdf', { velocities, area, outputUnit }, currentUser.email);
  };

  const handleExportPPT = () => {
    toast.promise(
      exportToPPT('absorption-calculator-container', 'Calculo_Absorcion', 'Cálculo de Absorción de Aire'),
      {
        loading: 'Generando presentación PPT...',
        success: 'Presentación PPT generada correctamente',
        error: 'Error al generar el PPT'
      }
    );
    saveCalculationRecord('absorption_calculation', 'export_ppt', { module: 'absorption_calculation' }, currentUser.email);
  };

  const allResults = velocities.flatMap(v => [
    { power: v.power, condition: 'Con Filtro', avg: calculateAverage(v.withFilter) },
    { power: v.power, condition: 'Sin Filtro', avg: calculateAverage(v.withoutFilter) }
  ]).filter(r => r.avg > 0);

  const maxResult = allResults.length > 0 
    ? allResults.reduce((max, r) => r.avg > max.avg ? r : max, allResults[0])
    : { power: 0, condition: 'N/A', avg: 0 };

  const minResult = allResults.length > 0
    ? allResults.reduce((min, r) => r.avg < min.avg ? r : min, allResults[0])
    : { power: 0, condition: 'N/A', avg: 0 };

  return (
    <div id="absorption-calculator-container" className="space-y-8 animate-in fade-in duration-500 bg-white p-2">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Cálculo de Absorción de Campana Extractora</h2>
          <p className="text-slate-500 font-medium mt-1">Cálculo de flujo de aire basado en velocidad y tipo de salida para campanas</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="p-3 rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-100 hover:bg-rose-50 transition-all active:scale-95"
            title="Restablecer formulario"
          >
            <Trash2 size={20} />
          </button>
          <ModuleActions 
            onSave={handleSave}
            onExportExcel={handleExportExcel}
            onExportPDF={handleExportPDF}
            onExportPPT={handleExportPPT}
          />
        </div>
      </div>

      <div id="absorption-calculator-content" className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Section 1: Outlet Configuration */}
        <div className="xl:col-span-1 space-y-6">
          <div className="bg-white rounded-[32px] shadow-sm border border-slate-200/60 p-8">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 mb-8">
              <Circle size={18} className="text-blue-500" />
              1. TIPO DE SALIDA DE AIRE
            </h3>
            
            <div className="grid grid-cols-2 gap-4 mb-8">
              <button
                onClick={() => setOutletType('circular')}
                className={`flex flex-col items-center justify-center p-6 rounded-3xl border-2 transition-all duration-200 ${
                  outletType === 'circular' 
                  ? 'border-blue-500 bg-blue-50/50 text-blue-700 shadow-sm' 
                  : 'border-slate-100 bg-slate-50/50 text-slate-400 hover:border-slate-200'
                }`}
              >
                <Circle size={32} className="mb-3" />
                <span className="font-bold text-sm">Circular</span>
              </button>
              <button
                onClick={() => setOutletType('quadrangular')}
                className={`flex flex-col items-center justify-center p-6 rounded-3xl border-2 transition-all duration-200 ${
                  outletType === 'quadrangular' 
                  ? 'border-blue-500 bg-blue-50/50 text-blue-700 shadow-sm' 
                  : 'border-slate-100 bg-slate-50/50 text-slate-400 hover:border-slate-200'
                }`}
              >
                <Square size={32} className="mb-3" />
                <span className="font-bold text-sm">Cuadrangular</span>
              </button>
            </div>

            <div className="space-y-4">
              {outletType === 'circular' ? (
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Diámetro (Ø) en mm</label>
                  <input
                    type="number"
                    value={diameter}
                    onChange={(e) => setDiameter(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Alto (mm)</label>
                    <input
                      type="number"
                      value={height}
                      onChange={(e) => setHeight(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-wider mb-2">Ancho (mm)</label>
                    <input
                      type="number"
                      value={width}
                      onChange={(e) => setWidth(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </div>
                </div>
              )}
              <div className="pt-4 border-t border-slate-100">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Área calculada:</span>
                  <span className="text-sm font-black text-blue-600">{area.toFixed(6)} m²</span>
                </div>
              </div>
            </div>
          </div>

          {/* Visual Reference Section */}
          <div className="bg-white rounded-[32px] shadow-sm border border-slate-200/60 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Referencia de Producto</h3>
            </div>
            <div className="p-6 space-y-6">
              <div 
                className={`relative group cursor-pointer border-2 border-dashed rounded-2xl transition-all duration-300 overflow-hidden ${
                  isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-400'
                }`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleImageUpload}
                onClick={() => document.getElementById('product-image-upload')?.click()}
              >
                <input
                  id="product-image-upload"
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                />
                
                {productImage ? (
                  <div className="relative h-48 w-full">
                    <img 
                      src={productImage} 
                      alt="Campana Extractora Referencia" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center gap-2">
                      <Upload size={24} className="text-white" />
                      <span className="text-[10px] font-bold text-white uppercase tracking-widest">Cambiar Imagen</span>
                    </div>
                  </div>
                ) : (
                  <div className="h-48 w-full flex flex-col items-center justify-center gap-3 text-slate-400">
                    <div className="p-4 bg-slate-50 rounded-full group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                      <ImageIcon size={32} />
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-black uppercase tracking-wider">Subir Foto del Producto</p>
                      <p className="text-[9px] font-medium opacity-60">Arrastra o haz clic aquí</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Descripción del Producto</label>
                  <textarea
                    value={productDescription}
                    onChange={(e) => setProductDescription(e.target.value)}
                    rows={3}
                    placeholder="Ingrese una descripción o notas sobre la instalación..."
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[32px] shadow-sm border border-slate-200/60 p-8">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 mb-6">
              <Wind size={18} className="text-blue-500" />
              UNIDADES DE SALIDA
            </h3>
            <div className="flex flex-wrap gap-2">
              {(['m3/h', 'm3/s', 'm3/min', 'cfm'] as UnitType[]).map((unit) => (
                <button
                  key={unit}
                  onClick={() => setOutputUnit(unit)}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                    outputUnit === unit
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                    : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                  }`}
                >
                  {unit}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Section 2: Velocity Input and Results */}
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-white rounded-[32px] shadow-sm border border-slate-200/60 overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <Wind size={18} className="text-blue-500" />
                2. INGRESO DE DATOS DE VELOCIDAD Y RESULTADOS
              </h3>
              <button
                onClick={handleAddPower}
                className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-xs font-black hover:bg-blue-100 transition-all active:scale-95"
              >
                <Plus size={14} />
                Agregar Potencia
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Potencia</th>
                    <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Con Filtro de Carbón (m/s)</th>
                    <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Sin Filtro (m/s)</th>
                    <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {velocities.map((v, idx) => {
                    const avgWith = calculateAverage(v.withFilter);
                    const avgWithout = calculateAverage(v.withoutFilter);
                    const stdWith = calculateStdDev(v.withFilter);
                    const stdWithout = calculateStdDev(v.withoutFilter);
                    
                    const absWith = convertAbsorption(avgWith * area);
                    const absWithout = convertAbsorption(avgWithout * area);

                    return (
                      <tr key={v.power} className="group hover:bg-slate-50/30 transition-colors">
                        <td className="px-6 py-4 align-top">
                          <div className="flex items-center gap-2 mt-2">
                            <div className={`w-2 h-2 rounded-full ${v.power === 1 ? 'bg-emerald-400' : v.power === 2 ? 'bg-amber-400' : 'bg-rose-400'}`} />
                            <span className="text-sm font-black text-slate-700">{v.power}</span>
                          </div>
                        </td>
                        <td className="px-6 py-8">
                          <div className="flex flex-col gap-3 max-w-[160px] mx-auto">
                            {v.withFilter.map((val, mIdx) => (
                              <div key={mIdx} className="flex items-center gap-3">
                                <span className="w-10 text-[9px] font-black text-slate-400 uppercase tracking-tighter text-right">M{mIdx + 1}</span>
                                <input
                                  type="number"
                                  step="0.1"
                                  value={val || ''}
                                  placeholder="0.0"
                                  onChange={(e) => handleVelocityChange(idx, 'withFilter', mIdx, e.target.value)}
                                  className="flex-1 bg-slate-50 border-2 border-transparent focus:border-blue-500/20 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 text-center transition-all outline-none"
                                />
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-8">
                          <div className="flex flex-col gap-3 max-w-[160px] mx-auto">
                            {v.withoutFilter.map((val, mIdx) => (
                              <div key={mIdx} className="flex items-center gap-3">
                                <span className="w-10 text-[9px] font-black text-slate-400 uppercase tracking-tighter text-right">M{mIdx + 1}</span>
                                <input
                                  type="number"
                                  step="0.1"
                                  value={val || ''}
                                  placeholder="0.0"
                                  onChange={(e) => handleVelocityChange(idx, 'withoutFilter', mIdx, e.target.value)}
                                  className="flex-1 bg-slate-50 border-2 border-transparent focus:border-blue-500/20 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 text-center transition-all outline-none"
                                />
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right align-top">
                          {velocities.length > 1 && (
                            <button
                              onClick={() => handleRemovePower(idx)}
                              className="p-2 text-slate-300 hover:text-rose-500 transition-colors mt-2"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary Grid for Results */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {velocities.map((v) => {
              const avgWith = calculateAverage(v.withFilter);
              const avgWithout = calculateAverage(v.withoutFilter);
              const stdWith = calculateStdDev(v.withFilter);
              const stdWithout = calculateStdDev(v.withoutFilter);
              const absWith = convertAbsorption(avgWith * area);
              const absWithout = convertAbsorption(avgWithout * area);
              return (
                <div key={v.power} className="bg-white rounded-[32px] p-8 border border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="flex items-center gap-3 mb-6">
                    <div className={`w-4 h-4 rounded-full ${v.power === 1 ? 'bg-emerald-400' : v.power === 2 ? 'bg-amber-400' : 'bg-rose-400'} shadow-sm`} />
                    <span className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Potencia {v.power}</span>
                  </div>
                  <div className="space-y-4">
                    <div className="flex flex-col pb-3 border-b border-slate-50">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Con Filtro (Avg)</span>
                        <span className="text-[10px] font-bold text-slate-400 italic">± {stdWith.toFixed(3)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-medium text-slate-400 italic">{avgWith.toFixed(2)} m/s</span>
                        <span className="text-base font-black text-slate-700">{absWith.toFixed(2)} <span className="text-[10px] font-bold opacity-50">{outputUnit}</span></span>
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sin Filtro (Avg)</span>
                        <span className="text-[10px] font-bold text-slate-400 italic">± {stdWithout.toFixed(3)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-medium text-slate-400 italic">{avgWithout.toFixed(2)} m/s</span>
                        <span className="text-base font-black text-blue-600">{absWithout.toFixed(2)} <span className="text-[10px] font-bold opacity-50">{outputUnit}</span></span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Max Absorption Card */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[32px] p-8 text-white shadow-xl shadow-blue-200">
              <div className="flex items-start justify-between mb-8">
                <div>
                  <h4 className="text-blue-100 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Resumen de Máxima Absorción</h4>
                  <p className="text-2xl font-black">Potencia {maxResult.power} ({maxResult.condition})</p>
                </div>
                <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                  <Wind size={24} className="text-blue-100" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 rounded-3xl p-5 backdrop-blur-md border border-white/5">
                  <span className="block text-blue-200 text-[9px] font-black uppercase tracking-wider mb-1">Velocidad Promedio</span>
                  <span className="text-2xl font-black">{maxResult.avg.toFixed(2)} <span className="text-[10px] font-medium opacity-60">m/s</span></span>
                </div>
                <div className="bg-white/10 rounded-3xl p-5 backdrop-blur-md border border-white/20 ring-1 ring-white/10">
                  <span className="block text-blue-200 text-[9px] font-black uppercase tracking-wider mb-1">Flujo Máximo</span>
                  <span className="text-2xl font-black text-white">
                    {convertAbsorption(maxResult.avg * area).toFixed(2)} 
                    <span className="text-[10px] font-medium opacity-70 ml-1">{outputUnit}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Min Absorption Card */}
            <div className="bg-white rounded-[32px] p-8 border border-slate-200/60 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <Wind size={80} className="text-slate-900" />
              </div>
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-8">
                  <div>
                    <h4 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Resumen de Mínima Absorción</h4>
                    <p className="text-2xl font-black text-slate-900">Potencia {minResult.power} ({minResult.condition})</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-3xl p-5 border border-slate-100">
                    <span className="block text-slate-400 text-[9px] font-black uppercase tracking-wider mb-1">Velocidad Promedio</span>
                    <span className="text-2xl font-black text-slate-700">{minResult.avg.toFixed(2)} <span className="text-[10px] font-medium opacity-40">m/s</span></span>
                  </div>
                  <div className="bg-slate-900 rounded-3xl p-5 shadow-lg shadow-slate-200">
                    <span className="block text-slate-500 text-[9px] font-black uppercase tracking-wider mb-1">Flujo Mínimo</span>
                    <span className="text-2xl font-black text-white">
                      {convertAbsorption(minResult.avg * area).toFixed(2)} 
                      <span className="text-[10px] font-medium opacity-50 ml-1">{outputUnit}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AbsorptionCalculator;
