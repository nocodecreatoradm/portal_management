import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Search } from 'lucide-react';
import { ProductRecord, SampleRecord } from '../types';
import { useSamples } from '../context/SamplesContext';

interface NewRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (record: ProductRecord) => void;
  existingProviders?: { name: string; emails: string[]; code: string }[];
  existingData?: ProductRecord[];
  samples?: SampleRecord[];
  mode?: 'artwork' | 'technical_sheet' | 'commercial_sheet';
  initialData?: ProductRecord | null;
  brands?: { id: string; name: string }[];
  productLines?: { id: string; name: string }[];
  categories?: { id: string; name: string; productLineId: string }[];
  isSubmitting?: boolean;
}

export default function NewRequestModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  existingProviders = [], 
  existingData = [],
  mode = 'artwork',
  initialData = null,
  brands = [],
  productLines = [],
  categories = [],
  isSubmitting = false
}: Omit<NewRequestModalProps, 'samples'>) {
  const { samples } = useSamples();
  const [step, setStep] = useState<1 | 2>(initialData ? 2 : 1);
  const [artworkType, setArtworkType] = useState<'local' | 'imported' | null>(initialData ? (initialData.proveedor === 'LOCAL' ? 'local' : 'imported') : null);
  const [sampleSearch, setSampleSearch] = useState('');
  const [isSampleDropdownOpen, setIsSampleDropdownOpen] = useState(false);
  const isFirstOpen = useRef(true);
  const prevIsOpen = useRef(isOpen);

  const [formData, setFormData] = useState(() => {
    if (initialData) {
      return {
        codigoEAN: initialData.codigoEAN || '',
        codigoSAP: initialData.codigoSAP || '',
        descripcionSAP: initialData.descripcionSAP || '',
        codProv: initialData.codProv || '',
        proveedor: initialData.proveedor || '',
        correoProveedor: Array.isArray(initialData.correoProveedor) ? [...initialData.correoProveedor] : [],
        marca: initialData.marca || (brands[0]?.name || 'SOLE'),
        brandId: (initialData as any).brandId || (brands.find(b => b.name === initialData.marca)?.id || ''),
        linea: initialData.linea || (productLines[0]?.name || 'LÍNEA BLANCA'),
        lineId: (initialData as any).lineId || (productLines.find(l => l.name === initialData.linea)?.id || ''),
        categoria: (initialData as any).categoria || '',
        categoryId: (initialData as any).categoryId || '',
        sampleId: initialData.sampleId || '',
        correlativeId: initialData.correlativeId || '',
      };
    }

    // Try to load from session storage if not editing
    try {
      const saved = sessionStorage.getItem('new_request_draft');
      if (saved) {
        const draft = JSON.parse(saved);
        // Only restore if it matches the current mode (optional, but safer)
        return draft;
      }
    } catch (e) {
      console.error('Error loading draft:', e);
    }

    return {
      codigoEAN: '',
      codigoSAP: '',
      descripcionSAP: '',
      codProv: '',
      proveedor: '',
      correoProveedor: [] as string[],
      marca: brands[0]?.name || 'SOLE',
      brandId: brands[0]?.id || '',
      linea: productLines[0]?.name || 'LÍNEA BLANCA',
      lineId: productLines[0]?.id || '',
      categoria: '',
      categoryId: '',
      sampleId: '',
      correlativeId: '',
    };
  });

  const generateNextCorrelativeId = (data: ProductRecord[]) => {
    const prefix = 'SOL-';
    if (!data || data.length === 0) return `${prefix}001`;
    
    // Extract numbers from IDs like "SOL-001", "D-007", etc.
    const numbers = data
      .map(r => {
        if (!r.correlativeId) return 0;
        const match = r.correlativeId.match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
      })
      .filter(n => !isNaN(n));
      
    const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
    return `${prefix}${(maxNumber + 1).toString().padStart(3, '0')}`;
  };

  // Auto-save draft
  useEffect(() => {
    if (!initialData && isOpen) {
      sessionStorage.setItem('new_request_draft', JSON.stringify(formData));
    }
  }, [formData, isOpen, initialData]);

  // Handle modal open/close transitions
  useEffect(() => {
    const wasClosed = !prevIsOpen.current && isOpen;
    prevIsOpen.current = isOpen;

    if (wasClosed) {
      if (initialData) {
        setFormData({
          codigoEAN: initialData.codigoEAN || '',
          codigoSAP: initialData.codigoSAP || '',
          descripcionSAP: initialData.descripcionSAP || '',
          codProv: initialData.codProv || '',
          proveedor: initialData.proveedor || '',
          correoProveedor: Array.isArray(initialData.correoProveedor) ? [...initialData.correoProveedor] : [],
          marca: initialData.marca || (brands[0]?.name || 'SOLE'),
          brandId: (initialData as any).brandId || (brands.find(b => b.name === initialData.marca)?.id || ''),
          linea: initialData.linea || (productLines[0]?.name || 'LÍNEA BLANCA'),
          lineId: (initialData as any).lineId || (productLines.find(l => l.name === initialData.linea)?.id || ''),
          categoria: (initialData as any).categoria || '',
          categoryId: (initialData as any).categoryId || '',
          sampleId: initialData.sampleId || '',
          correlativeId: initialData.correlativeId || '',
        });
        setArtworkType(initialData.proveedor === 'LOCAL' ? 'local' : 'imported');
        setStep(2);
      } else {
        // Check for existing draft first
        const saved = sessionStorage.getItem('new_request_draft');
        if (saved) {
          try {
            const draft = JSON.parse(saved);
            setFormData(draft);
          } catch (e) {
            console.error('Error parsing draft:', e);
          }
        } else {
          // No draft, reset to defaults
          const nextId = generateNextCorrelativeId(existingData);
          const defaultBrand = brands[0];
          const defaultLine = productLines[0];
          
          setFormData({
            codigoEAN: '',
            codigoSAP: '',
            descripcionSAP: '',
            codProv: '',
            proveedor: '',
            correoProveedor: [],
            marca: defaultBrand?.name || 'SOLE',
            brandId: defaultBrand?.id || '',
            linea: defaultLine?.name || 'LÍNEA BLANCA',
            lineId: defaultLine?.id || '',
            categoria: '',
            categoryId: '',
            sampleId: '',
            correlativeId: nextId,
          });
        }
        setStep(1);
        setArtworkType(null);
      }
    }
  }, [isOpen, initialData, brands, productLines, existingData]);

  // Keep IDs and correlative ID updated
  useEffect(() => {
    if (isOpen) {
      let updates: any = {};
      
      // Update correlative if missing
      if (!initialData && !formData.correlativeId) {
        updates.correlativeId = generateNextCorrelativeId(existingData);
      }

      // Recover lineId if we have the name but no ID (common after loading or drafts)
      if (formData.linea && !formData.lineId && productLines.length > 0) {
        const line = productLines.find(l => l.name === formData.linea);
        if (line) {
          updates.lineId = line.id;
          // If we also have a category name but no ID, recover it too
          if (formData.categoria && !formData.categoryId && categories.length > 0) {
            const cat = categories.find(c => c.name === formData.categoria && c.productLineId === line.id);
            if (cat) updates.categoryId = cat.id;
          }
        }
      }

      // Recover brandId if we have the name but no ID
      if (formData.marca && !formData.brandId && brands.length > 0) {
        const brand = brands.find(b => b.name === formData.marca);
        if (brand) updates.brandId = brand.id;
      }

      if (Object.keys(updates).length > 0) {
        setFormData(prev => ({ ...prev, ...updates }));
      }
    }
  }, [isOpen, initialData, existingData, formData.linea, formData.marca, productLines, brands]);

  const [newEmail, setNewEmail] = useState('');
  const [autoFilled, setAutoFilled] = useState(false);

  if (!isOpen) return null;

  const modeLabel = mode === 'artwork' ? 'Artwork' : 
                    mode === 'technical_sheet' ? 'Ficha Técnica' : 'Ficha Comercial';

  const targetTrackingType = mode === 'artwork' ? 'artwork' : 
                             mode === 'technical_sheet' ? 'technical' : 'commercial';
  const typeLabel = mode === 'artwork' ? 'Artes' : 
                    mode === 'technical_sheet' ? 'Ficha Técnica' : 'Ficha Comercial';

  const duplicateRecord = formData.codigoSAP.trim() !== '' && existingData?.find(p => 
    p.codigoSAP.toLowerCase() === formData.codigoSAP.trim().toLowerCase() &&
    p.trackingType === targetTrackingType &&
    (!initialData || p.id !== initialData.id)
  );

  const handleTypeSelect = (type: 'local' | 'imported') => {
    setArtworkType(type);
    if (type === 'local') {
      setFormData(prev => ({
        ...prev,
        proveedor: 'LOCAL',
        codProv: 'N/A',
        correoProveedor: [],
        sampleId: ''
      }));
    }
    setStep(2);
  };

  const handleBack = () => {
    if (initialData) return; // Prevent going back if editing
    setStep(1);
    setArtworkType(null);
    setFormData(prev => ({
      ...prev,
      proveedor: '',
      codProv: '',
      correoProveedor: [],
      sampleId: ''
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Auto-fill logic when SAP code is entered
    if (name === 'codigoSAP' && value.trim() !== '' && !initialData) {
      const existingProduct = existingData?.find(p => p.codigoSAP.toLowerCase() === value.trim().toLowerCase());
      if (existingProduct) {
        setFormData(prev => ({
          ...prev,
          codigoSAP: value,
          codigoEAN: existingProduct.codigoEAN,
          descripcionSAP: existingProduct.descripcionSAP,
          codProv: artworkType === 'local' ? 'N/A' : existingProduct.codProv,
          proveedor: artworkType === 'local' ? 'LOCAL' : existingProduct.proveedor,
          correoProveedor: artworkType === 'local' ? [] : [...existingProduct.correoProveedor],
          marca: existingProduct.marca as any,
          brandId: (existingProduct as any).brandId || '',
          linea: existingProduct.linea as any,
          lineId: (existingProduct as any).lineId || '',
          categoria: (existingProduct as any).categoria || '',
          categoryId: (existingProduct as any).categoryId || '',
          correlativeId: existingProduct.correlativeId || '',
        }));
        setAutoFilled(true);
        setTimeout(() => setAutoFilled(false), 3000);
        return;
      }
    }

    if (name === 'correlativeId') {
      setFormData(prev => ({ ...prev, correlativeId: value }));
      return;
    }

    if (name === 'marca') {
      const brand = brands.find(b => b.name === value);
      setFormData(prev => ({ ...prev, marca: value, brandId: brand?.id || '' }));
      return;
    }

    if (name === 'linea') {
      const line = productLines.find(l => l.name === value);
      setFormData(prev => ({ 
        ...prev, 
        linea: value, 
        lineId: line?.id || '',
        categoria: '', // Reset category when line changes
        categoryId: ''
      }));
      return;
    }

    if (name === 'categoria') {
      const currentLineId = formData.lineId || productLines.find(l => l.name === formData.linea)?.id;
      const cat = categories.find(c => c.name === value && c.productLineId === currentLineId);
      setFormData(prev => ({ ...prev, categoria: value, categoryId: cat?.id || '' }));
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddEmail = () => {
    if (newEmail && !formData.correoProveedor.includes(newEmail)) {
      if (newEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        setFormData(prev => ({
          ...prev,
          correoProveedor: [...prev.correoProveedor, newEmail]
        }));
        setNewEmail('');
      }
    }
  };

  const handleRemoveEmail = (email: string) => {
    setFormData(prev => ({
      ...prev,
      correoProveedor: prev.correoProveedor.filter(e => e !== email)
    }));
  };

  const handleSelectProvider = (val: string) => {
    if (!val) return;
    
    if (val === '__custom__') {
      const customName = prompt('Ingrese el nombre del nuevo proveedor:');
      if (customName) {
        setFormData(prev => ({ 
          ...prev, 
          proveedor: customName,
          codProv: '',
          correoProveedor: []
        }));
      }
      return;
    }

    const provider = existingProviders?.find(p => p.name === val);
    if (provider) {
      setFormData(prev => ({
        ...prev,
        proveedor: provider.name,
        correoProveedor: Array.isArray(provider.emails) ? [...provider.emails] : [],
        codProv: provider.code
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const updatedRecord: ProductRecord = {
      ...(initialData || {}),
      ...formData,
      id: initialData?.id || Date.now().toString(),
      artworks: initialData?.artworks || [],
      technicalSheets: initialData?.technicalSheets || [],
      commercialSheets: initialData?.commercialSheets || [],
      createdAt: initialData?.createdAt || new Date().toISOString()
    } as ProductRecord;

    onSubmit(updatedRecord);
    sessionStorage.removeItem('new_request_draft');
    onClose();
  };

  const handleCancel = () => {
    // Only ask to keep draft if they actually typed something meaningful, not just selecting type
    if (!initialData && (formData.codigoSAP || formData.descripcionSAP)) {
      if (confirm('¿Deseas descartar el borrador actual?')) {
        sessionStorage.removeItem('new_request_draft');
      }
    } else if (!initialData) {
      sessionStorage.removeItem('new_request_draft');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <div className="flex items-center gap-2">
            {step === 2 && (
              <button 
                onClick={handleBack}
                className="p-1 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
              >
                <X size={18} className="rotate-90" />
              </button>
            )}
            <h3 className="text-lg font-semibold text-gray-800">
              {step === 1 ? `Nueva Solicitud de ${modeLabel}` : `Nueva Solicitud: ${modeLabel} ${artworkType === 'local' ? 'Local' : 'Importado'}`}
            </h3>
          </div>
          <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto">
          {step === 1 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-8">
              <button
                onClick={() => handleTypeSelect('local')}
                className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-2xl hover:border-blue-500 hover:bg-blue-50 transition-all group"
              >
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Plus size={32} className="text-blue-600" />
                </div>
                <span className="text-lg font-bold text-slate-700">{modeLabel} Local</span>
                <p className="text-sm text-slate-500 text-center mt-2">Para productos de fabricación o gestión local</p>
              </button>

              <button
                onClick={() => handleTypeSelect('imported')}
                className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-2xl hover:border-blue-500 hover:bg-blue-50 transition-all group"
              >
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Plus size={32} className="text-orange-600" />
                </div>
                <span className="text-lg font-bold text-slate-700">{modeLabel} Importado</span>
                <p className="text-sm text-slate-500 text-center mt-2">Para productos de proveedores internacionales</p>
              </button>
            </div>
          ) : (
            <>
              {autoFilled && (
                <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-xs font-bold animate-pulse flex items-center gap-2">
                  <Plus size={14} />
                  Datos auto-completados desde un registro existente
                </div>
              )}
              <form id="new-request-form" onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">ID de Seguimiento / Correlativo</label>
                    <input 
                      type="text" 
                      name="correlativeId"
                      value={formData.correlativeId}
                      readOnly
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 font-bold text-blue-700 cursor-not-allowed"
                      placeholder="Generando ID..."
                    />
                    <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold italic">
                      * Este ID se genera automáticamente para garantizar la unicidad. Puede vincularse a una muestra para sincronizar identificadores.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Código EAN</label>
                    <input 
                      type="text" 
                      name="codigoEAN"
                      required
                      value={formData.codigoEAN}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="Ej. 7756514019986"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Código SAP</label>
                    <input 
                      type="text" 
                      name="codigoSAP"
                      required
                      value={formData.codigoSAP}
                      onChange={handleChange}
                      className={`w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none ${duplicateRecord ? 'border-red-500 bg-red-50 focus:ring-red-500' : 'border-gray-300'}`}
                      placeholder="Ej. 3120TURE83CO"
                    />
                    {duplicateRecord && (
                      <p className="text-red-500 text-xs mt-1 font-semibold animate-pulse">
                        Este código SAP ya está registrado en el seguimiento de {typeLabel}.
                      </p>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descripción SAP</label>
                    <input 
                      type="text" 
                      name="descripcionSAP"
                      required
                      value={formData.descripcionSAP}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="Ej. CAMPANA EXTRACTORA TURE 83 CO"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Marca</label>
                    <select 
                      name="marca"
                      value={formData.marca}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      {brands.length > 0 ? (
                        brands.map(b => (
                          <option key={b.id} value={b.name}>{b.name}</option>
                        ))
                      ) : (
                        <>
                          <option value="SOLE">SOLE</option>
                          <option value="S-Collection">S-Collection</option>
                        </>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Línea</label>
                    <select 
                      name="linea"
                      value={formData.linea}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="">Seleccionar Línea</option>
                      {productLines.map(l => (
                        <option key={l.id} value={l.name}>{l.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                    <select 
                      name="categoria"
                      value={formData.categoria}
                      onChange={handleChange}
                      disabled={!formData.linea}
                      className={`w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none ${!formData.linea ? 'bg-gray-100 cursor-not-allowed border-gray-300' : 'border-blue-200 bg-blue-50/20 font-medium'}`}
                    >
                      <option value="">-- SELECCIONAR CATEGORÍA --</option>
                      {categories
                        .filter(c => {
                          const currentLineId = formData.lineId || productLines.find(l => l.name === formData.linea)?.id;
                          return c.productLineId === currentLineId;
                        })
                        .map(c => (
                          <option key={c.id} value={c.name}>{c.name.toUpperCase()}</option>
                        ))
                      }
                    </select>
                  </div>

                  {artworkType === 'imported' && (
                    <>
                      <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
                          <select 
                            name="proveedor"
                            required
                            value={formData.proveedor}
                            onChange={(e) => handleSelectProvider(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium shadow-sm"
                          >
                            <option value="">-- Seleccionar Proveedor --</option>
                            {existingProviders?.map(p => (
                              <option key={p.name + p.code} value={p.name}>{p.name} ({p.code})</option>
                            ))}
                            <option value="__custom__" className="text-blue-600 font-bold">+ Añadir Nuevo Proveedor...</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Código de Proveedor</label>
                          <input 
                            type="text" 
                            name="codProv"
                            required
                            value={formData.codProv}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50"
                            placeholder="Ej. 2000005029"
                          />
                        </div>
                      </div>


                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Correos de Proveedor</label>
                        <div className="flex gap-2 mb-2">
                          <input 
                            type="email" 
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            className="flex-1 border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Ej. contacto@proveedor.com"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddEmail();
                              }
                            }}
                          />
                          <button 
                            type="button"
                            onClick={handleAddEmail}
                            className="bg-[#52627e] text-white p-2.5 rounded-lg hover:bg-[#3d4a60] transition-colors"
                          >
                            <Plus size={20} />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2 min-h-[40px] p-2 border border-dashed border-gray-300 rounded-lg bg-gray-50">
                          {formData.correoProveedor.length === 0 && (
                            <span className="text-xs text-gray-400 italic">Añade al menos un correo de contacto...</span>
                          )}
                          {formData.correoProveedor.map(email => (
                            <div key={email} className="flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium border border-blue-200">
                              {email}
                              <button 
                                type="button" 
                                onClick={() => handleRemoveEmail(email)}
                                className="hover:text-blue-900 ml-1"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </form>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button onClick={handleCancel} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-md transition-colors">
            Cancelar
          </button>
          {step === 2 && (
            <button 
              type="submit" 
              form="new-request-form" 
              disabled={isSubmitting || !!duplicateRecord}
              className="px-4 py-2 text-sm font-medium text-white bg-[#52627e] hover:bg-[#3d4a60] rounded-md transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creando...' : 'Crear Solicitud'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
