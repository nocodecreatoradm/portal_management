import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  Plus, 
  Trash2, 
  Save, 
  Download, 
  FileText, 
  Info,
  ChevronRight,
  Calculator,
  Image as ImageIcon,
  Target,
  Table as TableIcon,
  BarChart3
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { saveCalculationRecord, generateModuleCorrelative } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import ModuleActions from './ModuleActions';
import { exportToExcel, exportToPDF, exportToPPT } from '../lib/exportUtils';

interface Measurement {
  cr: string;
  ni: string;
}

interface Section {
  id: string;
  label: string; // e.g., '1', 'A', 'Cuerpo'
  x: number; // percentage
  y: number; // percentage
  measurements: [Measurement, Measurement, Measurement];
}

interface CrNiCoatingAnalysisProps {
  initialData?: any;
  onExportPPT?: () => void;
  onLoadRecord?: (record: any) => void;
}

export default function CrNiCoatingAnalysis({ initialData, onExportPPT, onLoadRecord }: CrNiCoatingAnalysisProps) {
  const { user } = useAuth();
  const [projectName, setProjectName] = useState(initialData?.projectName || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [image, setImage] = useState<string | null>(initialData?.image || null);
  const [sections, setSections] = useState<Section[]>(initialData?.sections || []);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (initialData) {
      setProjectName(initialData.projectName || '');
      setDescription(initialData.description || '');
      setImage(initialData.image || null);
      setSections(initialData.sections || []);
    }
  }, [initialData]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!image || !imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newSection: Section = {
      id: `section-${Date.now()}`,
      label: (sections.length + 1).toString(),
      x,
      y,
      measurements: [
        { cr: '', ni: '' },
        { cr: '', ni: '' },
        { cr: '', ni: '' }
      ]
    };

    setSections([...sections, newSection]);
    setActiveSectionId(newSection.id);
  };

  const updateSectionLabel = (id: string, label: string) => {
    setSections(sections.map(s => s.id === id ? { ...s, label } : s));
  };

  const updateMeasurement = (sectionId: string, index: number, field: 'cr' | 'ni', value: string) => {
    setSections(sections.map(s => {
      if (s.id === sectionId) {
        const newMeasurements = [...s.measurements] as [Measurement, Measurement, Measurement];
        newMeasurements[index] = { ...newMeasurements[index], [field]: value };
        return { ...s, measurements: newMeasurements };
      }
      return s;
    }));
  };

  const removeSection = (id: string) => {
    setSections(sections.filter(s => s.id !== id));
    if (activeSectionId === id) setActiveSectionId(null);
  };

  const calculateStats = (values: string[]) => {
    const nums = values.map(v => parseFloat(v)).filter(n => !isNaN(n));
    if (nums.length === 0) return { avg: 0, sd: 0 };

    const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
    const variance = nums.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / nums.length;
    const sd = Math.sqrt(variance);

    return { avg, sd };
  };

  const getSectionStats = (section: Section) => {
    const crValues = section.measurements.map(m => m.cr);
    const niValues = section.measurements.map(m => m.ni);

    return {
      cr: calculateStats(crValues),
      ni: calculateStats(niValues)
    };
  };

  const getTotalStats = () => {
    const allCr = sections.flatMap(s => s.measurements.map(m => m.cr));
    const allNi = sections.flatMap(s => s.measurements.map(m => m.ni));

    return {
      cr: calculateStats(allCr),
      ni: calculateStats(allNi)
    };
  };

  const handleSave = async () => {
    if (!projectName) {
      toast.error('Por favor, ingrese un nombre para el proyecto');
      return;
    }

    setIsSaving(true);
    try {
      const recordName = await generateModuleCorrelative('cr_ni_coating_analysis', projectName);
      
      const recordData = {
        projectName,
        recordName,
        description,
        image,
        sections,
        totalStats: getTotalStats()
      };

      await saveCalculationRecord(
        'cr_ni_coating_analysis',
        'save',
        recordData,
        user?.email || 'unknown',
        recordName,
        '',
        description
      );

      toast.success('Análisis guardado con éxito');
    } catch (error) {
      console.error('Error saving analysis:', error);
      toast.error('Error al guardar el análisis');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportExcel = () => {
    const data = sections.map(s => {
      const stats = getSectionStats(s);
      return {
        Zona: s.label,
        'Cr M1': s.measurements[0].cr,
        'Cr M2': s.measurements[1].cr,
        'Cr M3': s.measurements[2].cr,
        'Cr Promedio': stats.cr.avg.toFixed(2),
        'Ni M1': s.measurements[0].ni,
        'Ni M2': s.measurements[1].ni,
        'Ni M3': s.measurements[2].ni,
        'Ni Promedio': stats.ni.avg.toFixed(2)
      };
    });
    exportToExcel(data, `Analisis_CrNi_${projectName || 'Proyecto'}`, 'Resultados');
    saveCalculationRecord('cr_ni_coating_analysis', 'export_excel', { projectName, sections }, user?.email || 'unknown');
  };

  const handleExportPDF = () => {
    toast.promise(
      exportToPDF('cr-ni-analysis-container', `Analisis_CrNi_${projectName || 'Proyecto'}`, 'Análisis de Recubrimiento Cr-Ni', user?.email || 'unknown'),
      {
        loading: 'Generando informe PDF...',
        success: 'Informe PDF generado correctamente',
        error: 'Error al generar el PDF'
      }
    );
    saveCalculationRecord('cr_ni_coating_analysis', 'export_pdf', { projectName, sections }, user?.email || 'unknown');
  };

  const handleExportPPT = () => {
    toast.promise(
      exportToPPT('cr-ni-analysis-container', `Analisis_CrNi_${projectName || 'Proyecto'}`, 'Análisis de Recubrimiento Cr-Ni'),
      {
        loading: 'Generando presentación PPT...',
        success: 'Presentación PPT generada correctamente',
        error: 'Error al generar el PPT'
      }
    );
    saveCalculationRecord('cr_ni_coating_analysis', 'export_ppt', { module: 'cr_ni_coating_analysis' }, user?.email || 'unknown');
  };

  const totalStats = getTotalStats();

  return (
    <div id="cr-ni-analysis-container" className="space-y-8 pb-20 bg-white p-2">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-200">
            <Calculator size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Análisis de Recubrimiento Cr-Ni</h1>
            <p className="text-slate-500 font-medium">Control de espesores por zona y reporte estadístico</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ModuleActions 
            onSave={handleSave}
            onExportPDF={handleExportPDF}
            onExportExcel={handleExportExcel}
            onExportPPT={handleExportPPT}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left Column: Project Info & Image */}
        <div className="xl:col-span-2 space-y-8">
          {/* Project Info */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center gap-3 text-slate-900 mb-2">
              <Info size={20} className="text-blue-600" />
              <h2 className="text-xl font-black tracking-tight">Datos del Ensayo</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Identificación del Proyecto</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Ej: Grifería Metusa - Lote 2024"
                  className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none font-medium"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Observaciones / Notas</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detalles del estado de la muestra..."
                  className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none font-medium"
                />
              </div>
            </div>
          </div>

          {/* Image Sectioning */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-slate-900">
                <ImageIcon size={20} className="text-blue-600" />
                <h2 className="text-xl font-black tracking-tight">Zonas de Medición en la Pieza</h2>
              </div>
              {!image && (
                <label className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-sm font-bold cursor-pointer hover:bg-blue-100 transition-all">
                  <Upload size={18} />
                  Subir Foto
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              )}
              {image && (
                <button
                  onClick={() => setImage(null)}
                  className="text-xs font-bold text-rose-500 hover:text-rose-600 transition-colors"
                >
                  Cambiar Imagen
                </button>
              )}
            </div>

            <div className="relative min-h-[400px] bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden group">
              {image ? (
                <div 
                  className="relative cursor-crosshair"
                  onClick={handleImageClick}
                >
                  <img
                    ref={imageRef}
                    src={image}
                    alt="Pieza de grifería"
                    className="max-w-full max-h-[600px] rounded-2xl shadow-2xl"
                  />
                  {/* Markers */}
                  {sections.map((section) => (
                    <motion.div
                      key={section.id}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className={`absolute w-8 h-8 -ml-4 -mt-4 rounded-full border-2 flex items-center justify-center text-xs font-black transition-all shadow-lg cursor-pointer ${
                        activeSectionId === section.id 
                          ? 'bg-blue-600 border-white text-white scale-125 z-20 ring-4 ring-blue-500/20' 
                          : 'bg-white border-blue-600 text-blue-600 z-10 hover:scale-110'
                      }`}
                      style={{ left: `${section.x}%`, top: `${section.y}%` }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveSectionId(section.id);
                      }}
                    >
                      {section.label}
                    </motion.div>
                  ))}
                  <div className="absolute bottom-4 right-4 bg-white/80 backdrop-blur-md px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-600 shadow-sm pointer-events-none">
                    Haz clic en la imagen para marcar una zona
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-300 mx-auto">
                    <ImageIcon size={40} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-slate-900 font-black tracking-tight">No hay imagen cargada</p>
                    <p className="text-slate-400 text-sm font-medium">Sube una foto de la pieza para iniciar el mapeo</p>
                  </div>
                  <label className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold cursor-pointer hover:bg-slate-800 transition-all shadow-lg shadow-slate-200">
                    <Upload size={20} />
                    Seleccionar Archivo
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Measurements & Stats */}
        <div className="space-y-8">
          {/* Active Section Measurements */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-slate-900">
                <Target size={20} className="text-blue-600" />
                <h2 className="text-xl font-black tracking-tight">Mediciones</h2>
              </div>
              {activeSectionId && (
                <button
                  onClick={() => removeSection(activeSectionId)}
                  className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>

            <AnimatePresence mode="wait">
              {activeSectionId ? (
                <motion.div
                  key={activeSectionId}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  {sections.find(s => s.id === activeSectionId) && (
                    <>
                      <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black">
                          {sections.find(s => s.id === activeSectionId)?.label}
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-blue-400 block mb-1">Nombre de la Zona</label>
                          <input
                            type="text"
                            value={sections.find(s => s.id === activeSectionId)?.label}
                            onChange={(e) => updateSectionLabel(activeSectionId, e.target.value)}
                            className="bg-transparent border-none p-0 font-bold text-blue-900 outline-none w-full"
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Toma</div>
                          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cr (µm)</div>
                          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ni (µm)</div>
                        </div>

                        {[0, 1, 2].map((idx) => (
                          <div key={idx} className="grid grid-cols-3 gap-4 items-center">
                            <div className="text-sm font-bold text-slate-600 text-center">{idx + 1}</div>
                            <input
                              type="number"
                              step="0.01"
                              value={sections.find(s => s.id === activeSectionId)?.measurements[idx].cr}
                              onChange={(e) => updateMeasurement(activeSectionId, idx, 'cr', e.target.value)}
                              className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-100 focus:border-blue-500 transition-all outline-none font-bold text-center text-sm"
                            />
                            <input
                              type="number"
                              step="0.01"
                              value={sections.find(s => s.id === activeSectionId)?.measurements[idx].ni}
                              onChange={(e) => updateMeasurement(activeSectionId, idx, 'ni', e.target.value)}
                              className="w-full px-3 py-2.5 rounded-xl border-2 border-slate-100 focus:border-blue-500 transition-all outline-none font-bold text-center text-sm"
                            />
                          </div>
                        ))}
                      </div>

                      {/* Section Stats */}
                      <div className="pt-6 border-t border-slate-100 space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-xs font-bold text-slate-400">Promedio</div>
                          <div className="text-sm font-black text-slate-900 text-center">
                            {getSectionStats(sections.find(s => s.id === activeSectionId)!).cr.avg.toFixed(2)}
                          </div>
                          <div className="text-sm font-black text-slate-900 text-center">
                            {getSectionStats(sections.find(s => s.id === activeSectionId)!).ni.avg.toFixed(2)}
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-xs font-bold text-slate-400">Desv. Est.</div>
                          <div className="text-sm font-black text-slate-900 text-center">
                            {getSectionStats(sections.find(s => s.id === activeSectionId)!).cr.sd.toFixed(2)}
                          </div>
                          <div className="text-sm font-black text-slate-900 text-center">
                            {getSectionStats(sections.find(s => s.id === activeSectionId)!).ni.sd.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </motion.div>
              ) : (
                <div className="py-12 text-center space-y-4">
                  <div className="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-200 mx-auto">
                    <Target size={32} />
                  </div>
                  <p className="text-slate-400 text-sm font-medium">Selecciona una zona en la imagen para registrar datos</p>
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Global Summary */}
          <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-slate-900/20 space-y-6">
            <div className="flex items-center gap-3">
              <BarChart3 size={20} className="text-blue-400" />
              <h2 className="text-xl font-black tracking-tight">Resumen Total</h2>
            </div>

            <div className="space-y-6">
              <div className="p-6 rounded-3xl bg-white/5 border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-400">Espesor Cr Total</span>
                  <span className="text-2xl font-black text-blue-400">{totalStats.cr.avg.toFixed(2)} <span className="text-xs font-medium text-slate-500">µm</span></span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Desviación Estándar</span>
                  <span className="font-bold">{totalStats.cr.sd.toFixed(3)}</span>
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-white/5 border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-400">Espesor Ni Total</span>
                  <span className="text-2xl font-black text-emerald-400">{totalStats.ni.avg.toFixed(2)} <span className="text-xs font-medium text-slate-500">µm</span></span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Desviación Estándar</span>
                  <span className="font-bold">{totalStats.ni.sd.toFixed(3)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full Results Table */}
      {sections.length > 0 && (
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6 overflow-x-auto">
          <div className="flex items-center gap-3 text-slate-900">
            <TableIcon size={20} className="text-blue-600" />
            <h2 className="text-xl font-black tracking-tight">Reporte de Resultados por Zona</h2>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="py-4 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Zona</th>
                <th className="py-4 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Cr Promedio (µm)</th>
                <th className="py-4 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Cr SD</th>
                <th className="py-4 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Ni Promedio (µm)</th>
                <th className="py-4 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Ni SD</th>
              </tr>
            </thead>
            <tbody>
              {sections.map((section) => {
                const stats = getSectionStats(section);
                return (
                  <tr 
                    key={section.id} 
                    className={`border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer ${activeSectionId === section.id ? 'bg-blue-50/50' : ''}`}
                    onClick={() => setActiveSectionId(section.id)}
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${activeSectionId === section.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          {section.label}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center font-bold text-slate-900">{stats.cr.avg.toFixed(2)}</td>
                    <td className="py-4 px-4 text-center text-slate-500 text-sm">{stats.cr.sd.toFixed(3)}</td>
                    <td className="py-4 px-4 text-center font-bold text-slate-900">{stats.ni.avg.toFixed(2)}</td>
                    <td className="py-4 px-4 text-center text-slate-500 text-sm">{stats.ni.sd.toFixed(3)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
