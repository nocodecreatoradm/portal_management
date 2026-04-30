import React, { createContext, useContext, useState, useEffect } from 'react';
import { SampleRecord } from '../types';
import { SupabaseService } from '../lib/SupabaseService';
import { toast } from 'sonner';
import { initialSamples } from '../data/mockData';

const isUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

interface SamplesContextType {
  samples: SampleRecord[];
  setSamples: React.Dispatch<React.SetStateAction<SampleRecord[]>>;
  refreshSamples: () => Promise<void>;
  addSample: (sample: SampleRecord) => Promise<void>;
  updateSample: (id: string, updates: Partial<SampleRecord>) => Promise<void>;
  deleteSample: (id: string) => Promise<void>;
  loading: boolean;
}

const SamplesContext = createContext<SamplesContextType | undefined>(undefined);

export const SamplesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [samples, setSamples] = useState<SampleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [brands, setBrands] = useState<any[]>([]);
  const [lines, setLines] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  const resolveIds = (sample: Partial<SampleRecord>) => {
    const resolved = { ...sample };
    
    if (sample.marca) {
      const b = brands.find(x => x.name === sample.marca);
      if (b) (resolved as any).marca = b.id;
    }
    if (sample.linea) {
      const l = lines.find(x => x.name === sample.linea);
      if (l) (resolved as any).linea = l.id;
    }
    if (sample.categoria) {
      const c = categories.find(x => x.name === sample.categoria);
      if (c) (resolved as any).categoria = c.id;
    }
    if (sample.proveedor) {
      const s = suppliers.find(x => (x.legal_name || x.legalName) === sample.proveedor);
      if (s) (resolved as any).proveedor = s.id;
    }
    if (sample.technician) {
      const u = users.find(x => x.full_name === sample.technician);
      if (u) (resolved as any).technician = u.id;
    }
    
    return resolved;
  };

  const refreshSamples = async () => {
    try {
      setLoading(true);
      const remoteItems = await SupabaseService.getSamples();
      
      // Merge with initialSamples (on-demand migration support)
      const remoteIds = new Set(remoteItems.map(i => i.id));
      const remoteCorrelatives = new Set(remoteItems.map(i => i.correlativeId).filter(Boolean));
      
      const uniqueMockItems = initialSamples.filter(mock => 
        !remoteIds.has(mock.id) && (!mock.correlativeId || !remoteCorrelatives.has(mock.correlativeId))
      );
      
      setSamples([...remoteItems, ...uniqueMockItems]);
    } catch (error) {
      console.error('Error fetching samples:', error);
      toast.error('Error al cargar muestras desde el servidor');
    } finally {
      setLoading(false);
    }
  };

  const addSample = async (sample: SampleRecord) => {
    try {
      const resolved = resolveIds(sample);
      const newSample = await SupabaseService.createSample(resolved as SampleRecord);
      setSamples(prev => [newSample, ...prev]);
      toast.success('Muestra registrada correctamente');
    } catch (error) {
      console.error('Error adding sample:', error);
      toast.error('Error al registrar muestra');
    }
  };

  const updateSample = async (id: string, updates: Partial<SampleRecord>) => {
    try {
      const resolved = resolveIds(updates);
      const validUUID = isUUID(id);
      let updated;
      
      if (validUUID) {
        updated = await SupabaseService.updateSample(id, resolved);
      } else {
        // On-demand migration for samples
        const { id: _, ...sampleData } = { ...samples.find(s => s.id === id), ...resolved };
        updated = await SupabaseService.createSample(sampleData as SampleRecord);
      }
      
      setSamples(prev => prev.map(s => s.id === id ? updated : s));
      toast.success('Muestra actualizada');
    } catch (error) {
      console.error('Error updating sample:', error);
      toast.error('Error al actualizar muestra');
    }
  };

  const deleteSample = async (id: string) => {
    try {
      await SupabaseService.deleteSample(id);
      setSamples(prev => prev.filter(s => s.id !== id));
      toast.success('Muestra eliminada');
    } catch (error) {
      console.error('Error deleting sample:', error);
      toast.error('Error al eliminar muestra');
    }
  };

  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [b, l, c, s, u] = await Promise.all([
          SupabaseService.getBrands(),
          SupabaseService.getProductLines(),
          SupabaseService.getCategories(),
          SupabaseService.getSuppliers(),
          SupabaseService.getProfiles()
        ]);
        setBrands(b);
        setLines(l);
        setCategories(c);
        setSuppliers(s);
        setUsers(u);
      } catch (error) {
        console.error('Error loading samples metadata:', error);
      }
    };
    loadMetadata();
    refreshSamples();
  }, []);

  return (
    <SamplesContext.Provider value={{ 
      samples, 
      setSamples, 
      refreshSamples, 
      addSample,
      updateSample,
      deleteSample,
      loading 
    }}>
      {children}
    </SamplesContext.Provider>
  );
};

export const useSamples = () => {
  const context = useContext(SamplesContext);
  if (context === undefined) {
    throw new Error('useSamples must be used within a SamplesProvider');
  }
  return context;
};
