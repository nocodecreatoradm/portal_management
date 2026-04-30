import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { RolesService, Permission } from '../services/RolesService';

interface PermissionsContextType {
  permissions: string[];
  hasPermission: (permissionName: string) => boolean;
  loading: boolean;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export const PermissionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, user } = useAuth();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && profile?.role) {
      loadPermissions();
    } else {
      setPermissions([]);
      setLoading(false);
    }
  }, [user, profile?.role]);

  const loadPermissions = async () => {
    try {
      setLoading(true);
      // Fetch roles to find the current one and its permissions
      const roles = await RolesService.getRoles();
      const currentRole = roles.find(r => r.name === profile?.role);
      
      if (currentRole && currentRole.permissions) {
        setPermissions(currentRole.permissions.map(p => p.name));
      } else {
        setPermissions([]);
      }
    } catch (error) {
      console.error('Error loading permissions:', error);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (permissionName: string) => {
    // Admin always has all permissions
    if (profile?.role === 'admin') return true;
    return permissions.includes(permissionName);
  };

  return (
    <PermissionsContext.Provider value={{ permissions, hasPermission, loading }}>
      {children}
    </PermissionsContext.Provider>
  );
};

export const usePermissions = () => {
  const context = useContext(PermissionsContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return context;
};
