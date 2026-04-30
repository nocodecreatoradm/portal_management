import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Flame, Upload, Save, FileSpreadsheet, Plus, Trash2, 
  ChevronRight, ArrowLeft, Camera, Thermometer, Clock,
  History, Download, Layout, Target, Edit2, LineChart as LineChartIcon,
  FileText, Presentation
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { OvenExperimentalRecord, OvenInspectionPoint } from '../types';
import { saveCalculationRecord } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { exportToExcel, exportToPDF, exportToPPT } from '../lib/exportUtils';

interface OvenExperimentalProps {
  initialData?: any;
  onExportPPT?: () => void;
}

export default function OvenExperimental({ initialData, onExportPPT }: OvenExperimentalProps) {
  const { user } = useAuth();
  const [record, setRecord] = useState<OvenExperimentalRecord>(initialData || {
    ovenModel: '',
    points: [],
    date: new Date().toISOString()
  });

  const [isOvenModelSet, setIsOvenModelSet] = useState(!!record.ovenModel);
  const [ovenModelInput, setOvenModelInput] = useState(record.ovenModel || '');
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);
  const [chartViewMode, setChartViewMode] = useState<'all' | 'single'>('all');
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const imageRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedPoint = record.points.find(p => p.id === selectedPointId);
  const selectedSeries = selectedPoint?.series.find(s => s.id === selectedSeriesId);

  useEffect(() => {
    if (record.points.length > 0 && !selectedPointId) {
      setSelectedPointId(record.points[0].id);
    }
  }, [record.points, selectedPointId]);

  useEffect(() => {
    if (selectedPoint && selectedPoint.series.length > 0 && !selectedSeriesId) {
      setSelectedSeriesId(selectedPoint.series[0].id);
    }
  }, [selectedPoint, selectedSeriesId]);

  const handleSetOvenModel = () => {
    if (!ovenModelInput.trim()) {
      toast.error('Por favor ingrese el modelo del horno');
      return;
    }
    setRecord(prev => ({ ...prev, ovenModel: ovenModelInput }));
    setIsOvenModelSet(true);
    toast.success('Modelo configurado');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setRecord(prev => ({ ...prev, ovenImage: event.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!record.ovenImage || !imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newPointId = `point-${Date.now()}`;
    const newPoint: OvenInspectionPoint = {
      id: newPointId,
      name: `Zona ${record.points.length + 1}`,
      x,
      y,
      timeUnit: 'sec',
      series: [
        { id: `series-${Date.now()}`, trialNumber: 1, readings: [] }
      ]
    };

    setRecord(prev => ({
      ...prev,
      points: [...prev.points, newPoint]
    }));
    setSelectedPointId(newPointId);
    setSelectedSeriesId(newPoint.series[0].id);
    toast.success('Punto de inspección añadido');
  };

  const handleAddSeries = () => {
    if (!selectedPointId) return;
    setRecord(prev => {
      const newPoints = prev.points.map(p => {
        if (p.id === selectedPointId) {
          const newSeries = {
            id: `series-${Date.now()}`,
            trialNumber: p.series.length + 1,
            readings: []
          };
          setSelectedSeriesId(newSeries.id);
          return { ...p, series: [...p.series, newSeries] };
        }
        return p;
      });
      return { ...prev, points: newPoints };
    });
    toast.success('Nueva serie de medición añadida');
  };

  const handleAddReading = () => {
    if (!selectedPointId || !selectedSeriesId) return;

    setRecord(prev => {
      const newPoints = prev.points.map(p => {
        if (p.id === selectedPointId) {
          const newSeriesSet = p.series.map(s => {
            if (s.id === selectedSeriesId) {
              const lastReading = s.readings[s.readings.length - 1];
              const lastTime = lastReading ? Number(lastReading.time) : -1;
              const nextTime = lastTime + 1; // Default to next second/minute
              
              return {
                ...s,
                readings: [...s.readings, { time: nextTime, temperature: 25 }]
              };
            }
            return s;
          });
          return { ...p, series: newSeriesSet };
        }
        return p;
      });
      return { ...prev, points: newPoints };
    });
  };

  const updateReading = (pointId: string, seriesId: string, index: number, field: 'time' | 'temperature', value: any) => {
    const numValue = value === '' ? 0 : Number(value);
    setRecord(prev => {
      const newPoints = prev.points.map(p => {
        if (p.id === pointId) {
          const newSeriesSet = p.series.map(s => {
            if (s.id === seriesId) {
              const newReadings = [...s.readings];
              newReadings[index] = { ...newReadings[index], [field]: numValue };
              return { ...s, readings: newReadings };
            }
            return s;
          });
          return { ...p, series: newSeriesSet };
        }
        return p;
      });
      return { ...prev, points: newPoints };
    });
  };

  const removeReading = (pointId: string, seriesId: string, index: number) => {
    setRecord(prev => {
      const newPoints = prev.points.map(p => {
        if (p.id === pointId) {
          const newSeriesSet = p.series.map(s => {
            if (s.id === seriesId) {
              const newReadings = [...s.readings];
              newReadings.splice(index, 1);
              return { ...s, readings: newReadings };
            }
            return s;
          });
          return { ...p, series: newSeriesSet };
        }
        return p;
      });
      return { ...prev, points: newPoints };
    });
  };

  const removePoint = (pointId: string) => {
    setRecord(prev => ({
      ...prev,
      points: prev.points.filter(p => p.id !== pointId)
    }));
    if (selectedPointId === pointId) {
      setSelectedPointId(null);
      setSelectedSeriesId(null);
    }
  };

  const handleSave = async () => {
    if (!record.ovenModel) {
      toast.error('Debe ingresar el modelo del horno');
      return;
    }
    try {
      await saveCalculationRecord(
        'oven_experimental',
        'experimental_record',
        record,
        user?.email || 'unknown',
        `Prueba Horno ${record.ovenModel} - ${new Date().toLocaleDateString()}`
      );
      toast.success('Registro guardado correctamente');
    } catch (error) {
      toast.error('Error al guardar el registro');
    }
  };

  const handleExportPDF = async () => {
    if (!record.ovenModel) return;
    try {
      toast.promise(
        exportToPDF('oven-experimental-container', `Analisis_Horno_${record.ovenModel}`, `ANÁLISIS TÉRMICO - HORNO ${record.ovenModel}`, user?.name || 'Sistema'),
        {
          loading: 'Generando reporte PDF...',
          success: 'Reporte PDF generado',
          error: 'Error al generar PDF'
        }
      );
    } catch (error) {
      console.error(error);
    }
  };

  const handleExportExcel = () => {
    if (!record.ovenModel) return;
    const flatData: any[] = [];
    
    record.points.forEach(point => {
      point.series.forEach(series => {
        series.readings.forEach(reading => {
          flatData.push({
            'Zona': point.name,
            'Coordenada X (%)': point.x.toFixed(2),
            'Coordenada Y (%)': point.y.toFixed(2),
            'Serie #': series.trialNumber,
            'Tiempo': reading.time,
            'Unidad Tiempo': point.timeUnit,
            'Temperatura (°C)': reading.temperature
          });
        });
      });
    });

    if (flatData.length === 0) {
      toast.error('No hay datos para exportar');
      return;
    }

    exportToExcel(flatData, `Datos_Horno_${record.ovenModel}`, 'Mediciones');
    toast.success('Excel exportado correctamente');
  };

  const handleExportPPT = async () => {
    if (!record.ovenModel) return;
    try {
      toast.promise(
        exportToPPT('oven-experimental-container', `Presentacion_Horno_${record.ovenModel}`, `ESTUDIO TÉRMICO - ${record.ovenModel}`),
        {
          loading: 'Generando presentación...',
          success: 'Presentación PPT generada',
          error: 'Error al generar PPT'
        }
      );
    } catch (error) {
      console.error(error);
    }
  };

  // Generate unified data for Recharts
  const chartData = useMemo(() => {
    const allTimesSet = new Set<number>();
    record.points.forEach(p => {
      p.series.forEach(s => {
        s.readings.forEach(r => {
          const t = Number(r.time);
          if (!isNaN(t)) allTimesSet.add(t);
        });
      });
    });
    
    const allTimes = Array.from(allTimesSet).sort((a, b) => a - b);
    if (allTimes.length === 0) return [];

    return allTimes.map(time => {
      const dataPoint: any = { time };
      record.points.forEach((p, pIdx) => {
        const readingsAtTime = p.series.flatMap(s => s.readings.filter(r => Number(r.time) === time));
        if (readingsAtTime.length > 0) {
          const temps = readingsAtTime.map(r => Number(r.temperature)).filter(t => !isNaN(t));
          if (temps.length > 0) {
            dataPoint[`avg_${pIdx}`] = temps.reduce((acc, t) => acc + t, 0) / temps.length;
          }
        }
        
        p.series.forEach((s, sIdx) => {
          const reading = s.readings.find(r => Number(r.time) === time);
          if (reading && !isNaN(Number(reading.temperature))) {
            dataPoint[`series_${pIdx}_${sIdx}`] = Number(reading.temperature);
          }
        });
      });
      return dataPoint;
    });
  }, [record.points]);

  if (!isOvenModelSet) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-12 rounded-[3rem] border border-slate-200 shadow-2xl max-w-lg w-full text-center space-y-8"
        >
          <div className="w-24 h-24 bg-orange-100 text-orange-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner">
            <Flame size={48} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic mb-2">Configuración Inicial</h2>
            <p className="text-slate-500 font-medium tracking-tight">Ingrese el modelo del horno para comenzar el análisis térmico.</p>
          </div>
          <div className="space-y-4">
            <input 
              type="text"
              value={ovenModelInput}
              onChange={(e) => setOvenModelInput(e.target.value)}
              placeholder="Ej: HO-6000-PROFESSIONAL"
              className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl text-lg font-black focus:outline-none focus:border-orange-500 focus:bg-white transition-all text-center uppercase tracking-widest"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSetOvenModel()}
            />
            <button 
              onClick={handleSetOvenModel}
              className="w-full py-5 bg-orange-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-orange-200 hover:bg-orange-700 transition-all active:scale-[0.98]"
            >
              Iniciar Análisis
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div id="oven-experimental-container" ref={containerRef} className="space-y-8 pb-20">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 blur-3xl rounded-full -mr-32 -mt-32" />
        <div className="relative z-10 flex items-center gap-6">
          <div className="w-16 h-16 rounded-[1.5rem] bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-200">
            <Flame size={32} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              {record.ovenModel}
              <span className="text-xs font-black bg-orange-100 text-orange-600 px-3 py-1 rounded-full uppercase tracking-widest italic">Análisis Térmico</span>
            </h2>
            <p className="text-slate-500 font-medium mt-1">Mapeo de temperatura por zonas y curvas de calentamiento en cavidad.</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100 mr-2">
            <button 
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-4 py-2 bg-white text-red-600 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-red-200 hover:bg-red-50 transition-all shadow-sm"
            >
              <FileText size={14} />
              PDF
            </button>
            <button 
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-4 py-2 bg-white text-green-600 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-green-200 hover:bg-green-50 transition-all shadow-sm"
            >
              <FileSpreadsheet size={14} />
              Excel
            </button>
            <button 
              onClick={handleExportPPT}
              className="flex items-center gap-2 px-4 py-2 bg-white text-orange-600 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-orange-200 hover:bg-orange-50 transition-all shadow-sm"
            >
              <Presentation size={14} />
              PPT
            </button>
          </div>

          <button 
            onClick={() => setIsOvenModelSet(false)}
            className="p-3.5 bg-slate-100 text-slate-500 rounded-2xl hover:bg-slate-200 transition-all active:scale-95"
            title="Editar nombre del modelo"
          >
            <Edit2 size={18} />
          </button>
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-3.5 bg-orange-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-orange-700 transition-all shadow-xl shadow-orange-200 active:scale-95"
          >
            <Save size={16} />
            Guardar Prueba
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Mapping Tool */}
        <div className="xl:col-span-12">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                  <Layout size={20} />
                </div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Maquetado de Zonas de Inspección</h3>
              </div>
              <div className="flex items-center gap-3">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                  className="hidden" 
                  accept="image/*" 
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                >
                  <Camera size={14} />
                  {record.ovenImage ? 'Cambiar Foto' : 'Subir Foto del Horno'}
                </button>
              </div>
            </div>

            {!record.ovenImage ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-full aspect-[21/9] border-4 border-dashed border-slate-100 rounded-[3rem] flex flex-col items-center justify-center gap-4 text-slate-300 hover:text-orange-500 hover:border-orange-200 hover:bg-orange-50/30 transition-all cursor-pointer group"
              >
                <div className="p-8 rounded-full bg-slate-50 group-hover:bg-white transition-all transform group-hover:scale-110">
                  <Upload size={64} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-black uppercase tracking-[0.2em] mb-1">Haz clic para subir la foto del horno cerrado</p>
                  <p className="text-[10px] font-medium opacity-60">Recomendado: Vista frontal sin reflejos</p>
                </div>
              </div>
            ) : (
              <div className="relative group overflow-hidden rounded-[3rem] bg-slate-900 shadow-2xl shadow-slate-900/10 border-8 border-white border-inset">
                <div 
                  className="relative cursor-crosshair inline-block w-full"
                  onClick={handleImageClick}
                >
                  <img 
                    ref={imageRef}
                    src={record.ovenImage} 
                    alt="Horno" 
                    className="block w-full max-h-[600px] object-contain opacity-90 mx-auto"
                    onLoad={(e) => setImageSize({ 
                      width: e.currentTarget.clientWidth, 
                      height: e.currentTarget.clientHeight 
                    })}
                  />
                  
                  <AnimatePresence>
                    {record.points.map((point) => (
                      <motion.div
                        key={point.id}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPointId(point.id);
                        }}
                        className={`absolute -translate-x-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center cursor-pointer transition-all z-20 ${
                          selectedPointId === point.id ? 'scale-125' : 'hover:scale-110'
                        }`}
                        style={{ left: `${point.x}%`, top: `${point.y}%` }}
                      >
                        <div className={`w-10 h-10 rounded-full border-4 flex items-center justify-center font-black text-xs shadow-xl transition-all ${
                          selectedPointId === point.id 
                          ? 'bg-orange-600 border-white text-white rotate-12 scale-110' 
                          : 'bg-white border-orange-600 text-orange-600'
                        }`}>
                          {record.points.indexOf(point) + 1}
                        </div>
                        {selectedPointId === point.id && (
                          <div className="absolute inset-0 rounded-full bg-orange-400/30 animate-ping" />
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                <div className="absolute inset-x-0 bottom-0 p-8 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-between text-white pointer-events-none">
                  <div className="flex items-center gap-3">
                    <Target size={20} className="text-orange-400" />
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] block">Interacción Directa</span>
                      <span className="text-[9px] font-medium opacity-60">Haz clic en la imagen para marcar una zona de inspección</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <span className="text-2xl font-black block">{record.points.length}</span>
                      <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Zonas totales</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Readings Management */}
        <div className="xl:col-span-4 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm h-full flex flex-col min-h-[600px]">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-orange-50 text-orange-600 rounded-xl">
                  <Thermometer size={20} />
                </div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Registros y Series</h3>
              </div>
              {selectedPoint && (
                <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
                  <button 
                    onClick={() => {
                      setRecord(prev => ({
                        ...prev,
                        points: prev.points.map(p => p.id === selectedPoint.id ? { ...p, timeUnit: 'sec' } : p)
                      }))
                    }}
                    className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${
                      selectedPoint.timeUnit === 'sec' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Seg
                  </button>
                  <button 
                    onClick={() => {
                      setRecord(prev => ({
                        ...prev,
                        points: prev.points.map(p => p.id === selectedPoint.id ? { ...p, timeUnit: 'min' } : p)
                      }))
                    }}
                    className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${
                      selectedPoint.timeUnit === 'min' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Min
                  </button>
                </div>
              )}
            </div>

            {!selectedPoint ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-300 text-center space-y-4">
                <div className="w-20 h-20 rounded-3xl bg-slate-50 flex items-center justify-center transform -rotate-6">
                  <Target size={40} />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-400">Seleccione una Zona</p>
                  <p className="text-[10px] font-medium px-12">Haga clic en un marcador numerado para gestionar sus mediciones</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6 flex-1 flex flex-col">
                <div className="flex items-center justify-between p-5 bg-orange-50 border border-orange-100 rounded-3xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-600 text-white rounded-2xl flex items-center justify-center font-black text-sm">
                      {record.points.indexOf(selectedPoint) + 1}
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-orange-900 uppercase tracking-widest leading-none">{selectedPoint.name}</h4>
                      <p className="text-[9px] font-black text-orange-600/60 uppercase tracking-widest mt-1">Gestión de Series</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => removePoint(selectedPoint.id)}
                    className="p-2.5 hover:bg-orange-100 text-orange-600 rounded-2xl transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                {/* Series Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {selectedPoint.series.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSeriesId(s.id)}
                      className={`shrink-0 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        selectedSeriesId === s.id 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' 
                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      Serie {s.trialNumber}
                    </button>
                  ))}
                  <button 
                    onClick={handleAddSeries}
                    className="shrink-0 p-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all shadow-md active:scale-90"
                    title="Añadir nueva serie de repetición"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                {selectedSeries ? (
                  <div className="flex-1 flex flex-col">
                    <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                      <AnimatePresence mode="popLayout">
                        {selectedSeries.readings.map((reading, idx) => (
                          <motion.div 
                            layout
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            key={`${selectedSeriesId}-${idx}`} 
                            className="group flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-blue-200 hover:bg-white hover:shadow-sm transition-all"
                          >
                            <div className="w-16">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 block">T ({selectedPoint.timeUnit})</label>
                              <input 
                                type="number"
                                value={reading.time}
                                onChange={(e) => updateReading(selectedPoint.id, selectedSeries.id, idx, 'time', Number(e.target.value))}
                                className="w-full bg-transparent text-sm font-black focus:outline-none focus:text-blue-600"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 block">Temp (°C)</label>
                              <input 
                                type="number"
                                value={reading.temperature}
                                onChange={(e) => updateReading(selectedPoint.id, selectedSeries.id, idx, 'temperature', Number(e.target.value))}
                                className="w-full bg-transparent text-sm font-black focus:outline-none focus:text-orange-600"
                              />
                            </div>
                            <button 
                              onClick={() => removeReading(selectedPoint.id, selectedSeries.id, idx)}
                              className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-50 text-red-500 rounded-xl transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>

                    <div className="pt-6 border-t border-slate-50 mt-auto">
                      <button 
                        onClick={handleAddReading}
                        className="w-full py-5 bg-white border-2 border-dashed border-slate-200 text-slate-400 rounded-[2rem] flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] hover:border-orange-500 hover:text-orange-600 hover:bg-orange-50/30 transition-all active:scale-[0.98]"
                      >
                        <Plus size={18} />
                        Añadir Medición a Serie {selectedSeries.trialNumber}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
                    <p className="text-[10px] font-black uppercase tracking-widest text-center italic">Seleccione o añada una serie para registrar datos</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Real-time Visualization */}
        <div className="xl:col-span-8 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col min-h-[600px] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-64 h-64 bg-blue-500/5 blur-3xl rounded-full -ml-32 -mt-32" />
            
            <div className="flex items-center justify-between mb-12 relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                  <LineChartIcon size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest whitespace-nowrap">Comportamiento Térmico Real</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Visualización por zonas y promedios</p>
                </div>
              </div>
              
              <div className="hidden sm:flex items-center gap-4">
                <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-2 h-2 rounded-full bg-orange-600" />
                  <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Individual</span>
                </div>
                <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 rounded-xl border border-blue-100">
                  <div className="w-2 h-2 rounded-full bg-blue-600 shadow-md shadow-blue-200" />
                  <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Promedio</span>
                </div>
              </div>

              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  onClick={() => setChartViewMode('all')}
                  className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                    chartViewMode === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Ver Todos
                </button>
                <button
                  onClick={() => setChartViewMode('single')}
                  className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                    chartViewMode === 'single' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Zona Actual
                </button>
              </div>
            </div>

            <div className="flex-1 relative z-10 min-h-[500px] bg-slate-50/20 rounded-[2.5rem] p-6 flex flex-col border border-slate-100/50">
              <div className="w-full h-[450px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart 
                    data={chartData} 
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis 
                      type="number" 
                      dataKey="time" 
                      stroke="#94a3b8"
                      fontSize={11}
                      tickFormatter={(val) => `${val}${selectedPoint?.timeUnit === 'min' ? 'm' : 's'}`}
                      axisLine={false}
                      tickLine={false}
                      domain={['dataMin', 'dataMax']}
                    />
                    <YAxis 
                      stroke="#94a3b8"
                      fontSize={11}
                      tickFormatter={(val) => `${val}°`}
                      axisLine={false}
                      tickLine={false}
                      domain={['auto', 'auto']}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        borderRadius: '20px', 
                        border: 'none', 
                        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                        fontWeight: 'bold',
                        padding: '12px 16px'
                      }}
                    />
                    <Legend 
                      verticalAlign="top" 
                      height={40}
                      iconType="circle"
                      wrapperStyle={{ 
                        paddingBottom: '20px',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}
                    />
                    
                    {record.points.map((point, pIdx) => {
                      if (chartViewMode === 'single' && selectedPointId !== point.id) return null;
                      
                      const colors = [
                        '#f97316', // Orange
                        '#3b82f6', // Blue
                        '#10b981', // Green
                        '#8b5cf6', // Violet
                        '#f43f5e'  // Rose
                      ];
                      const color = colors[pIdx % colors.length];
                      
                      return (
                        <React.Fragment key={point.id}>
                          {point.series.map((s, sIdx) => (
                            <Line
                              key={s.id}
                              type="monotone"
                              dataKey={`series_${pIdx}_${sIdx}`}
                              name={`${point.name} - S${s.trialNumber}`}
                              stroke={color}
                              strokeWidth={1.5}
                              strokeOpacity={0.15}
                              dot={false}
                              connectNulls
                              isAnimationActive={false}
                              legendType="none"
                            />
                          ))}
                          <Line
                            type="monotone"
                            dataKey={`avg_${pIdx}`}
                            name={`${point.name} (PROM)`}
                            stroke={color}
                            strokeWidth={4}
                            strokeOpacity={1}
                            dot={{ r: 5, fill: color, strokeWidth: 2, stroke: '#fff' }}
                            activeDot={{ r: 7, strokeWidth: 0 }}
                            connectNulls
                            isAnimationActive={false}
                          />
                        </React.Fragment>
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {record.points.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/40 backdrop-blur-[4px] rounded-[2.5rem] z-20">
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-white p-12 rounded-[3rem] shadow-2xl border border-slate-100 flex flex-col items-center text-center space-y-6 max-w-sm"
                >
                  <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-[1.5rem] flex items-center justify-center shadow-lg shadow-blue-50">
                    <LineChartIcon size={40} />
                  </div>
                  <div className="space-y-4">
                    <p className="text-sm font-black text-slate-800 uppercase tracking-[0.2em]">Dashboard Térmico</p>
                    <p className="text-xs font-medium text-slate-400 leading-relaxed">
                      El motor gráfico se activará una vez que marque zonas en la cavidad del horno y registre las primeras series de temperatura.
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <div className="w-1 h-1 rounded-full bg-slate-200" />
                    <div className="w-8 h-1 rounded-full bg-blue-500" />
                    <div className="w-1 h-1 rounded-full bg-slate-200" />
                  </div>
                </motion.div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
