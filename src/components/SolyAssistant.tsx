import React, { useState, useEffect } from 'react';
import { Sparkles, X, ChevronRight, ChevronLeft, ArrowRight, HelpCircle } from 'lucide-react';
import { ModuleId } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

// Import avatar images
import pointingForward from '../assets/avatar/pointing_forward.png';
import armsCrossed from '../assets/avatar/arms_crossed.png';
import thinking from '../assets/avatar/thinking.png';
import celebrating from '../assets/avatar/celebrating.png';
import pointingLeft from '../assets/avatar/pointing_left.png';

const avatarImages = {
  pointing_forward: pointingForward,
  arms_crossed: armsCrossed,
  thinking: thinking,
  celebrating: celebrating,
  pointing_left: pointingLeft
};

interface SolyAssistantProps {
  activeModule: ModuleId;
  onNavigateModule: (module: ModuleId) => void;
  isVisible: boolean;
  onToggleVisible: (visible: boolean) => void;
}

interface TourStep {
  text: string;
  avatar: 'pointing_forward' | 'arms_crossed' | 'thinking' | 'celebrating' | 'pointing_left';
  action?: { label: string; module: ModuleId };
  highlightSelector?: string;
}

export default function SolyAssistant({ activeModule, onNavigateModule, isVisible, onToggleVisible }: SolyAssistantProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Define step content and selectors for each module
  const tourData: Record<string, TourStep[]> = {
    brandbook: [
      {
        text: "¡Hola! Soy Soly, tu asistente de I+D. Bienvenido al manual de marca o Brandbook. Aquí visualizas la identidad de nuestras marcas oficiales.",
        avatar: "pointing_forward",
        highlightSelector: "[data-soly='brand-card']"
      },
      {
        text: "Puedes hacer clic en cualquiera de las tarjetas de marca en la cuadrícula para desplegar su logotipo oficial, colores y tipografía.",
        avatar: "pointing_left",
        highlightSelector: "[data-soly='brand-card']"
      },
      {
        text: "Además, en la esquina superior derecha tienes botones para descargar el manual completo en PDF o exportarlo a una plantilla de PowerPoint (PPT).",
        avatar: "arms_crossed",
        highlightSelector: "[title='Brandbook']",
        action: { label: "Ir al Calendario", module: "calendar" }
      }
    ],
    calendar: [
      {
        text: "Este es el Calendario de Pendientes. Aquí centralizamos plazos y fechas críticas para todo el equipo.",
        avatar: "pointing_forward",
        highlightSelector: "[class*='col-span-2']"
      },
      {
        text: "Las tareas fijas (en color púrpura) provienen automáticamente de los módulos de seguimiento de Artes, Fichas Técnicas, Comerciales y Reclamos.",
        avatar: "pointing_left",
        highlightSelector: "[data-soly='calendar-fixed-task']"
      },
      {
        text: "Si deseas agregar tareas del día a día, simplemente haz clic sobre cualquier celda vacía para abrir el formulario rápido.",
        avatar: "thinking",
        highlightSelector: "[data-soly='calendar-cell']"
      },
      {
        text: "¡No te pierdas el Diagrama de Gantt mensual! Usa el selector de la cabecera para ver las tareas distribuidas en el tiempo y detectar retrasos.",
        avatar: "celebrating",
        highlightSelector: "[data-soly='calendar-gantt-btn']",
        action: { label: "Ver Plan de Trabajo", module: "work_plan" }
      }
    ],
    work_plan: [
      {
        text: "Bienvenido al Plan de Trabajo Anual. Aquí puedes dar seguimiento y trazabilidad a los proyectos y sus actividades principales.",
        avatar: "pointing_forward",
        highlightSelector: ".space-y-6"
      },
      {
        text: "Haz clic en 'Registrar Avance' en cualquier celda para registrar el progreso (%) de cada actividad distribuyéndolo en un rango de fechas.",
        avatar: "thinking",
        highlightSelector: "[data-soly='workplan-timeline-cell']"
      },
      {
        text: "El avance general del proyecto se calcula automáticamente promediando sus actividades para que puedas reportar al comité sin esfuerzo.",
        avatar: "celebrating",
        highlightSelector: ".grid-cols-4",
        action: { label: "Ir a Muestras", module: "samples" }
      }
    ],
    samples: [
      {
        text: "Esta es la sección de Muestras (Samples). Aquí realizamos y controlamos los ensayos e inspecciones físicas de los productos.",
        avatar: "pointing_forward",
        highlightSelector: "#samples-table"
      },
      {
        text: "Haz clic en 'Asignar' para designar un técnico de I+D y programar la fecha planificada de inicio de las pruebas.",
        avatar: "pointing_left",
        highlightSelector: "[data-soly='samples-assign-btn']"
      },
      {
        text: "Usa el botón de reproducción (Play) para abrir la hoja de inspección dinámica. El sistema registrará el tiempo administrativo en tiempo real.",
        avatar: "thinking",
        highlightSelector: "[data-soly='samples-play-btn']"
      },
      {
        text: "Dentro del modal podrás completar el formato de preguntas dinámicas según la categoría y validar paso a paso el flujo del ensayo.",
        avatar: "celebrating",
        highlightSelector: "[data-soly='samples-play-btn']",
        action: { label: "Ver Inventario de Lab", module: "rd_inventory" }
      }
    ],
    rd_inventory: [
      {
        text: "Este es el Inventario de Laboratorio. Aquí llevamos el control de calibración y vigencia de equipos e instrumentos técnicos.",
        avatar: "pointing_forward",
        highlightSelector: "table"
      },
      {
        text: "Puedes ver semáforos de colores (rojo, amarillo, verde) que alertan dinámicamente si la calibración de un equipo está próxima a vencer o vencida.",
        avatar: "thinking",
        highlightSelector: "[data-soly='inventory-status-cell']"
      },
      {
        text: "Haz clic en el lápiz para editar cualquier equipo, actualizar sus fechas tras realizar una calibración, o asignar un responsable directo.",
        avatar: "celebrating",
        highlightSelector: "[data-soly='inventory-edit-btn']",
        action: { label: "Ver Normativas NTP", module: "ntp_regulations" }
      }
    ],
    ntp_regulations: [
      {
        text: "Bienvenido al módulo de Normativas NTP (Normas Técnicas Peruanas) aplicables a nuestro portafolio de productos.",
        avatar: "pointing_forward",
        highlightSelector: "#ntp-grid"
      },
      {
        text: "Haz clic en 'ABRIR' para visualizar o descargar directamente el documento PDF de la norma técnica que esté guardado en la nube.",
        avatar: "pointing_left",
        highlightSelector: "[data-soly='ntp-open-btn']"
      },
      {
        text: "Si la norma técnica no tiene un archivo adjunto, el sistema te redirigirá automáticamente a la Sala de Lectura Virtual de INACAL.",
        avatar: "thinking",
        highlightSelector: "[data-soly='ntp-open-btn']",
        action: { label: "Ver Simulador GMROI", module: "price_gmroi_simulator" }
      }
    ],
    price_gmroi_simulator: [
      {
        text: "Este es el Simulador de Precios y Plantilla GMROI de 12 meses. Una potente herramienta financiera para planificar el retorno de stock.",
        avatar: "pointing_forward",
        highlightSelector: ".bg-slate-900"
      },
      {
        text: "Filtra por Línea de Negocio en la cabecera. La Categoría se filtrará de forma dependiente cargando sus umbrales GMROI específicos.",
        avatar: "pointing_left",
        highlightSelector: "[data-soly='gmroi-line-select']"
      },
      {
        text: "Ajusta el PVP y márgenes con los sliders e inputs interactivos. Los KPIs superiores te avisarán si la rentabilidad es Crítica, Aceptable o Alta.",
        avatar: "thinking",
        highlightSelector: "[data-soly='gmroi-pvp-lista-slider']"
      },
      {
        text: "En la pestaña 'Planilla 12 Meses', edita las celdas amarillas para simular compras y rotación. El sistema calculará el GMROI real proyectado.",
        avatar: "celebrating",
        highlightSelector: "[data-soly='gmroi-tab-sheet']",
        action: { label: "Ver Seguimiento de Artes", module: "artwork_followup" }
      }
    ],
    artwork_followup: [
      {
        text: "Bienvenido al Seguimiento de Artes (Fase 1). Aquí controlamos la trazabilidad del diseño y validación de manuales y cajas de empaque.",
        avatar: "pointing_forward",
        highlightSelector: "#artwork-table"
      },
      {
        text: "Haz clic en el botón '+' de la columna de archivos para subir una propuesta de diseño para la versión actual del producto.",
        avatar: "pointing_left",
        highlightSelector: "button[title*='Subir']"
      },
      {
        text: "Para avanzar, el arte debe recibir aprobación de cuatro áreas: I+D (Coordinador), Marketing, Planeamiento y el Proveedor externo.",
        avatar: "thinking",
        highlightSelector: "thead tr:first-child th"
      },
      {
        text: "Haz clic sobre el código correlativo (ej. D-001) para ver el historial detallado de cambios, comentarios y descargar versiones anteriores.",
        avatar: "celebrating",
        highlightSelector: "[data-soly='datatable-correlative']",
        action: { label: "Ir a Reclamos de Calidad", module: "quality_claims" }
      }
    ],
    technical_datasheet: [
      {
        text: "Esta es la sección de Fichas Técnicas (Fase 2). En esta etapa validamos las especificaciones completas de fabricación del producto.",
        avatar: "pointing_forward",
        highlightSelector: "#artwork-table"
      },
      {
        text: "Al igual que en Artes, puedes adjuntar la Ficha Técnica oficial y solicitar las respectivas aprobaciones colaborativas en red.",
        avatar: "arms_crossed",
        highlightSelector: "button[title*='Subir']"
      },
      {
        text: "Una vez aprobada, el sistema registrará la fecha oficial y permitirá pasar al módulo de Ficha Comercial para la fase final.",
        avatar: "celebrating",
        highlightSelector: "thead",
        action: { label: "Ver Fichas Comerciales", module: "commercial_datasheet" }
      }
    ],
    commercial_datasheet: [
      {
        text: "Esta es la etapa final de Fichas Comerciales (Fase 3). Aquí se validan manuales definitivos, rotulados obligatorios y términos de garantía.",
        avatar: "pointing_forward",
        highlightSelector: "#artwork-table"
      },
      {
        text: "Una vez aprobadas las firmas de conformidad por todas las áreas, el producto queda certificado y su estado cambia automáticamente a 'A la Venta'.",
        avatar: "celebrating",
        highlightSelector: "button[title*='flujo']",
        action: { label: "Ver Maestro de Proveedores", module: "supplier_master" }
      }
    ],
    quality_claims: [
      {
        text: "Bienvenido al panel central de Reclamos de Calidad. Un módulo operativo para registrar desvíos y coordinar mejoras con fábrica.",
        avatar: "pointing_forward",
        highlightSelector: ".grid-cols-4"
      },
      {
        text: "Aquí puedes visualizar gráficamente los tipos de defectos (estéticos, funcionales, empaque) y las tasas de resolución mediante KPIs y charts.",
        avatar: "pointing_left",
        highlightSelector: ".grid-cols-2"
      },
      {
        text: "Usa el botón de registro para reportar un nuevo reclamo, asignarle nivel de gravedad, adjuntar fotos de evidencia e indicar la causa raíz.",
        avatar: "thinking",
        highlightSelector: "table"
      },
      {
        text: "Cuando el área técnica registre la subsanación en el sistema, el semáforo cambiará a verde y se enviará una notificación formal por Outlook.",
        avatar: "celebrating",
        highlightSelector: "select:first-of-type",
        action: { label: "Ir al Calendario", module: "calendar" }
      }
    ],
    master_data: [
      {
        text: "Este es el Maestro de Datos, la base de configuración del portal. Módulo restringido exclusivamente para administradores.",
        avatar: "pointing_forward",
        highlightSelector: "table"
      },
      {
        text: "Aquí puedes dar de alta nuevas Marcas, Líneas de Negocio y Categorías Técnicas en la base de datos central.",
        avatar: "arms_crossed",
        highlightSelector: "[data-soly='master-add-btn']"
      },
      {
        text: "Lo más importante: puedes estructurar las plantillas de Inspección y Flujo de Trabajo que usarán los técnicos en el laboratorio.",
        avatar: "thinking",
        highlightSelector: "[data-soly='master-tabs']",
        action: { label: "Ir a Muestras", module: "samples" }
      }
    ]
  };

  // Reset steps on module change
  useEffect(() => {
    setCurrentStep(0);
  }, [activeModule]);

  // Effect to handle dynamic element highlighting and scrolling
  useEffect(() => {
    const clearHighlights = () => {
      document.querySelectorAll('.soly-tour-highlight').forEach(el => {
        el.classList.remove('soly-tour-highlight');
      });
    };

    clearHighlights();

    if (!isVisible || isMinimized) return;

    const currentSteps = tourData[activeModule] || [
      {
        text: `Estás en el módulo de ${activeModule.replace('_', ' ')}. ¡Explora todas las herramientas disponibles en el panel lateral!`,
        avatar: "pointing_forward"
      }
    ];
    const step = currentSteps[currentStep];

    if (step && step.highlightSelector) {
      const timer = setTimeout(() => {
        const element = document.querySelector(step.highlightSelector!);
        if (element) {
          element.classList.add('soly-tour-highlight');
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 200);
      return () => clearTimeout(timer);
    }

    return () => {
      clearHighlights();
    };
  }, [activeModule, currentStep, isVisible, isMinimized]);

  if (!isVisible) return null;

  const currentSteps = tourData[activeModule] || [
    {
      text: `Estás en el módulo de ${activeModule.replace('_', ' ')}. ¡Explora todas las herramientas disponibles en el panel lateral!`,
      avatar: "pointing_forward"
    }
  ];

  const step = currentSteps[currentStep] || currentSteps[0];
  const avatarSrc = avatarImages[step.avatar] || pointingForward;

  const handleNext = () => {
    if (currentStep < currentSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleActionClick = (targetModule: ModuleId) => {
    onNavigateModule(targetModule);
  };

  const highlightStyles = `
    @keyframes solyPulse {
      0% {
        outline-color: rgba(99, 102, 241, 0.4);
        box-shadow: 0 0 0 0px rgba(99, 102, 241, 0.4);
      }
      50% {
        outline-color: rgba(99, 102, 241, 1);
        box-shadow: 0 0 20px 8px rgba(99, 102, 241, 0.7);
      }
      100% {
        outline-color: rgba(99, 102, 241, 0.4);
        box-shadow: 0 0 0 0px rgba(99, 102, 241, 0.4);
      }
    }
    .soly-tour-highlight {
      position: relative !important;
      z-index: 40 !important;
      outline: 5px solid #6366f1 !important;
      outline-offset: 4px !important;
      box-shadow: 0 0 25px rgba(99, 102, 241, 0.8) !important;
      animation: solyPulse 2s infinite !important;
      transition: all 0.3s ease-in-out !important;
    }
  `;

  return (
    <div className="fixed bottom-6 right-6 z-[90] flex items-end gap-2 pointer-events-none">
      <style>{highlightStyles}</style>
      
      <AnimatePresence>
        {!isMinimized && (
          <div className="flex items-end gap-3 pointer-events-auto">
            {/* Speech Bubble */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9, x: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 120 }}
              className="w-72 sm:w-80 md:w-96 bg-white border border-slate-200 shadow-2xl p-5 rounded-3xl relative flex flex-col mb-4"
            >
              {/* Header toolbar */}
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-1.5 text-indigo-600">
                  <Sparkles size={16} className="animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Soly</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setIsMinimized(true)}
                    className="hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors text-[9px] font-black uppercase px-2 py-0.5 border border-slate-200"
                    title="Minimizar ayuda"
                  >
                    Minimizar
                  </button>
                  <button
                    onClick={() => onToggleVisible(false)}
                    className="p-1 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                    title="Ocultar asistente permanentemente"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Bubble Chat content */}
              <div className="flex-1 flex flex-col justify-between min-h-[80px]">
                <p className="text-xs font-semibold text-slate-700 leading-relaxed">
                  {step.text}
                </p>

                {/* Optional navigation shortcut */}
                {step.action && (
                  <button
                    onClick={() => handleActionClick(step.action!.module)}
                    className="mt-3 inline-flex items-center gap-1.5 self-start text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 transition-colors bg-indigo-50 hover:bg-indigo-100/80 px-2.5 py-1.5 rounded-lg border border-indigo-100/60"
                  >
                    {step.action.label}
                    <ArrowRight size={12} />
                  </button>
                )}
              </div>

              {/* Steps navigation footer */}
              {currentSteps.length > 1 && (
                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Paso {currentStep + 1} de {currentSteps.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handlePrev}
                      disabled={currentStep === 0}
                      className="p-1 hover:bg-slate-100 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent text-slate-500 transition-colors"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={handleNext}
                      disabled={currentStep === currentSteps.length - 1}
                      className="p-1 hover:bg-slate-100 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent text-slate-500 transition-colors"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* Speech bubble pointer tail pointing to the avatar */}
              <div className="absolute top-[65%] -right-1.5 w-3 h-3 bg-white border-t border-r border-slate-200 transform rotate(45deg) z-10" />
            </motion.div>

            {/* Standalone Free Avatar Image (Clippy Style) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="w-36 h-48 sm:w-44 sm:h-52 flex items-end justify-center select-none shrink-0"
            >
              <img
                src={avatarSrc}
                alt="Soly Avatar"
                className="w-full h-full object-contain filter drop-shadow-[0_12px_20px_rgba(0,0,0,0.18)] hover:scale-105 transition-transform duration-300 cursor-pointer"
                onClick={() => setIsMinimized(true)}
                title="Haz clic para minimizar"
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mini floating button toggle */}
      {isMinimized && (
        <motion.button
          layoutId="solyFloatingBtn"
          onClick={() => setIsMinimized(false)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          className="w-14 h-14 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-indigo-700 transition-colors border-2 border-white relative group pointer-events-auto"
        >
          <div className="w-11 h-11 rounded-full overflow-hidden bg-indigo-50">
            <img src={pointingForward} alt="Soly Mini" className="w-full h-full object-contain object-top mt-1" />
          </div>
          {/* Pulsing indicator */}
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white animate-bounce" />
          {/* Tooltip */}
          <span className="absolute right-full mr-3 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest py-1.5 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl">
            ¿Necesitas ayuda?
          </span>
        </motion.button>
      )}
    </div>
  );
}
