import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Shield, 
  Mail, 
  Calendar, 
  ChevronDown,
  AlertCircle,
  Filter,
  MoreVertical,
  Lock,
  Check,
  Info,
  UserCheck,
  UserX,
  Building2,
  ExternalLink,
  Edit2,
  Trash2,
  Activity,
  ArrowUpRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SupabaseService } from '../lib/SupabaseService';
import { RolesService, Role, Permission } from '../services/RolesService';
import { toast } from 'sonner';
import UserEditModal from './UserEditModal';
import UserActivityModal from './UserActivityModal';
import HeaderFilterPopover from './HeaderFilterPopover';

export default function UserManagement() {
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({
    full_name: '',
    email: '',
    role: '',
    is_active: ''
  });
  const [sortConfig, setSortConfig] = useState<{ column: string; direction: 'asc' | 'desc' | null }>({
    column: '',
    direction: null
  });

  const handleFilterChange = (column: string, value: string) => {
    setColumnFilters(prev => ({ ...prev, [column]: value }));
  };

  const handleSortChange = (column: string, direction: 'asc' | 'desc' | null) => {
    setSortConfig({ column, direction });
  };
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState<string | number | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  
  // Roles Tab State
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [savingPermissions, setSavingPermissions] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [profilesData, rolesData, permissionsData] = await Promise.all([
        SupabaseService.getProfiles(),
        RolesService.getRoles(),
        RolesService.getPermissions()
      ]);
      setUsers(profilesData);
      setRoles(rolesData);
      setPermissions(permissionsData);
      if (rolesData.length > 0) setSelectedRole(rolesData[0]);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar datos de gestión');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Correo copiado al portapapeles');
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      setUpdatingId(userId);
      await SupabaseService.updateProfileRole(userId, newRole);
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      toast.success('Rol actualizado correctamente');
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('No se pudo actualizar el rol');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleStatusToggle = async (user: any) => {
    try {
      setUpdatingId(user.id);
      const newStatus = !user.is_active;
      await SupabaseService.updateProfileStatus(user.id, newStatus);
      setUsers(users.map(u => u.id === user.id ? { ...u, is_active: newStatus } : u));
      toast.success(newStatus ? 'Usuario activado' : 'Usuario desactivado');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Error al cambiar estado');
    } finally {
      setUpdatingId(null);
      setOpenMenuId(null);
    }
  };

  const togglePermission = async (permissionId: number) => {
    if (!selectedRole) return;

    const currentPermissionIds = selectedRole.permissions?.map(p => p.id) || [];
    let newPermissionIds: number[];

    if (currentPermissionIds.includes(permissionId)) {
      newPermissionIds = currentPermissionIds.filter(id => id !== permissionId);
    } else {
      newPermissionIds = [...currentPermissionIds, permissionId];
    }

    try {
      setSavingPermissions(true);
      await RolesService.updateRolePermissions(selectedRole.id, newPermissionIds);
      
      const updatedPermissions = permissions.filter(p => newPermissionIds.includes(p.id));
      const updatedRoles = roles.map(r => 
        r.id === selectedRole.id ? { ...r, permissions: updatedPermissions } : r
      );
      setRoles(updatedRoles);
      setSelectedRole({ ...selectedRole, permissions: updatedPermissions });
      
      toast.success('Permisos actualizados');
    } catch (error) {
      console.error('Error updating permissions:', error);
      toast.error('Error al guardar permisos');
    } finally {
      setSavingPermissions(false);
    }
  };

  const handleUpdateUser = (updatedUser: any) => {
    setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
  };

  const filteredUsers = useMemo(() => {
    let result = users.filter(user => {
      const matchesSearch = 
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.department?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? user.is_active : !user.is_active);
      return matchesSearch && matchesRole && matchesStatus;
    });

    Object.keys(columnFilters).forEach(col => {
      const filterVal = columnFilters[col]?.toLowerCase();
      if (filterVal) {
        result = result.filter(r => {
          if (col === 'full_name') {
            return r.full_name?.toLowerCase().includes(filterVal) || r.department?.toLowerCase().includes(filterVal);
          }
          if (col === 'email') {
            return r.email?.toLowerCase().includes(filterVal);
          }
          if (col === 'role') {
            return r.role?.toLowerCase().includes(filterVal);
          }
          if (col === 'is_active') {
            const statusStr = r.is_active ? 'activo' : 'inactivo';
            return statusStr.includes(filterVal);
          }
          return false;
        });
      }
    });

    if (sortConfig.column && sortConfig.direction) {
      result.sort((a: any, b: any) => {
        let valA = '';
        let valB = '';
        if (sortConfig.column === 'full_name') {
          valA = a.full_name || '';
          valB = b.full_name || '';
        } else if (sortConfig.column === 'email') {
          valA = a.email || '';
          valB = b.email || '';
        } else if (sortConfig.column === 'role') {
          valA = a.role || '';
          valB = b.role || '';
        } else if (sortConfig.column === 'is_active') {
          valA = a.is_active ? 'a' : 'b';
          valB = b.is_active ? 'a' : 'b';
        }
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [users, searchTerm, roleFilter, statusFilter, columnFilters, sortConfig]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-medium animate-pulse">Sincronizando gestión de accesos...</p>
        </div>
      </div>
    );
  }

  const permissionModules = Array.from(new Set(permissions.map(p => p.module)));

  // Stats calculation
  const totalActive = users.filter(u => u.is_active).length;
  const totalAdmins = users.filter(u => u.role === 'admin').length;

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest">Admin Panel</span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Security & RBAC</span>
          </div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Shield className="text-blue-600" size={40} />
            Control de Accesos
          </h2>
          <p className="text-slate-500 font-medium mt-1">Monitorea usuarios, gestiona roles y define políticas de seguridad</p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-8 py-3 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${
              activeTab === 'users' ? 'bg-white text-blue-600 shadow-lg shadow-blue-600/5 ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users size={18} strokeWidth={2.5} />
            Usuarios
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            className={`px-8 py-3 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${
              activeTab === 'roles' ? 'bg-white text-blue-600 shadow-lg shadow-blue-600/5 ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Lock size={18} strokeWidth={2.5} />
            Roles
          </button>
        </div>
      </div>

      {activeTab === 'users' ? (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Stats Bento Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard 
              label="Total Usuarios" 
              value={users.length} 
              icon={<Users size={20} />} 
              color="blue"
              subtext="Registrados en la plataforma"
            />
            <StatCard 
              label="Usuarios Activos" 
              value={totalActive} 
              icon={<UserCheck size={20} />} 
              color="emerald"
              subtext={`${((totalActive / users.length) * 100).toFixed(0)}% del total`}
            />
            <StatCard 
              label="Administradores" 
              value={totalAdmins} 
              icon={<Shield size={20} />} 
              color="purple"
              subtext="Acceso total al sistema"
            />
            <StatCard 
              label="Actividad Reciente" 
              value="84" 
              icon={<Activity size={20} />} 
              color="amber"
              subtext="Acciones en las últimas 24h"
            />
          </div>

          {/* Advanced Filters */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            <div className="md:col-span-5 relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
              <input
                type="text"
                placeholder="Buscar por nombre, correo o departamento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border-transparent rounded-2xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 transition-all text-sm font-medium"
              />
            </div>

            <div className="md:col-span-3 relative group">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border-transparent rounded-2xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 transition-all text-sm font-bold appearance-none cursor-pointer"
              >
                <option value="all">Cualquier Rol</option>
                {roles.map(role => (
                  <option key={role.id} value={role.name}>{role.display_name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
            </div>

            <div className="md:col-span-3 relative group">
              <Activity className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border-transparent rounded-2xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 transition-all text-sm font-bold appearance-none cursor-pointer"
              >
                <option value="all">Todos los Estados</option>
                <option value="active">Solo Activos</option>
                <option value="inactive">Solo Inactivos</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
            </div>

            <div className="md:col-span-1 flex justify-center">
              <button 
                onClick={loadInitialData}
                className="p-3 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all"
                title="Refrescar lista"
              >
                <Activity size={20} />
              </button>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white border border-slate-200 rounded-[32px] shadow-xl shadow-slate-200/50 relative">
            <div className="overflow-x-auto min-h-[420px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                      <div className="flex items-center justify-between">
                        <span>Usuario & Contacto</span>
                        <HeaderFilterPopover 
                          column="full_name" 
                          label="Usuario & Contacto" 
                          currentFilter={columnFilters.full_name || ''}
                          onFilterChange={handleFilterChange}
                          currentSort={sortConfig}
                          onSortChange={handleSortChange}
                        />
                      </div>
                    </th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                      <div className="flex items-center justify-between">
                        <span>Departamento / Email</span>
                        <HeaderFilterPopover 
                          column="email" 
                          label="Departamento / Email" 
                          currentFilter={columnFilters.email || ''}
                          onFilterChange={handleFilterChange}
                          currentSort={sortConfig}
                          onSortChange={handleSortChange}
                        />
                      </div>
                    </th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">
                      <div className="flex items-center justify-center">
                        <span>Nivel de Acceso</span>
                        <HeaderFilterPopover 
                          column="role" 
                          label="Nivel de Acceso" 
                          currentFilter={columnFilters.role || ''}
                          onFilterChange={handleFilterChange}
                          currentSort={sortConfig}
                          onSortChange={handleSortChange}
                        />
                      </div>
                    </th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">
                      <div className="flex items-center justify-center">
                        <span>Estado</span>
                        <HeaderFilterPopover 
                          column="is_active" 
                          label="Estado" 
                          currentFilter={columnFilters.is_active || ''}
                          onFilterChange={handleFilterChange}
                          currentSort={sortConfig}
                          onSortChange={handleSortChange}
                        />
                      </div>
                    </th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <AnimatePresence mode="popLayout">
                    {filteredUsers.map((user) => (
                      <motion.tr 
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        key={user.id} 
                        className={`hover:bg-slate-50/50 transition-all group ${!user.is_active ? 'opacity-60 bg-slate-50/30' : ''}`}
                      >
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-500 font-black text-xl border border-white shadow-sm overflow-hidden shrink-0">
                                {user.avatar_url ? (
                                  <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  user.full_name?.substring(0, 2).toUpperCase() || 'U'
                                )}
                              </div>
                              <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white shadow-sm ${user.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-base font-black text-slate-900 leading-tight truncate group-hover:text-blue-600 transition-colors">
                                {user.full_name || 'Sin nombre'}
                              </span>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-slate-500 font-medium truncate max-w-[200px]">{user.email}</span>
                                <button 
                                  onClick={() => copyToClipboard(user.email)}
                                  className="p-1 text-slate-300 hover:text-blue-500 transition-colors" 
                                  title="Copiar correo"
                                >
                                  <Mail size={12} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-2 text-slate-600 bg-slate-100/50 px-3 py-1.5 rounded-xl border border-slate-200/50 w-fit">
                            <Building2 size={14} className="text-slate-400" />
                            <span className="text-xs font-bold uppercase tracking-wider">{user.department || 'Sin Asignar'}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <div className={`
                            inline-block px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.1em] border-2 transition-all
                            ${user.role === 'admin' ? 'bg-red-50 text-red-600 border-red-100' : 
                              user.role === 'gerente_innovacion' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                              user.role === 'coordinador_id' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' :
                              'bg-slate-50 text-slate-600 border-slate-100'}
                          `}>
                            {roles.find(r => r.name === user.role)?.display_name || user.role || 'VISITANTE'}
                          </div>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <button
                            onClick={() => handleStatusToggle(user)}
                            disabled={updatingId === user.id}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                              user.is_active 
                                ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100' 
                                : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                            }`}
                          >
                            {user.is_active ? 'Activo' : 'Inactivo'}
                          </button>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="relative">
                            {updatingId === user.id ? (
                              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin ml-auto" />
                            ) : (
                              <button 
                                onClick={() => setOpenMenuId(openMenuId === user.id ? null : user.id)}
                                className={`p-2.5 rounded-xl transition-all ${openMenuId === user.id ? 'bg-slate-100 text-blue-600' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100'}`}
                              >
                                <MoreVertical size={20} />
                              </button>
                            )}
                            
                            <AnimatePresence>
                              {openMenuId === user.id && (
                                <>
                                  <div className="fixed inset-0 z-[80]" onClick={() => setOpenMenuId(null)} />
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                    className="absolute right-0 top-full mt-1 w-56 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[100] overflow-hidden"
                                  >
                                    <div className="p-2 space-y-1">
                                      <button 
                                        onClick={() => {
                                          setSelectedUser(user);
                                          setIsEditModalOpen(true);
                                          setOpenMenuId(null);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all"
                                      >
                                        <Edit2 size={16} />
                                        Editar Perfil
                                      </button>
                                      <button 
                                        onClick={() => {
                                          setSelectedUser(user);
                                          setIsActivityModalOpen(true);
                                          setOpenMenuId(null);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all"
                                      >
                                        <ExternalLink size={16} />
                                        Ver Actividad
                                      </button>
                                      <div className="h-px bg-slate-100 my-1" />
                                      <button 
                                        onClick={() => handleStatusToggle(user)}
                                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold rounded-xl transition-all ${user.is_active ? 'text-red-600 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                                      >
                                        {user.is_active ? <UserX size={16} /> : <UserCheck size={16} />}
                                        {user.is_active ? 'Desactivar Cuenta' : 'Activar Cuenta'}
                                      </button>
                                    </div>
                                  </motion.div>
                                </>
                              )}
                            </AnimatePresence>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
            
            {filteredUsers.length === 0 && (
              <div className="py-24 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-slate-100 rounded-[28px] flex items-center justify-center text-slate-300 mb-6 border-2 border-dashed border-slate-200">
                  <Search size={32} />
                </div>
                <h3 className="text-xl font-black text-slate-900">Sin resultados</h3>
                <p className="text-slate-500 max-w-xs mt-2 font-medium">No encontramos usuarios que coincidan con tus criterios de búsqueda.</p>
                <button 
                  onClick={() => { setSearchTerm(''); setRoleFilter('all'); setStatusFilter('all'); }}
                  className="mt-6 text-blue-600 font-black text-sm uppercase tracking-widest hover:underline"
                >
                  Limpiar todos los filtros
                </button>
              </div>
            )}
          </div>
        </motion.div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="grid grid-cols-1 lg:grid-cols-4 gap-6"
        >
          {/* Roles List */}
          <div className="lg:col-span-1 space-y-3">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-4">Directorio de Roles</h3>
            <div className="space-y-2 p-1">
              {roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => setSelectedRole(role)}
                  className={`w-full text-left p-5 rounded-[24px] transition-all border-2 relative overflow-hidden group ${
                    selectedRole?.id === role.id 
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xl shadow-blue-600/20' 
                      : 'bg-white text-slate-600 border-slate-100 hover:border-blue-200 hover:bg-blue-50/30'
                  }`}
                >
                  <div className="relative z-10">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-sm tracking-tight">{role.display_name}</span>
                      <ChevronDown className={`transition-transform duration-300 ${selectedRole?.id === role.id ? '-rotate-90' : 'opacity-30'}`} size={16} />
                    </div>
                    <p className={`text-[10px] mt-1.5 font-bold tracking-tight line-clamp-1 ${selectedRole?.id === role.id ? 'text-blue-100' : 'text-slate-400'}`}>
                      {role.description}
                    </p>
                  </div>
                  {selectedRole?.id === role.id && (
                    <motion.div 
                      layoutId="role-bg"
                      className="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-700 -z-0" 
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Permissions Matrix */}
          <div className="lg:col-span-3">
            <div className="bg-white border border-slate-200 rounded-[32px] shadow-2xl shadow-slate-200/50 overflow-hidden min-h-[600px] flex flex-col border-2">
              <div className="p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="text-blue-600" size={16} />
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Matriz de Privilegios</span>
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                    {selectedRole?.display_name}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">Configura el alcance operativo de este perfil en los distintos módulos</p>
                </div>
                {savingPermissions ? (
                  <div className="flex items-center gap-3 bg-blue-600 text-white px-5 py-2.5 rounded-2xl shadow-lg shadow-blue-600/20">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-black uppercase tracking-widest">Guardando...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600">
                    <Check size={14} strokeWidth={3} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Sincronizado</span>
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                {permissionModules.map((moduleName) => (
                  <div key={moduleName} className="space-y-6">
                    <div className="flex items-center gap-4">
                      <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] whitespace-nowrap">
                        Módulo: {moduleName}
                      </h4>
                      <div className="h-px bg-slate-100 flex-1" />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {permissions
                        .filter(p => p.module === moduleName)
                        .map((permission) => {
                          const isEnabled = selectedRole?.permissions?.some(p => p.id === permission.id);
                          return (
                            <button
                              key={permission.id}
                              onClick={() => togglePermission(permission.id)}
                              className={`flex items-start gap-4 p-5 rounded-3xl border-2 transition-all text-left group relative overflow-hidden ${
                                isEnabled 
                                  ? 'bg-blue-50/30 border-blue-100 hover:border-blue-300' 
                                  : 'bg-white border-slate-50 hover:border-slate-200'
                              }`}
                            >
                              <div className={`mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                                isEnabled 
                                  ? 'bg-blue-600 border-blue-600 text-white' 
                                  : 'bg-white border-slate-200 text-transparent group-hover:border-blue-400'
                              }`}>
                                <Check size={14} strokeWidth={4} />
                              </div>
                              <div className="flex flex-col relative z-10">
                                <span className={`text-sm font-black tracking-tight ${isEnabled ? 'text-blue-900' : 'text-slate-700'}`}>
                                  {permission.name.split(':')[1]?.toUpperCase().replace('_', ' ') || permission.name}
                                </span>
                                <p className="text-[11px] text-slate-500 mt-1 font-medium leading-relaxed">
                                  {permission.description}
                                </p>
                              </div>
                              {isEnabled && (
                                <div className="absolute top-0 right-0 p-2">
                                  <ArrowUpRight size={14} className="text-blue-200" />
                                </div>
                              )}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                ))}

                {permissions.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-center py-20">
                    <div className="w-20 h-20 bg-slate-50 rounded-[32px] flex items-center justify-center text-slate-300 mb-6 border-2 border-dashed border-slate-100">
                      <Info size={32} />
                    </div>
                    <h3 className="text-xl font-black text-slate-900">Matriz Vacía</h3>
                    <p className="text-slate-500 max-w-xs mx-auto font-medium">
                      No se han detectado descriptores de permisos para este entorno.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {isEditModalOpen && selectedUser && (
          <UserEditModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            user={selectedUser}
            roles={roles}
            onUpdate={handleUpdateUser}
          />
        )}
        {isActivityModalOpen && selectedUser && (
          <UserActivityModal
            isOpen={isActivityModalOpen}
            onClose={() => setIsActivityModalOpen(false)}
            user={selectedUser}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ label, value, icon, color, subtext }: any) {
  const colors: any = {
    blue: 'bg-blue-600 text-blue-600 border-blue-100 ring-blue-50',
    emerald: 'bg-emerald-600 text-emerald-600 border-emerald-100 ring-emerald-50',
    purple: 'bg-purple-600 text-purple-600 border-purple-100 ring-purple-50',
    amber: 'bg-amber-600 text-amber-600 border-amber-100 ring-amber-50',
  };

  return (
    <div className={`bg-white p-6 rounded-[32px] border-2 border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform ${colors[color].split(' ')[0]}`}>
          {icon}
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
          <p className="text-3xl font-black text-slate-900 tracking-tighter leading-none">{value}</p>
        </div>
      </div>
      <div className="h-px bg-slate-50 w-full mb-3" />
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight flex items-center gap-1.5">
        <Info size={12} className="opacity-50" />
        {subtext}
      </p>
    </div>
  );
}
