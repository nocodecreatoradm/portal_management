import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, X, ChevronRight, ChevronLeft, ArrowRight, Send } from 'lucide-react';
import { ModuleId } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { SupabaseService } from '../lib/SupabaseService';

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

interface ChatMessage {
  sender: 'user' | 'soly';
  text: string;
  action?: { label: string; module: ModuleId };
}

export default function SolyAssistant({ activeModule, onNavigateModule, isVisible, onToggleVisible }: SolyAssistantProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [activeTab, setActiveTab] = useState<'tour' | 'chat'>('tour');
  
  // Chat states
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      sender: 'soly',
      text: '¡Hola! Soy Soly, tu asistente de I+D. Pregúntame sobre los plazos de entrega cercanos, prioridades críticas de la semana, dónde encontrar datos o resúmenes de muestras e inventario. ¿En qué te ayudo hoy?'
    }
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Highlighting and float positioning states
  const [highlightRect, setHighlightRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const [widgetPosition, setWidgetPosition] = useState<{ left?: number; top?: number; placement: 'fixed' | 'left' | 'right' | 'below' | 'above' }>({
    placement: 'fixed'
  });

  // App data cache for Q&A chatbot
  const [appData, setAppData] = useState<{
    tasks: any[];
    products: any[];
    samples: any[];
    inventory: any[];
    claims: any[];
  }>({ tasks: [], products: [], samples: [], inventory: [], claims: [] });

  // Tour data definitions
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

  const currentSteps = tourData[activeModule] || [
    {
      text: `Estás en el módulo de ${activeModule.replace('_', ' ')}. ¡Explora todas las herramientas disponibles en el panel lateral!`,
      avatar: "pointing_forward"
    }
  ];

  const step = currentSteps[currentStep] || currentSteps[0];
  const avatarSrc = avatarImages[step.avatar] || pointingForward;

  // Auto-scroll chat history on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Load all app data for chatbot queries on load
  useEffect(() => {
    if (!isVisible) return;
    const fetchAllData = async () => {
      try {
        const [tasksData, productsData, samplesData, inventoryData, claimsData] = await Promise.all([
          SupabaseService.getCalendarTasks().catch(() => []),
          SupabaseService.getProducts().catch(() => []),
          SupabaseService.getSamples().catch(() => []),
          SupabaseService.getInventory().catch(() => []),
          SupabaseService.getQualityClaims().catch(() => [])
        ]);

        setAppData({
          tasks: tasksData || [],
          products: productsData || [],
          samples: samplesData || [],
          inventory: inventoryData || [],
          claims: claimsData || []
        });
      } catch (err) {
        console.error("Error loading chat records:", err);
      }
    };
    fetchAllData();
  }, [isVisible]);

  // Reset steps on module change
  useEffect(() => {
    setCurrentStep(0);
  }, [activeModule]);

  // Effect to calculate float positioning and cutout coordinates
  useEffect(() => {
    if (!isVisible || isMinimized || activeTab !== 'tour') {
      setHighlightRect(null);
      setWidgetPosition({ placement: 'fixed' });
      return;
    }

    const updatePosition = () => {
      const step = currentSteps[currentStep];
      if (step && step.highlightSelector) {
        const element = document.querySelector(step.highlightSelector);
        if (element) {
          const rect = element.getBoundingClientRect();
          setHighlightRect({
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height
          });

          // Define assistant widget bounding box dimensions
          const widgetWidth = window.innerWidth < 640 ? 270 : 370;
          const widgetHeight = 230;

          // Default fixed bottom-right position
          let left = window.innerWidth - widgetWidth - 24;
          let top = window.innerHeight - widgetHeight - 24;
          let placement: 'fixed' | 'left' | 'right' | 'below' | 'above' = 'fixed';

          // 1. Try Right Placement
          if (window.innerWidth - (rect.left + rect.width) > widgetWidth + 40) {
            left = rect.left + rect.width + 20;
            top = Math.max(20, Math.min(rect.top + rect.height / 2 - widgetHeight / 2, window.innerHeight - widgetHeight - 40));
            placement = 'right';
          }
          // 2. Try Left Placement
          else if (rect.left > widgetWidth + 40) {
            left = rect.left - widgetWidth - 20;
            top = Math.max(20, Math.min(rect.top + rect.height / 2 - widgetHeight / 2, window.innerHeight - widgetHeight - 40));
            placement = 'left';
          }
          // 3. Try Below Placement
          else if (window.innerHeight - (rect.top + rect.height) > widgetHeight + 40) {
            left = Math.max(20, Math.min(rect.left + rect.width / 2 - widgetWidth / 2, window.innerWidth - widgetWidth - 40));
            top = rect.top + rect.height + 20;
            placement = 'below';
          }
          // 4. Try Above Placement
          else if (rect.top > widgetHeight + 40) {
            left = Math.max(20, Math.min(rect.left + rect.width / 2 - widgetWidth / 2, window.innerWidth - widgetWidth - 40));
            top = rect.top - widgetHeight - 20;
            placement = 'above';
          }

          setWidgetPosition({ left, top, placement });
        } else {
          setHighlightRect(null);
          setWidgetPosition({ placement: 'fixed' });
        }
      } else {
        setHighlightRect(null);
        setWidgetPosition({ placement: 'fixed' });
      }
    };

    updatePosition();

    // Event listeners for recalculating position dynamically on scroll/resize
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [activeModule, currentStep, isVisible, isMinimized, activeTab, currentSteps]);

  // Chat QA NLP matching function
  const getSolyResponse = (query: string): ChatMessage => {
    const q = query.toLowerCase().trim();
    const today = new Date();

    // 1. URGENT / NEAR DEADLINES
    if (q.includes('plazo') || q.includes('limite') || q.includes('límite') || q.includes('cerca') || q.includes('vence') || q.includes('urgente') || q.includes('fecha')) {
      const pendingTasks = appData.tasks
        .filter(t => t.status !== 'completed' && t.status !== 'cancelled' && (t.deadline || (t.startDate && t.endDate)))
        .map(t => ({ title: t.title, date: new Date(t.deadline || t.endDate || ''), module: 'calendar' as ModuleId }));

      const pendingProducts = appData.products
        .filter(p => {
          const assign = p.artworkAssignment || p.technicalAssignment || p.commercialAssignment;
          return assign && assign.designer && !assign.actualCompletionDate && assign.plannedStartDate && assign.plannedEndDate;
        })
        .map(p => {
          const assign = p.artworkAssignment || p.technicalAssignment || p.commercialAssignment;
          const type = p.trackingType === 'artwork' ? 'Arte' : p.trackingType === 'technical' ? 'F. Téc' : 'F. Com';
          return {
            title: `[${type}] ${p.correlativeId || p.codigoSAP}`,
            date: new Date(assign.plannedEndDate || ''),
            module: (p.trackingType === 'artwork' ? 'artwork_followup' : p.trackingType === 'technical' ? 'technical_datasheet' : 'commercial_datasheet') as ModuleId
          };
        });

      const pendingSamples = appData.samples
        .filter(s => s.inspectionProgress !== 'completed' && s.plannedStartDate)
        .map(s => ({
          title: `[Muestra] ${s.correlativeId || s.codigoSAP}`,
          date: new Date(s.plannedStartDate || ''),
          module: 'samples' as ModuleId
        }));

      const allPending = [...pendingTasks, ...pendingProducts, ...pendingSamples]
        .filter(item => !isNaN(item.date.getTime()))
        .sort((a, b) => a.date.getTime() - b.date.getTime());

      if (allPending.length === 0) {
        return { sender: 'soly', text: '🎉 ¡Excelente! No tienes actividades pendientes con fecha límite registrada.' };
      }

      const urgentItems = allPending.slice(0, 4);
      let reply = 'Aquí tienes las actividades más próximas a vencer:\n\n';
      urgentItems.forEach(item => {
        const diffTime = item.date.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        let statusText = '';
        if (diffDays < 0) {
          statusText = `(⚠️ Vencido hace ${Math.abs(diffDays)} días)`;
        } else if (diffDays === 0) {
          statusText = `(⏳ ¡Vence HOY!)`;
        } else {
          statusText = `(vence en ${diffDays} días)`;
        }
        reply += `• **${item.title}**: ${item.date.toLocaleDateString('es-PE')} ${statusText}\n`;
      });

      return { sender: 'soly', text: reply, action: { label: 'Ver Calendario', module: 'calendar' } };
    }

    // 2. TOP 5 PRIORITIES
    if (q.includes('prioridad') || q.includes('prioridades') || q.includes('top 5') || q.includes('top5')) {
      const pendingTasks = appData.tasks
        .filter(t => t.status !== 'completed' && t.status !== 'cancelled' && (t.deadline || (t.startDate && t.endDate)))
        .map(t => ({
          title: t.title,
          date: new Date(t.deadline || t.endDate || ''),
          urgency: t.deliveryStatus === 'delayed' ? 2 : 1
        }))
        .filter(t => !isNaN(t.date.getTime()));

      const pendingClaims = appData.claims
        .filter(c => c.status === 'open' && c.claimStartDate && c.claimEndDate)
        .map(c => ({
          title: `[Reclamo] SAP ${c.sapCode} - ${c.defectType}`,
          date: new Date(c.claimEndDate || ''),
          urgency: 3 // Higher priority
        }))
        .filter(c => !isNaN(c.date.getTime()));

      const pendingSamples = appData.samples
        .filter(s => s.inspectionProgress !== 'completed' && s.plannedStartDate)
        .map(s => ({
          title: `[Muestra] ${s.correlativeId || s.codigoSAP}`,
          date: new Date(s.plannedStartDate || ''),
          urgency: 2
        }))
        .filter(s => !isNaN(s.date.getTime()));

      const allPriorities = [...pendingTasks, ...pendingClaims, ...pendingSamples]
        .sort((a, b) => {
          if (b.urgency !== a.urgency) return b.urgency - a.urgency;
          return a.date.getTime() - b.date.getTime();
        });

      if (allPriorities.length === 0) {
        return { sender: 'soly', text: 'No se encontraron actividades pendientes de alta prioridad. ¡Buen trabajo!' };
      }

      let reply = 'Estas son las **Top 5 Prioridades** críticas del portal en base a plazos y severidad:\n\n';
      allPriorities.slice(0, 5).forEach((p, idx) => {
        reply += `${idx + 1}. **${p.title}** (Límite: ${p.date.toLocaleDateString('es-PE')})\n`;
      });

      return { sender: 'soly', text: reply };
    }

    // 3. SAMPLES
    if (q.includes('muestra') || q.includes('ensayo') || q.includes('inspeccion') || q.includes('inspección') || q.includes('laboratorio')) {
      const pendingSamples = appData.samples.filter(s => s.inspectionProgress !== 'completed');
      const inProgress = pendingSamples.filter(s => s.inspectionProgress === 'in_progress').length;
      const pendingAssign = pendingSamples.filter(s => !s.technician).length;

      let reply = `En el módulo de Muestras tenemos **${pendingSamples.length}** muestras activas:\n\n`;
      reply += `• **${inProgress}** en curso de inspección.\n`;
      reply += `• **${pendingAssign}** sin técnico asignado.\n\n`;

      if (pendingSamples.length > 0) {
        reply += 'Muestras urgentes:\n';
        pendingSamples.slice(0, 3).forEach(s => {
          reply += `• ${s.correlativeId || s.codigoSAP} - ${s.descripcionSAP || 'Muestra'}\n`;
        });
      }

      return { sender: 'soly', text: reply, action: { label: 'Ir a Muestras', module: 'samples' } };
    }

    // 4. QUALITY CLAIMS
    if (q.includes('reclamo') || q.includes('calidad') || q.includes('queja') || q.includes('defecto')) {
      const openClaims = appData.claims.filter(c => c.status === 'open');
      let reply = `Actualmente existen **${openClaims.length}** reclamos de calidad pendientes de subsanar:\n\n`;

      if (openClaims.length > 0) {
        openClaims.slice(0, 3).forEach(c => {
          reply += `• **SAP ${c.sapCode}**: ${c.defectType} - ${c.comments || 'Sin comentarios'}\n`;
        });
      } else {
        reply = '🎉 Todos los reclamos registrados han sido subsanados con éxito (semáforos en verde).';
      }

      return { sender: 'soly', text: reply, action: { label: 'Ver Reclamos', module: 'quality_claims' } };
    }

    // 5. CALIBRATION
    if (q.includes('equipo') || q.includes('calibracion') || q.includes('calibración') || q.includes('inventario') || q.includes('vencido')) {
      const expired = appData.inventory.filter(i => i.calibrationStatus === 'Vencido').length;
      const warning = appData.inventory.filter(i => i.calibrationStatus === 'Próximo a Vencer').length;
      let reply = `En el Inventario de Laboratorio tenemos:\n\n`;
      reply += `• 🔴 **${expired}** equipos con calibración **Vencida**.\n`;
      reply += `• 🟡 **${warning}** equipos **Próximos a Vencer**.\n\n`;

      if (expired > 0) {
        reply += "Equipos críticos vencidos:\n";
        appData.inventory.filter(i => i.calibrationStatus === 'Vencido').slice(0, 3).forEach(i => {
          reply += `• S/N ${i.serialNumber}: ${i.description}\n`;
        });
      }

      return { sender: 'soly', text: reply, action: { label: 'Ver Inventario R&D', module: 'rd_inventory' } };
    }

    // 6. MODULE POSITIONING QUESTIONS (DÓNDE ENCONTRAR / NAVIGATION)
    if (q.includes('donde') || q.includes('dónde') || q.includes('encontrar') || q.includes('buscar') || q.includes('ver') || q.includes('ir a')) {
      if (q.includes('simulador') || q.includes('gmroi') || q.includes('precio')) {
        return { 
          sender: 'soly',
          text: 'El **Simulador de Precios y Plantilla GMROI** se ubica en el menú lateral bajo el grupo de **Recursos & Guías**.',
          action: { label: 'Ir al Simulador', module: 'price_gmroi_simulator' }
        };
      }
      if (q.includes('calendario') || q.includes('pendientes')) {
        return { 
          sender: 'soly',
          text: 'El **Calendario de Pendientes** está en el grupo de **Gestión Operativa**.',
          action: { label: 'Ir al Calendario', module: 'calendar' }
        };
      }
      if (q.includes('plan de trabajo') || q.includes('cronograma')) {
        return { 
          sender: 'soly',
          text: 'El **Plan de Trabajo Anual** está en el grupo de **Gestión Operativa**.',
          action: { label: 'Ir al Plan de Trabajo', module: 'work_plan' }
        };
      }
      if (q.includes('artes') || q.includes('artwork')) {
        return { 
          sender: 'soly',
          text: 'El **Seguimiento de Artes (Fase 1)** está en el grupo de **Gestión Operativa**.',
          action: { label: 'Ir a Artes', module: 'artwork_followup' }
        };
      }
      if (q.includes('ficha tecnica') || q.includes('ficha técnica') || q.includes('f. tec')) {
        return { 
          sender: 'soly',
          text: 'El **Seguimiento de Fichas Técnicas (Fase 2)** está en el grupo de **Gestión Operativa**.',
          action: { label: 'Ir a Ficha Técnica', module: 'technical_datasheet' }
        };
      }
      if (q.includes('brandbook') || q.includes('marca') || q.includes('logotipo')) {
        return { 
          sender: 'soly',
          text: 'El **Brandbook (Manual de Marca)** está al inicio del menú lateral en su propio grupo **Manual de Marca**.',
          action: { label: 'Ir al Brandbook', module: 'brandbook' }
        };
      }
    }

    // DEFAULT
    return {
      sender: 'soly',
      text: 'Disculpa, no logré comprender tu consulta. Puedes preguntarme:\n\n• *¿Cuáles son los plazos urgentes?*\n• *Genera el top 5 de prioridades.*\n• *¿Dónde encuentro el simulador GMROI?*\n• *Dime un resumen de las muestras o reclamos.*'
    };
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const queryText = chatInput;
    setChatInput('');

    // Add user message
    setChatMessages(prev => [...prev, { sender: 'user', text: queryText }]);

    // Trigger response typing effect after a small delay
    setTimeout(() => {
      const response = getSolyResponse(queryText);
      setChatMessages(prev => [...prev, response]);
    }, 400);
  };

  const handleChipClick = (text: string) => {
    setChatMessages(prev => [...prev, { sender: 'user', text }]);
    setTimeout(() => {
      const response = getSolyResponse(text);
      setChatMessages(prev => [...prev, response]);
    }, 400);
  };

  if (!isVisible) return null;

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

  const isFixed = widgetPosition.placement === 'fixed';
  const containerStyle: React.CSSProperties = isFixed
    ? {}
    : {
        position: 'fixed',
        left: `${widgetPosition.left}px`,
        top: `${widgetPosition.top}px`,
        bottom: 'auto',
        right: 'auto',
        transition: 'left 0.3s ease, top 0.3s ease',
        zIndex: 95
      };

  return (
    <div className="z-[90] pointer-events-none">
      <style>{highlightStyles}</style>

      {/* Dim Overlay Backdrops around highlighted element */}
      {highlightRect && activeTab === 'tour' && !isMinimized && (
        <>
          {/* Top overlay */}
          <div 
            className="fixed top-0 left-0 right-0 bg-slate-950/60 z-[80] pointer-events-auto transition-all duration-300"
            style={{ height: `${highlightRect.top - 4}px` }}
          />
          {/* Bottom overlay */}
          <div 
            className="fixed left-0 right-0 bottom-0 bg-slate-950/60 z-[80] pointer-events-auto transition-all duration-300"
            style={{ top: `${highlightRect.top + highlightRect.height + 4}px` }}
          />
          {/* Left overlay */}
          <div 
            className="fixed bg-slate-950/60 z-[80] pointer-events-auto transition-all duration-300"
            style={{ 
              top: `${highlightRect.top - 4}px`, 
              height: `${highlightRect.height + 8}px`, 
              left: 0, 
              width: `${highlightRect.left - 4}px` 
            }}
          />
          {/* Right overlay */}
          <div 
            className="fixed bg-slate-950/60 z-[80] pointer-events-auto transition-all duration-300"
            style={{ 
              top: `${highlightRect.top - 4}px`, 
              height: `${highlightRect.height + 8}px`, 
              left: `${highlightRect.left + highlightRect.width + 4}px`, 
              right: 0 
            }}
          />
        </>
      )}

      {/* Floating Soly Assistant Widget container */}
      <div 
        className={isFixed ? "fixed bottom-6 right-6 flex items-end gap-2 z-[95]" : "z-[95]"} 
        style={containerStyle}
      >
        <AnimatePresence>
          {!isMinimized && (
            <div className="flex items-end gap-3 pointer-events-auto">
              {/* Speech Bubble */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9, x: 20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9, x: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 120 }}
                className="w-72 sm:w-80 md:w-96 bg-white border border-slate-200 shadow-2xl p-5 rounded-3xl relative flex flex-col mb-4 max-h-[440px]"
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

                {/* Tabs selection */}
                <div className="flex border-b border-slate-100 mb-3 text-xs">
                  <button 
                    onClick={() => setActiveTab('tour')}
                    className={`flex-1 pb-1.5 font-black uppercase tracking-wider text-center transition-all ${
                      activeTab === 'tour' 
                        ? 'text-indigo-600 border-b-2 border-indigo-600' 
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Guía de Módulo
                  </button>
                  <button 
                    onClick={() => setActiveTab('chat')}
                    className={`flex-1 pb-1.5 font-black uppercase tracking-wider text-center transition-all ${
                      activeTab === 'chat' 
                        ? 'text-indigo-600 border-b-2 border-indigo-600' 
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Preguntar a Soly
                  </button>
                </div>

                {/* Tour Tab Content */}
                {activeTab === 'tour' && (
                  <div className="flex-1 flex flex-col justify-between min-h-[90px]">
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
                  </div>
                )}

                {/* Chat Tab Content */}
                {activeTab === 'chat' && (
                  <div className="flex-1 flex flex-col min-h-[160px] justify-between">
                    {/* Message Log */}
                    <div className="flex-1 overflow-y-auto max-h-[180px] space-y-2.5 pr-1 mb-2 flex flex-col text-xs custom-scrollbar">
                      {chatMessages.map((msg, idx) => (
                        <div 
                          key={idx}
                          className={`max-w-[85%] rounded-2xl px-3.5 py-2 leading-relaxed font-semibold ${
                            msg.sender === 'user'
                              ? 'bg-indigo-600 text-white self-end rounded-tr-none'
                              : 'bg-slate-50 text-slate-700 border border-slate-100 self-start rounded-tl-none whitespace-pre-wrap'
                          }`}
                        >
                          {msg.text}
                          {msg.action && (
                            <button
                              onClick={() => handleActionClick(msg.action!.module)}
                              className="mt-2 flex items-center gap-1 text-[9px] font-black uppercase tracking-widest bg-white hover:bg-indigo-50 border border-indigo-100 text-indigo-600 px-2 py-1 rounded-lg"
                            >
                              {msg.action.label}
                              <ArrowRight size={10} />
                            </button>
                          )}
                        </div>
                      ))}
                      <div ref={chatEndRef} />
                    </div>

                    {/* Suggestion Chips */}
                    <div className="flex gap-1.5 overflow-x-auto pb-2 border-t border-slate-100 pt-2 shrink-0 select-none custom-scrollbar">
                      <button 
                        onClick={() => handleChipClick('¿Qué plazos están cerca?')}
                        className="px-2 py-1 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-600 hover:text-indigo-600 rounded-full text-[9px] font-bold whitespace-nowrap transition-colors"
                      >
                        🕒 Plazos cerca
                      </button>
                      <button 
                        onClick={() => handleChipClick('Top 5 Prioridades')}
                        className="px-2 py-1 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-600 hover:text-indigo-600 rounded-full text-[9px] font-bold whitespace-nowrap transition-colors"
                      >
                        🏆 Top 5 Prioridades
                      </button>
                      <button 
                        onClick={() => handleChipClick('Resumen de Muestras')}
                        className="px-2 py-1 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-600 hover:text-indigo-600 rounded-full text-[9px] font-bold whitespace-nowrap transition-colors"
                      >
                        📦 Muestras
                      </button>
                      <button 
                        onClick={() => handleChipClick('¿Hay reclamos de calidad abiertos?')}
                        className="px-2 py-1 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-600 hover:text-indigo-600 rounded-full text-[9px] font-bold whitespace-nowrap transition-colors"
                      >
                        ⚠️ Reclamos
                      </button>
                    </div>

                    {/* Chat Text Input Form */}
                    <form onSubmit={handleSendMessage} className="flex gap-1.5 items-center shrink-0">
                      <input 
                        type="text"
                        placeholder="Pregúntame algo..."
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-slate-700"
                      />
                      <button 
                        type="submit" 
                        className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center shrink-0"
                      >
                        <Send size={12} />
                      </button>
                    </form>
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
    </div>
  );
}
