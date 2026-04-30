import { ThumbsUp, ThumbsDown, Clock, Minus, Eye } from 'lucide-react';
import { ApprovalStatus } from '../types';

export default function StatusIcon({ 
  status, 
  onClick, 
  interactive = false,
  label = '',
  size = 32
}: { 
  status: ApprovalStatus, 
  onClick?: () => void, 
  interactive?: boolean,
  label?: string,
  size?: number
}) {
  const baseClasses = `flex items-center justify-center rounded-full ${interactive ? 'cursor-pointer hover:ring-2 hover:ring-offset-1 transition-all' : ''}`;
  const iconSize = Math.max(12, Math.floor(size / 2));
  const style = { width: `${size}px`, height: `${size}px` };
  
  const isObservation = (label === 'PROV' || label === 'PLAN') && status === 'rejected';

  switch (status) {
    case 'approved':
      return (
        <div onClick={onClick} style={style} className={`${baseClasses} bg-emerald-100 text-emerald-600 ${interactive ? 'hover:ring-emerald-400' : ''}`} title="Aprobado">
          <ThumbsUp size={iconSize} />
        </div>
      );
    case 'rejected':
      return (
        <div onClick={onClick} style={style} className={`${baseClasses} ${isObservation ? 'bg-blue-100 text-blue-600 hover:ring-blue-400' : 'bg-red-100 text-red-600 hover:ring-red-400'}`} title={isObservation ? "Observación" : "Rechazar"}>
          {isObservation ? <Eye size={iconSize} /> : <ThumbsDown size={iconSize} />}
        </div>
      );
    case 'pending':
      return (
        <div onClick={onClick} style={style} className={`${baseClasses} bg-amber-100 text-amber-600 ${interactive ? 'hover:ring-amber-400' : ''}`} title="Pendiente">
          <Clock size={iconSize} />
        </div>
      );
    case 'not_started':
      return (
        <div onClick={onClick} style={style} className={`${baseClasses} bg-slate-100 text-slate-400 ${interactive ? 'hover:ring-slate-300' : ''}`} title="No iniciado">
          <Minus size={iconSize} />
        </div>
      );
    case 'not_required':
    default:
      return (
        <div style={style} className="flex items-center justify-center text-gray-300" title="No aplica">
          <Minus size={iconSize} />
        </div>
      );
  }
}
