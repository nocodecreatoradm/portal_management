import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { SamplesProvider } from './context/SamplesContext';
import { AuthProvider } from './contexts/AuthContext';
import { PermissionsProvider } from './contexts/PermissionsContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <SamplesProvider>
        <PermissionsProvider>
          <App />
        </PermissionsProvider>
      </SamplesProvider>
    </AuthProvider>
  </StrictMode>,
);
