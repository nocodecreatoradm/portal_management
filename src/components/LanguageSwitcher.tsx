import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'es' ? 'en' : 'es';
    i18n.changeLanguage(newLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-2 px-3 py-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all text-sm font-medium border border-slate-200 bg-white"
      title={i18n.language === 'es' ? 'Cambiar a Inglés' : 'Switch to Spanish'}
    >
      <Languages size={16} />
      <span className="uppercase">{i18n.language}</span>
    </button>
  );
}
