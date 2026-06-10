import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, Save, Copy, RotateCcw, Trash2, 
  Settings, HelpCircle, ChevronRight, Check,
  LineChart, DollarSign, ArrowRight, BookOpen, AlertTriangle
} from 'lucide-react';
import { ResponsiveContainer, LineChart as ReLineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { SupabaseService } from '../lib/SupabaseService';
import { ProductLine, Category, PriceGMROITemplate, CategoryGMROIThreshold } from '../types';
import { toast } from 'sonner';

export default function PriceGMROISimulator() {
  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState<'calculator' | 'sheet' | 'charts'>('calculator');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Metadata
  const [lines, setLines] = useState<ProductLine[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [templates, setTemplates] = useState<PriceGMROITemplate[]>([]);
  const [thresholds, setThresholds] = useState<CategoryGMROIThreshold[]>([]);

  // Filter selection
  const [selectedLineId, setSelectedLineId] = useState<string>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [activeTemplateId, setActiveTemplateId] = useState<string>('new');

  // Simulator Form State (Pestaña 1)
  const [sapCode, setSapCode] = useState('HGE-001');
  const [productName, setProductName] = useState('Horno a Gas Entry Price');
  const [lineId, setLineId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  
  const [pvpLista, setPvpLista] = useState(1099);
  const [pvpPromocion, setPvpPromocion] = useState(999);
  const [margenDistribuidor, setMargenDistribuidor] = useState(20); // %
  const [acuerdoComercial, setAcuerdoComercial] = useState(10); // %
  
  const [fobUnitario, setFobUnitario] = useState(80);
  const [tipoCambio, setTipoCambio] = useState(3.5);
  const [costoInstalacion, setCostoInstalacion] = useState(40);
  const [costoFleteContenedor, setCostoFleteContenedor] = useState(3500);
  const [unidadesContenedor, setUnidadesContenedor] = useState(270);
  
  const [ingresarCostoDirecto, setIngresarCostoDirecto] = useState(true);
  const [gastoEstimadoConsolidado, setGastoEstimadoConsolidado] = useState(2000);
  const [gastoUnitarioAplicado, setGastoUnitarioAplicado] = useState(3.8);

  // Tab 2 spreadsheet state (12 months arrays)
  const [forecastDemanda, setForecastDemanda] = useState<number[]>([10, 20, 20, 10, 0, 0, 0, 10, 10, 10, 10, 0]);
  const [llegadaStock, setLlegadaStock] = useState<number[]>([100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 100, 0]); // mes 0 is index 0, mes 1 to 12 are index 1 to 12. Total 13 items

  // Threshold config modal
  const [isThresholdModalOpen, setIsThresholdModalOpen] = useState(false);
  const [editedThresholds, setEditedThresholds] = useState<Record<string, { minMedio: number; minAlto: number }>>({});

  // Dynamic categories filter for the dropdowns
  const filteredCategories = useMemo(() => {
    if (selectedLineId === 'all') return categories;
    return categories.filter(c => c.productLineId === selectedLineId);
  }, [categories, selectedLineId]);

  const formFilteredCategories = useMemo(() => {
    if (!lineId) return [];
    return categories.filter(c => c.productLineId === lineId);
  }, [categories, lineId]);

  // Adjust selections automatically on line changes
  useEffect(() => {
    if (selectedLineId !== 'all') {
      const isValid = categories.some(c => c.id === selectedCategoryId && c.productLineId === selectedLineId);
      if (!isValid && selectedCategoryId !== 'all') {
        setSelectedCategoryId('all');
      }
    }
  }, [selectedLineId, selectedCategoryId, categories]);

  useEffect(() => {
    if (lineId) {
      const lineCats = categories.filter(c => c.productLineId === lineId);
      const isValid = lineCats.some(c => c.id === categoryId);
      if (!isValid) {
        setCategoryId(lineCats.length > 0 ? lineCats[0].id : '');
      }
    }
  }, [lineId, categories, categoryId]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [lData, cData, tData, thData] = await Promise.all([
        SupabaseService.getProductLines(),
        SupabaseService.getCategories(),
        SupabaseService.getPriceGMROITemplates(),
        SupabaseService.getCategoryGMROIThresholds()
      ]);
      setLines(lData);
      setCategories(cData);
      setTemplates(tData);
      setThresholds(thData);

      if (lData.length > 0) setLineId(lData[0].id);
      if (cData.length > 0) setCategoryId(cData[0].id);
    } catch (err) {
      console.error('Error loading simulator data:', err);
      toast.error('Error al cargar la información del maestro de datos');
    } finally {
      setLoading(false);
    }
  };

  // Set threshold defaults
  const activeThresholds = useMemo(() => {
    const map: Record<string, { minMedio: number; minAlto: number }> = {};
    categories.forEach(cat => {
      const dbThresh = thresholds.find(t => t.categoryId === cat.id);
      map[cat.id] = dbThresh ? { minMedio: dbThresh.minMedio, minAlto: dbThresh.minAlto } : { minMedio: 0.8, minAlto: 1.2 };
    });
    return map;
  }, [categories, thresholds]);

  // Current category threshold
  const currentThreshold = useMemo(() => {
    return activeThresholds[categoryId] || { minMedio: 0.8, minAlto: 1.2 };
  }, [categoryId, activeThresholds]);

  // Combined discount formula
  const combinedDiscount = useMemo(() => {
    const md = margenDistribuidor / 100;
    const ac = acuerdoComercial / 100;
    return 1 - (1 - md) * (1 - ac);
  }, [margenDistribuidor, acuerdoComercial]);

  // Net Price Distributor without IGV
  const precioNetoDistribuidor = useMemo(() => {
    const pvpNet = pvpPromocion / 1.18;
    return pvpNet * (1 - combinedDiscount);
  }, [pvpPromocion, combinedDiscount]);

  // Flete Unitario USD
  const fleteUnitarioUSD = useMemo(() => {
    if (unidadesContenedor <= 0) return 0;
    return costoFleteContenedor / unidadesContenedor;
  }, [costoFleteContenedor, unidadesContenedor]);

  // Costo Puesto en Planta (CPP / PSN)
  const costoPuestoEnPlanta = useMemo(() => {
    const unitFleteSoles = fleteUnitarioUSD * tipoCambio;
    const fobSoles = fobUnitario * tipoCambio;
    
    let extraCosts = 0;
    if (ingresarCostoDirecto) {
      extraCosts = gastoUnitarioAplicado;
    } else {
      const totalDemand = forecastDemanda.reduce((a, b) => a + b, 0);
      extraCosts = totalDemand > 0 ? gastoEstimadoConsolidado / totalDemand : 0;
    }
    
    return fobSoles + unitFleteSoles + extraCosts + costoInstalacion;
  }, [fobUnitario, fleteUnitarioUSD, tipoCambio, ingresarCostoDirecto, gastoUnitarioAplicado, gastoEstimadoConsolidado, forecastDemanda, costoInstalacion]);

  // Operational Utility unit
  const utilidadOperativaUnit = useMemo(() => {
    return precioNetoDistribuidor - costoPuestoEnPlanta;
  }, [precioNetoDistribuidor, costoPuestoEnPlanta]);

  // Margen Bruto Promo
  const margenBrutoPromo = useMemo(() => {
    if (precioNetoDistribuidor <= 0) return 0;
    return (utilidadOperativaUnit / precioNetoDistribuidor) * 100;
  }, [utilidadOperativaUnit, precioNetoDistribuidor]);

  // Margen Lista
  const margenLista = useMemo(() => {
    const pvpListaNeto = pvpLista / 1.18;
    const precioNetoDistribuidorLista = pvpListaNeto * (1 - combinedDiscount);
    if (precioNetoDistribuidorLista <= 0) return 0;
    const utilidadLista = precioNetoDistribuidorLista - costoPuestoEnPlanta;
    return (utilidadLista / precioNetoDistribuidorLista) * 100;
  }, [pvpLista, combinedDiscount, costoPuestoEnPlanta]);

  // 12 Months spreadsheet calculations
  const spreadsheetData = useMemo(() => {
    const totalDemand = forecastDemanda.reduce((a, b) => a + b, 0);
    
    // Costo Puesto Planta might change slightly if ingresarCostoDirecto is false
    const cppVal = costoPuestoEnPlanta;
    const pndVal = precioNetoDistribuidor;
    const uouVal = utilidadOperativaUnit;

    const ingresosBrutos: number[] = [];
    const utilidadBrutaAcum: number[] = [];
    const stockFinal: number[] = [];
    const costoStockPlanta: number[] = [];

    // Mes 0 arrival
    const arrival0 = llegadaStock[0] || 0;
    stockFinal.push(arrival0);
    costoStockPlanta.push(arrival0 * cppVal);

    let currentStock = arrival0;
    for (let m = 1; m <= 12; m++) {
      const dem = forecastDemanda[m - 1] || 0;
      const arr = llegadaStock[m] || 0;
      
      const ing = dem * pndVal;
      ingresosBrutos.push(ing);

      const ut = dem * uouVal;
      utilidadBrutaAcum.push(ut);

      currentStock = Math.max(0, currentStock - dem + arr);
      stockFinal.push(currentStock);
      costoStockPlanta.push(currentStock * cppVal);
    }

    // Totals
    const totalIngresos = ingresosBrutos.reduce((a, b) => a + b, 0);
    const totalUtilidadBruta = utilidadBrutaAcum.reduce((a, b) => a + b, 0);

    // Average Inventory (Trapezoidal average: Stock0/2 + Stock1 + ... + Stock11 + Stock12/2) / 12
    const sumStock = (stockFinal[0] / 2) + 
                     stockFinal.slice(1, 12).reduce((a, b) => a + b, 0) + 
                     (stockFinal[12] / 2);
    const averageUnits = sumStock / 12;
    const averageInventoryValue = averageUnits * cppVal;

    // GMROI = Total Utility / Average Inventory
    const gmroi = averageInventoryValue > 0 ? totalUtilidadBruta / averageInventoryValue : 0;

    return {
      ingresosBrutos,
      utilidadBrutaAcum,
      stockFinal,
      costoStockPlanta,
      totalDemand,
      totalIngresos,
      totalUtilidadBruta,
      averageInventoryValue,
      gmroi
    };
  }, [forecastDemanda, llegadaStock, costoPuestoEnPlanta, precioNetoDistribuidor, utilidadOperativaUnit]);

  // GMROI Rating
  const gmroiRating = useMemo(() => {
    const val = spreadsheetData.gmroi;
    const { minMedio, minAlto } = currentThreshold;
    if (val < minMedio) return { label: 'CRÍTICO / BAJO', color: 'bg-rose-500 text-white', icon: <AlertTriangle size={16} /> };
    if (val < minAlto) return { label: 'ACEPTABLE / MEDIO', color: 'bg-amber-500 text-slate-900', icon: <HelpCircle size={16} /> };
    return { label: 'RENDIMIENTO ALTO', color: 'bg-emerald-600 text-white', icon: <TrendingUp size={16} /> };
  }, [spreadsheetData.gmroi, currentThreshold]);

  // Handle template selection change
  const handleTemplateChange = (templateId: string) => {
    setActiveTemplateId(templateId);
    if (templateId === 'new') {
      // Reset form
      setSapCode('HGE-001');
      setProductName('Nueva Simulación');
      if (lines.length > 0) setLineId(lines[0].id);
      if (categories.length > 0) setCategoryId(categories[0].id);
      setPvpLista(1000);
      setPvpPromocion(900);
      setMargenDistribuidor(20);
      setAcuerdoComercial(10);
      setFobUnitario(80);
      setTipoCambio(3.5);
      setCostoInstalacion(40);
      setCostoFleteContenedor(3500);
      setUnidadesContenedor(270);
      setIngresarCostoDirecto(true);
      setGastoEstimadoConsolidado(2000);
      setGastoUnitarioAplicado(3.8);
      setForecastDemanda(Array(12).fill(10));
      setLlegadaStock([100, ...Array(12).fill(0)]);
      return;
    }

    const t = templates.find(temp => temp.id === templateId);
    if (t) {
      setSapCode(t.sapCode);
      setProductName(t.name);
      setLineId(t.lineId);
      setCategoryId(t.categoryId);
      setPvpLista(t.pvpLista);
      setPvpPromocion(t.pvpPromocion);
      setMargenDistribuidor(t.margenDistribuidor);
      setAcuerdoComercial(t.acuerdoComercial);
      setFobUnitario(t.fobUnitario);
      setTipoCambio(t.tipoCambio);
      setCostoInstalacion(t.costoInstalacion);
      setCostoFleteContenedor(t.costoFleteContenedor);
      setUnidadesContenedor(t.unidadesContenedor);
      setIngresarCostoDirecto(t.ingresarCostoDirecto);
      setGastoEstimadoConsolidado(t.gastoEstimadoConsolidado);
      setGastoUnitarioAplicado(t.gastoUnitarioAplicado);
      setForecastDemanda(t.forecastDemanda);
      setLlegadaStock(t.llegadaStock);
    }
  };

  // Filter templates list by dropdown selections
  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      const matchLine = selectedLineId === 'all' || t.lineId === selectedLineId;
      const matchCat = selectedCategoryId === 'all' || t.categoryId === selectedCategoryId;
      return matchLine && matchCat;
    });
  }, [templates, selectedLineId, selectedCategoryId]);

  // Copy parameters from similar template
  const handleCopyParams = (source: PriceGMROITemplate, mode: 'margins' | 'costs' | 'all') => {
    if (mode === 'margins' || mode === 'all') {
      setPvpLista(source.pvpLista);
      setPvpPromocion(source.pvpPromocion);
      setMargenDistribuidor(source.margenDistribuidor);
      setAcuerdoComercial(source.acuerdoComercial);
    }
    if (mode === 'costs' || mode === 'all') {
      setFobUnitario(source.fobUnitario);
      setTipoCambio(source.tipoCambio);
      setCostoInstalacion(source.costoInstalacion);
      setCostoFleteContenedor(source.costoFleteContenedor);
      setUnidadesContenedor(source.unidadesContenedor);
      setIngresarCostoDirecto(source.ingresarCostoDirecto);
      setGastoEstimadoConsolidado(source.gastoEstimadoConsolidado);
      setGastoUnitarioAplicado(source.gastoUnitarioAplicado);
    }
    if (mode === 'all') {
      setForecastDemanda(source.forecastDemanda);
      setLlegadaStock(source.llegadaStock);
    }
    toast.success('Parámetros copiados al simulador activo');
  };

  // Reset template values
  const handleReset = () => {
    handleTemplateChange(activeTemplateId);
    toast.info('Valores restablecidos a la plantilla original');
  };

  // Save or Update simulation sheet
  const handleSave = async () => {
    if (!productName.trim()) {
      toast.error('Por favor, ingresa el nombre del producto');
      return;
    }
    try {
      setSaving(true);
      const payload: Partial<PriceGMROITemplate> = {
        name: productName,
        sapCode,
        lineId,
        categoryId,
        pvpLista,
        pvpPromocion,
        margenDistribuidor,
        acuerdoComercial,
        fobUnitario,
        tipoCambio,
        costoInstalacion,
        costoFleteContenedor,
        unidadesContenedor,
        ingresarCostoDirecto,
        gastoEstimadoConsolidado,
        gastoUnitarioAplicado,
        forecastDemanda,
        llegadaStock
      };

      if (activeTemplateId && activeTemplateId !== 'new') {
        const result = await SupabaseService.updatePriceGMROITemplate(activeTemplateId, payload);
        if (result) {
          setTemplates(prev => prev.map(t => t.id === activeTemplateId ? result : t));
          toast.success('Ficha de simulación actualizada con éxito');
        }
      } else {
        const result = await SupabaseService.createPriceGMROITemplate(payload);
        if (result) {
          setTemplates(prev => [result, ...prev]);
          setActiveTemplateId(result.id || 'new');
          toast.success('Ficha de simulación creada y guardada con éxito');
        }
      }
    } catch (err) {
      console.error('Error saving template:', err);
      toast.error('Error al guardar la simulación');
    } finally {
      setSaving(false);
    }
  };

  // Delete active template
  const handleDeleteActive = async () => {
    if (activeTemplateId === 'new') return;
    if (!window.confirm('¿Está seguro de eliminar esta ficha de simulación?')) return;
    try {
      setSaving(true);
      await SupabaseService.deletePriceGMROITemplate(activeTemplateId);
      setTemplates(prev => prev.filter(t => t.id !== activeTemplateId));
      setActiveTemplateId('new');
      handleTemplateChange('new');
      toast.success('Ficha eliminada correctamente');
    } catch (err) {
      console.error('Error deleting template:', err);
      toast.error('Error al eliminar la ficha');
    } finally {
      setSaving(false);
    }
  };

  // Open threshold configuration modal
  const handleOpenThresholds = () => {
    const values: Record<string, { minMedio: number; minAlto: number }> = {};
    categories.forEach(cat => {
      values[cat.id] = activeThresholds[cat.id] || { minMedio: 0.8, minAlto: 1.2 };
    });
    setEditedThresholds(values);
    setIsThresholdModalOpen(true);
  };

  // Save thresholds
  const handleSaveThresholds = async () => {
    try {
      setSaving(true);
      const listToSave = Object.keys(editedThresholds).map(catId => ({
        categoryId: catId,
        minMedio: editedThresholds[catId].minMedio,
        minAlto: editedThresholds[catId].minAlto
      }));
      
      const saved = await SupabaseService.saveCategoryGMROIThresholds(listToSave);
      setThresholds(saved);
      setIsThresholdModalOpen(false);
      toast.success('Límites de rendimiento GMROI actualizados con éxito');
    } catch (err) {
      console.error('Error saving thresholds:', err);
      toast.error('Error al guardar la configuración de umbrales');
    } finally {
      setSaving(false);
    }
  };

  // 12-Month Table edits
  const handleDemandCellChange = (index: number, val: string) => {
    const cleanNum = Math.max(0, parseInt(val) || 0);
    setForecastDemanda(prev => {
      const copy = [...prev];
      copy[index] = cleanNum;
      return copy;
    });
  };

  const handleArrivalCellChange = (index: number, val: string) => {
    const cleanNum = Math.max(0, parseInt(val) || 0);
    setLlegadaStock(prev => {
      const copy = [...prev];
      copy[index] = cleanNum;
      return copy;
    });
  };

  // Format currencies
  const formatSoles = (val: number) => {
    return `S/ ${val.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Charts mapping data
  const chartsData = useMemo(() => {
    return Array.from({ length: 12 }).map((_, idx) => {
      const monthLabel = `Mes ${idx + 1}`;
      return {
        name: monthLabel,
        Demanda: forecastDemanda[idx] || 0,
        StockFinal: spreadsheetData.stockFinal[idx + 1] || 0,
        MargenBruto: spreadsheetData.utilidadBrutaAcum[idx] || 0
      };
    });
  }, [forecastDemanda, spreadsheetData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-bold animate-pulse uppercase tracking-widest text-xs">Cargando simulador...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 p-6 gap-6 overflow-y-auto">
      {/* Header Widget */}
      <div className="bg-slate-900 rounded-[32px] p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-start gap-4 z-10">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 shrink-0">
            <TrendingUp size={28} className="text-white" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-black uppercase tracking-tight">Simulador Técnico-Comercial de Precios y Plantillas GMROI</h2>
            <p className="text-slate-300 text-xs font-semibold max-w-2xl">
              Módulo interactivo del <span className="text-blue-400 font-bold">Grupo Sole</span> para formular precios al distribuidor (PVP), simular fletes marítimos, calcular utilidad operativa y proyectar el retorno de inventario (GMROI). Administre plantillas guardadas por línea y categoría.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 z-10 shrink-0">
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95 disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? 'Guardando...' : 'Guardar Ficha'}
          </button>
          <button 
            onClick={() => {
              const nameCopy = prompt('Ingresa el nombre para la copia de la simulación:', `${productName} (Copia)`);
              if (nameCopy) {
                setProductName(nameCopy);
                setActiveTemplateId('new');
                toast.info('Listo para guardar como nueva copia');
              }
            }}
            title="Duplicar Simulación"
            className="p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 transition-all hover:text-white"
          >
            <Copy size={16} />
          </button>
          <button 
            onClick={handleReset}
            title="Reestablecer Valores"
            className="p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 transition-all hover:text-white"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      {/* Selectors and Filter Block */}
      <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-200/60 flex flex-col lg:flex-row items-center gap-6 justify-between">
        <div className="flex flex-col lg:flex-row items-center gap-4 w-full lg:w-auto">
          <div className="space-y-1.5 w-full lg:w-60">
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Filtrar por Línea:</label>
            <select
              value={selectedLineId}
              onChange={(e) => setSelectedLineId(e.target.value)}
              data-soly="gmroi-line-select"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-bold text-slate-700 text-xs"
            >
              <option value="all">Todas las Líneas ({lines.length})</option>
              {lines.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5 w-full lg:w-60">
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Filtrar por Categoría:</label>
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              data-soly="gmroi-category-select"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-bold text-slate-700 text-xs"
            >
              <option value="all">Todas las Categorías ({filteredCategories.length})</option>
              {filteredCategories.map(c => (
                <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="space-y-1.5 flex-1 lg:w-96">
            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Ficha de Simulación Activa:</label>
            <select
              value={activeTemplateId}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-black text-blue-700 text-xs uppercase"
            >
              <option value="new"> Crear Nueva Plantilla de Simulación</option>
              {filteredTemplates.map(t => (
                <option key={t.id} value={t.id}>{t.name} [{t.sapCode}]</option>
              ))}
            </select>
          </div>
          {activeTemplateId !== 'new' && (
            <button
              onClick={handleDeleteActive}
              className="flex items-center justify-center p-2.5 bg-rose-50 border border-rose-100 hover:bg-rose-100 text-rose-600 rounded-xl mt-5 transition-all text-xs font-black uppercase tracking-wider"
            >
              <Trash2 size={16} />
              <span className="ml-1 hidden sm:inline">Eliminar</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/60 relative overflow-hidden flex flex-col justify-between h-32">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">PVP Promoción (Con IGV)</div>
          <div className="text-2xl font-black text-slate-900 mt-2">{formatSoles(pvpPromocion)}</div>
          <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold border-t border-slate-50 pt-2 mt-2">
            <span>PVP Lista: {formatSoles(pvpLista)}</span>
            <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">Consumo</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/60 relative overflow-hidden flex flex-col justify-between h-32">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Costo Puesto en Planta</div>
          <div className="text-2xl font-black text-rose-600 mt-2">{formatSoles(costoPuestoEnPlanta)}</div>
          <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold border-t border-slate-50 pt-2 mt-2">
            <span>FOB Unit: ${fobUnitario}</span>
            <span>Flete: ${fleteUnitarioUSD.toFixed(1)}</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/60 relative overflow-hidden flex flex-col justify-between h-32">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Utilidad Bruta PE</div>
          <div className="text-2xl font-black text-emerald-600 mt-2">{formatSoles(utilidadOperativaUnit)}</div>
          <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold border-t border-slate-50 pt-2 mt-2">
            <span>PVP Neto sin IGV: {formatSoles(pvpPromocion / 1.18)}</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/60 relative overflow-hidden flex flex-col justify-between h-32">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Margen Bruto (Promoción)</div>
          <div className="text-2xl font-black text-blue-600 mt-2">{margenBrutoPromo.toFixed(1)}%</div>
          <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold border-t border-slate-50 pt-2 mt-2">
            <span>Margen Lista: {margenLista.toFixed(1)}%</span>
          </div>
        </div>

        <div className={`${gmroiRating.color} rounded-3xl p-6 shadow-md relative overflow-hidden flex flex-col justify-between h-32 transition-all`}>
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Retorno Inventario GMROI</span>
            <button 
              onClick={handleOpenThresholds}
              className="text-[8px] font-black uppercase bg-white/20 hover:bg-white/30 text-current px-2 py-1 rounded-md transition-all flex items-center gap-1 border border-current/10"
            >
              <Settings size={10} /> Ajustar
            </button>
          </div>
          <div className="text-4xl font-black mt-1">{spreadsheetData.gmroi.toFixed(2)}</div>
          <div className="flex items-center gap-1.5 text-[9px] font-black tracking-widest uppercase border-t border-white/20 pt-2 mt-2">
            {gmroiRating.icon}
            <span>{gmroiRating.label}</span>
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex items-center bg-slate-200/50 rounded-2xl p-1.5 border border-slate-200 self-start">
        <button
          onClick={() => setActiveTab('calculator')}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'calculator' ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-800'}`}
        >
          1. Calculadora de Márgenes y Costos
        </button>
        <button
          onClick={() => setActiveTab('sheet')}
          data-soly="gmroi-tab-sheet"
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'sheet' ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-800'}`}
        >
          2. Planilla 12 Meses e Índice GMROI
        </button>
        <button
          onClick={() => setActiveTab('charts')}
          className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${activeTab === 'charts' ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-800'}`}
        >
          3. Gráficos de Rotación y Margen
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'calculator' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Inputs Panel */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-200/60 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">Parámetros de Ficha Comercial</h3>
                <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">CÓDIGO SAP: {sapCode || 'N/A'}</span>
              </div>

              {/* Classification */}
              <div className="space-y-4 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Clasificación de la Ficha (Útil para ser plantilla similar)</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre del Producto:</label>
                    <input 
                      type="text"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none font-bold text-slate-700 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Código SAP / Modelo:</label>
                    <input 
                      type="text"
                      value={sapCode}
                      onChange={(e) => setSapCode(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none font-bold text-slate-700 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Línea de Negocio:</label>
                    <select
                      value={lineId}
                      onChange={(e) => setLineId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none font-bold text-slate-700 text-xs"
                    >
                      {lines.map(l => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoría Técnica:</label>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none font-bold text-slate-700 text-xs"
                    >
                      {formFilteredCategories.length === 0 ? (
                        <option value="">Sin Categorías</option>
                      ) : (
                        formFilteredCategories.map(c => (
                          <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>
                        ))
                      )}
                    </select>
                  </div>
                </div>
              </div>

              {/* PVP inputs */}
              <div className="space-y-6">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Puntajes de Precio al Consumidor (S/. Con IGV)</h4>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <span>PVP Lista (S/.):</span>
                      <span className="text-blue-600 font-black">{formatSoles(pvpLista)}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <button onClick={() => setPvpLista(prev => Math.max(1, prev - 10))} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-black">-</button>
                      <input 
                        type="range" 
                        min="100" 
                        max="5000" 
                        step="10"
                        value={pvpLista} 
                        onChange={(e) => setPvpLista(parseInt(e.target.value))}
                        data-soly="gmroi-pvp-lista-slider"
                        className="flex-1 accent-blue-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                      />
                      <button onClick={() => setPvpLista(prev => prev + 10)} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-black">+</button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <span>PVP Promoción Sugerido (S/.):</span>
                      <span className="text-blue-600 font-black">{formatSoles(pvpPromocion)}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <button onClick={() => setPvpPromocion(prev => Math.max(1, prev - 10))} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-black">-</button>
                      <input 
                        type="range" 
                        min="100" 
                        max="5000" 
                        step="10"
                        value={pvpPromocion} 
                        onChange={(e) => setPvpPromocion(parseInt(e.target.value))}
                        data-soly="gmroi-pvp-promo-slider"
                        className="flex-1 accent-blue-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                      />
                      <button onClick={() => setPvpPromocion(prev => prev + 10)} className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center font-black">+</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Margins */}
              <div className="space-y-6 border-t border-slate-100 pt-6">
                <div className="flex justify-between items-center">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Márgenes de Distribuidor y Canal Mayorista</h4>
                  <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">Descuento Combinado Total DTO: {(combinedDiscount * 100).toFixed(1)}%</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <span>Margen del Distribuidor (Canal %):</span>
                      <span className="text-blue-600 font-black">{margenDistribuidor}%</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <button onClick={() => setMargenDistribuidor(prev => Math.max(0, prev - 1))} className="text-[10px] font-bold text-slate-400 hover:text-slate-700">-1%</button>
                      <input 
                        type="range" 
                        min="0" 
                        max="80" 
                        value={margenDistribuidor} 
                        onChange={(e) => setMargenDistribuidor(parseInt(e.target.value))}
                        className="flex-1 accent-blue-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                      />
                      <button onClick={() => setMargenDistribuidor(prev => Math.min(80, prev + 1))} className="text-[10px] font-bold text-slate-400 hover:text-slate-700">+1%</button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <span>Acuerdo Comercial Interno (%):</span>
                      <span className="text-blue-600 font-black">{acuerdoComercial}%</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <button onClick={() => setAcuerdoComercial(prev => Math.max(0, prev - 1))} className="text-[10px] font-bold text-slate-400 hover:text-slate-700">-1%</button>
                      <input 
                        type="range" 
                        min="0" 
                        max="80" 
                        value={acuerdoComercial} 
                        onChange={(e) => setAcuerdoComercial(parseInt(e.target.value))}
                        className="flex-1 accent-blue-600 h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer"
                      />
                      <button onClick={() => setAcuerdoComercial(prev => Math.min(80, prev + 1))} className="text-[10px] font-bold text-slate-400 hover:text-slate-700">+1%</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Logistics and Freight */}
              <div className="space-y-6 border-t border-slate-100 pt-6">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Costos Logísticos de Fletes, FOB e Internación</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">FOB Unitario ($ USD):</label>
                    <input 
                      type="number"
                      value={fobUnitario}
                      onChange={(e) => setFobUnitario(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none font-bold text-slate-700 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Cambio Aduanero (S/.):</label>
                    <input 
                      type="number"
                      step="0.01"
                      value={tipoCambio}
                      onChange={(e) => setTipoCambio(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none font-bold text-slate-700 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Costo Instalación Sole (S/.):</label>
                    <input 
                      type="number"
                      value={costoInstalacion}
                      onChange={(e) => setCostoInstalacion(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none font-bold text-slate-700 text-xs"
                    />
                  </div>
                </div>

                {/* Prorated container freight */}
                <div className="bg-blue-50/30 p-6 rounded-2xl border border-blue-100/60 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-blue-700 uppercase tracking-wider">Flete de Contenedor Prorrateado</span>
                    <span className="text-[8px] text-slate-400 uppercase font-black tracking-widest">Prorratea el costo por unidad de acuerdo al cubicaje</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Costo del Flete de Contenedor ($ USD):</label>
                      <input 
                        type="number"
                        value={costoFleteContenedor}
                        onChange={(e) => setCostoFleteContenedor(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full px-4 py-2.5 bg-white border border-blue-200/60 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none font-bold text-slate-700 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Unidades que caben por contenedor (40'HQ):</label>
                      <input 
                        type="number"
                        value={unidadesContenedor}
                        onChange={(e) => setUnidadesContenedor(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full px-4 py-2.5 bg-white border border-blue-200/60 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none font-bold text-slate-700 text-xs"
                      />
                    </div>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-blue-100 flex justify-between items-center text-xs font-bold text-blue-900 shadow-sm">
                    <span>Flete unitario por producto:</span>
                    <span className="font-black">${fleteUnitarioUSD.toFixed(2)} USD (~{formatSoles(fleteUnitarioUSD * tipoCambio)})</span>
                  </div>
                </div>

                {/* Additional expenses */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fondos y Gastos Adicionales Sole</h5>
                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-wider cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={ingresarCostoDirecto}
                        onChange={(e) => setIngresarCostoDirecto(e.target.checked)}
                        className="rounded accent-blue-600 cursor-pointer"
                      />
                      Ingresar costo unitario directo
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Monto de Gasto Estimado Consolidado (S/.):</label>
                      <input 
                        type="number"
                        disabled={ingresarCostoDirecto}
                        value={gastoEstimadoConsolidado}
                        onChange={(e) => setGastoEstimadoConsolidado(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none font-bold text-slate-700 text-xs disabled:opacity-50"
                      />
                      {!ingresarCostoDirecto && (
                        <span className="text-[8px] font-bold text-amber-600 block mt-1">
                          * Se divide entre unidades de demanda consolidada ({spreadsheetData.totalDemand} unids)
                        </span>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Gasto Unitario Aplicado (S/.):</label>
                      <input 
                        type="number"
                        disabled={!ingresarCostoDirecto}
                        value={gastoUnitarioAplicado}
                        onChange={(e) => setGastoUnitarioAplicado(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none font-bold text-slate-700 text-xs disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right structural panel */}
          <div className="space-y-6">
            {/* Price breakdown card */}
            <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-200/60 space-y-6">
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">Hoja de Estructura de Precios</h3>
                <p className="text-slate-400 text-[9px] font-bold uppercase tracking-wider mt-1">Fórmulas aplicadas de acuerdo con la contabilidad comercial del Grupo Sole</p>
              </div>

              <div className="space-y-3.5">
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs font-bold text-slate-700">
                  <div className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-black shrink-0">1</div>
                  <span className="flex-1">PVP Promoción Sugerido</span>
                  <span className="font-black text-slate-900">{formatSoles(pvpPromocion)}</span>
                </div>

                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs font-bold text-slate-700">
                  <div className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-black shrink-0">2</div>
                  <span className="flex-1">PVP neto exc. IGV</span>
                  <span className="font-black text-slate-900">/1.18 = {formatSoles(pvpPromocion / 1.18)}</span>
                </div>

                <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs font-black text-amber-800">
                  <div className="w-6 h-6 rounded-full bg-amber-800 text-white flex items-center justify-center text-[10px] font-black shrink-0">3</div>
                  <span className="flex-1">PRECIO NETO DISTRIBUIDOR</span>
                  <span className="font-black">{formatSoles(precioNetoDistribuidor)}</span>
                </div>

                <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-black text-rose-800">
                  <div className="w-6 h-6 rounded-full bg-rose-800 text-white flex items-center justify-center text-[10px] font-black shrink-0">4</div>
                  <span className="flex-1">COSTO PUESTO EN PLANTA (PSN)</span>
                  <span className="font-black">{formatSoles(costoPuestoEnPlanta)}</span>
                </div>

                <div className="flex items-center gap-3 p-4 bg-emerald-600 text-white rounded-2xl text-xs font-black">
                  <div className="w-6 h-6 rounded-full bg-white text-emerald-600 flex items-center justify-center text-[10px] font-black shrink-0">5</div>
                  <span className="flex-1">Utilidad Operativa Unit.</span>
                  <span className="font-black">{formatSoles(utilidadOperativaUnit)}</span>
                </div>
              </div>

              {/* Bitacora details */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Bitácora de Métricas Sole:</span>
                <p className="text-[10px] font-bold text-slate-500 leading-relaxed">
                  - DESCUENTO COMBINADO: 1 - (1 - MargenCanal) * (1 - AcuerdoComercial)<br />
                  - PRECIO SIN IGV NETO: (PVP_PROMOCION / 1.18) * (1 - CombinedDiscount)<br />
                  - COSTO PLANTA: ((FOB + GastoFleteUnit) * TC) + GastoAdicUnit + Instalacion<br />
                  - MARGEN COMERCIAL DISPONIBLE: 1 - (CostoPlanta / PrecioNetoSinIGV)
                </p>
              </div>
            </div>

            {/* Forecast Summary Widget */}
            <div className="bg-slate-900 rounded-[32px] p-6 shadow-xl text-white space-y-4">
              <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest block">Resumen GMROI de Pronóstico Anual</span>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[8px] font-black uppercase text-slate-400">Demanda Pronosticada:</span>
                  <div className="text-sm font-black">{spreadsheetData.totalDemand} unidades</div>
                </div>
                <div className="space-y-1">
                  <span className="text-[8px] font-black uppercase text-slate-400">Margen Bruto Acumulado:</span>
                  <div className="text-sm font-black text-emerald-400">{formatSoles(spreadsheetData.totalUtilidadBruta)}</div>
                </div>
                <div className="space-y-1 col-span-2 border-t border-slate-800 pt-3">
                  <span className="text-[8px] font-black uppercase text-slate-400">Valor Almacén Promedio:</span>
                  <div className="text-sm font-black">{formatSoles(spreadsheetData.averageInventoryValue)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'sheet' && (
        <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-200/60 space-y-6">
          <div>
            <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">Planilla Operativa de Inventario de {productName} ({lines.find(l=>l.id===lineId)?.name || 'Sin Línea'})</h3>
            <p className="text-slate-400 text-[10px] font-semibold mt-1">
              Haga clic directamente en las casillas marcadas de color <span className="text-amber-600 font-black">Amarillo</span> para cambiar la estimación de ventas y las llegadas mensuales. El índice de rentabilidad real se actualizará automáticamente.
            </p>
          </div>

          {/* Spreadsheet Table Container */}
          <div className="overflow-x-auto border border-slate-200 rounded-3xl">
            <table className="w-full text-xs font-bold text-slate-700 text-left border-collapse min-w-[900px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase text-[9px] font-black tracking-wider">
                <tr>
                  <th className="p-4 border-r border-slate-200 w-60">Variables del Simulador</th>
                  <th className="p-4 border-r border-slate-200 text-center bg-blue-50/50 text-blue-700">Mes 0 (Llegada)</th>
                  {Array.from({ length: 12 }).map((_, mIdx) => (
                    <th key={mIdx} className="p-4 border-r border-slate-200 text-center">Mes {mIdx + 1}</th>
                  ))}
                  <th className="p-4 text-center bg-slate-900 text-white font-black">Métrica Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {/* 1. Demand forecast row */}
                <tr>
                  <td className="p-4 font-black bg-slate-50/30 border-r border-slate-200">Forecast Demanda (Unids)</td>
                  <td className="p-4 text-center bg-slate-100/30 border-r border-slate-200 text-slate-400 font-bold">-</td>
                  {forecastDemanda.map((val, idx) => (
                    <td key={idx} className="p-2 border-r border-slate-200 text-center bg-amber-50">
                      <input 
                        type="number"
                        value={val}
                        onChange={(e) => handleDemandCellChange(idx, e.target.value)}
                        className="w-16 px-2 py-1.5 bg-white border border-amber-300 rounded-lg text-center font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      />
                    </td>
                  ))}
                  <td className="p-4 text-center bg-slate-100 font-black border-l border-slate-200">{spreadsheetData.totalDemand}</td>
                </tr>

                {/* 2. Estimated Gross Income row */}
                <tr>
                  <td className="p-4 font-bold bg-slate-50/30 border-r border-slate-200">Ingresos Brutos Estimados (S/.)</td>
                  <td className="p-4 text-center bg-slate-100/30 border-r border-slate-200 text-slate-400">-</td>
                  {spreadsheetData.ingresosBrutos.map((val, idx) => (
                    <td key={idx} className="p-4 border-r border-slate-200 text-center text-[10px] text-slate-600">{formatSoles(val)}</td>
                  ))}
                  <td className="p-4 text-center bg-slate-100 font-black border-l border-slate-200">{formatSoles(spreadsheetData.totalIngresos)}</td>
                </tr>

                {/* 3. Utility row */}
                <tr>
                  <td className="p-4 font-bold bg-slate-50/30 border-r border-slate-200">Utilidad Bruta Acumulada (S/.)</td>
                  <td className="p-4 text-center bg-slate-100/30 border-r border-slate-200 text-slate-400">-</td>
                  {spreadsheetData.utilidadBrutaAcum.map((val, idx) => (
                    <td key={idx} className="p-4 border-r border-slate-200 text-center text-[10px] text-emerald-600 font-black">{formatSoles(val)}</td>
                  ))}
                  <td className="p-4 text-center bg-emerald-50 text-emerald-700 font-black border-l border-slate-200">{formatSoles(spreadsheetData.totalUtilidadBruta)}</td>
                </tr>

                {/* 4. Arrival stock row */}
                <tr>
                  <td className="p-4 font-black bg-slate-50/30 border-r border-slate-200">Llegada de Stock (Unidades)</td>
                  {llegadaStock.map((val, idx) => (
                    <td key={idx} className="p-2 border-r border-slate-200 text-center bg-amber-50">
                      <input 
                        type="number"
                        value={val}
                        onChange={(e) => handleArrivalCellChange(idx, e.target.value)}
                        className="w-16 px-2 py-1.5 bg-white border border-amber-300 rounded-lg text-center font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      />
                    </td>
                  ))}
                  <td className="p-4 text-center bg-slate-100 font-black border-l border-slate-200">
                    {llegadaStock.reduce((a, b) => a + b, 0)} unids
                  </td>
                </tr>

                {/* 5. Stock level end row */}
                <tr>
                  <td className="p-4 font-bold bg-slate-50/30 border-r border-slate-200">Stock Final Almacén (Unidades)</td>
                  {spreadsheetData.stockFinal.map((val, idx) => (
                    <td key={idx} className={`p-4 border-r border-slate-200 text-center font-black ${val === 0 ? 'text-rose-500 bg-rose-50/50' : 'text-slate-800 bg-slate-50/30'}`}>{val}</td>
                  ))}
                  <td className="p-4 text-center bg-slate-100 font-black border-l border-slate-200">-</td>
                </tr>

                {/* 6. Stock cost row */}
                <tr>
                  <td className="p-4 font-bold bg-slate-50/30 border-r border-slate-200">Costo de Stock en Planta (S/.)</td>
                  {spreadsheetData.costoStockPlanta.map((val, idx) => (
                    <td key={idx} className="p-4 border-r border-slate-200 text-center text-[10px] text-slate-500">{formatSoles(val)}</td>
                  ))}
                  <td className="p-4 text-center bg-slate-100 font-black border-l border-slate-200">-</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Annual metrics block */}
          <div className="bg-slate-900 rounded-[32px] p-8 text-white space-y-6">
            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block">Integración de Rotación Financiera (12 períodos combinados)</span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 divide-y md:divide-y-0 md:divide-x divide-slate-800">
              <div className="space-y-1">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Inventario Promedio en Almacén (PEN)</span>
                <span className="text-xl font-black">{formatSoles(spreadsheetData.averageInventoryValue)}</span>
                <span className="text-[9px] text-slate-400 block mt-1">Costo del capital inmovilizado promedio mensual es stock</span>
              </div>
              <div className="space-y-1 md:pl-6">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Utilidad Bruta de Venta Acumulada Anual (PEN)</span>
                <span className="text-xl font-black text-emerald-400">{formatSoles(spreadsheetData.totalUtilidadBruta)}</span>
                <span className="text-[9px] text-slate-400 block mt-1">Margen total acumulado de las ventas de 12 meses</span>
              </div>
              <div className="space-y-1 md:pl-6 flex flex-col justify-between">
                <div>
                  <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest block">Indicador GMROI Final (Retorno sobre inversión de stock)</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-black text-blue-400">{spreadsheetData.gmroi.toFixed(2)}</span>
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${gmroiRating.color}`}>
                      {gmroiRating.label}
                    </span>
                  </div>
                </div>
                <span className="text-[8px] text-slate-400 uppercase font-black tracking-widest block mt-2">Fórmula: Utilidad Bruta Acumulada / Inventario Promedio</span>
              </div>
            </div>
          </div>

          {/* Breakdown cards */}
          <div className="bg-slate-50 rounded-[32px] p-8 border border-slate-200/60 space-y-6">
            <div className="flex items-center gap-2">
              <BookOpen size={18} className="text-blue-600" />
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Desglose Técnico de la Fórmula GMROI (Grupo Sole)</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Paso 1: Utilidad Bruta Acumulada</span>
                <div className="text-lg font-black text-slate-900">{formatSoles(spreadsheetData.totalUtilidadBruta)}</div>
                <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
                  Suma de la Utilidad Bruta Unit. ({formatSoles(utilidadOperativaUnit)}) multiplicada por la demanda forecast pronosticada de cada uno de los 12 meses ({spreadsheetData.totalDemand} unids en total).
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Paso 2: Valor de Almacén Promedio</span>
                <div className="text-lg font-black text-slate-900">{formatSoles(spreadsheetData.averageInventoryValue)}</div>
                <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
                  Se calcula promediando el costo unitario en planta del stock final remanente en almacén a lo largo del año (Suma de los 13 meses incluyendo el Mes 0, dividido entre 12). Representa el capital financiero inmovilizado.
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Paso 3: Retorno sobre Inversión (GMROI)</span>
                <div className="text-lg font-black text-blue-600">{spreadsheetData.gmroi.toFixed(2)} Soles retornados</div>
                <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
                  Dividiendo la utilidad acumulada por el inventario promedio. Al año, este producto retorna {spreadsheetData.gmroi.toFixed(2)} Soles de ganancia neta por cada 1 Sol detenido en almacén de {(categories.find(c => c.id === categoryId)?.name || 'N/A').toUpperCase()}.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-200/60 items-center">
              <div className="md:col-span-2 p-4 bg-slate-900 text-white rounded-2xl text-[10px] font-mono shadow-md">
                <span className="text-slate-400 font-bold">Fórmula Completa Aplicada:</span>
                <div className="mt-1 font-bold">GMROI = Total Utilidad Bruta ({formatSoles(spreadsheetData.totalUtilidadBruta)}) / Inventario Promedio ({formatSoles(spreadsheetData.averageInventoryValue)}) = {spreadsheetData.gmroi.toFixed(2)}</div>
              </div>

              <div className="p-4 bg-white border border-slate-200 rounded-2xl text-[9px] font-bold text-slate-600 space-y-1">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Umbrales Activos de Normas:</span>
                <div className="flex justify-between">
                  <span>Alto (Verde):</span>
                  <span className="font-extrabold text-emerald-600">≥ {currentThreshold.minAlto.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Aceptable (Amarillo):</span>
                  <span className="font-extrabold text-amber-600">[{currentThreshold.minMedio.toFixed(2)} - {currentThreshold.minAlto.toFixed(2)})</span>
                </div>
                <div className="flex justify-between">
                  <span>Crítico (Rojo):</span>
                  <span className="font-extrabold text-rose-600">&lt; {currentThreshold.minMedio.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl text-[10px] text-blue-900 leading-relaxed font-bold">
              <strong>¿Cómo optimizar y usar esta plantilla de {(categories.find(c=>c.id===categoryId)?.name || 'N/A').toUpperCase()}?</strong><br />
              El indicador GMROI de <strong>{spreadsheetData.gmroi.toFixed(2)}</strong> significa que por cada Sol capitalizado que tienes dormido en inventario promedio mensual de {productName}, recuperas S/ {spreadsheetData.gmroi.toFixed(2)} en utilidad. Si deseas subir tu índice, puedes hacer ingresos fraccionados (Menos unidades en Mes 0 y más ingresos distribuidos) para achicar el inventario retenido promedio.
            </div>
          </div>
        </div>
      )}

      {activeTab === 'charts' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-200/60 space-y-4">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Balance de Cobertura de Stock vs Demanda mensual</span>
            <span className="text-[9px] text-slate-400 font-bold block">Verifique que la curva de Demanda (Naranja) no supere el stock final disponible.</span>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ReLineChart data={chartsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} fontWeight="black" />
                  <YAxis stroke="#94a3b8" fontSize={10} fontWeight="black" />
                  <Tooltip contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '10px', fontWeight: 'bold' }} />
                  <Line type="monotone" dataKey="Demanda" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Demanda (Unids)" />
                  <Line type="monotone" dataKey="StockFinal" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Stock Final (Unids)" />
                </ReLineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-200/60 space-y-4">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Distribución de Utilidad Bruta Mensual (S/.)</span>
            <span className="text-[9px] text-slate-400 font-bold block">Muestra el aporte económico neto mensual al Grupo Sole de acuerdo al forecast de ventas.</span>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} fontWeight="black" />
                  <YAxis stroke="#94a3b8" fontSize={10} fontWeight="black" />
                  <Tooltip formatter={(value) => formatSoles(Number(value))} contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '10px', fontWeight: 'bold' }} />
                  <Bar dataKey="MargenBruto" fill="#10b981" radius={[8, 8, 0, 0]} name="Margen Bruto Mensual (PEN)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Similar templates block */}
      {activeTab === 'calculator' && (
        <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-200/60 space-y-6">
          <div className="flex items-center gap-2">
            <Copy size={16} className="text-blue-600" />
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Copiar Parámetros de Plantillas Similares</h4>
          </div>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Utilice las clasificaciones de otras fichas como plantilla. Copiará márgenes de canal, fletes, o la proyección completa al simulador activo.</p>
          
          <div className="space-y-3">
            {templates.filter(t => t.id !== activeTemplateId).slice(0, 3).map(temp => (
              <div key={temp.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 border border-slate-200/60 rounded-2xl gap-4 hover:border-blue-400 transition-all">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-black uppercase bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                      {lines.find(l=>l.id===temp.lineId)?.name || 'N/A'}
                    </span>
                    <h5 className="text-xs font-black text-slate-800 uppercase tracking-tight">{temp.name}</h5>
                  </div>
                  <span className="text-[9px] text-slate-400 font-bold block mt-1">Margen Canal: {temp.margenDistribuidor}% | FOB: ${temp.fobUnitario} | Flete: ${temp.costoFleteContenedor}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button 
                    onClick={() => handleCopyParams(temp, 'margins')}
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:border-blue-500 rounded-xl text-[9px] font-black uppercase tracking-wider hover:text-blue-600 transition-all shadow-sm"
                  >
                    Copiar Márgenes
                  </button>
                  <button 
                    onClick={() => handleCopyParams(temp, 'costs')}
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:border-blue-500 rounded-xl text-[9px] font-black uppercase tracking-wider hover:text-blue-600 transition-all shadow-sm"
                  >
                    Copiar Costos
                  </button>
                  <button 
                    onClick={() => handleCopyParams(temp, 'all')}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-blue-700 transition-all shadow-sm shadow-blue-200"
                  >
                    Copiar Todo
                  </button>
                </div>
              </div>
            ))}

            {templates.filter(t => t.id !== activeTemplateId).length === 0 && (
              <div className="text-center py-6 text-slate-400 text-xs italic font-bold">
                No hay otras fichas guardadas para mostrar como sugerencias.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Threshold Modal */}
      {isThresholdModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Parametrización de Rangos GMROI por Categoría</h3>
                <p className="text-slate-500 text-xs font-semibold">Modifique las escalas mínimas para activar los niveles de rendimiento (Alto, Medio/Aceptable, Bajo) de acuerdo a cada portafolio.</p>
              </div>
              <button onClick={() => setIsThresholdModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="p-8 overflow-y-auto space-y-4 divide-y divide-slate-100 flex-1">
              {categories.map(cat => {
                const vals = editedThresholds[cat.id] || { minMedio: 0.8, minAlto: 1.2 };
                return (
                  <div key={cat.id} className="grid grid-cols-1 md:grid-cols-4 items-center gap-4 py-3.5 first:pt-0">
                    <div className="md:col-span-1">
                      <span className="text-xs font-black text-slate-800 uppercase tracking-tight block">{cat.name.toUpperCase()}</span>
                      <span className="text-[8px] text-slate-400 uppercase font-black tracking-widest block mt-0.5">Estándar Sole Group</span>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[8px] font-black text-amber-600 uppercase tracking-widest">Mín. Medio (Aceptable):</label>
                      <input 
                        type="number"
                        step="0.1"
                        value={vals.minMedio}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setEditedThresholds(prev => ({
                            ...prev,
                            [cat.id]: { ...prev[cat.id], minMedio: val }
                          }));
                        }}
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Mín. Alto:</label>
                      <input 
                        type="number"
                        step="0.1"
                        value={vals.minAlto}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setEditedThresholds(prev => ({
                            ...prev,
                            [cat.id]: { ...prev[cat.id], minAlto: val }
                          }));
                        }}
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>

                    <div className="flex flex-wrap gap-1 items-center justify-end mt-2 md:mt-0 text-[8px] font-black uppercase tracking-wider">
                      <span className="bg-rose-50 border border-rose-100 text-rose-600 px-2 py-1 rounded">
                        &lt; {vals.minMedio.toFixed(2)} Crítico
                      </span>
                      <span className="bg-amber-50 border border-amber-100 text-amber-600 px-2 py-1 rounded">
                        [{vals.minMedio.toFixed(2)} - {vals.minAlto.toFixed(2)}) Medio
                      </span>
                      <span className="bg-emerald-50 border border-emerald-100 text-emerald-600 px-2 py-1 rounded">
                        &ge; {vals.minAlto.toFixed(2)} Alto
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">* Los cambios de umbrales se guardan en la base de datos y se aplican de inmediato.</span>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsThresholdModalOpen(false)}
                  className="px-5 py-3 border border-slate-200 rounded-xl text-xs font-black uppercase tracking-wider text-slate-500 hover:bg-white transition-all"
                >
                  Salir sin Guardar
                </button>
                <button 
                  onClick={handleSaveThresholds}
                  disabled={saving}
                  className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-blue-500/20"
                >
                  {saving ? 'Guardando...' : 'Guardar Configuración'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
