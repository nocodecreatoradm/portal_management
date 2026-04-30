import React, { createContext, useContext, useState, useEffect } from 'react';
import { SampleRecord } from '../types';
import { SupabaseService } from '../lib/SupabaseService';
import { toast } from 'sonner';

interface SamplesContextType {
  samples: SampleRecord[];
  setSamples: React.Dispatch<React.SetStateAction<SampleRecord[]>>;
  refreshSamples: () => Promise<void>;
  loading: boolean;
}

const SamplesContext = createContext<SamplesContextType | undefined>(undefined);

export const SamplesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [samples, setSamples] = useState<SampleRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshSamples = async () => {
    try {
      setLoading(true);
      const data = await SupabaseService.getSamples();
      // Map Supabase data to frontend SampleRecord type if needed
      // For now we assume they match closely enough or we cast
      setSamples(data as unknown as SampleRecord[]);
    } catch (error) {
      console.error('Error fetching samples:', error);
      toast.error('Error al cargar muestras desde el servidor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshSamples();
  }, []);

  return (
    <SamplesContext.Provider value={{ samples, setSamples, refreshSamples, loading }}>
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
