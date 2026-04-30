import React from 'react';
import { ExternalLink, Ship, Wrench, Clock, Receipt } from 'lucide-react';

const apps = [
  {
    name: 'Seguimiento de Importaciones',
    url: 'https://ts.metusa.com/Sigweb/Login.aspx',
    description: 'Sistema de gestión y seguimiento de importaciones SIGWEB.',
    icon: Ship,
    color: 'bg-blue-500',
  },
  {
    name: 'Servicio Técnico C4C',
    url: 'https://my361897.crm.ondemand.com/sap/ap/ui/clogin?saml2=disabled&app.component=%2fSAP_UI_CT%2fMain%2froot.uiccwoc&rootWindow=X&redirectUrl=%2fsap%2fpublic%2fbyd%2fruntime&sap-ui-language=es_es&supressAutoLogon=true#',
    description: 'Portal de SAP Cloud for Customer para Servicio Técnico.',
    icon: Wrench,
    color: 'bg-orange-500',
  },
  {
    name: 'Reloj Control',
    url: 'https://app.relojcontrol.com/login.zul',
    description: 'Plataforma de marcación y control de asistencia.',
    icon: Clock,
    color: 'bg-emerald-500',
  },
  {
    name: 'Rinde Gastos',
    url: 'https://app.rindegastos.com/employee/expenses/',
    description: 'Gestión de rendiciones de gastos y viáticos.',
    icon: Receipt,
    color: 'bg-indigo-500',
  },
  {
    name: 'Success Factor',
    url: 'https://hcm-us10.hr.cloud.sap/sf/orgchart?bplte_company=mtindustri&_s.crb=2CPiS%252b8cfnYwMMLitRARmfoeUeMdhc5m%252fsh7PGk07Q8%253d#/',
    description: 'Gestión Administrativa',
    icon: Receipt,
    color: 'bg-indigo-500',
  },
];

export default function Applications() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-black text-slate-900 tracking-tight">Applications</h2>
        <p className="text-slate-500 font-medium mt-1">Acceso rápido a herramientas y plataformas corporativas</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {apps.map((app) => (
          <a
            key={app.name}
            href={app.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all duration-300 flex flex-col h-full"
          >
            <div className={`w-12 h-12 ${app.color} rounded-2xl flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-current/20`}>
              <app.icon size={24} />
            </div>
            
            <h3 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors">
              {app.name}
            </h3>
            
            <p className="text-slate-500 text-sm font-medium leading-relaxed flex-1">
              {app.description}
            </p>
            
            <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between text-blue-600 font-bold text-xs uppercase tracking-wider">
              <span>Abrir Aplicativo</span>
              <ExternalLink size={14} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
