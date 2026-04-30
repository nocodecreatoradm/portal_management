import { ProductRecord, User, SampleRecord, RDInventoryItem, Project, AuditLog, Supplier, EnergyEfficiencyRecord, ProductManagementRecord, CalendarTask, RDProject, RDProjectTemplate } from '../types';

export const technicians = [
  'Jonathan Soriano',
  'Fernando Lopez',
  'Anthony Soto'
];

export const designers = [
  'Andrea Valdivia',
  'Claudia Mendez',
  'Renato Garcia'
];

export const initialProjects: Project[] = [
  {
    id: 'P1',
    number: '1',
    name: 'Generación de patentes (x3)',
    responsible: 'Carlos Andrés Hoyos Fiorentini',
    progress: 6,
    status: 'EN PROCESO',
    activities: [
      { id: 'A1.1', number: '1.1', name: 'Generación de ideas', comments: 'Agua Caliente: Función Solar - Se encuentra en proceso de implementación', indicator: 'No aplica', progress: 10, responsible: ['Cristhian Sevillano', 'Carlos Hoyos'], classification: 'Plan inicial', plannedStartDate: '2026-01-16', plannedEndDate: '2026-07-12', actualStartDate: '2026-01-05', actualEndDate: '2026-03-15', status: 'EN PROCESO' },
      { id: 'A1.2', number: '1.2', name: 'Desarrollo conceptual', comments: 'Agua Caliente: Función Solar - Se encuentra en proceso de implementación', indicator: 'No aplica', progress: 10, responsible: ['Cristhian Sevillano', 'Carlos Hoyos'], classification: 'Plan inicial', plannedStartDate: '2026-07-12', plannedEndDate: '2026-08-12', actualStartDate: '2026-01-05', actualEndDate: '2026-03-15', status: 'EN PROCESO' },
      { id: 'A1.3', number: '1.3', name: 'Pruebas funcionales', comments: 'Agua Caliente: Función Solar - Se encuentra en proceso de implementación', indicator: 'No aplica', progress: 10, responsible: ['Cristhian Sevillano', 'Carlos Hoyos'], classification: 'Plan inicial', plannedStartDate: '2026-08-12', plannedEndDate: '2026-09-12', actualStartDate: '2026-01-05', actualEndDate: '2026-03-15', status: 'EN PROCESO' },
      { id: 'A1.4', number: '1.4', name: 'Generación de documentación técnica', progress: 0, responsible: ['Cristhian Sevillano', 'Carlos Hoyos'], classification: 'Plan inicial', plannedStartDate: '2026-09-12', plannedEndDate: '2026-10-12', status: 'NO INICIADO' },
      { id: 'A1.5', number: '1.5', name: 'Solicitud de patente', progress: 0, responsible: ['Carlos Hoyos'], classification: 'Plan inicial', plannedStartDate: '2026-10-12', plannedEndDate: '2026-12-12', status: 'NO INICIADO' }
    ]
  },
  {
    id: 'P2',
    number: '2',
    name: 'Propuestas de nuevos productos para Línea Blanca (x6)',
    responsible: 'Carlos Andrés Hoyos Fiorentini',
    progress: 0,
    status: 'NO INICIADO',
    activities: [
      { id: 'A2.1', number: '2.1', name: 'Inspección y evaluación inicial de muestras', indicator: 'Tiempo promedio de evaluación (Average Turnaround Time)', progress: 0, responsible: ['Jonathan Soriano', 'Fernando Lopez', 'Anthony Soto'], classification: 'Plan inicial', plannedStartDate: '2026-01-16', plannedEndDate: '2026-07-12', status: 'NO INICIADO' },
      { id: 'A2.2', number: '2.2', name: 'Generación de informe técnico interno', indicator: 'Tiempo promedio de elaboración de informe', progress: 0, responsible: ['Cristhian Sevillano', 'Carlos Hoyos'], classification: 'Plan inicial', plannedStartDate: '2026-07-12', plannedEndDate: '2026-08-12', status: 'NO INICIADO' },
      { id: 'A2.3', number: '2.3', name: 'Evaluación interna y decisión del proyecto', indicator: 'No aplica', progress: 0, responsible: ['Cristhian Sevillano', 'Carlos Hoyos'], classification: 'Plan inicial', plannedStartDate: '2026-08-12', plannedEndDate: '2026-09-12', status: 'NO INICIADO' },
      { id: 'A2.4', number: '2.4', name: 'Desarrollo de documentación técnica y artworks', indicator: '1 Tiempo de elaboración de Ficha Técnica, 2 Tiempo de elaboración de artes', progress: 0, responsible: ['Jonathan Soriano', 'Fernando Lopez', 'Anthony Soto', 'Raquel Veliz', 'Yakkira Velasquez'], classification: 'Plan inicial', plannedStartDate: '2026-09-12', plannedEndDate: '2026-10-25', status: 'NO INICIADO' },
      { id: 'A2.5', number: '2.5', name: 'Generación de documentación comercial', indicator: 'Tiempo de elaboración de la Ficha Comercial provisional', progress: 0, responsible: ['Fernando Lopez', 'Anthony Soto', 'Raquel Veliz', 'Yakkira Velasquez'], classification: 'Plan inicial', plannedStartDate: '2026-10-12', plannedEndDate: '2026-12-12', status: 'NO INICIADO' }
    ]
  },
  {
    id: 'P3',
    number: '3',
    name: 'Propuestas de nuevos productos para Agua Caliente (x6)',
    responsible: 'Carlos Andrés Hoyos Fiorentini',
    progress: 0,
    status: 'NO INICIADO',
    activities: [
      { id: 'A3.1', number: '3.1', name: 'Inspección y evaluación inicial de muestras', indicator: 'Tiempo promedio de evaluación (Average Turnaround Time)', progress: 0, responsible: ['Jonathan Soriano', 'Fernando Lopez', 'Anthony Soto'], classification: 'Plan inicial', plannedStartDate: '2026-01-16', plannedEndDate: '2026-07-12', status: 'NO INICIADO' },
      { id: 'A3.2', number: '3.2', name: 'Generación de informe técnico interno', indicator: 'Tiempo promedio de elaboración de informe', progress: 0, responsible: ['Cristhian Sevillano', 'Carlos Hoyos'], classification: 'Plan inicial', plannedStartDate: '2026-07-12', plannedEndDate: '2026-08-12', status: 'NO INICIADO' },
      { id: 'A3.3', number: '3.3', name: 'Evaluación interna y decisión del proyecto', indicator: 'No aplica', progress: 0, responsible: ['Cristhian Sevillano', 'Carlos Hoyos'], classification: 'Plan inicial', plannedStartDate: '2026-08-12', plannedEndDate: '2026-09-12', status: 'NO INICIADO' },
      { id: 'A3.4', number: '3.4', name: 'Desarrollo de documentación técnica y artworks', indicator: '1 Tiempo de elaboración de Ficha Técnica, 2 Tiempo de elaboración de artes', progress: 0, responsible: ['Jonathan Soriano', 'Fernando Lopez', 'Anthony Soto', 'Raquel Veliz', 'Yakkira Velasquez'], classification: 'Plan inicial', plannedStartDate: '2026-09-12', plannedEndDate: '2026-10-25', status: 'NO INICIADO' },
      { id: 'A3.5', number: '3.5', name: 'Generación de documentación comercial', indicator: 'Tiempo de elaboración de la Ficha Comercial provisional', progress: 0, responsible: ['Fernando Lopez', 'Anthony Soto', 'Raquel Veliz', 'Yakkira Velasquez'], classification: 'Plan inicial', plannedStartDate: '2026-10-12', plannedEndDate: '2026-12-12', status: 'NO INICIADO' }
    ]
  },
  {
    id: 'P4',
    number: '4',
    name: 'Propuestas de nuevos productos para Climatización (x2)',
    responsible: 'Carlos Andrés Hoyos Fiorentini',
    progress: 0,
    status: 'NO INICIADO',
    activities: [
      { id: 'A4.1', number: '4.1', name: 'Inspección y evaluación inicial de muestras', indicator: 'Tiempo promedio de evaluación (Average Turnaround Time)', progress: 0, responsible: ['Jonathan Soriano', 'Fernando Lopez', 'Anthony Soto'], classification: 'Plan inicial', plannedStartDate: '2026-01-16', plannedEndDate: '2026-07-12', status: 'NO INICIADO' },
      { id: 'A4.2', number: '4.2', name: 'Generación de informe técnico interno', indicator: 'Tiempo promedio de elaboración de informe', progress: 0, responsible: ['Cristhian Sevillano', 'Carlos Hoyos'], classification: 'Plan inicial', plannedStartDate: '2026-07-12', plannedEndDate: '2026-08-12', status: 'NO INICIADO' },
      { id: 'A4.3', number: '4.3', name: 'Evaluación interna y decisión del proyecto', indicator: 'No aplica', progress: 0, responsible: ['Cristhian Sevillano', 'Carlos Hoyos'], classification: 'Plan inicial', plannedStartDate: '2026-08-12', plannedEndDate: '2026-09-12', status: 'NO INICIADO' },
      { id: 'A4.4', number: '4.4', name: 'Desarrollo de documentación técnica y artworks', indicator: '1 Tiempo de elaboración de Ficha Técnica, 2 Tiempo de elaboración de artes', progress: 0, responsible: ['Jonathan Soriano', 'Fernando Lopez', 'Anthony Soto', 'Raquel Veliz', 'Yakkira Velasquez'], classification: 'Plan inicial', plannedStartDate: '2026-09-12', plannedEndDate: '2026-10-25', status: 'NO INICIADO' },
      { id: 'A4.5', number: '4.5', name: 'Generación de documentación comercial', indicator: 'Tiempo de elaboración de la Ficha Comercial provisional', progress: 0, responsible: ['Fernando Lopez', 'Anthony Soto', 'Raquel Veliz', 'Yakkira Velasquez'], classification: 'Plan inicial', plannedStartDate: '2026-10-12', plannedEndDate: '2026-12-12', status: 'NO INICIADO' }
    ]
  },
  {
    id: 'P5',
    number: '5',
    name: 'Propuestas de nuevos productos para Purificación (x2)',
    responsible: 'Carlos Andrés Hoyos Fiorentini',
    progress: 0,
    status: 'NO INICIADO',
    activities: [
      { id: 'A5.1', number: '5.1', name: 'Inspección y evaluación inicial de muestras', indicator: 'Tiempo promedio de evaluación (Average Turnaround Time)', progress: 0, responsible: ['Jonathan Soriano', 'Fernando Lopez', 'Anthony Soto'], classification: 'Plan inicial', plannedStartDate: '2026-01-16', plannedEndDate: '2026-07-12', status: 'NO INICIADO' },
      { id: 'A5.2', number: '5.2', name: 'Generación de informe técnico interno', indicator: 'Tiempo promedio de elaboración de informe', progress: 0, responsible: ['Fernando Lopez', 'Anthony Soto'], classification: 'Plan inicial', plannedStartDate: '2026-07-12', plannedEndDate: '2026-08-12', status: 'NO INICIADO' },
      { id: 'A5.3', number: '5.3', name: 'Evaluación interna y decisión del proyecto', indicator: 'No aplica', progress: 0, responsible: ['Jonathan Soriano', 'Raquel Veliz', 'Yakkira Velasquez'], classification: 'Plan inicial', plannedStartDate: '2026-08-12', plannedEndDate: '2026-09-12', status: 'NO INICIADO' },
      { id: 'A5.4', number: '5.4', name: 'Desarrollo de documentación técnica y artworks', indicator: '1 Tiempo de elaboración de Ficha Técnica, 2 Tiempo de elaboración de artes', progress: 0, responsible: ['Jonathan Soriano', 'Raquel Veliz', 'Yakkira Velasquez'], classification: 'Plan inicial', plannedStartDate: '2026-09-12', plannedEndDate: '2026-10-25', status: 'NO INICIADO' },
      { id: 'A5.5', number: '5.5', name: 'Generación de documentación comercial', indicator: 'Tiempo de elaboración de la Ficha Comercial provisional', progress: 0, responsible: ['Fernando Lopez', 'Anthony Soto', 'Raquel Veliz', 'Yakkira Velasquez'], classification: 'Plan inicial', plannedStartDate: '2026-10-12', plannedEndDate: '2026-12-12', status: 'NO INICIADO' }
    ]
  },
  {
    id: 'P6',
    number: '6',
    name: 'Propuestas de mejoras funcionales (x3)',
    responsible: 'Carlos Andrés Hoyos Fiorentini',
    progress: 6,
    status: 'EN PROCESO',
    activities: [
      { id: 'A6.1', number: '6.1', name: 'Identificación de oportunidades de mejora', comments: 'Agua Caliente: Función Solar - Se encuentra en proceso de implementación', indicator: 'No aplica', progress: 10, responsible: ['Carlos Hoyos', 'Jonathan Soriano', 'Fernando Lopez', 'Anthony Soto', 'Raquel Veliz', 'Yakkira Velasquez'], classification: 'Plan inicial', plannedStartDate: '2026-01-16', plannedEndDate: '2026-07-12', actualStartDate: '2026-01-05', actualEndDate: '2026-03-15', status: 'EN PROCESO' },
      { id: 'A6.2', number: '6.2', name: 'Generación y selección de propuestas funcionales', comments: 'Agua Caliente: Función Solar - Se encuentra en proceso de implementación', indicator: 'No aplica', progress: 10, responsible: ['Carlos Hoyos', 'Jonathan Soriano', 'Fernando Lopez', 'Anthony Soto', 'Raquel Veliz', 'Yakkira Velasquez'], classification: 'Plan inicial', plannedStartDate: '2026-07-12', plannedEndDate: '2026-08-12', actualStartDate: '2026-01-05', actualEndDate: '2026-03-15', status: 'EN PROCESO' },
      { id: 'A6.3', number: '6.3', name: 'Desarrollo conceptual y validación técnica', comments: 'Agua Caliente: Función Solar - Se encuentra en proceso de implementación', indicator: 'No aplica', progress: 10, responsible: ['Carlos Hoyos', 'Jonathan Soriano', 'Fernando Lopez', 'Anthony Soto', 'Raquel Veliz', 'Yakkira Velasquez'], classification: 'Plan inicial', plannedStartDate: '2026-08-12', plannedEndDate: '2026-09-12', actualStartDate: '2026-01-05', actualEndDate: '2026-03-15', status: 'EN PROCESO' },
      { id: 'A6.4', number: '6.4', name: 'Pruebas funcionales y evaluación', progress: 0, responsible: ['Carlos Hoyos', 'Jonathan Soriano', 'Fernando Lopez', 'Anthony Soto', 'Raquel Veliz', 'Yakkira Velasquez'], classification: 'Plan inicial', plannedStartDate: '2026-09-12', plannedEndDate: '2026-10-12', status: 'NO INICIADO' },
      { id: 'A6.5', number: '6.5', name: 'Documentación y liberación de propuestas', progress: 0, responsible: ['Carlos Hoyos', 'Jonathan Soriano', 'Fernando Lopez', 'Anthony Soto', 'Raquel Veliz', 'Yakkira Velasquez'], classification: 'Plan inicial', plannedStartDate: '2026-10-12', plannedEndDate: '2026-12-12', status: 'NO INICIADO' }
    ]
  },
  {
    id: 'P7',
    number: '7',
    name: 'Propuestas de mejoras en el área',
    responsible: 'Carlos Andrés Hoyos Fiorentini',
    progress: 0,
    status: 'NO INICIADO',
    activities: [
      { id: 'A7.1', number: '7.1', name: 'Mejora del sistema de aprobaciones de artworks y flujo de trabajo', indicator: 'No aplica', progress: 0, responsible: ['Jonathan Soriano', 'Fernando Lopez', 'Anthony Soto', 'Raquel Veliz', 'Yakkira Velasquez'], classification: 'Plan inicial', plannedStartDate: '2026-01-16', plannedEndDate: '2026-07-12', status: 'NO INICIADO' },
      { id: 'A7.2', number: '7.2', name: 'Mejora del sistema de inspección de muestras con checklist', indicator: 'No aplica', progress: 0, responsible: ['Jonathan Soriano', 'Fernando Lopez', 'Anthony Soto', 'Raquel Veliz', 'Yakkira Velasquez'], classification: 'Plan inicial', plannedStartDate: '2026-07-12', plannedEndDate: '2026-08-12', status: 'NO INICIADO' },
      { id: 'A7.3', number: '7.3', name: 'Robustecimiento de la plataforma de I+D para seguimiento de entregables', indicator: 'No aplica', progress: 0, responsible: ['Jonathan Soriano', 'Fernando Lopez', 'Anthony Soto', 'Raquel Veliz', 'Yakkira Velasquez'], classification: 'Plan inicial', plannedStartDate: '2026-08-12', plannedEndDate: '2026-09-12', status: 'NO INICIADO' },
      { id: 'A7.4', number: '7.4', name: 'Implementación y fortalecimiento de las 5S en el área (preparación para 5S)', indicator: 'No aplica', progress: 0, responsible: ['Jonathan Soriano', 'Fernando Lopez', 'Anthony Soto', 'Raquel Veliz', 'Yakkira Velasquez'], classification: 'Plan inicial', plannedStartDate: '2026-09-12', plannedEndDate: '2026-12-12', status: 'NO INICIADO' },
      { id: 'A7.5', number: '7.5', name: 'Promoción de capacitaciones de productos a las áreas internas', indicator: 'No aplica', progress: 0, responsible: ['Jonathan Soriano', 'Fernando Lopez', 'Anthony Soto', 'Raquel Veliz', 'Yakkira Velasquez'], classification: 'Plan inicial', plannedStartDate: '2026-10-12', plannedEndDate: '2026-12-12', status: 'NO INICIADO' }
    ]
  },
  {
    id: 'P8',
    number: '8',
    name: 'Viajes técnicos y soporte en campo',
    responsible: 'Carlos Andrés Hoyos Fiorentini',
    progress: 0,
    status: 'NO INICIADO',
    activities: [
      { id: 'A8.1', number: '8.1', name: '1er Viaje técnico a provincia - Cuzco', indicator: 'No aplica', progress: 0, responsible: ['Patricia Terzano', 'Carlos Hoyos'], classification: 'Plan inicial', plannedStartDate: '2026-03-05', plannedEndDate: '2026-03-07', status: 'NO INICIADO' },
      { id: 'A8.2', number: '8.2', name: '2do Viaje técnico a provincia - Huancayo', indicator: 'No aplica', progress: 0, responsible: ['Patricia Terzano', 'Carlos Hoyos'], classification: 'Plan inicial', plannedStartDate: '2026-06-04', plannedEndDate: '2026-06-06', status: 'NO INICIADO' },
      { id: 'A8.3', number: '8.3', name: '3er Viaje técnico a provincia - Chiclayo', indicator: 'No aplica', progress: 0, responsible: ['Patricia Terzano', 'Carlos Hoyos'], classification: 'Plan inicial', plannedStartDate: '2026-09-03', plannedEndDate: '2026-09-05', status: 'NO INICIADO' },
      { id: 'A8.4', number: '8.4', name: '4er Viaje técnico a provincia - Arequipa', indicator: 'No aplica', progress: 0, responsible: ['Patricia Terzano', 'Carlos Hoyos'], classification: 'Plan inicial', plannedStartDate: '2026-11-26', plannedEndDate: '2026-11-28', status: 'NO INICIADO' },
      { id: 'A8.5', number: '8.5', name: 'Viaje técnico cierre anual', indicator: 'No aplica', progress: 0, responsible: ['Patricia Terzano', 'Carlos Hoyos'], classification: 'Plan inicial', plannedStartDate: '2026-12-31', plannedEndDate: '2026-12-31', status: 'NO INICIADO' }
    ]
  }
];

export const initialEnergyEfficiency: EnergyEfficiencyRecord[] = [
  {
    id: 'EE-001',
    codigoMT: 'MT-12345',
    descripcion: 'CALENTADOR DE AGUA 5.5L',
    letra: 'A',
    porcentajeEE: '85%',
    ocp: 'SGS',
    proveedor: 'GUANGDONG VANWARD',
    fechaEmision: '2024-01-01',
    fechaVigilancia: '2025-01-01',
    tipoProducto: 'Calentador a Gas',
    sampleId: 'S1',
    createdAt: '2024-01-01T00:00:00Z'
  }
];

export const initialProductManagement: ProductManagementRecord[] = [
  {
    id: 'PM-1',
    codigoSAP: '100001',
    descripcionSAP: 'Termas a Gas 10L GLP',
    marca: 'SOLE',
    proveedor: 'Proveedor A',
    linea: 'AGUA CALIENTE',
    sampleId: 'S1',
    approvedDocuments: [
      {
        id: 'DOC-1',
        name: 'Ficha Técnica Aprobada.pdf',
        type: 'application/pdf',
        url: '#',
        category: 'Ficha Técnica',
        approvalDate: '2026-02-10'
      }
    ],
    gallery: [
      {
        id: 'G1',
        category: 'Inspección Inicial',
        photos: [
          { name: 'foto1.jpg', url: 'https://picsum.photos/seed/prod1/800/600', type: 'image/jpeg' }
        ],
        uploadDate: '2026-02-15'
      }
    ],
    createdAt: '2026-02-15T12:00:00Z'
  }
];

export const initialRDProjects: RDProject[] = [
  {
    id: 'PROJ-1',
    templateId: 'water-quality',
    name: 'Ensayo Calidad de Agua - Sede Sur',
    description: 'Monitoreo mensual de parámetros de agua en la planta de producción sur.',
    status: 'En Proceso',
    priority: 'Alta',
    responsible: 'Jonathan Soriano',
    startDate: '2026-03-01',
    sections: [
      {
        id: 'general',
        title: 'Información General',
        fields: [
          { id: 'sample_point', label: 'Punto de Muestreo', type: 'text', value: 'Grifo Principal Planta 1', required: true },
          { id: 'source', label: 'Fuente de Agua', type: 'select', value: 'Red Pública', options: ['Red Pública', 'Pozo', 'Cisterna', 'Otro'], required: true },
          { id: 'temp', label: 'Temperatura (°C)', type: 'number', value: 22.5 }
        ]
      },
      {
        id: 'parameters',
        title: 'Parámetros Físico-Químicos',
        fields: [
          { id: 'ph', label: 'pH', type: 'number', value: 7.2 },
          { id: 'turbidity', label: 'Turbidez (NTU)', type: 'number', value: 0.8 },
          { id: 'chlorine', label: 'Cloro Libre (mg/L)', type: 'number', value: 0.5 },
          { id: 'hardness', label: 'Dureza Total (mg/L)', type: 'number', value: 180 }
        ]
      }
    ],
    attachments: [],
    createdAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-03-01T10:00:00Z'
  },
  {
    id: 'PROJ-2',
    templateId: 'dimensioning',
    name: 'Dimensionamiento Edificio Miraflores',
    description: 'Cálculo de demanda de agua caliente para edificio residencial de 20 departamentos.',
    status: 'Revisión',
    priority: 'Media',
    responsible: 'Carlos Hoyos',
    startDate: '2026-03-15',
    sections: [
      {
        id: 'client_info',
        title: 'Datos del Cliente / Proyecto',
        fields: [
          { id: 'client_name', label: 'Nombre del Cliente', type: 'text', value: 'Inmobiliaria Horizonte', required: true },
          { id: 'location', label: 'Ubicación', type: 'text', value: 'Av. Larco 123, Miraflores' },
          { id: 'project_type', label: 'Tipo de Edificación', type: 'select', value: 'Residencial', options: ['Residencial', 'Comercial', 'Industrial', 'Hotelero'] }
        ]
      },
      {
        id: 'technical_req',
        title: 'Requerimientos Técnicos',
        fields: [
          { id: 'total_flow', label: 'Caudal Total Requerido (L/min)', type: 'number', value: 150 },
          { id: 'storage_cap', label: 'Capacidad de Almacenamiento (L)', type: 'number', value: 2000 },
          { id: 'energy_source', label: 'Fuente de Energía', type: 'select', value: 'Gas Natural', options: ['Gas Natural', 'GLP', 'Electricidad', 'Solar'] }
        ]
      }
    ],
    attachments: [],
    createdAt: '2026-03-15T09:00:00Z',
    updatedAt: '2026-03-25T14:30:00Z'
  }
];

export const initialAuditLogs: AuditLog[] = [];

export const initialRDInventory: RDInventoryItem[] = [
  {
    id: 'RD-001',
    serialNumber: '28035436',
    description: 'Cámara termográfica',
    responsible: 'I+D',
    acquisitionDate: '2026-11-18',
    startupDate: '2026-11-19',
    calibrationStatus: 'Programado',
    category: 'Equipo de Medición',
    equipmentType: 'Termografía',
    sourceType: 'Calor',
    brand: 'BOSCH',
    model: 'GTC400C',
    equipmentRange: '-10°C-400°C',
    lastCalibrationDate: '2026-11-19',
    nextCalibrationDate: '2027-11-19',
    photos: [
      { name: 'camara1.jpg', url: 'https://picsum.photos/seed/cam1/800/600', type: 'image/jpeg' },
      { name: 'camara2.jpg', url: 'https://picsum.photos/seed/cam2/800/600', type: 'image/jpeg' }
    ],
    manual: { name: 'Manual_GTC400C.pdf', url: 'https://www.bosch-professional.com/binary/ocsmedia/optimized/full/o263342v21_160992A4U8_201809.pdf', type: 'application/pdf' },
    certificateHistory: [
      {
        name: 'CERT-2023-BOSCH.pdf',
        url: '#',
        type: 'application/pdf',
        uploadDate: '2023-11-19',
        calibrationDate: '2023-11-19',
        expiryDate: '2024-11-19',
        version: 1
      }
    ]
  },
  {
    id: 'RD-002',
    serialNumber: '2087040',
    description: 'Sonómetro',
    responsible: 'I+D',
    calibrationStatus: 'Programado',
    category: 'Equipo de Medición',
    equipmentType: 'Sonido',
    sourceType: 'Ruido',
    brand: 'BAFX PRODUCTS',
    model: 'BAFX3608',
    equipmentRange: '30dB-130dB',
    lastCalibrationDate: '2026-06-15',
    nextCalibrationDate: '2027-06-15',
    photos: [
      { name: 'sonometro.jpg', url: 'https://picsum.photos/seed/sono/800/600', type: 'image/jpeg' }
    ]
  },
  {
    id: 'RD-003',
    serialNumber: '529277',
    description: 'Tacómetro',
    responsible: 'I+D',
    calibrationStatus: 'Programado',
    category: 'Equipo de Medición',
    equipmentType: 'Velocidad rotacional',
    sourceType: 'Aire',
    brand: 'LUTRON',
    model: 'DT-2230',
    equipmentRange: '0.5 RPM - 100000 RPM',
    lastCalibrationDate: '2026-08-20',
    nextCalibrationDate: '2027-08-20'
  },
  {
    id: 'RD-004',
    serialNumber: '3172',
    description: 'Termoanemómetro',
    responsible: 'I+D',
    calibrationStatus: 'Operativo',
    category: 'Equipo de Medición',
    equipmentType: 'Flujo de aire/Temperatura',
    sourceType: 'Aire/Calor',
    brand: 'LUTRON',
    model: 'AM-4207SD',
    equipmentRange: '-100 - 1300 °C',
    revisionRegistry: '2027-04-01',
    lastCalibrationDate: '2026-04-01',
    nextCalibrationDate: '2027-04-01'
  },
  {
    id: 'RD-005',
    serialNumber: '40571001WS',
    description: 'Multímetro digital + puntas y sonda',
    responsible: 'I+D',
    calibrationStatus: 'Operativo',
    category: 'Equipo de Medición',
    equipmentType: 'Eléctrico',
    sourceType: 'Electricidad',
    brand: 'FLUKE',
    model: '116',
    equipmentRange: '-',
    revisionRegistry: '2027-04-01',
    lastCalibrationDate: '2026-04-01',
    nextCalibrationDate: '2027-04-01'
  },
  {
    id: 'RD-006',
    serialNumber: '40471779WS',
    description: 'Pinza amperimétrica',
    responsible: 'I+D',
    calibrationStatus: 'Operativo',
    category: 'Equipo de Medición',
    equipmentType: 'Eléctrico',
    sourceType: 'Electricidad',
    brand: 'FLUKE',
    model: '324',
    equipmentRange: '-',
    revisionRegistry: '2027-06-13',
    lastCalibrationDate: '2026-06-13',
    nextCalibrationDate: '2027-06-13'
  },
  {
    id: 'RD-007',
    serialNumber: '46540164',
    description: 'Megohmetro digital',
    responsible: 'I+D',
    calibrationStatus: 'Operativo',
    category: 'Equipo de Medición',
    equipmentType: 'Aislamiento eléctrico',
    sourceType: 'Electricidad',
    brand: 'FLUKE',
    model: '1507',
    equipmentRange: '-',
    revisionRegistry: '2027-06-13',
    lastCalibrationDate: '2026-06-13',
    nextCalibrationDate: '2027-06-13'
  },
  {
    id: 'RD-008',
    serialNumber: 'TIN12025',
    description: 'Termómetro infrarrojo',
    responsible: 'I+D',
    calibrationStatus: 'Programado',
    category: 'Equipo de Medición',
    equipmentType: 'Temperatura superficial',
    sourceType: 'Calor',
    brand: 'FLUKE',
    model: '62MAX',
    equipmentRange: '-30 °C a 500 °C',
    lastCalibrationDate: '2026-10-10',
    nextCalibrationDate: '2027-10-10'
  },
  {
    id: 'RD-009',
    serialNumber: 'TL12025',
    description: 'Termómetro de lanza',
    responsible: 'I+D',
    acquisitionDate: '2024-10-30',
    startupDate: '2024-10-30',
    calibrationStatus: 'Programado',
    category: 'Equipo de Medición',
    equipmentType: 'Temperatura interna',
    sourceType: 'Calor',
    brand: 'DELTATRAK',
    model: '11050',
    equipmentRange: '-40°C a 155°C',
    lastCalibrationDate: '2024-10-30',
    nextCalibrationDate: '2025-10-30'
  },
  {
    id: 'RD-010',
    serialNumber: 'TL2025-1',
    description: 'Termómetro de lanza',
    responsible: 'I+D',
    acquisitionDate: '2024-10-30',
    startupDate: '2024-10-30',
    calibrationStatus: 'Programado',
    category: 'Equipo de Medición',
    equipmentType: 'Temperatura interna',
    sourceType: 'Calor',
    brand: 'DELTATRAK',
    model: '11050',
    equipmentRange: '-40°C a 155°C',
    lastCalibrationDate: '2024-10-30',
    nextCalibrationDate: '2025-10-30'
  },
  {
    id: 'RD-011',
    serialNumber: 'TL2025-2',
    description: 'Termómetro de lanza',
    responsible: 'I+D',
    acquisitionDate: '2024-10-30',
    startupDate: '2024-10-30',
    calibrationStatus: 'Programado',
    category: 'Equipo de Medición',
    equipmentType: 'Temperatura interna',
    sourceType: 'Calor',
    brand: 'DELTATRAK',
    model: '11050',
    equipmentRange: '-40°C a 155°C',
    lastCalibrationDate: '2024-10-30',
    nextCalibrationDate: '2025-10-30'
  },
  {
    id: 'RD-012',
    serialNumber: '29324030',
    description: 'Micrómetro digital',
    responsible: 'I+D',
    calibrationStatus: 'Programado',
    category: 'Equipo de Medición',
    equipmentType: 'Dimensional',
    sourceType: 'Mecánico',
    brand: 'MITUTOYO',
    model: 'MDC-25PX',
    equipmentRange: '-',
    lastCalibrationDate: '2024-12-01',
    nextCalibrationDate: '2025-12-01'
  },
  {
    id: 'RD-013',
    serialNumber: '500-19630B',
    description: 'Vernier digital CD-6"',
    responsible: 'I+D',
    calibrationStatus: 'Programado',
    category: 'Equipo de Medición',
    equipmentType: 'Dimensional',
    sourceType: 'Mecánico',
    brand: 'MITUTOYO',
    model: 'ASX-B',
    equipmentRange: '-',
    lastCalibrationDate: '2024-12-01',
    nextCalibrationDate: '2025-12-01'
  },
  {
    id: 'RD-014',
    serialNumber: '500-197-20B',
    description: 'Vernier digital CD-8"',
    responsible: 'I+D',
    calibrationStatus: 'Programado',
    category: 'Equipo de Medición',
    equipmentType: 'Dimensional',
    sourceType: 'Mecánico',
    brand: 'MITUTOYO',
    model: 'CSX-B',
    equipmentRange: '-',
    lastCalibrationDate: '2024-12-01',
    nextCalibrationDate: '2025-12-01'
  },
  {
    id: 'RD-015',
    serialNumber: '303005.0091',
    description: 'Manómetro digital -1 a 3 bar',
    responsible: 'I+D',
    calibrationStatus: 'Programado',
    category: 'Equipo de Medición',
    equipmentType: 'Presión',
    sourceType: 'Líquido',
    brand: 'KELLER',
    model: 'LEO1',
    equipmentRange: '-1 a 3 bar',
    lastCalibrationDate: '2024-05-15',
    nextCalibrationDate: '2025-05-15'
  },
  {
    id: 'RD-016',
    serialNumber: '81000.2',
    description: 'Manómetro digital -1 a 3 bar',
    responsible: 'I+D',
    acquisitionDate: '2025-02-21',
    startupDate: '2025-02-21',
    calibrationStatus: 'Programado',
    category: 'Equipo de Medición',
    equipmentType: 'Presión',
    sourceType: 'Líquido',
    brand: 'KELLER',
    model: 'LEO1',
    equipmentRange: '-1 a 3 bar',
    lastCalibrationDate: '2025-02-21',
    nextCalibrationDate: '2026-02-21'
  },
  {
    id: 'RD-017',
    serialNumber: '303005.7008',
    description: 'Manómetro digital -1 a 30 bar',
    responsible: 'I+D',
    acquisitionDate: '2025-02-21',
    startupDate: '2025-02-21',
    calibrationStatus: 'Programado',
    category: 'Equipo de Medición',
    equipmentType: 'Presión',
    sourceType: 'Líquido',
    brand: 'KELLER',
    model: 'LEO1',
    equipmentRange: '-1 a 30 bar',
    lastCalibrationDate: '2025-02-21',
    nextCalibrationDate: '2026-02-21'
  },
  {
    id: 'RD-018',
    serialNumber: 'V12025',
    description: 'Vatímetro',
    responsible: 'I+D',
    calibrationStatus: 'Programado',
    category: 'Equipo de Medición',
    equipmentType: 'Potencia eléctrica',
    sourceType: 'Electricidad',
    brand: 'ZHURUI',
    model: 'PR10',
    equipmentRange: '0.005A - 15A',
    lastCalibrationDate: '2024-09-12',
    nextCalibrationDate: '2025-09-12'
  },
  {
    id: 'RD-019',
    serialNumber: 'DL2025',
    description: 'Data Logger Termómetro',
    responsible: 'I+D',
    acquisitionDate: '2024-10-28',
    startupDate: '2024-10-28',
    calibrationStatus: 'Operativo',
    category: 'Equipo de Medición',
    equipmentType: 'Registro de temperatura',
    sourceType: 'Calor',
    brand: 'CENTER',
    model: '374',
    equipmentRange: '200 °C - 1370 °C',
    lastCalibrationDate: '2024-10-28',
    nextCalibrationDate: '2025-10-28'
  },
  {
    id: 'RD-020',
    serialNumber: '2059206',
    description: 'Colorímetro de Cloro',
    responsible: 'I+D',
    calibrationStatus: 'Operativo',
    category: 'Equipo de Medición',
    equipmentType: 'Colorimetría',
    sourceType: 'Químico',
    brand: 'HERMO SCIENTIFIC',
    model: 'AQ 3170',
    equipmentRange: '0.02 to 8.00 mg/L',
    lastCalibrationDate: '2024-11-05',
    nextCalibrationDate: '2025-11-05'
  },
  {
    id: 'RD-021',
    serialNumber: 'PC400S1122021005',
    description: 'pH-metro multiparámetro',
    responsible: 'I+D',
    calibrationStatus: 'Programado',
    category: 'Equipo de Medición',
    equipmentType: 'Medición de pH',
    sourceType: 'Químico / Agua',
    brand: 'PERA INSTRUMENTS',
    model: 'PC400S',
    equipmentRange: '-',
    lastCalibrationDate: '2024-11-05',
    nextCalibrationDate: '2025-11-05'
  },
  {
    id: 'RD-022',
    serialNumber: '3171',
    description: 'Balanza de precisión',
    responsible: 'I+D',
    calibrationStatus: 'Programado',
    category: 'Equipo de Medición',
    equipmentType: 'Masa / Peso',
    sourceType: 'Electrónica',
    brand: 'AND',
    model: 'GF-3002A',
    equipmentRange: '-',
    lastCalibrationDate: '2024-07-20',
    nextCalibrationDate: '2025-07-20'
  },
  {
    id: 'RD-023',
    serialNumber: '157441-0120',
    description: 'Balanza 6 kg',
    responsible: 'I+D',
    calibrationStatus: 'Programado',
    category: 'Equipo de Medición',
    equipmentType: 'Masa / Peso',
    sourceType: 'Electrónica',
    brand: 'SUMINCO',
    model: 'Genérico',
    equipmentRange: '0-6kg',
    lastCalibrationDate: '2024-07-20',
    nextCalibrationDate: '2025-07-20'
  },
  {
    id: 'RD-024',
    serialNumber: '157595-0320',
    description: 'Balanza 30 kg',
    responsible: 'I+D',
    calibrationStatus: 'Programado',
    category: 'Equipo de Medición',
    equipmentType: 'Masa / Peso',
    sourceType: 'Electrónica',
    brand: 'SUMINCO',
    model: 'Genérico',
    equipmentRange: '0-30 kg',
    lastCalibrationDate: '2024-07-20',
    nextCalibrationDate: '2025-07-20'
  },
  {
    id: 'RD-025',
    serialNumber: '224601270',
    description: 'Medidor Láser',
    responsible: 'I+D',
    acquisitionDate: '2024-07-19',
    startupDate: '2024-07-23',
    calibrationStatus: 'Programado',
    category: 'Equipo de Medición',
    equipmentType: 'Dimensional',
    sourceType: 'Mecánico',
    brand: 'BOSCH',
    model: 'GLM 50-27C',
    equipmentRange: '-',
    lastCalibrationDate: '2024-07-23',
    nextCalibrationDate: '2025-07-23'
  },
  {
    id: 'RD-026',
    serialNumber: '1D2338000305',
    description: 'Analizador de gases de Combustión',
    responsible: 'I+D',
    acquisitionDate: '2025-04-24',
    startupDate: '2025-04-24',
    calibrationStatus: 'Operativo',
    category: 'Equipo de Medición',
    equipmentType: 'Gases / Combustión',
    sourceType: 'Aire / Gases',
    brand: 'SAUERMANN',
    model: 'KI-CA030',
    equipmentRange: '-',
    certificate: 'Gas2500362',
    lastCalibrationDate: '2025-04-24',
    nextCalibrationDate: '2026-04-24'
  },
  {
    id: 'RD-027',
    serialNumber: '320003',
    description: 'Torquímetro',
    responsible: 'I+D',
    calibrationStatus: 'Programado',
    category: 'Equipo de Medición',
    equipmentType: 'Torque',
    sourceType: 'Mecánico',
    brand: 'TOPTUL',
    model: 'DT-200N',
    equipmentRange: '20-200Nm',
    lastCalibrationDate: '2024-08-15',
    nextCalibrationDate: '2025-08-15'
  },
  {
    id: 'RD-028',
    serialNumber: '20119795',
    description: 'Termohigrómetro',
    responsible: 'I+D',
    acquisitionDate: '2024-10-30',
    startupDate: '2024-10-30',
    calibrationStatus: 'Programado',
    category: 'Equipo de Medición',
    equipmentType: 'Temperatura ambiental',
    sourceType: 'Calor',
    brand: 'DELTATRAK',
    model: '13309',
    equipmentRange: '-50°C - 70°C',
    lastCalibrationDate: '2024-10-30',
    nextCalibrationDate: '2025-10-30'
  },
  {
    id: 'RD-029',
    serialNumber: '1729485',
    description: 'Manómetro de gas',
    responsible: 'I+D',
    acquisitionDate: '2025-02-25',
    startupDate: '2025-02-25',
    calibrationStatus: 'Operativo',
    category: 'Equipo de Medición',
    equipmentType: 'Gases',
    sourceType: 'Aire/Gases',
    brand: 'CPS PRODUCTS INC',
    model: 'Pro Set 2',
    equipmentRange: '-',
    supplierOrEquipment: 'D DEL PERU S.A.C.',
    lastCalibrationDate: '2025-02-25',
    nextCalibrationDate: '2026-02-25'
  }
];

export const initialSamples: SampleRecord[] = [
  {
    id: 'S1',
    correlativeId: 'M-001',
    createdAt: '2024-01-05T08:00:00Z',
    version: 1,
    descripcionSAP: 'CALENTADOR DE AGUA 5.5L',
    marca: 'SOLE',
    proveedor: 'GUANGDONG VANWARD NEW ELECTRIC CO., LTD.',
    linea: 'AGUA CALIENTE',
    categoria: 'Calentador a Gas',
    technician: 'Jonathan Soriano',
    inspectionDate: '2024-01-05',
    inspectionCompletedDate: '2024-01-06T14:30:00Z',
    inspectionStatus: 'Aprobado',
    inspectionProgress: 'completed',
    reportDate: '2024-01-08T10:00:00Z',
    reportFile: { name: 'Reporte_S1_V1.pdf', url: 'https://images.unsplash.com/photo-1586717791821-3f44a563de4c?q=80&w=2070&auto=format&fit=crop', type: 'application/pdf' },
    inspectionTimer: {
      accumulatedTimeMs: 4 * 60 * 60 * 1000, // 4 hours admin
      idleTimeMs: 12 * 60 * 60 * 1000, // 12 hours inspection
      isPaused: true
    },
    history: [
      { date: '2024-01-05', status: 'Aprobado', user: 'Carlos H.', comment: 'Muestra cumple con estándares' }
    ],
    providerDocuments: []
  },
  {
    id: 'S2',
    correlativeId: 'M-002',
    createdAt: '2024-01-15T09:00:00Z',
    version: 1,
    descripcionSAP: 'COCINA DE INDUCCIÓN 1 HORNILLA',
    marca: 'S-Collection',
    proveedor: 'ZHONGSHAN V-GUARD ELECTRIC APPLIANCE CO., LTD.',
    linea: 'LÍNEA BLANCA',
    categoria: 'Encimera',
    technician: 'Fernando Lopez',
    inspectionDate: '2024-01-15',
    inspectionCompletedDate: '2024-01-16T16:00:00Z',
    inspectionStatus: 'Rechazado',
    inspectionProgress: 'completed',
    reportDate: '2024-01-20T09:00:00Z',
    reportFile: { name: 'Reporte_S2_V1.pdf', url: '#', type: 'application/pdf' },
    inspectionTimer: {
      accumulatedTimeMs: 3 * 60 * 60 * 1000,
      idleTimeMs: 8 * 60 * 60 * 1000,
      isPaused: true
    },
    history: [
      { date: '2024-01-15', status: 'Rechazado', user: 'Carlos H.', comment: 'Falla en panel táctil' }
    ],
    providerDocuments: []
  },
  {
    id: 'S3',
    correlativeId: 'M-003',
    createdAt: '2024-02-01T10:00:00Z',
    version: 1,
    descripcionSAP: 'DESHUMEDECEDOR 20L',
    marca: 'SOLE',
    proveedor: 'NINGBO ETDZ HUIXING TRADE CO., LTD.',
    linea: 'CLIMATIZACIÓN',
    categoria: 'Deshumedecedor',
    technician: 'Anthony Soto',
    inspectionDate: '2024-02-01',
    inspectionCompletedDate: '2024-02-02T11:00:00Z',
    inspectionStatus: 'Tolerado',
    inspectionProgress: 'completed',
    reportDate: '2024-02-03T15:00:00Z',
    reportFile: { name: 'Reporte_S3_V1.pdf', url: '#', type: 'application/pdf' },
    inspectionTimer: {
      accumulatedTimeMs: 5 * 60 * 60 * 1000,
      idleTimeMs: 15 * 60 * 60 * 1000,
      isPaused: true
    },
    history: [
      { date: '2024-02-01', status: 'Tolerado', user: 'Carlos H.', comment: 'Ruido ligeramente superior al esperado pero aceptable' }
    ],
    providerDocuments: []
  },
  {
    id: 'S4',
    correlativeId: 'M-004',
    createdAt: '2024-02-10T11:00:00Z',
    version: 1,
    descripcionSAP: 'CAMPANA EXTRACTORA 90CM',
    marca: 'SOLE',
    proveedor: 'GUANGDONG VANWARD NEW ELECTRIC CO., LTD.',
    linea: 'LÍNEA BLANCA',
    categoria: 'Campanas',
    technician: 'Jonathan Soriano',
    inspectionDate: '2024-02-10',
    inspectionCompletedDate: '2024-02-11T10:00:00Z',
    inspectionStatus: 'Aprobado',
    inspectionProgress: 'completed',
    reportDate: '2024-02-12T14:00:00Z',
    reportFile: { name: 'Reporte_S4_V1.pdf', url: '#', type: 'application/pdf' },
    inspectionTimer: {
      accumulatedTimeMs: 2 * 60 * 60 * 1000,
      idleTimeMs: 10 * 60 * 60 * 1000,
      isPaused: true
    },
    history: [{ date: '2024-02-10', status: 'Aprobado', user: 'Carlos H.' }],
    providerDocuments: []
  },
  {
    id: 'S5',
    correlativeId: 'M-005',
    createdAt: '2024-02-20T12:00:00Z',
    version: 1,
    descripcionSAP: 'TERMA ELÉCTRICA 50L',
    marca: 'SOLE',
    proveedor: 'MIDEA GROUP CO., LTD.',
    linea: 'AGUA CALIENTE',
    categoria: 'Termas Eléctricas',
    technician: 'Fernando Lopez',
    inspectionDate: '2024-02-20',
    inspectionCompletedDate: '2024-02-21T15:00:00Z',
    inspectionStatus: 'Aprobado',
    inspectionProgress: 'completed',
    reportDate: '2024-02-25T11:00:00Z',
    reportFile: { name: 'Reporte_S5_V1.pdf', url: '#', type: 'application/pdf' },
    inspectionTimer: {
      accumulatedTimeMs: 4 * 60 * 60 * 1000,
      idleTimeMs: 14 * 60 * 60 * 1000,
      isPaused: true
    },
    history: [{ date: '2024-02-20', status: 'Aprobado', user: 'Carlos H.' }],
    providerDocuments: []
  },
  {
    id: 'S6',
    correlativeId: 'M-006',
    createdAt: '2024-03-01T13:00:00Z',
    version: 1,
    descripcionSAP: 'ENCIMERA A GAS 4H',
    marca: 'S-Collection',
    proveedor: 'ZHONGSHAN V-GUARD ELECTRIC APPLIANCE CO., LTD.',
    linea: 'LÍNEA BLANCA',
    categoria: 'Encimera',
    technician: 'Anthony Soto',
    inspectionDate: '2024-03-01',
    inspectionCompletedDate: '2024-03-02T13:00:00Z',
    inspectionStatus: 'Rechazado',
    inspectionProgress: 'completed',
    reportDate: '2024-03-05T16:00:00Z',
    reportFile: { name: 'Reporte_S6_V1.pdf', url: '#', type: 'application/pdf' },
    inspectionTimer: {
      accumulatedTimeMs: 6 * 60 * 60 * 1000,
      idleTimeMs: 18 * 60 * 60 * 1000,
      isPaused: true
    },
    history: [{ date: '2024-03-01', status: 'Rechazado', user: 'Carlos H.' }],
    providerDocuments: []
  },
  {
    id: 'S7',
    correlativeId: 'M-007',
    createdAt: '2024-03-05T14:00:00Z',
    version: 1,
    descripcionSAP: 'PURIFICADOR DE AGUA UV',
    marca: 'SOLE',
    proveedor: 'WATER TECH SOLUTIONS',
    linea: 'PURIFICACIÓN',
    categoria: 'Purificación',
    technician: 'Jonathan Soriano',
    inspectionDate: '2024-03-05',
    inspectionCompletedDate: '2024-03-06T10:00:00Z',
    inspectionStatus: 'Aprobado',
    inspectionProgress: 'completed',
    reportDate: '2024-03-07T09:00:00Z',
    reportFile: { name: 'Reporte_S7_V1.pdf', url: '#', type: 'application/pdf' },
    inspectionTimer: {
      accumulatedTimeMs: 3 * 60 * 60 * 1000,
      idleTimeMs: 9 * 60 * 60 * 1000,
      isPaused: true
    },
    history: [{ date: '2024-03-05', status: 'Aprobado', user: 'Carlos H.' }],
    providerDocuments: []
  },
  {
    id: 'S8',
    correlativeId: 'M-008',
    createdAt: '2024-03-10T15:00:00Z',
    version: 1,
    descripcionSAP: 'MICROONDAS 20L',
    marca: 'SOLE',
    proveedor: 'AMERICAN',
    codProv: '2000001112',
    linea: 'LÍNEA BLANCA',
    categoria: 'Microondas',
    technician: 'Fernando Lopez',
    inspectionDate: '2024-03-10',
    inspectionCompletedDate: '2024-03-11T16:00:00Z',
    inspectionStatus: 'Aprobado',
    inspectionProgress: 'completed',
    reportDate: '2024-03-12T10:00:00Z',
    reportFile: { name: 'Reporte_S8_V1.pdf', url: '#', type: 'application/pdf' },
    inspectionTimer: { accumulatedTimeMs: 2 * 60 * 60 * 1000, idleTimeMs: 6 * 60 * 60 * 1000, isPaused: true },
    history: [{ date: '2024-03-10', status: 'Aprobado', user: 'Carlos H.' }],
    providerDocuments: []
  },
  {
    id: 'S9',
    correlativeId: 'M-009',
    createdAt: '2024-03-12T16:00:00Z',
    version: 1,
    descripcionSAP: 'LICUADORA PROFESIONAL',
    marca: 'S-Collection',
    proveedor: 'ARCELIK',
    codProv: '2000001270',
    linea: 'PEQUEÑOS ELECTRO',
    categoria: 'Licuadoras',
    technician: 'Anthony Soto',
    inspectionDate: '2024-03-12',
    inspectionCompletedDate: '2024-03-13T11:00:00Z',
    inspectionStatus: 'Tolerado',
    inspectionProgress: 'completed',
    reportDate: '2024-03-14T15:00:00Z',
    reportFile: { name: 'Reporte_S9_V1.pdf', url: '#', type: 'application/pdf' },
    inspectionTimer: { accumulatedTimeMs: 3 * 60 * 60 * 1000, idleTimeMs: 7 * 60 * 60 * 1000, isPaused: true },
    history: [{ date: '2024-03-12', status: 'Tolerado', user: 'Carlos H.' }],
    providerDocuments: []
  },
  {
    id: 'S10',
    correlativeId: 'M-010',
    createdAt: '2024-03-15T17:00:00Z',
    version: 1,
    descripcionSAP: 'VENTILADOR DE TORRE',
    marca: 'SOLE',
    proveedor: 'MIDEA',
    codProv: '3000001234',
    linea: 'CLIMATIZACIÓN',
    categoria: 'Ventilación',
    technician: 'Jonathan Soriano',
    inspectionDate: '2024-03-15',
    inspectionCompletedDate: '2024-03-16T10:00:00Z',
    inspectionStatus: 'Aprobado',
    inspectionProgress: 'completed',
    reportDate: '2024-03-17T09:00:00Z',
    reportFile: { name: 'Reporte_S10_V1.pdf', url: '#', type: 'application/pdf' },
    inspectionTimer: { accumulatedTimeMs: 2 * 60 * 60 * 1000, idleTimeMs: 5 * 60 * 60 * 1000, isPaused: true },
    history: [{ date: '2024-03-15', status: 'Aprobado', user: 'Carlos H.' }]
  }
];

export const initialData: ProductRecord[] = [
  {
    id: '1',
    createdAt: '2025-05-01T10:00:00Z',
    correlativeId: 'D-001',
    codigoEAN: '7756514019986',
    codigoSAP: '3120TURE83CO',
    descripcionSAP: 'CAMPANA EXTRACTORA TURE 83 CO',
    sampleId: 'S4',
    codProv: '2000005029',
    proveedor: 'VANWARD',
    correoProveedor: ['ventas@ningboetdz.com'],
    marca: 'SOLE',
    linea: 'LÍNEA BLANCA',
    artworks: [
      {
        version: 1,
        files: [{ name: '3120TURE83CO_Manual_Printing_V1.pdf', url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', type: 'application/pdf', originalName: 'artwork_v1.pdf' }],
        category: 'Manual',
        subcategory: 'Printing',
        uploadDate: '2026-01-15',
        uploadedBy: 'Diseñadora',
        idApproval: { status: 'approved', user: 'Carlos H.', date: '2026-01-16' },
        mktApproval: { status: 'approved', user: 'Monica M.', date: '2026-01-18' },
        planApproval: { status: 'approved', user: 'Sandra S.', date: '2026-01-20' },
        provApproval: { status: 'approved', user: 'Luis G.', date: '2026-01-22' },
      }
    ],
    artworkAssignment: {
      designer: 'Andrea Valdivia',
      assignmentDate: '2026-01-10',
      plannedStartDate: '2026-01-12',
      plannedEndDate: '2026-01-14',
      actualCompletionDate: '2026-01-15',
    }
  },
  {
    id: '2',
    createdAt: '2025-05-02T10:00:00Z',
    correlativeId: 'D-002',
    codigoEAN: '7756514019993',
    codigoSAP: '3120TURE81CO',
    descripcionSAP: 'CAMPANA EXTRACTORA TURE 81 CO',
    sampleId: 'S6',
    codProv: '3000001234',
    proveedor: 'MIDEA',
    correoProveedor: ['ventas@ningboetdz.com'],
    marca: 'S-Collection',
    linea: 'LÍNEA BLANCA',
    artworks: [
      {
        version: 2,
        files: [{ name: '3120TURE81CO_Cartonbox_Printing_V2.jpg', url: 'https://picsum.photos/seed/artwork2/800/1200', type: 'image/jpeg', originalName: 'artwork_v2.jpg' }],
        category: 'Carton box',
        subcategory: 'Printing',
        uploadDate: '2026-02-05',
        uploadedBy: 'Diseñadora',
        idApproval: { status: 'approved', user: 'Carlos H.', date: '2026-02-06' },
        mktApproval: { status: 'approved', user: 'Monica M.', date: '2026-02-07' },
        planApproval: { status: 'approved', user: 'Sandra S.', date: '2026-02-08' },
        provApproval: { status: 'approved', user: 'Luis G.', date: '2026-02-09' },
      }
    ],
    artworkAssignment: {
      designer: 'Claudia Mendez',
      assignmentDate: '2026-02-01',
      plannedStartDate: '2026-02-02',
      plannedEndDate: '2026-02-04',
      actualCompletionDate: '2026-02-05',
    },
    commercialStatus: 'A la venta',
    qualityInspectionDate: '2026-03-01'
  },
  {
    id: '3',
    createdAt: '2025-05-03T10:00:00Z',
    correlativeId: 'D-003',
    codigoEAN: '7756514020005',
    codigoSAP: '3120SOLCO040',
    descripcionSAP: 'TERMA A GAS SOLCO 040',
    codProv: '2000001112',
    proveedor: 'AMERICAN',
    correoProveedor: ['info@ningboetdz.com'],
    marca: 'SOLE',
    linea: 'AGUA CALIENTE',
    artworks: [
      {
        version: 1,
        files: [{ name: '3120SOLCO040_ProductLabel_Editable_V1.pdf', url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', type: 'application/pdf', originalName: 'artwork_v1.pdf' }],
        category: 'Product Label',
        subcategory: 'Editable',
        uploadDate: '2026-02-20',
        uploadedBy: 'Diseñadora',
        idApproval: { status: 'rejected', user: 'Carlos H.', date: '2026-02-21', comments: 'Error en logos' },
        mktApproval: { status: 'not_started' },
        planApproval: { status: 'not_started' },
        provApproval: { status: 'not_started' },
      }
    ],
    artworkAssignment: {
      designer: 'Renato Garcia',
      assignmentDate: '2026-02-15',
      plannedStartDate: '2026-02-16',
      plannedEndDate: '2026-02-19',
      actualCompletionDate: '2026-02-20',
    }
  },
  {
    id: '4',
    createdAt: '2025-05-04T10:00:00Z',
    correlativeId: 'D-004',
    codigoEAN: '7756514020012',
    codigoSAP: '3120SOLCO060',
    descripcionSAP: 'TERMA A GAS SOLCO 060',
    codProv: '2000005029',
    proveedor: 'NINGBO ETDZ HUIXING TRADE CO., LTD.',
    correoProveedor: ['info@ningboetdz.com'],
    marca: 'SOLE',
    linea: 'AGUA CALIENTE',
    artworks: [
      {
        version: 1,
        files: [{ name: '3120SOLCO060_Label_V1.ai', url: 'https://images.unsplash.com/photo-1544377193-33dcf4d68fb5?q=80&w=2070&auto=format&fit=crop', type: 'image/jpeg', originalName: 'label.jpg' }],
        category: 'Product Label',
        subcategory: 'Printing',
        uploadDate: '2026-01-20',
        uploadedBy: 'Diseñadora',
        idApproval: { status: 'approved', user: 'Carlos H.', date: '2026-01-21' },
        mktApproval: { status: 'approved', user: 'Monica M.', date: '2026-01-22' },
        planApproval: { status: 'rejected', user: 'Sandra S.', date: '2026-01-23', comments: 'Error en dimensiones' },
        provApproval: { status: 'not_started' },
      }
    ],
    artworkAssignment: {
      designer: 'Claudia Mendez',
      assignmentDate: '2026-01-10',
      plannedStartDate: '2026-01-12',
      plannedEndDate: '2026-01-18',
      actualCompletionDate: '2026-01-20'
    }
  },
  {
    id: '5',
    createdAt: '2025-05-05T10:00:00Z',
    correlativeId: 'D-005',
    codigoEAN: '7756514020029',
    codigoSAP: '3120SOLCO080',
    descripcionSAP: 'TERMA A GAS SOLCO 080',
    codProv: '2000005029',
    proveedor: 'NINGBO ETDZ HUIXING TRADE CO., LTD.',
    correoProveedor: ['info@ningboetdz.com'],
    marca: 'SOLE',
    linea: 'AGUA CALIENTE',
    artworks: [
      {
        version: 1,
        files: [{ name: '3120SOLCO080_Manual_V1.pdf', url: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=2070&auto=format&fit=crop', type: 'image/jpeg', originalName: 'manual_v1.jpg' }],
        category: 'Manual',
        subcategory: 'Printing',
        uploadDate: '2026-03-01',
        uploadedBy: 'Diseñadora',
        idApproval: { status: 'pending' },
        mktApproval: { status: 'pending' },
        planApproval: { status: 'pending' },
        provApproval: { status: 'pending' },
      },
      {
        version: 2,
        files: [{ name: '3120SOLCO080_Manual_V2.pdf', url: 'https://images.unsplash.com/photo-1544377193-33dcf4d68fb5?q=80&w=2070&auto=format&fit=crop', type: 'image/jpeg', originalName: 'manual_v2.jpg' }],
        category: 'Manual',
        subcategory: 'Printing',
        uploadDate: '2026-04-15',
        uploadedBy: 'Diseñadora',
        changeDescription: 'Corregido el manual según revisión V1',
        idApproval: { status: 'pending' },
        mktApproval: { status: 'pending' },
        planApproval: { status: 'pending' },
        provApproval: { status: 'pending' },
      }
    ],
  },
  {
    id: '6',
    createdAt: '2025-05-06T10:00:00Z',
    correlativeId: 'D-006',
    codigoEAN: '7756514020036',
    codigoSAP: '4120AC090000',
    descripcionSAP: 'AIRE ACONDICIONADO 9000 BTU',
    codProv: '3000001234',
    proveedor: 'MIDEA GROUP CO., LTD.',
    correoProveedor: ['service@midea.com'],
    marca: 'SOLE',
    linea: 'CLIMATIZACIÓN',
    artworks: [
      {
        version: 1,
        files: [{ name: 'AC_Manual_V1.pdf', url: 'https://images.unsplash.com/photo-1586717791821-3f44a563de4c?q=80&w=2070&auto=format&fit=crop', type: 'image/jpeg', originalName: 'manual.pdf' }],
        category: 'Manual',
        subcategory: 'Printing',
        uploadDate: '2026-01-15',
        uploadedBy: 'Diseñadora',
        idApproval: { status: 'approved', user: 'Carlos H.', date: '2026-01-16' },
        mktApproval: { status: 'approved', user: 'Monica M.', date: '2026-01-17' },
        planApproval: { status: 'approved', user: 'Sandra S.', date: '2026-01-18' },
        provApproval: { status: 'approved', user: 'Luis G.', date: '2026-01-19' },
      }
    ],
    artworkAssignment: {
      designer: 'Andrea Valdivia',
      assignmentDate: '2026-01-05',
      plannedStartDate: '2026-01-06',
      plannedEndDate: '2026-01-14',
      actualCompletionDate: '2026-01-15'
    }
  },
  {
    id: '7',
    createdAt: '2025-05-07T10:00:00Z',
    correlativeId: 'D-007',
    codigoEAN: '7756514020043',
    codigoSAP: '4120AC120000',
    descripcionSAP: 'AIRE ACONDICIONADO 12000 BTU',
    codProv: '3000001234',
    proveedor: 'MIDEA GROUP CO., LTD.',
    correoProveedor: ['service@midea.com'],
    marca: 'SOLE',
    linea: 'CLIMATIZACIÓN',
    artworks: [
      {
        version: 1,
        files: [{ name: '4120AC120000_MANUAL_PRINTING_V1.jpg', url: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=2070&auto=format&fit=crop', type: 'image/jpeg', originalName: 'manual_v1.jpg' }],
        category: 'Manual',
        subcategory: 'Printing',
        uploadDate: '2026-03-01',
        uploadedBy: 'Diseñadora',
        idApproval: { status: 'pending' },
        mktApproval: { status: 'pending' },
        planApproval: { status: 'pending' },
        provApproval: { status: 'pending' },
      }
    ],
  },
  {
    id: '8',
    createdAt: '2025-05-08T10:00:00Z',
    correlativeId: 'D-008',
    codigoEAN: '7756514020050',
    codigoSAP: '5120PUR00100',
    descripcionSAP: 'PURIFICADOR DE AGUA MODELO 1',
    codProv: '4000005678',
    proveedor: 'WATER TECH SOLUTIONS',
    correoProveedor: ['tech@watertech.com'],
    marca: 'S-Collection',
    linea: 'PURIFICACIÓN',
    artworks: [
      {
        version: 1,
        files: [{ name: '5120PUR00100_Box_V1.jpg', url: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=2070&auto=format&fit=crop', type: 'image/jpeg', originalName: 'box_design.jpg' }],
        category: 'Carton box',
        subcategory: 'Printing',
        uploadDate: '2026-02-05',
        uploadedBy: 'Diseñadora',
        idApproval: { status: 'approved', user: 'Carlos H.', date: '2026-02-06' },
        mktApproval: { status: 'approved', user: 'Monica M.', date: '2026-02-07' },
        planApproval: { status: 'approved', user: 'Sandra S.', date: '2026-02-08' },
        provApproval: { status: 'approved', user: 'Luis G.', date: '2026-02-09' },
      }
    ],
    artworkAssignment: {
      designer: 'Renato Garcia',
      assignmentDate: '2026-01-25',
      plannedStartDate: '2026-01-26',
      plannedEndDate: '2026-02-03',
      actualCompletionDate: '2026-02-05'
    },
    commercialStatus: 'A la venta'
  },
  {
    id: '9',
    createdAt: '2025-05-09T10:00:00Z',
    correlativeId: 'D-009',
    codigoEAN: '7756514020067',
    codigoSAP: '3120COOK0010',
    descripcionSAP: 'COCINA EMPOTRABLE 4 HORNILLAS',
    codProv: '2000005029',
    proveedor: 'NINGBO ETDZ HUIXING TRADE CO., LTD.',
    correoProveedor: ['ventas@ningboetdz.com'],
    marca: 'SOLE',
    linea: 'LÍNEA BLANCA',
    artworks: [
      {
        version: 1,
        files: [{ name: '3120COOK0010_Manual_V1.pdf', url: 'https://images.unsplash.com/photo-1586717791821-3f44a563de4c?q=80&w=2070&auto=format&fit=crop', type: 'image/jpeg', originalName: 'manual_v1.jpg' }],
        category: 'Manual',
        subcategory: 'Printing',
        uploadDate: '2026-03-05',
        uploadedBy: 'Diseñadora',
        idApproval: { status: 'rejected', user: 'Carlos H.', date: '2026-03-06', comments: 'Faltan logos de seguridad' },
        mktApproval: { status: 'pending' },
        planApproval: { status: 'pending' },
        provApproval: { status: 'pending' },
      },
      {
        version: 2,
        files: [{ name: '3120COOK0010_Manual_V2.pdf', url: 'https://images.unsplash.com/photo-1606857521015-7f9fdf423740?q=80&w=2070&auto=format&fit=crop', type: 'image/jpeg', originalName: 'manual_v2.jpg' }],
        category: 'Manual',
        subcategory: 'Printing',
        uploadDate: '2026-03-20',
        uploadedBy: 'Diseñadora',
        idApproval: { status: 'pending' },
        mktApproval: { status: 'pending' },
        planApproval: { status: 'pending' },
        provApproval: { status: 'pending' },
      }
    ],
    artworkAssignment: {
      designer: 'Andrea Valdivia',
      assignmentDate: '2026-02-25',
      plannedStartDate: '2026-02-26',
      plannedEndDate: '2026-03-04',
      actualCompletionDate: '2026-03-05'
    }
  },
  {
    id: '10',
    createdAt: '2025-05-10T10:00:00Z',
    correlativeId: 'D-010',
    codigoEAN: '7756514020074',
    codigoSAP: '3120COOK0020',
    descripcionSAP: 'COCINA EMPOTRABLE 5 HORNILLAS',
    codProv: '2000005029',
    proveedor: 'NINGBO ETDZ HUIXING TRADE CO., LTD.',
    correoProveedor: ['ventas@ningboetdz.com'],
    marca: 'SOLE',
    linea: 'LÍNEA BLANCA',
    artworks: [
      {
        version: 1,
        files: [{ name: '3120COOK0020_Manual_V1.pdf', url: 'https://images.unsplash.com/photo-1544377193-33dcf4d68fb5?q=80&w=2070&auto=format&fit=crop', type: 'image/jpeg', originalName: 'manual_v1.jpg' }],
        category: 'Manual',
        subcategory: 'Printing',
        uploadDate: '2026-03-05',
        uploadedBy: 'Diseñadora',
        idApproval: { status: 'approved', user: 'Carlos H.', date: '2026-03-06' },
        mktApproval: { status: 'approved', user: 'Monica M.', date: '2026-03-08' },
        planApproval: { status: 'approved', user: 'Sandra S.', date: '2026-03-10' },
        provApproval: { status: 'approved', user: 'Luis G.', date: '2026-03-12' },
      },
      {
        version: 2,
        files: [{ name: '3120COOK0020_Manual_V2.pdf', url: 'https://images.unsplash.com/photo-1586717791821-3f44a563de4c?q=80&w=2070&auto=format&fit=crop', type: 'image/jpeg', originalName: 'manual_v2.jpg' }],
        category: 'Manual',
        subcategory: 'Printing',
        uploadDate: '2026-03-15',
        uploadedBy: 'Diseñadora',
        idApproval: { status: 'rejected', user: 'Carlos H.', date: '2026-03-16', comments: 'Revisar medidas de base' },
        mktApproval: { status: 'pending' },
        planApproval: { status: 'pending' },
        provApproval: { status: 'pending' },
      },
      {
        version: 3,
        files: [{ name: '3120COOK0020_Manual_V3.pdf', url: 'https://images.unsplash.com/photo-1606857521015-7f9fdf423740?q=80&w=2070&auto=format&fit=crop', type: 'image/jpeg', originalName: 'manual_v3.jpg' }],
        category: 'Manual',
        subcategory: 'Printing',
        uploadDate: '2026-03-25',
        uploadedBy: 'Diseñadora',
        idApproval: { status: 'pending' },
        mktApproval: { status: 'pending' },
        planApproval: { status: 'pending' },
        provApproval: { status: 'pending' },
      },
      {
        version: 4,
        files: [{ name: '3120COOK0020_Manual_V4.pdf', url: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=2070&auto=format&fit=crop', type: 'image/jpeg', originalName: 'manual_v4.jpg' }],
        category: 'Manual',
        subcategory: 'Printing',
        uploadDate: '2026-04-05',
        uploadedBy: 'Diseñadora',
        idApproval: { status: 'pending' },
        mktApproval: { status: 'pending' },
        planApproval: { status: 'pending' },
        provApproval: { status: 'pending' },
      }
    ],
    artworkAssignment: {
      designer: 'Andrea Valdivia',
      assignmentDate: '2026-03-10',
      plannedStartDate: '2026-03-12',
      plannedEndDate: '2026-03-25'
    }
  }
];

export const currentUser: User = {
  name: 'CARLOS ANDRÉS HOYOS FIORENTINI',
  email: 'carlos.hoyosf@pucp.pe',
  role: 'Coordinador de I+D'
};

export const allUsers: User[] = [
  { name: 'Carlos H.', email: 'carlos.h@example.com', role: 'Coordinador de I+D' },
  { name: 'Cristhian S.', email: 'cristhian.s@example.com', role: 'Gerente de Innovación y Calidad' },
  { name: 'Monica M.', email: 'monica.m@example.com', role: 'Jefe de Marketing 1' },
  { name: 'Sandra S.', email: 'sandra.s@example.com', role: 'Jefe de Planeamiento' },
  { name: 'Ana P.', email: 'ana.p@example.com', role: 'Gerente de Marketing' },
  { name: 'Luis G.', email: 'luis.g@example.com', role: 'Proveedor' },
  { name: 'Diseñadora Gráfica', email: 'designer@example.com', role: 'Diseñadora Gráfica' },
  { name: 'Técnico de I+D', email: 'tecnico@example.com', role: 'Técnico de I+D' },
];

export const initialApprovers: { [key: string]: string } = {
  'I+D': 'Carlos H.',
  'MKT': 'Monica M.',
  'PLAN': 'Sandra S.',
  'PROV': 'Luis G.'
};

export const initialSuppliers: Supplier[] = [
  {
    id: '1',
    legalName: 'AMERICAN WATER HEATER COMPANY',
    commercialAlias: 'AMERICAN',
    erpCode: '2000001112',
    country: 'CHINA',
    logoUrl: 'https://www.americanwaterheater.com/favicon.ico',
    evaluation: {
      innovation: 4,
      responseTime: 3,
      quality: 5,
      failureIndex: 2,
      price: 4,
      lastUpdated: '2024-03-20T10:00:00Z'
    }
  },
  {
    id: '2',
    legalName: 'ARCELIK A.S',
    commercialAlias: 'ARCELIK',
    erpCode: '2000001270',
    country: 'TURQUIA',
    logoUrl: 'https://www.arcelikglobal.com/media/4421/arcelik_logo.png',
    evaluation: {
      innovation: 5,
      responseTime: 5,
      quality: 4,
      failureIndex: 1,
      price: 3,
      lastUpdated: '2024-03-21T09:00:00Z'
    }
  },
  {
    id: '3',
    legalName: 'ARCELORMITTAL INTERNATIONAL',
    commercialAlias: 'ARCELOR',
    erpCode: '2000000362',
    country: 'CHINA',
    logoUrl: 'https://logo.clearbit.com/arcelormittal.com',
    evaluation: {
      innovation: 3,
      responseTime: 4,
      quality: 4,
      failureIndex: 3,
      price: 5,
      lastUpdated: '2024-03-15T14:30:00Z'
    }
  },
  {
    id: '4',
    legalName: 'ARDA (ZHEJIANG) ELECTRIC CO., LTD.',
    commercialAlias: 'ARDA',
    erpCode: '2000000417',
    country: 'CHINA',
    logoUrl: 'https://www.arda.cn/favicon.ico',
    evaluation: {
      innovation: 4,
      responseTime: 2,
      quality: 3,
      failureIndex: 4,
      price: 4,
      lastUpdated: '2024-03-10T11:20:00Z'
    }
  },
  {
    id: '5',
    legalName: 'ASTELAV S.R.L.',
    commercialAlias: 'ASTELAV',
    erpCode: '2000001107',
    country: 'ITALIA',
    logoUrl: 'https://www.astelav.com/favicon.ico',
    evaluation: {
      innovation: 2,
      responseTime: 3,
      quality: 5,
      failureIndex: 1,
      price: 2,
      lastUpdated: '2024-03-25T16:45:00Z'
    }
  },
  {
    id: '6',
    legalName: 'MIDEA GROUP CO., LTD.',
    commercialAlias: 'MIDEA',
    erpCode: '3000001234',
    country: 'CHINA',
    logoUrl: 'https://www.midea.com/favicon.ico',
    evaluation: {
      innovation: 5,
      responseTime: 4,
      quality: 5,
      failureIndex: 1,
      price: 4,
      lastUpdated: '2024-03-28T08:15:00Z'
    }
  },
  {
    id: '7',
    legalName: 'NINGBO ETDZ HUIXING TRADE CO., LTD.',
    commercialAlias: 'VANWARD',
    erpCode: '2000005029',
    country: 'CHINA',
    logoUrl: 'https://www.vanward.com/favicon.ico',
    evaluation: {
      innovation: 4,
      responseTime: 5,
      quality: 4,
      failureIndex: 2,
      price: 5,
      lastUpdated: '2024-03-29T13:00:00Z'
    }
  }
];

export const initialCalendarTasks: CalendarTask[] = [
  {
    id: 'TASK-001',
    title: 'Entrega de Artefactos Cocina',
    description: 'Entrega de muestras de cocina para revisión de I+D',
    deadline: '2026-03-31T10:00:00',
    type: 'work',
    requester: 'Carlos Hoyos',
    status: 'in_progress',
    deliveryStatus: 'on_time',
    createdAt: '2026-03-25T08:00:00',
    changeLog: [
      {
        id: 'LOG-001',
        timestamp: '2026-03-25T08:00:00',
        user: 'Carlos Hoyos',
        action: 'Creación',
        details: 'Se creó la tarea inicial'
      }
    ]
  },
  {
    id: 'TASK-002',
    title: 'Revisión de Manuales',
    description: 'Revisión final de manuales de usuario para la línea de purificación',
    deadline: '2026-04-05T15:00:00',
    type: 'work',
    requester: 'Ana García',
    status: 'pending',
    deliveryStatus: 'pending',
    createdAt: '2026-03-28T10:00:00',
    changeLog: []
  },
  {
    id: 'TASK-003',
    title: 'Viernes Santo',
    startDate: '2026-04-03',
    endDate: '2026-04-03',
    type: 'holiday',
    createdAt: '2026-03-31T14:00:00',
    changeLog: []
  },
  {
    id: 'TASK-004',
    title: 'Vacaciones: Juan Pérez',
    description: 'Periodo de vacaciones anuales.',
    startDate: '2026-04-10',
    endDate: '2026-04-15',
    type: 'vacation',
    assignee: 'Juan Pérez',
    createdAt: '2026-03-25T08:00:00',
    changeLog: []
  },
  {
    id: 'TASK-005',
    title: 'Visita a Campo: Proyecto Solar Arequipa',
    description: 'Inspección técnica de paneles solares.',
    startDate: '2026-04-12',
    endDate: '2026-04-13',
    type: 'field_visit',
    assignee: 'Ing. María García',
    createdAt: '2026-03-26T09:00:00',
    changeLog: []
  },
  {
    id: 'TASK-006',
    title: 'Viaje de Trabajo: Lima - Cusco',
    description: 'Reunión con proveedores regionales.',
    startDate: '2026-04-18',
    endDate: '2026-04-20',
    type: 'business_trip',
    assignee: 'Roberto Sánchez',
    createdAt: '2026-03-27T10:00:00',
    changeLog: []
  }
];

export const initialRDProjectTemplates: RDProjectTemplate[] = [
  {
    id: 'water-quality',
    name: 'Ensayo de Calidad de Agua',
    description: 'Plantilla para el registro de parámetros físico-químicos y microbiológicos del agua.',
    icon: 'Droplets',
    sections: [
      {
        id: 'general',
        title: 'Información General',
        fields: [
          { id: 'sample_point', label: 'Punto de Muestreo', type: 'text', required: true },
          { id: 'source', label: 'Fuente de Agua', type: 'select', options: ['Red Pública', 'Pozo', 'Cisterna', 'Otro'], required: true },
          { id: 'temp', label: 'Temperatura (°C)', type: 'number' }
        ]
      },
      {
        id: 'parameters',
        title: 'Parámetros Físico-Químicos',
        fields: [
          { id: 'ph', label: 'pH', type: 'number' },
          { id: 'turbidity', label: 'Turbidez (NTU)', type: 'number' },
          { id: 'chlorine', label: 'Cloro Libre (mg/L)', type: 'number' },
          { id: 'hardness', label: 'Dureza Total (mg/L)', type: 'number' }
        ]
      }
    ]
  },
  {
    id: 'dimensioning',
    name: 'Proyecto de Dimensionamiento',
    description: 'Cálculo y diseño de sistemas de agua caliente o climatización.',
    icon: 'Ruler',
    sections: [
      {
        id: 'client_info',
        title: 'Datos del Cliente / Proyecto',
        fields: [
          { id: 'client_name', label: 'Nombre del Cliente', type: 'text', required: true },
          { id: 'location', label: 'Ubicación', type: 'text' },
          { id: 'project_type', label: 'Tipo de Edificación', type: 'select', options: ['Residencial', 'Comercial', 'Industrial', 'Hotelero'] }
        ]
      },
      {
        id: 'technical_req',
        title: 'Requerimientos Técnicos',
        fields: [
          { id: 'total_flow', label: 'Caudal Total Requerido (L/min)', type: 'number' },
          { id: 'storage_cap', label: 'Capacidad de Almacenamiento (L)', type: 'number' },
          { id: 'energy_source', label: 'Fuente de Energía', type: 'select', options: ['Gas Natural', 'GLP', 'Electricidad', 'Solar'] }
        ]
      }
    ]
  },
  {
    id: 'generic',
    name: 'Proyecto General I+D',
    description: 'Plantilla flexible para proyectos de investigación y desarrollo general.',
    icon: 'Briefcase',
    sections: [
      {
        id: 'basic',
        title: 'Información Básica',
        fields: [
          { id: 'objective', label: 'Objetivo del Proyecto', type: 'textarea', required: true },
          { id: 'scope', label: 'Alcance', type: 'textarea' },
          { id: 'budget', label: 'Presupuesto Estimado', type: 'number' }
        ]
      }
    ]
  }
];
