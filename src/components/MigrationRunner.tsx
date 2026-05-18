import React, { useState, useEffect, useRef } from 'react';
import { runBase64Migration } from '../lib/migrateBase64ToStorage';

/**
 * Temporary admin component to run migrations.
 * Features:
 * 1. Base64 → Storage migration (Local storage).
 * 2. Supabase Storage → Azure Blob Storage migration (Cloud migration with live SSE stream).
 */
export const MigrationRunner: React.FC = () => {
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const handleRunBase64 = async () => {
    setRunning(true);
    setLogs([]);
    setDone(false);
    
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    
    const capturedLogs: string[] = [];
    
    console.log = (...args: any[]) => {
      const msg = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ');
      capturedLogs.push(msg);
      setLogs([...capturedLogs]);
      originalLog(...args);
    };
    
    console.error = (...args: any[]) => {
      const msg = '❌ ' + args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ');
      capturedLogs.push(msg);
      setLogs([...capturedLogs]);
      originalError(...args);
    };
    
    console.warn = (...args: any[]) => {
      const msg = '⚠️ ' + args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ');
      capturedLogs.push(msg);
      setLogs([...capturedLogs]);
      originalWarn(...args);
    };

    try {
      await runBase64Migration();
      capturedLogs.push('✅ Migración Base64 completada exitosamente');
      setLogs([...capturedLogs]);
      setDone(true);
    } catch (err: any) {
      capturedLogs.push(`❌ Error fatal: ${err.message}`);
      setLogs([...capturedLogs]);
    } finally {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
      setRunning(false);
    }
  };

  const handleRunAzure = async () => {
    setRunning(true);
    setLogs(['⏳ Conectando con el servidor de migración de Azure...']);
    setDone(false);

    try {
      const eventSource = new EventSource('/api/azure-migrate');
      
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.message) {
          setLogs(prev => [...prev, data.message]);
        }
        if (data.done) {
          setLogs(prev => [...prev, '🎉 ¡Migración Supabase → Azure completada con éxito!']);
          setDone(true);
          eventSource.close();
          setRunning(false);
        }
        if (data.error) {
          setLogs(prev => [...prev, `❌ Error: ${data.error}`]);
          eventSource.close();
          setRunning(false);
        }
      };

      eventSource.onerror = (err) => {
        console.error('SSE Error:', err);
        setLogs(prev => [...prev, '❌ Error de conexión o proceso de migración finalizado con fallas.']);
        eventSource.close();
        setRunning(false);
      };
    } catch (err: any) {
      setLogs(prev => [...prev, `❌ Error fatal de conexión: ${err.message || err}`]);
      setRunning(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      right: 20,
      zIndex: 99999,
      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
      color: '#e2e8f0',
      borderRadius: 16,
      padding: 24,
      maxWidth: 550,
      width: '100%',
      maxHeight: '80vh',
      overflow: 'hidden',
      boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      border: '1px solid rgba(255,255,255,0.08)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>🔧 Centro de Migración de Archivos</span>
        </h3>
        {running && (
          <span style={{ fontSize: 11, background: '#f59e0b', color: '#0f172a', padding: '2px 8px', borderRadius: 12, fontWeight: 'bold', animation: 'pulse 1.5s infinite' }}>
            PROCESANDO
          </span>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', marginBottom: 16 }}>
        {!running && !done && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: 13, color: '#f8fafc' }}>Option 1: Migración Base64 a Storage</h4>
              <p style={{ margin: '0 0 12px 0', color: '#94a3b8', fontSize: 12, lineHeight: 1.5 }}>
                Busca registros con archivos en formato Base64 incrustados en la base de datos y los migra a Storage.
              </p>
              <button
                onClick={handleRunBase64}
                style={{
                  background: '#1e40af',
                  color: '#e0f2fe',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 12,
                  transition: 'background 0.2s',
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = '#1d4ed8')}
                onMouseOut={(e) => (e.currentTarget.style.background = '#1e40af')}
              >
                ⚡ Ejecutar Base64 → Storage
              </button>
            </div>

            <div style={{ background: 'rgba(56, 189, 248, 0.03)', padding: 16, borderRadius: 12, border: '1px solid rgba(56, 189, 248, 0.1)' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: 13, color: '#38bdf8' }}>Option 2: Migración Supabase → Azure Storage</h4>
              <p style={{ margin: '0 0 12px 0', color: '#94a3b8', fontSize: 12, lineHeight: 1.5 }}>
                Escanea de manera exhaustiva todas las tablas de la base de datos, descarga los archivos alojados en el Storage de Supabase, los sube a Azure Blob Storage conservando la estructura de carpetas, y actualiza los registros con las nuevas URLs de Azure.
              </p>
              <button
                onClick={handleRunAzure}
                style={{
                  background: '#0284c7',
                  color: '#f0f9ff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 16px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 12,
                  transition: 'background 0.2s',
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = '#0369a1')}
                onMouseOut={(e) => (e.currentTarget.style.background = '#0284c7')}
              >
                ☁️ Ejecutar Supabase → Azure Storage
              </button>
            </div>
          </div>
        )}

        {(running || logs.length > 0) && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ 
              background: '#020617', 
              borderRadius: 12, 
              padding: 16,
              maxHeight: 280,
              overflowY: 'auto',
              border: '1px solid rgba(255,255,255,0.05)',
              fontFamily: 'Fira Code, SFMono-Regular, Consolas, monospace',
              fontSize: 11,
              flex: 1,
            }}>
              {logs.map((log, i) => {
                let color = '#94a3b8';
                if (log.includes('❌') || log.includes('Error')) color = '#f87171';
                else if (log.includes('✅') || log.includes('exitosamente') || log.includes('Successfully')) color = '#4ade80';
                else if (log.includes('⚠️') || log.includes('Scanning') || log.includes('Starting')) color = '#fbbf24';
                else if (log.includes('📥') || log.includes('📤')) color = '#38bdf8';

                return (
                  <div key={i} style={{ 
                    padding: '2px 0',
                    color,
                    borderBottom: '1px solid rgba(255,255,255,0.02)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all'
                  }}>
                    {log}
                  </div>
                );
              })}
              <div ref={logsEndRef} />
            </div>
          </div>
        )}
      </div>

      {done && (
        <div style={{ 
          marginTop: 8, 
          padding: 12, 
          background: 'rgba(74, 222, 128, 0.1)', 
          borderRadius: 8, 
          border: '1px solid rgba(74, 222, 128, 0.2)',
          color: '#4ade80', 
          fontSize: 12,
          fontWeight: 500
        }}>
          ✨ ¡Migración completada! Se han actualizado todas las referencias en base de datos.
          <div style={{ marginTop: 6, display: 'flex', gap: 8 }}>
            <button
              onClick={() => { setDone(false); setLogs([]); }}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: 4,
                padding: '4px 8px',
                color: '#fff',
                fontSize: 11,
                cursor: 'pointer'
              }}
            >
              Volver al inicio
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
