import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit2, Trash2, Save, X, Layout, 
  ClipboardList, Tag, Layers, Briefcase, 
  ChevronRight, GripVertical, Type, AlignLeft, 
  CheckSquare, CircleDot, Camera, PenTool,
  PlusCircle, MinusCircle, ArrowRight
} from 'lucide-react';
import { Brand, ProductLine, Category, InspectionTemplate, InspectionFormField, WorkflowStage } from '../types';
import { SupabaseService } from '../lib/SupabaseService';
import { toast } from 'sonner';

type ActiveTab = 'brands' | 'lines' | 'categories' | 'templates';

export default function MasterDataModule() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('brands');
  const [brands, setBrands] = useState<Brand[]>([]);
  const [lines, setLines] = useState<ProductLine[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [templates, setTemplates] = useState<InspectionTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<ActiveTab | 'builder'>('brands');
  const [editingItem, setEditingItem] = useState<any>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [brandsData, linesData, categoriesData, templatesData] = await Promise.all([
        SupabaseService.getBrands(),
        SupabaseService.getProductLines(),
        SupabaseService.getCategories(),
        SupabaseService.getInspectionTemplates()
      ]);
      setBrands(brandsData);
      setLines(linesData);
      setCategories(categoriesData);
      setTemplates(templatesData);
    } catch (error) {
      console.error('Error loading master data:', error);
      toast.error('Error al cargar datos maestros');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (type: ActiveTab, id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este registro?')) return;
    
    try {
      switch (type) {
        case 'brands': await SupabaseService.deleteBrand(id); break;
        case 'lines': await SupabaseService.deleteProductLine(id); break;
        case 'categories': await SupabaseService.deleteCategory(id); break;
        case 'templates': await SupabaseService.deleteInspectionTemplate(id); break;
      }
      toast.success('Registro eliminado correctamente');
      loadAllData();
    } catch (error) {
      console.error('Error deleting record:', error);
      toast.error('Error al eliminar registro');
    }
  };

  const handleOpenModal = (type: ActiveTab | 'builder', item: any = null) => {
    setModalType(type);
    setEditingItem(item);
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Cargando Maestros...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
        <div>
          <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Maestro de Datos</h1>
          <p className="text-slate-500 font-medium text-lg mt-1 tracking-tight">Gestión de jerarquías y plantillas de inspección</p>
        </div>
        <button 
          onClick={() => handleOpenModal(activeTab)}
          className="flex items-center justify-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-sm hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 hover:scale-105 active:scale-95"
        >
          <Plus size={20} />
          {activeTab === 'brands' && 'Nueva Marca'}
          {activeTab === 'lines' && 'Nueva Línea'}
          {activeTab === 'categories' && 'Nueva Categoría'}
          {activeTab === 'templates' && 'Nueva Plantilla'}
        </button>
      </div>

      <div className="flex gap-2 p-2 bg-slate-100/50 rounded-[28px] w-fit">
        {[
          { id: 'brands', label: 'Marcas', icon: Tag },
          { id: 'lines', label: 'Líneas', icon: Layers },
          { id: 'categories', label: 'Categorías', icon: Briefcase },
          { id: 'templates', label: 'Plantillas', icon: ClipboardList }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as ActiveTab)}
            className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-black uppercase text-xs transition-all ${
              activeTab === tab.id 
                ? 'bg-white text-slate-900 shadow-md scale-105' 
                : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {activeTab === 'brands' && brands.map(brand => (
          <MasterCard 
            key={brand.id}
            title={brand.name}
            subtitle={brand.description || 'Sin descripción'}
            image={brand.image}
            onEdit={() => handleOpenModal('brands', brand)}
            onDelete={() => handleDelete('brands', brand.id)}
          />
        ))}

        {activeTab === 'lines' && lines.map(line => (
          <MasterCard 
            key={line.id}
            title={line.name}
            subtitle="Línea de Producto"
            onEdit={() => handleOpenModal('lines', line)}
            onDelete={() => handleDelete('lines', line.id)}
          />
        ))}

        {activeTab === 'categories' && categories.map(cat => (
          <MasterCard 
            key={cat.id}
            title={cat.name}
            subtitle={lines.find(l => l.id === cat.productLineId)?.name || 'Sin Línea'}
            onEdit={() => handleOpenModal('categories', cat)}
            onDelete={() => handleDelete('categories', cat.id)}
          />
        ))}

        {activeTab === 'templates' && templates.map(template => (
          <MasterCard 
            key={template.id}
            title={template.name}
            subtitle={categories.find(c => c.id === template.categoryId)?.name || 'Sin Categoría'}
            icon={<ClipboardList size={24} className="text-indigo-600" />}
            onEdit={() => handleOpenModal('builder', template)}
            onDelete={() => handleDelete('templates', template.id)}
          />
        ))}
      </div>

      {showModal && (
        <Modal 
          type={modalType} 
          item={editingItem} 
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            loadAllData();
          }}
          brands={brands}
          lines={lines}
          categories={categories}
        />
      )}
    </div>
  );
}

function MasterCard({ title, subtitle, image, icon, onEdit, onDelete }: any) {
  return (
    <div className="group bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300">
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center overflow-hidden border border-slate-100">
          {image ? (
            <img src={image} alt={title} className="w-full h-full object-contain p-2" />
          ) : icon ? (
            icon
          ) : (
            <Tag size={20} className="text-slate-300" />
          )}
        </div>
        <div className="flex gap-1">
          <button onClick={onEdit} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
            <Edit2 size={16} />
          </button>
          <button onClick={onDelete} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight line-clamp-1">{title}</h3>
      <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1 line-clamp-1">{subtitle}</p>
    </div>
  );
}

function Modal({ type, item, onClose, onSuccess, brands, lines, categories }: any) {
  const [formData, setFormData] = useState<any>(item || {});
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (type === 'brands') {
        if (item) await SupabaseService.updateBrand(item.id, formData);
        else await SupabaseService.createBrand(formData);
      } else if (type === 'lines') {
        if (item) await SupabaseService.updateProductLine(item.id, formData);
        else await SupabaseService.createProductLine(formData);
      } else if (type === 'categories') {
        if (item) await SupabaseService.updateCategory(item.id, formData);
        else await SupabaseService.createCategory(formData);
      }
      toast.success('Guardado correctamente');
      onSuccess();
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (type === 'builder') {
    return <TemplateBuilder template={item} categories={categories} onClose={onClose} onSuccess={onSuccess} />;
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[40px] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
              {item ? 'Editar' : 'Nuevo'} {type === 'brands' ? 'Marca' : type === 'lines' ? 'Línea' : 'Categoría'}
            </h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full text-slate-400 transition-colors">
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre</label>
            <input 
              value={formData.name || ''} 
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              required 
              className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700 uppercase" 
            />
          </div>

          {type === 'brands' && (
            <>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descripción</label>
                <textarea 
                  value={formData.description || ''} 
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700 h-24" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">URL Logo</label>
                <input 
                  value={formData.image || ''} 
                  onChange={e => setFormData({ ...formData, image: e.target.value })}
                  className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700" 
                />
              </div>
            </>
          )}

          {type === 'categories' && (
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Línea de Producto</label>
              <select 
                value={formData.productLineId || ''} 
                onChange={e => setFormData({ ...formData, productLineId: e.target.value })}
                required
                className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-slate-700"
              >
                <option value="">Seleccionar Línea</option>
                {lines.map((l: any) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-6 py-4 border border-slate-200 rounded-2xl font-black uppercase text-sm text-slate-500 hover:bg-slate-50 transition-all">Cancelar</button>
            <button disabled={saving} type="submit" className="flex-1 px-6 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-sm hover:bg-slate-800 transition-all shadow-lg shadow-slate-200">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TemplateBuilder({ template, categories, onClose, onSuccess }: any) {
  const [name, setName] = useState(template?.name || '');
  const [categoryId, setCategoryId] = useState(template?.categoryId || '');
  const [sections, setSections] = useState<any[]>(template?.formStructure?.sections || [
    { id: 'sec_1', title: 'INFORMACIÓN GENERAL', fields: [] }
  ]);
  const [workflow, setWorkflow] = useState<WorkflowStage[]>(template?.workflowStructure?.stages || [
    { id: 'stg_1', name: 'RECEPCIÓN', role: 'TECHNICAL', status: 'PENDING' },
    { id: 'stg_2', name: 'INSPECCIÓN', role: 'TECHNICAL', status: 'IN_PROGRESS' },
    { id: 'stg_3', name: 'REPORTE', role: 'TECHNICAL', status: 'COMPLETED' }
  ]);
  const [saving, setSaving] = useState(false);

  const addSection = () => {
    setSections([...sections, { id: `sec_${Date.now()}`, title: 'NUEVA SECCIÓN', fields: [] }]);
  };

  const addField = (sectionId: string, type: InspectionFormField['type']) => {
    const newField: InspectionFormField = {
      id: `fld_${Date.now()}`,
      label: 'NUEVA PREGUNTA',
      type,
      required: false
    };
    if (['select', 'radio', 'checkbox'].includes(type)) {
      newField.options = ['OPCIÓN 1', 'OPCIÓN 2'];
    }
    setSections(sections.map(s => s.id === sectionId ? { ...s, fields: [...s.fields, newField] } : s));
  };

  const updateField = (sectionId: string, fieldId: string, updates: any) => {
    setSections(sections.map(s => s.id === sectionId ? {
      ...s,
      fields: s.fields.map((f: any) => f.id === fieldId ? { ...f, ...updates } : f)
    } : s));
  };

  const removeField = (sectionId: string, fieldId: string) => {
    setSections(sections.map(s => s.id === sectionId ? {
      ...s,
      fields: s.fields.filter((f: any) => f.id !== fieldId)
    } : s));
  };

  const handleSave = async () => {
    if (!name || !categoryId) {
      toast.error('Nombre y Categoría son requeridos');
      return;
    }
    setSaving(true);
    try {
      const payload: Partial<InspectionTemplate> = {
        name,
        categoryId,
        formStructure: { sections },
        workflowStructure: { stages: workflow }
      };

      if (template) await SupabaseService.updateInspectionTemplate(template.id, payload);
      else await SupabaseService.createInspectionTemplate(payload);

      toast.success('Plantilla guardada');
      onSuccess();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Error al guardar plantilla');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-[60] flex flex-col animate-in slide-in-from-bottom duration-500">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-6">
          <button onClick={onClose} className="p-3 hover:bg-white rounded-2xl text-slate-400 transition-colors border border-slate-200">
            <X size={24} />
          </button>
          <div>
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Constructor de Plantillas</h3>
            <p className="text-slate-500 text-sm font-medium">Diseña el formulario y flujo de inspección</p>
          </div>
        </div>
        <div className="flex gap-4">
          <button onClick={onClose} className="px-8 py-4 border border-slate-200 rounded-2xl font-black uppercase text-sm text-slate-500 hover:bg-slate-50 transition-all">Cancelar</button>
          <button 
            onClick={handleSave} 
            disabled={saving}
            className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-sm hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
          >
            <Save size={20} />
            {saving ? 'Guardando...' : 'Guardar Plantilla'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {/* Sidebar - Field Types */}
        <div className="w-80 border-r border-slate-100 bg-slate-50/30 p-8 space-y-8 overflow-y-auto">
          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Información Básica</h4>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Plantilla</label>
                <input value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold text-sm text-slate-700 uppercase" placeholder="EJ. TERMAS A GAS" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoría</label>
                <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold text-sm text-slate-700">
                  <option value="">Seleccionar...</option>
                  {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Añadir Campos</h4>
            <div className="grid grid-cols-1 gap-2">
              {[
                { type: 'text', label: 'Texto Corto', icon: Type },
                { type: 'textarea', label: 'Texto Largo', icon: AlignLeft },
                { type: 'select', label: 'Desplegable', icon: ChevronRight },
                { type: 'radio', label: 'Opción Única', icon: CircleDot },
                { type: 'checkbox', label: 'Múltiple Opción', icon: CheckSquare },
                { type: 'photo', label: 'Fotografía', icon: Camera },
                { type: 'signature', label: 'Firma', icon: PenTool }
              ].map(ft => (
                <button
                  key={ft.type}
                  onClick={() => addField(sections[sections.length - 1]?.id, ft.type as any)}
                  className="flex items-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 hover:text-indigo-600 transition-all text-xs font-black uppercase text-slate-600 group"
                >
                  <div className="p-1.5 bg-slate-50 rounded-lg group-hover:bg-indigo-50 transition-colors">
                    <ft.icon size={14} />
                  </div>
                  {ft.label}
                </button>
              ))}
            </div>
          </div>
          
          <div className="pt-4 border-t border-slate-100">
            <button 
              onClick={addSection}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:border-indigo-300 hover:text-indigo-600 transition-all text-[10px] font-black uppercase"
            >
              <PlusCircle size={14} />
              Añadir Sección
            </button>
          </div>
        </div>

        {/* Main Area - Form Preview */}
        <div className="flex-1 bg-slate-100/30 p-12 overflow-y-auto">
          <div className="max-w-3xl mx-auto space-y-8 pb-20">
            {sections.map((section, sIdx) => (
              <div key={section.id} className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <GripVertical size={16} className="text-slate-300 cursor-move" />
                    <input 
                      value={section.title}
                      onChange={e => setSections(sections.map(s => s.id === section.id ? { ...s, title: e.target.value.toUpperCase() } : s))}
                      className="bg-transparent border-none font-black text-slate-900 uppercase tracking-tight focus:ring-0 text-sm w-64"
                    />
                  </div>
                  <button 
                    onClick={() => setSections(sections.filter(s => s.id !== section.id))}
                    className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="p-8 space-y-6">
                  {section.fields.map((field: any, fIdx: number) => (
                    <div key={field.id} className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 group">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-4">
                          <div className="flex items-center gap-2">
                             <input 
                              value={field.label}
                              onChange={e => updateField(section.id, field.id, { label: e.target.value.toUpperCase() })}
                              className="bg-transparent border-none font-bold text-slate-700 text-sm focus:ring-0 w-full"
                              placeholder="ESCRIBIR PREGUNTA..."
                            />
                            <div className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[9px] font-black text-slate-400 uppercase">
                              {field.type}
                            </div>
                          </div>
                          
                          {['select', 'radio', 'checkbox'].includes(field.type) && (
                            <div className="space-y-2 pl-4 border-l-2 border-slate-200">
                              {field.options?.map((opt: string, oIdx: number) => (
                                <div key={oIdx} className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                  <input 
                                    value={opt}
                                    onChange={e => {
                                      const newOpts = [...field.options];
                                      newOpts[oIdx] = e.target.value.toUpperCase();
                                      updateField(section.id, field.id, { options: newOpts });
                                    }}
                                    className="bg-transparent border-none text-xs font-medium text-slate-500 focus:ring-0 p-0"
                                  />
                                  <button 
                                    onClick={() => {
                                      const newOpts = field.options.filter((_: any, i: number) => i !== oIdx);
                                      updateField(section.id, field.id, { options: newOpts });
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-400"
                                  >
                                    <MinusCircle size={12} />
                                  </button>
                                </div>
                              ))}
                              <button 
                                onClick={() => updateField(section.id, field.id, { options: [...(field.options || []), 'NUEVA OPCIÓN'] })}
                                className="flex items-center gap-1 text-[10px] font-black text-indigo-600 uppercase mt-2"
                              >
                                <Plus size={12} /> Añadir Opción
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button 
                            onClick={() => removeField(section.id, field.id)}
                            className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {section.fields.length === 0 && (
                    <div className="p-12 border-2 border-dashed border-slate-100 rounded-3xl flex flex-col items-center justify-center text-slate-300 gap-4">
                      <Layout size={40} className="opacity-20" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-center">No hay campos en esta sección.<br/>Selecciona un tipo de la izquierda.</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Workflow Sidebar */}
        <div className="w-80 border-l border-slate-100 bg-white p-8 space-y-8 overflow-y-auto">
          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Flujo de Trabajo</h4>
            <div className="space-y-4 relative">
              {workflow.map((stage, idx) => (
                <div key={stage.id} className="relative z-10">
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <input 
                        value={stage.name}
                        onChange={e => setWorkflow(workflow.map(w => w.id === stage.id ? { ...w, name: e.target.value.toUpperCase() } : w))}
                        className="bg-transparent border-none font-black text-slate-900 text-xs uppercase focus:ring-0 p-0"
                      />
                      <button onClick={() => setWorkflow(workflow.filter(w => w.id !== stage.id))} className="text-slate-300 hover:text-red-500">
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <select 
                      value={stage.role}
                      onChange={e => setWorkflow(workflow.map(w => w.id === stage.id ? { ...w, role: e.target.value } : w))}
                      className="w-full bg-white border border-slate-100 rounded-lg text-[9px] font-black p-1 uppercase"
                    >
                      <option value="TECHNICAL">TÉCNICO</option>
                      <option value="ID">I+D</option>
                      <option value="MKT">MKT</option>
                      <option value="PLAN">PLANEAMIENTO</option>
                    </select>
                  </div>
                  {idx < workflow.length - 1 && (
                    <div className="flex justify-center my-2">
                      <ArrowRight size={16} className="text-slate-300 rotate-90" />
                    </div>
                  )}
                </div>
              ))}
              <button 
                onClick={() => setWorkflow([...workflow, { id: `stg_${Date.now()}`, name: 'NUEVA ETAPA', role: 'TECHNICAL', status: 'PENDING' }])}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 transition-all text-[10px] font-black uppercase"
              >
                <Plus size={14} /> Añadir Etapa
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
