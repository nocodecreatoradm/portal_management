import React, { useState } from 'react';
import { runBase64Migration } from '../lib/migrateBase64ToStorage';

/**
 * Temporary admin component to run the base64 → Storage migration.
 * Add this to App.tsx temporarily, then remove after migration is complete.
 * 
 * Usage: Add <MigrationRunner /> somewhere in your admin UI
 */
export const MigrationRunner: React.FC = () => {
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  const handleRun = async () => {
    setRunning(true);
    setLogs([]);
    
    // Capture console.log/error output
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
      capturedLogs.push('✅ Migración completada exitosamente');
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

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      right: 20,
      zIndex: 99999,
      background: '#1e293b',
      color: '#e2e8f0',
      borderRadius: 16,
      padding: 20,
      maxWidth: 500,
      maxHeight: '60vh',
      overflow: 'auto',
      boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
      fontFamily: 'monospace',
      fontSize: 12,
    }}>
      <h3 style={{ margin: '0 0 12px', fontSize: 14, color: '#3b82f6' }}>
        🔧 Migración Base64 → Storage
      </h3>
      
      {!running && !done && (
        <div>
          <p style={{ margin: '0 0 12px', color: '#94a3b8' }}>
            Esta herramienta migrará todos los archivos base64 incrustados en la base de datos 
            al bucket de Supabase Storage. Esto reducirá el tamaño de la base de datos significativamente.
          </p>
          <button
            onClick={handleRun}
            style={{
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              padding: '8px 16px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            🚀 Iniciar Migración
          </button>
        </div>
      )}

      {running && (
        <div style={{ color: '#fbbf24' }}>
          ⏳ Migración en progreso... No cierre esta ventana.
        </div>
      )}

      {logs.length > 0 && (
        <div style={{ 
          marginTop: 12, 
          background: '#0f172a', 
          borderRadius: 8, 
          padding: 12,
          maxHeight: 300,
          overflow: 'auto',
        }}>
          {logs.map((log, i) => (
            <div key={i} style={{ 
              padding: '2px 0',
              color: log.includes('❌') ? '#ef4444' : 
                     log.includes('✅') ? '#22c55e' : 
                     log.includes('⚠️') ? '#f59e0b' : '#94a3b8'
            }}>
              {log}
            </div>
          ))}
        </div>
      )}

      {done && (
        <div style={{ marginTop: 12, color: '#22c55e', fontWeight: 'bold' }}>
          ✅ Migración completada. Puede recargar la página para ver los cambios.
          <br/>
          <small style={{ color: '#94a3b8' }}>
            Elimine el componente MigrationRunner del código después de la migración.
          </small>
        </div>
      )}
    </div>
  );
};
