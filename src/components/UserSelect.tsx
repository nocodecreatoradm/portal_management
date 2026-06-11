import React, { useState, useEffect, useRef } from 'react';
import { Search, User, ChevronDown, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SupabaseService } from '../lib/SupabaseService';

interface UserSelectProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (user: any) => void;
  placeholder?: string;
  label?: string;
  name?: string;
  required?: boolean;
  className?: string;
}

export default function UserSelect({ 
  value, 
  onChange, 
  onSelect,
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

  // Load profiles on mount
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        const data = await SupabaseService.getProfiles();
        setUsers(data || []);
      } catch (err: any) {
        console.error('Error loading users for select:', {
          message: err.message,
          status: err.status,
          details: err.details
        });
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  // Sync searchTerm with value prop
  useEffect(() => {
    const selected = users.find(u => u.id === value || u.full_name === value);
    if (selected) {
      setSearchTerm(selected.full_name || '');
    } else {
      setSearchTerm(value || '');
    }
  }, [value, users]);

  // Automatically trigger onSelect if the typed text matches a user's full_name
  useEffect(() => {
    if (onSelect && value) {
      const match = users.find(u => u.full_name?.toLowerCase() === value.toLowerCase());
      if (match) {
        onSelect(match);
      }
    }
  }, [value, users, onSelect]);

  // Handle outside clicks to close the dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    onChange(val);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const handleChevronClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  // Filter users based on search term
  const filteredUsers = users.filter(user => {
    const fullName = user.full_name || '';
    const email = user.email || '';
    const search = searchTerm || '';
    return fullName.toLowerCase().includes(search.toLowerCase()) ||
           email.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className={`space-y-1.5 ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
          {label}
        </label>
      )}
      
      <div className="relative">
        <div className="relative">
          {/* User icon on the left */}
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            <User size={16} />
          </div>

          <input
            type="text"
            name={name}
            value={searchTerm}
            onChange={handleInputChange}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            required={required}
            className="w-full pl-11 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl font-bold text-sm text-slate-700 placeholder-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all outline-none"
            autoComplete="off"
          />

          {/* Toggle dropdown button */}
          <button
            type="button"
            onClick={handleChevronClick}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <ChevronDown size={18} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute z-[100] w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="max-h-60 overflow-y-auto custom-scrollbar">
                {loading && users.length === 0 ? (
                  <div className="p-8 flex flex-col items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-[10px] font-black text-slate-400 uppercase">Cargando usuarios...</span>
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
                            if (onSelect) onSelect(user);
                            setIsOpen(false);
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
                  <div className="p-6 text-center">
                    <p className="text-xs text-slate-400 italic">No se encontraron usuarios coincidentes (puedes escribir un nombre personalizado)</p>
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
