import { supabase } from '../lib/supabase';

export interface Permission {
  id: number;
  name: string;
  description: string;
  module: string;
}

export interface Role {
  id: number;
  name: string;
  display_name: string;
  description: string;
  level: number;
  permissions?: Permission[];
}

export const RolesService = {
  async getRoles() {
    const { data, error } = await supabase
      .from('roles')
      .select('*, permissions:role_permissions(permissions(*))')
      .order('level', { ascending: false });
    
    if (error) throw error;
    
    // Flatten the nested permissions structure
    return data.map(role => ({
      ...role,
      permissions: role.permissions?.map((p: any) => p.permissions) || []
    }));
  },

  async getPermissions() {
    const { data, error } = await supabase
      .from('permissions')
      .select('*')
      .order('module');
    
    if (error) throw error;
    return data;
  },

  async updateRolePermissions(roleId: number, permissionIds: number[]) {
    // First, delete existing permissions for this role
    const { error: deleteError } = await supabase
      .from('role_permissions')
      .delete()
      .eq('role_id', roleId);
    
    if (deleteError) throw deleteError;

    // Then, insert new permissions
    if (permissionIds.length > 0) {
      const { error: insertError } = await supabase
        .from('role_permissions')
        .insert(permissionIds.map(permissionId => ({
          role_id: roleId,
          permission_id: permissionId
        })));
      
      if (insertError) throw insertError;
    }
  },

  async getRoleWithPermissions(roleId: number) {
    const { data, error } = await supabase
      .from('roles')
      .select('*, permissions:role_permissions(permissions(*))')
      .eq('id', roleId)
      .single();
    
    if (error) throw error;
    
    return {
      ...data,
      permissions: data.permissions?.map((p: any) => p.permissions) || []
    };
  },

  async createRole(role: Omit<Role, 'id' | 'permissions'>) {
    const { data, error } = await supabase
      .from('roles')
      .insert([role])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateRole(id: number, role: Partial<Omit<Role, 'id' | 'permissions'>>) {
    const { data, error } = await supabase
      .from('roles')
      .update(role)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deleteRole(id: number) {
    const { error } = await supabase
      .from('roles')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};
