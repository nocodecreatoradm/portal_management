import { LogOut, User as UserIcon, Menu, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';

interface HeaderProps {
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
}

export default function Header({ onToggleSidebar, isSidebarOpen }: HeaderProps) {
  const { profile, signOut } = useAuth();
  const { t } = useTranslation();

  return (
    <header className="bg-white border-b border-gray-200 px-4 md:px-8 py-4 flex justify-between items-center sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <button 
          onClick={onToggleSidebar}
          className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-all"
        >
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <div className="flex flex-col leading-tight">
          <h1 className="text-lg md:text-2xl font-bold text-[#52627e] tracking-tight">
            {t('common.title')}
          </h1>
          <p className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">{t('common.subtitle')}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2 md:gap-4">
        <div className="hidden sm:flex items-center gap-3 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Profile" className="w-full h-full rounded-full object-cover" />
            ) : (
              <UserIcon size={16} />
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-tight leading-none">
              {profile?.full_name || 'Usuario'}
            </span>
            <span className="text-[10px] text-slate-500 font-medium leading-none mt-1">
              {profile?.role || 'Visitante'}
            </span>
          </div>
        </div>
        
        <LanguageSwitcher />
        
        <button 
          onClick={signOut}
          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
          title="Cerrar Sesión"
        >
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
}
