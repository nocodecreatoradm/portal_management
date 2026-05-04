import React, { useState, useEffect, useRef } from 'react';
import { Search, User, ChevronDown, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SupabaseService } from '../lib/SupabaseService';

interface UserSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  name?: string;
  required?: boolean;
  className?: string;
}

export default function UserSelect({ 
  value, 
  onChange, 
  placeholder = 'Seleccionar usuario...', 
  label,
  name,
  required,
  className = ''
}: UserSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        const data = await SupabaseService.getProfiles();
        setUsers(data || []);
      } catch (error) {
        console.error('Error loading users for select:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredUsers = users.filter(user => 
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedUser = users.find(u => u.full_name === value || u.id === value);

  return (
    <div className={`space-y-1.5 ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
          {label}
        </label>
      )}
      
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between px-5 py-3 bg-slate-50 border rounded-xl md:rounded-2xl transition-all font-bold text-sm outline-none ${
            isOpen ? 'border-indigo-500 ring-4 ring-indigo-500/10 bg-white' : 'border-slate-200 text-slate-700'
          }`}
        >
          <div className="flex items-center gap-3 truncate">
            {selectedUser ? (
              <>
                <div className="w-6 h-6 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                  <User size={14} />
                </div>
                <span className="truncate">{selectedUser.full_name}</span>
              </>
            ) : (
              <span className="text-slate-400">{placeholder}</span>
            )}
          </div>
          <ChevronDown size={18} className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Hidden input for form submission if name is provided */}
        {name && (
          <input 
            type="hidden" 
            name={name} 
            value={value} 
            required={required} 
          />
        )}

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute z-[100] w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-3 border-b border-slate-100 bg-slate-50/50">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Buscar usuario..."
                    className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button 
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto custom-scrollbar">
                {loading && users.length === 0 ? (
                  <div className="p-8 flex flex-col items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-[10px] font-black text-slate-400 uppercase">Cargando...</span>
                  </div>
                ) : filteredUsers.length > 0 ? (
                  <div className="p-1">
                    {filteredUsers.map((user) => {
                      const isSelected = value === user.full_name || value === user.id;
                      return (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => {
                            onChange(user.full_name);
                            setIsOpen(false);
                            setSearchTerm('');
                          }}
                          className={`w-full flex items-center justify-between p-3 rounded-xl transition-all text-left group ${
                            isSelected ? 'bg-indigo-50 text-indigo-600' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs border ${
                              isSelected ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-100 text-slate-500 border-slate-100 group-hover:bg-white'
                            }`}>
                              {user.full_name?.substring(0, 2).toUpperCase() || 'U'}
                            </div>
                            <div className="flex flex-col">
                              <span className={`text-xs font-bold ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`}>
                                {user.full_name}
                              </span>
                              <span className="text-[10px] text-slate-400">{user.email}</span>
                            </div>
                          </div>
                          {isSelected && <Check size={14} className="text-indigo-600" strokeWidth={3} />}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <p className="text-xs text-slate-500 font-medium italic">No se encontraron usuarios</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
