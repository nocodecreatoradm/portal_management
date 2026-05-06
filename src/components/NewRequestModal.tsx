import React, { useState } from 'react';
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
  categories = []
}: Omit<NewRequestModalProps, 'samples'>) {
  const { samples } = useSamples();
  const [step, setStep] = React.useState<1 | 2>(initialData ? 2 : 1);
  const [artworkType, setArtworkType] = React.useState<'local' | 'imported' | null>(initialData ? (initialData.proveedor === 'LOCAL' ? 'local' : 'imported') : null);
  const [sampleSearch, setSampleSearch] = React.useState('');
  const [isSampleDropdownOpen, setIsSampleDropdownOpen] = React.useState(false);
  const [formData, setFormData] = React.useState({
    codigoEAN: initialData?.codigoEAN || '',
    codigoSAP: initialData?.codigoSAP || '',
    descripcionSAP: initialData?.descripcionSAP || '',
    codProv: initialData?.codProv || '',
    proveedor: initialData?.proveedor || '',
    correoProveedor: initialData?.correoProveedor || [] as string[],
    marca: initialData?.marca || (brands[0]?.name || 'SOLE'),
    brandId: initialData?.brandId || (brands[0]?.id || ''),
    linea: initialData?.linea || (productLines[0]?.name || 'LÍNEA BLANCA'),
    lineId: initialData?.lineId || (productLines[0]?.id || ''),
    categoria: initialData?.categoria || '',
    categoryId: initialData?.categoryId || '',
    sampleId: initialData?.sampleId || '',
    correlativeId: initialData?.correlativeId || '',
  });

  React.useEffect(() => {
    if (initialData) {
      setFormData({
        codigoEAN: initialData.codigoEAN,
        codigoSAP: initialData.codigoSAP,
        descripcionSAP: initialData.descripcionSAP,
        codProv: initialData.codProv,
        proveedor: initialData.proveedor,
        correoProveedor: [...initialData.correoProveedor],
        marca: initialData.marca as any,
        linea: initialData.linea as any,
        sampleId: initialData.sampleId || '',
        correlativeId: initialData.correlativeId || '',
      });
      setArtworkType(initialData.proveedor === 'LOCAL' ? 'local' : 'imported');
      setStep(2);
    } else {
      setFormData({
        codigoEAN: '',
        codigoSAP: '',
        descripcionSAP: '',
        codProv: '',
        proveedor: '',
        correoProveedor: [],
        marca: brands[0]?.name || 'SOLE',
        linea: productLines[0]?.name || 'LÍNEA BLANCA',
        sampleId: '',
        correlativeId: '',
      });
      setStep(1);
      setArtworkType(null);
    }
  }, [initialData, isOpen, brands, productLines]);

  const [newEmail, setNewEmail] = React.useState('');
  const [autoFilled, setAutoFilled] = React.useState(false);

  if (!isOpen) return null;

  const modeLabel = mode === 'artwork' ? 'Artwork' : 
                    mode === 'technical_sheet' ? 'Ficha Técnica' : 'Ficha Comercial';

  const handleTypeSelect = (type: 'local' | 'imported') => {
    setArtworkType(type);
    if (type === 'local') {
      setFormData(prev => ({
        ...prev,
        proveedor: 'LOCAL',
        codProv: 'N/A',
        correoProveedor: [],
        sampleId: '',
        correlativeId: ''
      }));
    }
    setStep(2);
  };

  const handleBack = () => {
    if (initialData) return; // Prevent going back if editing
    setStep(1);
    setArtworkType(null);
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
      const cat = categories.find(c => c.name === value);
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

  const handleSelectProvider = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const providerKey = e.target.value;
    if (!providerKey) return;
    
    const provider = existingProviders?.find(p => (p.name + p.code) === providerKey);
    if (provider) {
      setFormData(prev => ({
        ...prev,
        proveedor: provider.name,
        correoProveedor: [...provider.emails],
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
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
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
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-blue-50/20 font-bold text-blue-700"
                      placeholder="Ej. MUE-001 o ID Personalizado"
                    />
                    <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold italic">
                      * Este ID identifica el seguimiento en la tabla principal. Se auto-completa al vincular una muestra.
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
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="Ej. 3120TURE83CO"
                    />
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
                      disabled={!formData.lineId}
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">Seleccionar Categoría</option>
                      {categories
                        .filter(c => c.productLineId === formData.lineId)
                        .map(c => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))
                      }
                    </select>
                  </div>

                  {artworkType === 'imported' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Seleccionar Proveedor Existente</label>
                        <select 
                          onChange={handleSelectProvider}
                          className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50"
                          value=""
                        >
                          <option value="">-- Seleccionar para auto-completar --</option>
                          {existingProviders?.map(p => (
                            <option key={p.name + p.code} value={p.name + p.code}>{p.name} ({p.code})</option>
                          ))}
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
                          className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                          placeholder="Ej. 2000005029"
                        />
                      </div>
                      <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Vincular con Muestra (Samples)</label>
                        <div className="relative">
                          <div 
                            onClick={() => setIsSampleDropdownOpen(!isSampleDropdownOpen)}
                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-blue-50/30 cursor-pointer flex justify-between items-center"
                          >
                            <span className={formData.sampleId ? 'text-slate-900' : 'text-slate-400'}>
                              {formData.sampleId 
                                ? samples.find(s => s.id === formData.sampleId)?.correlativeId + ' - ' + samples.find(s => s.id === formData.sampleId)?.descripcionSAP
                                : 'Seleccionar muestra...'}
                            </span>
                          </div>
                          
                          {isSampleDropdownOpen && (
                            <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                              <div className="p-2 border-b border-slate-100 bg-slate-50">
                                <div className="relative">
                                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                  <input 
                                    type="text"
                                    placeholder="Buscar por ID o descripción..."
                                    className="w-full pl-9 pr-4 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={sampleSearch}
                                    onChange={(e) => setSampleSearch(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </div>
                              </div>
                              <div className="max-h-48 overflow-y-auto">
                                <div 
                                  className="p-2 text-xs hover:bg-slate-50 cursor-pointer text-slate-500 italic"
                                  onClick={() => {
                                    setFormData(prev => ({ ...prev, sampleId: '' }));
                                    setIsSampleDropdownOpen(false);
                                  }}
                                >
                                  Sin muestra
                                </div>
                                {samples
                                  .filter(s => 
                                    s.correlativeId.toLowerCase().includes(sampleSearch.toLowerCase()) || 
                                    s.descripcionSAP.toLowerCase().includes(sampleSearch.toLowerCase())
                                  )
                                  .map(s => (
                                    <div 
                                      key={s.id}
                                      className="p-2 text-xs hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0"
                                      onClick={() => {
                                        setFormData(prev => ({ ...prev, sampleId: s.id, correlativeId: s.correlativeId }));
                                        setIsSampleDropdownOpen(false);
                                        setSampleSearch('');
                                      }}
                                    >
                                      <span className="font-bold text-blue-600">{s.correlativeId}</span>
                                      <span className="ml-2 text-slate-600">{s.descripcionSAP}</span>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
                        <select 
                          name="proveedor"
                          required
                          value={formData.proveedor}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '__custom__') {
                              const customName = prompt('Ingrese el nombre del nuevo proveedor:');
                              if (customName) {
                                setFormData(prev => ({ ...prev, proveedor: customName }));
                              }
                            } else {
                              handleChange(e);
                              const matched = existingProviders.find(p => p.name === val);
                              if (matched) {
                                setFormData(prev => ({
                                  ...prev,
                                  codProv: matched.code || prev.codProv,
                                  correoProveedor: matched.emails.length > 0 ? matched.emails : prev.correoProveedor
                                }));
                              }
                            }
                          }}
                          className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium"
                        >
                          <option value="">-- Seleccionar Proveedor --</option>
                          {existingProviders?.map(p => (
                            <option key={p.name + p.code} value={p.name}>{p.name} ({p.code})</option>
                          ))}
                          <option value="__custom__">+ Añadir Nuevo Proveedor...</option>
                        </select>
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
                            <span className="text-xs text-gray-400 italic">Añade al menos un correo...</span>
                          )}
                          {formData.correoProveedor.map(email => (
                            <div key={email} className="flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium">
                              {email}
                              <button 
                                type="button" 
                                onClick={() => handleRemoveEmail(email)}
                                className="hover:text-blue-900"
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
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-md transition-colors">
            Cancelar
          </button>
          {step === 2 && (
            <button type="submit" form="new-request-form" className="px-4 py-2 text-sm font-medium text-white bg-[#52627e] hover:bg-[#3d4a60] rounded-md transition-colors shadow-sm">
              Crear Solicitud
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
