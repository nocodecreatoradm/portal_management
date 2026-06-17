import React, { useState, useEffect, useMemo } from 'react';
import { 
  Truck, 
  Plus, 
  Search, 
  FileText, 
  FileSpreadsheet, 
  Users, 
  Download, 
  RefreshCw, 
  ExternalLink, 
  Calendar, 
  MapPin, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Trash2, 
  Edit, 
  ChevronDown, 
  ChevronUp, 
  Upload, 
  X, 
  Mail, 
  FileCode,
  Package,
  Layers,
  ArrowRight
} from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { SupabaseService } from '../lib/SupabaseService';
import { Supplier } from '../types';

interface SampleItem {
  id: string;
  commercialDescription: string;
  fullDescription: string;
  code: string; // SAP Code, filled by Planning
  alto: string;
  ancho: string;
  profundidad: string;
  peso: string;
  unidadMedida: string;
  presentacion: string;
  costoUnitario: number;
  sujetoALote: 'SI' | 'NO';
  codigoAReemplazar: string;
  codigoModelo: string;
  modoCompra: string;
  finalidad: string;
  canalDistrib: string;
  almacen: string;
  fichaTecnicaEn: 'SI' | 'NO';
  status: 'pendiente_codigo' | 'solicitado' | 'codigo_creado';
}

interface AttachedDoc {
  name: string;
  url: string;
  type: string;
}

interface ImportShipment {
  id: string;
  supplierId: string;
  supplierName: string;
  supplierLine: string;
  responsible: string;
  delegate: string;
  trackingNumber: string;
  carrier: 'DHL' | 'FedEx';
  createdAt: string;
  quoteName: string;
  quoteUrl: string;
  documents: AttachedDoc[];
  trackingStatus: string;
  estimatedDelivery: string;
  origin: string;
  destination: string;
  progress: number;
  trackingHistory: { date: string; status: string; location: string }[];
  samples: SampleItem[];
}

const DEFAULT_IMPORT_SHIPMENTS: ImportShipment[] = [
  {
    id: 'SMP-001',
    supplierId: '',
    supplierName: 'NINGBO TEXTILE CO.',
    supplierLine: 'DISEÑO INFANTIL',
    responsible: 'Carlos Hoyos',
    delegate: 'Ana Valdivia',
    trackingNumber: '1747552811',
    carrier: 'DHL',
    createdAt: '2026-06-12T10:00:00Z',
    quoteName: 'COTIZACION_NINGBO_2026.pdf',
    quoteUrl: '#',
    documents: [
      { name: 'Factura Comercial', url: '#', type: 'application/pdf' },
      { name: 'Certificado Oekotex', url: '#', type: 'application/pdf' }
    ],
    trackingStatus: 'Envío ha salido de una estación de DHL Hong Kong',
    estimatedDelivery: '2026-06-21',
    origin: 'HONG KONG',
    destination: 'LIMA',
    progress: 40,
    trackingHistory: [
      { date: '2026-06-12 08:00', status: 'Envío recolectado', location: 'Hong Kong' },
      { date: '2026-06-14 14:30', status: 'Procesado en la estación de origen', location: 'Hong Kong' },
      { date: '2026-06-15 02:15', status: 'Envío ha salido de una estación de DHL', location: 'Hong Kong' }
    ],
    samples: [
      {
        id: 'smp-item-1',
        commercialDescription: 'Muestra Tela Poliéster Dryfit Roja',
        fullDescription: 'Tela poliéster 100% dryfit color rojo para colección verano 2026',
        code: '3120MUES001',
        alto: '30 cm',
        ancho: '20 cm',
        profundidad: '15.7 cm',
        peso: '3 kg',
        unidadMedida: 'UN',
        presentacion: 'Rollo muestra',
        costoUnitario: 12.50,
        sujetoALote: 'NO',
        codigoAReemplazar: '-',
        codigoModelo: 'REU-16E32G-CLE',
        modoCompra: 'IMPORTADO',
        finalidad: 'MUESTRAS',
        canalDistrib: 'MKT',
        almacen: '138',
        fichaTecnicaEn: 'SI',
        status: 'codigo_creado'
      },
      {
        id: 'smp-item-2',
        commercialDescription: 'Muestra Tela Poliéster Dryfit Azul',
        fullDescription: 'Tela poliéster 100% dryfit color azul para colección verano 2026',
        code: '',
        alto: '30 cm',
        ancho: '20 cm',
        profundidad: '15.7 cm',
        peso: '3 kg',
        unidadMedida: 'UN',
        presentacion: 'Rollo muestra',
        costoUnitario: 12.50,
        sujetoALote: 'NO',
        codigoAReemplazar: '-',
        codigoModelo: 'REU-16E32G-CLE',
        modoCompra: 'IMPORTADO',
        finalidad: 'MUESTRAS',
        canalDistrib: 'MKT',
        almacen: '138',
        fichaTecnicaEn: 'SI',
        status: 'pendiente_codigo'
      }
    ]
  },
  {
    id: 'SMP-002',
    supplierId: '',
    supplierName: 'GUANGZHOU ACCESSORIES LTD.',
    supplierLine: 'PRODUCCIÓN MASCULINA',
    responsible: 'Juan Pérez',
    delegate: 'Marta Solano',
    trackingNumber: '870762694200',
    carrier: 'FedEx',
    createdAt: '2026-06-05T10:00:00Z',
    quoteName: 'COT_BUTTONS_GZ.pdf',
    quoteUrl: '#',
    documents: [
      { name: 'Factura Comercial', url: '#', type: 'application/pdf' }
    ],
    trackingStatus: 'Entregado',
    estimatedDelivery: '2026-06-14',
    origin: 'NAGOYA',
    destination: 'CALLAO',
    progress: 100,
    trackingHistory: [
      { date: '2026-06-05 10:00', status: 'Etiqueta creada', location: 'Nagoya, Japón' },
      { date: '2026-06-07 16:00', status: 'Recogido por FedEx', location: 'Nagoya, Japón' },
      { date: '2026-06-09 08:30', status: 'En tránsito', location: 'Memphis, TN' },
      { date: '2026-06-12 11:45', status: 'En aduana de destino', location: 'Callao, Perú' },
      { date: '2026-06-14 15:20', status: 'Entregado / Firma: E.STAMP', location: 'Callao, Perú' }
    ],
    samples: [
      {
        id: 'smp-item-3',
        commercialDescription: 'Botones metálicos dorados 20mm',
        fullDescription: 'Botones metálicos dorados grabados 20mm para producción masculina',
        code: '3130MUES002',
        alto: '10 cm',
        ancho: '10 cm',
        profundidad: '5 cm',
        peso: '0.5 kg',
        unidadMedida: 'UN',
        presentacion: 'Bolsa 100 unidades',
        costoUnitario: 0.15,
        sujetoALote: 'NO',
        codigoAReemplazar: '-',
        codigoModelo: 'BTN-GOLD-20',
        modoCompra: 'IMPORTADO',
        finalidad: 'MUESTRAS',
        canalDistrib: 'MKT',
        almacen: '138',
        fichaTecnicaEn: 'SI',
        status: 'codigo_creado'
      }
    ]
  }
];

export default function ImportTrackingModule() {
  const [shipments, setShipments] = useState<ImportShipment[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<ImportShipment | null>(null);
  
  // Planning request Modal
  const [isPlanningModalOpen, setIsPlanningModalOpen] = useState(false);
  const [selectedSampleItem, setSelectedSampleItem] = useState<{ shipmentId: string; item: SampleItem } | null>(null);
  const [planningForm, setPlanningForm] = useState<SampleItem | null>(null);
  const [emailPreview, setEmailPreview] = useState<{ to: string[]; subject: string; body: string } | null>(null);
  
  // Set SAP Code Modal
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [customSapCode, setCustomSapCode] = useState('');

  // Expandable cards
  const [expandedShipments, setExpandedShipments] = useState<Record<string, boolean>>({});

  // Loading suppliers and shipments
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const sups = await SupabaseService.getSuppliers();
        setSuppliers(sups);
        
        // Try getting from DB or fallback to local
        const stored = localStorage.getItem('import_tracking_shipments');
        if (stored) {
          setShipments(JSON.parse(stored));
        } else {
          setShipments(DEFAULT_IMPORT_SHIPMENTS);
          localStorage.setItem('import_tracking_shipments', JSON.stringify(DEFAULT_IMPORT_SHIPMENTS));
        }
      } catch (err) {
        console.error('Error loading import tracking data:', err);
        setShipments(DEFAULT_IMPORT_SHIPMENTS);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const saveShipments = (updated: ImportShipment[]) => {
    setShipments(updated);
    localStorage.setItem('import_tracking_shipments', JSON.stringify(updated));
  };

  // Toggle card expansion
  const toggleExpand = (id: string) => {
    setExpandedShipments(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Simulated Carrier API check
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  
  const handleRefreshTracking = (shipmentId: string) => {
    setRefreshingId(shipmentId);
    toast.loading('Sincronizando con servidores de la transportadora...');
    
    setTimeout(() => {
      const updated = shipments.map(s => {
        if (s.id === shipmentId) {
          if (s.progress >= 100) {
            toast.dismiss();
            toast.success('El envío ya fue entregado con éxito.');
            return s;
          }

          // Generate simulated status updates
          const nextProgress = Math.min(s.progress + 15, 100);
          const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
          
          let newStatus = '';
          let newLocation = s.destination;

          if (nextProgress >= 100) {
            newStatus = 'Entregado / Firma de conformidad';
            newLocation = s.destination;
          } else if (nextProgress >= 80) {
            newStatus = 'En tránsito local para distribución';
            newLocation = s.destination;
          } else if (nextProgress >= 60) {
            newStatus = 'Procesado en centro de distribución local';
            newLocation = 'LIMA, PERÚ';
          } else {
            newStatus = 'Envío en tránsito internacional';
            newLocation = 'MIAMI, FL';
          }

          const updatedHistory = [
            { date: nowStr, status: newStatus, location: newLocation },
            ...s.trackingHistory
          ];

          toast.dismiss();
          toast.success(`Tracking actualizado: ${newStatus}`);

          return {
            ...s,
            progress: nextProgress,
            trackingStatus: newStatus,
            trackingHistory: updatedHistory
          };
        }
        return s;
      });
      
      saveShipments(updated);
      setRefreshingId(null);
    }, 1500);
  };

  // Filtered shipments
  const filteredShipments = useMemo(() => {
    if (!searchTerm.trim()) return shipments;
    const term = searchTerm.toLowerCase();
    return shipments.filter(s => 
      s.id.toLowerCase().includes(term) ||
      s.supplierName.toLowerCase().includes(term) ||
      s.supplierLine.toLowerCase().includes(term) ||
      s.trackingNumber.toLowerCase().includes(term) ||
      s.responsible.toLowerCase().includes(term) ||
      s.samples.some(item => 
        item.commercialDescription.toLowerCase().includes(term) ||
        item.fullDescription.toLowerCase().includes(term) ||
        item.code.toLowerCase().includes(term) ||
        item.codigoModelo.toLowerCase().includes(term)
      )
    );
  }, [shipments, searchTerm]);

  // Statistics
  const stats = useMemo(() => {
    const total = shipments.length;
    const inTransit = shipments.filter(s => s.progress < 100).length;
    const delivered = shipments.filter(s => s.progress >= 100).length;
    const pendingCodes = shipments.reduce((acc, s) => 
      acc + s.samples.filter(item => item.status !== 'codigo_creado').length, 0
    );
    return { total, inTransit, delivered, pendingCodes };
  }, [shipments]);

  // Form for new Shipment (Solicitud)
  const [newShipment, setNewShipment] = useState<{
    supplierId: string;
    supplierName: string;
    supplierLine: string;
    responsible: string;
    delegate: string;
    trackingNumber: string;
    carrier: 'DHL' | 'FedEx';
    quoteName: string;
    quoteUrl: string;
    documents: AttachedDoc[];
    origin: string;
    destination: string;
    samples: Omit<SampleItem, 'id' | 'status'>[];
  }>({
    supplierId: '',
    supplierName: '',
    supplierLine: '',
    responsible: '',
    delegate: '',
    trackingNumber: '',
    carrier: 'DHL',
    quoteName: '',
    quoteUrl: '',
    documents: [],
    origin: 'HONG KONG',
    destination: 'LIMA',
    samples: []
  });

  // Adding sample row to new request
  const [newSampleRow, setNewSampleRow] = useState<Omit<SampleItem, 'id' | 'status' | 'code'>>({
    commercialDescription: '',
    fullDescription: '',
    alto: '30 cm',
    ancho: '20 cm',
    profundidad: '15 cm',
    peso: '1 kg',
    unidadMedida: 'UN',
    presentacion: 'Muestra',
    costoUnitario: 0,
    sujetoALote: 'NO',
    codigoAReemplazar: '-',
    codigoModelo: '-',
    modoCompra: 'IMPORTADO',
    finalidad: 'MUESTRAS',
    canalDistrib: 'MKT',
    almacen: '138',
    fichaTecnicaEn: 'SI'
  });

  const handleAddSampleRow = () => {
    if (!newSampleRow.commercialDescription || !newSampleRow.fullDescription) {
      toast.error('Por favor complete la descripción de la muestra.');
      return;
    }
    setNewShipment(prev => ({
      ...prev,
      samples: [...prev.samples, { ...newSampleRow, code: '' }]
    }));
    setNewSampleRow({
      commercialDescription: '',
      fullDescription: '',
      alto: '30 cm',
      ancho: '20 cm',
      profundidad: '15 cm',
      peso: '1 kg',
      unidadMedida: 'UN',
      presentacion: 'Muestra',
      costoUnitario: 0,
      sujetoALote: 'NO',
      codigoAReemplazar: '-',
      codigoModelo: '-',
      modoCompra: 'IMPORTADO',
      finalidad: 'MUESTRAS',
      canalDistrib: 'MKT',
      almacen: '138',
      fichaTecnicaEn: 'SI'
    });
    toast.success('Muestra agregada a la lista');
  };

  const handleRemoveNewSample = (idx: number) => {
    setNewShipment(prev => ({
      ...prev,
      samples: prev.samples.filter((_, i) => i !== idx)
    }));
  };

  // Adding attachment to new request
  const [docType, setDocType] = useState('FACTURA COMERCIAL');
  const [docName, setDocName] = useState('');
  
  const handleAddDoc = () => {
    if (!docName.trim()) {
      toast.error('Ingrese el nombre o referencia del documento');
      return;
    }
    const doc: AttachedDoc = {
      name: `${docType}: ${docName}`,
      url: '#',
      type: 'application/pdf'
    };
    setNewShipment(prev => ({
      ...prev,
      documents: [...prev.documents, doc]
    }));
    setDocName('');
    toast.success('Documento adjuntado');
  };

  const handleCreateShipment = () => {
    if (!newShipment.supplierName || !newShipment.responsible || !newShipment.trackingNumber) {
      toast.error('Por favor complete los campos obligatorios (Proveedor, Responsable, Tracking Number).');
      return;
    }
    if (newShipment.samples.length === 0) {
      toast.error('Debe ingresar al menos una muestra en el listado.');
      return;
    }

    const nextId = `SMP-${String(shipments.length + 1).padStart(3, '0')}`;
    const created: ImportShipment = {
      id: nextId,
      supplierId: newShipment.supplierId,
      supplierName: newShipment.supplierName,
      supplierLine: newShipment.supplierLine || 'MUESTRAS GENERAL',
      responsible: newShipment.responsible,
      delegate: newShipment.delegate || 'No asignado',
      trackingNumber: newShipment.trackingNumber,
      carrier: newShipment.carrier,
      createdAt: new Date().toISOString(),
      quoteName: newShipment.quoteName || 'COTIZACION_ADJUNTA.pdf',
      quoteUrl: '#',
      documents: newShipment.documents,
      trackingStatus: 'Información de envío recibida por la transportadora',
      estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
      origin: newShipment.origin,
      destination: newShipment.destination,
      progress: 10,
      trackingHistory: [
        { date: new Date().toISOString().replace('T', ' ').substring(0, 16), status: 'Información de envío registrada', location: newShipment.origin }
      ],
      samples: newShipment.samples.map((s, index) => ({
        ...s,
        id: `smp-item-${Date.now()}-${index}`,
        status: 'pendiente_codigo'
      }))
    };

    saveShipments([created, ...shipments]);
    setIsNewModalOpen(false);
    // Reset form
    setNewShipment({
      supplierId: '',
      supplierName: '',
      supplierLine: '',
      responsible: '',
      delegate: '',
      trackingNumber: '',
      carrier: 'DHL',
      quoteName: '',
      quoteUrl: '',
      documents: [],
      origin: 'HONG KONG',
      destination: 'LIMA',
      samples: []
    });
    toast.success('Solicitud de importación registrada exitosamente.');
  };

  // Request code email notification
  const handleOpenPlanningRequest = (shipmentId: string, item: SampleItem) => {
    setSelectedSampleItem({ shipmentId, item });
    setPlanningForm({ ...item });
    
    // Auto-generate dynamic email details
    const to = ['planeamientomt@sole.com.pe', 'importaciones@sole.com.pe', 'admin@sole.com.pe'];
    const subject = `[Solicitud de Código de Muestra] - ${item.commercialDescription}`;
    const body = `Estimado equipo de Planeamiento,

Se solicita la creación del código de material SAP para la siguiente muestra importada:

--------------------------------------------------------------------------------
DETALLES DEL MATERIAL DE MUESTRA
--------------------------------------------------------------------------------
* Descripción Comercial: ${item.commercialDescription}
* Descripción Completa: ${item.fullDescription}
* Dimensiones: ${item.alto} (alto) x ${item.ancho} (ancho) x ${item.profundidad} (profundidad)
* Peso: ${item.peso}
* Unidad de Medida: ${item.unidadMedida}
* Presentación: ${item.presentacion}
* Costo Unitario: USD ${item.costoUnitario.toFixed(2)}
* Sujeto a Lote: ${item.sujetoALote}
* Código Modelo: ${item.codigoModelo}
* Modo de Compra: ${item.modoCompra}
* Finalidad: ${item.finalidad}
* Almacén Destino: ${item.almacen}
--------------------------------------------------------------------------------

Agradecemos su pronta atención para la generación de este código a la brevedad.

Atentamente,
Equipo de Importaciones & Desarrollo`;

    setEmailPreview({ to, subject, body });
    setIsPlanningModalOpen(true);
  };

  const handleSendPlanningEmail = () => {
    if (!selectedSampleItem || !planningForm) return;

    // Simulate sending email
    toast.loading('Enviando correo formal a Planeamiento...');
    setTimeout(() => {
      const updated = shipments.map(s => {
        if (s.id === selectedSampleItem.shipmentId) {
          const updatedItems = s.samples.map(item => {
            if (item.id === selectedSampleItem.item.id) {
              return { ...item, ...planningForm, status: 'solicitado' as const };
            }
            return item;
          });
          return { ...s, samples: updatedItems };
        }
        return s;
      });

      saveShipments(updated);
      toast.dismiss();
      toast.success('Correo enviado exitosamente a planeamientomt@sole.com.pe');
      setIsPlanningModalOpen(false);
      setSelectedSampleItem(null);
    }, 1200);
  };

  // Simulating Admin/Planning inserting the code
  const handleOpenAssignCode = (shipmentId: string, item: SampleItem) => {
    setSelectedSampleItem({ shipmentId, item });
    setCustomSapCode('');
    setIsCodeModalOpen(true);
  };

  const handleSaveSapCode = () => {
    if (!customSapCode.trim()) {
      toast.error('Debe ingresar un código SAP válido.');
      return;
    }
    if (!selectedSampleItem) return;

    const updated = shipments.map(s => {
      if (s.id === selectedSampleItem.shipmentId) {
        const updatedItems = s.samples.map(item => {
          if (item.id === selectedSampleItem.item.id) {
            return { 
              ...item, 
              code: customSapCode.trim().toUpperCase(), 
              status: 'codigo_creado' as const 
            };
          }
          return item;
        });
        return { ...s, samples: updatedItems };
      }
      return s;
    });

    saveShipments(updated);
    toast.success('Código SAP registrado y guardado.');
    setIsCodeModalOpen(false);
    setSelectedSampleItem(null);
  };

  // Find Supplier Logo Helper
  const getSupplierLogo = (supplierName: string) => {
    const s = suppliers.find(sup => 
      sup.commercialAlias?.toLowerCase() === supplierName.toLowerCase() ||
      sup.legalName?.toLowerCase() === supplierName.toLowerCase()
    );
    return s?.logoUrl || null;
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Seguimiento de Importación de Muestras</h2>
          <p className="text-slate-500 font-medium mt-1">
            Gestión de muestras de proveedores, códigos de material SAP y rastreo en vivo DHL & FedEx
          </p>
        </div>
        <div>
          <button 
            onClick={() => setIsNewModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-200 active:scale-95"
          >
            <Plus size={18} />
            Registrar Muestra
          </button>
        </div>
      </div>

      {/* Stats Summary Widgets */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="bg-blue-50 text-blue-600 p-3 rounded-xl">
            <Truck size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cargos Totales</p>
            <h3 className="text-2xl font-black text-slate-900 mt-0.5">{stats.total}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="bg-yellow-50 text-yellow-600 p-3 rounded-xl relative">
            <Clock size={24} />
            {stats.inTransit > 0 && (
              <span className="absolute top-2 right-2 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
              </span>
            )}
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">En Tránsito</p>
            <h3 className="text-2xl font-black text-slate-900 mt-0.5">{stats.inTransit}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="bg-green-50 text-green-600 p-3 rounded-xl">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Entregados</p>
            <h3 className="text-2xl font-black text-slate-900 mt-0.5">{stats.delivered}</h3>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="bg-orange-50 text-orange-600 p-3 rounded-xl">
            <FileCode size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Códigos Pendientes</p>
            <h3 className="text-2xl font-black text-slate-900 mt-0.5">{stats.pendingCodes}</h3>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por código de muestra, proveedor, descripción, tracking number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Main List of Shipments */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200">
            <RefreshCw className="animate-spin text-blue-600 mb-4" size={36} />
            <p className="text-slate-500 font-bold">Cargando módulo de importación...</p>
          </div>
        ) : filteredShipments.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 bg-white rounded-2xl border border-slate-200 text-slate-400">
            <Package size={48} className="opacity-20 mb-3" />
            <h4 className="text-lg font-bold">No se encontraron envíos</h4>
            <p className="text-sm font-medium mt-1">Crea una nueva solicitud de muestras de importación arriba.</p>
          </div>
        ) : (
          filteredShipments.map(s => {
            const supplierLogo = getSupplierLogo(s.supplierName);
            const isExpanded = !!expandedShipments[s.id];
            const isDelivered = s.progress >= 100;

            return (
              <div 
                key={s.id} 
                className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all overflow-hidden"
              >
                {/* Card Header */}
                <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100">
                  <div className="flex items-center gap-4">
                    {/* Supplier Logo or Initial Badge */}
                    {supplierLogo ? (
                      <img 
                        src={supplierLogo} 
                        alt={s.supplierName} 
                        className="w-12 h-12 rounded-xl object-contain border border-slate-200 p-1 bg-slate-50"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-sm shadow-inner uppercase">
                        {s.supplierName.substring(0, 2)}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black px-2 py-0.5 rounded bg-slate-100 text-slate-500 uppercase tracking-widest">
                          {s.id}
                        </span>
                        <h4 className="text-lg font-black text-slate-900 tracking-tight">{s.supplierName}</h4>
                      </div>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">{s.supplierLine}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    {/* Carrier Badge */}
                    <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-tight shadow-sm border ${
                      s.carrier === 'DHL' 
                        ? 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20' 
                        : 'bg-purple-600/10 text-purple-700 border-purple-600/20'
                    }`}>
                      <Truck size={12} />
                      {s.carrier}
                    </span>

                    {/* Delivery Status Tag */}
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      isDelivered 
                        ? 'bg-green-100 text-green-700 border border-green-200' 
                        : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                    }`}>
                      {isDelivered ? 'Entregado' : 'En Tránsito'}
                    </span>

                    <button 
                      onClick={() => toggleExpand(s.id)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all"
                    >
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  </div>
                </div>

                {/* Card Body (Condensed Overview) */}
                <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Left Section: Info and Documents */}
                  <div className="lg:col-span-5 space-y-6">
                    <div className="flex items-start gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <Package className="text-slate-400 mt-0.5 flex-shrink-0" size={18} />
                      <div>
                        <h5 className="text-xs font-black text-slate-400 uppercase tracking-widest">Resumen del Cargamento</h5>
                        <p className="text-sm text-slate-700 font-bold leading-snug mt-1">
                          {s.samples.length} muestras de {s.supplierName}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Registrado el {new Date(s.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Responsable</span>
                        <p className="text-xs font-bold text-slate-700 mt-0.5">{s.responsible}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Delegado</span>
                        <p className="text-xs font-bold text-slate-700 mt-0.5">{s.delegate}</p>
                      </div>
                    </div>

                    {/* Attached Documents */}
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                        Documentación Adjunta
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {s.quoteName && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold border border-blue-100">
                            <FileText size={12} />
                            Cotización
                          </span>
                        )}
                        {s.documents.map((doc, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 text-slate-600 rounded-lg text-xs font-bold border border-slate-200">
                            <FileText size={12} />
                            {doc.name.split(':')[0]}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Section: Live Tracking Box */}
                  <div className="lg:col-span-7 flex flex-col justify-between bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-inner">
                    <div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black bg-red-600 text-white px-2 py-0.5 rounded uppercase tracking-widest flex items-center gap-1 animate-pulse">
                          ● Status en Vivo
                        </span>
                        <span className="text-xs text-slate-400 font-bold">
                          Entrega aprox: <span className="text-white font-black">{new Date(s.estimatedDelivery).toLocaleDateString()}</span>
                        </span>
                      </div>

                      <h5 className="text-sm md:text-base font-bold text-slate-100 mt-3 leading-snug">
                        {s.trackingStatus}
                      </h5>

                      {/* Progress Line */}
                      <div className="mt-4 space-y-1">
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-550 ${isDelivered ? 'bg-green-500' : 'bg-red-500'}`}
                            style={{ width: `${s.progress}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[9px] font-black uppercase text-slate-400 tracking-wider">
                          <span>Origen: {s.origin}</span>
                          <span>Destino: {s.destination}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-800/80 pt-4 mt-4 gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                            {s.carrier} Tracking ID
                          </p>
                          <p className="text-xs font-bold font-mono tracking-wider text-slate-300">
                            {s.trackingNumber}
                          </p>
                        </div>
                        <button 
                          onClick={() => handleRefreshTracking(s.id)}
                          disabled={refreshingId === s.id}
                          className={`p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all ${refreshingId === s.id ? 'animate-spin' : ''}`}
                          title="Actualizar rastreo en vivo"
                        >
                          <RefreshCw size={14} />
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => {
                            setSelectedShipment(s);
                            setIsHistoryModalOpen(true);
                          }}
                          className="px-3 py-1.5 text-[10px] font-black uppercase text-slate-350 hover:text-white bg-slate-800 rounded-lg hover:bg-slate-700 transition-all"
                        >
                          Ver Historial
                        </button>
                        <a 
                          href={s.carrier === 'DHL' 
                            ? `https://www.dhl.com/pe-es/home/rastreo.html?tracking-id=${s.trackingNumber}` 
                            : `https://www.fedex.com/apps/fedextrack/?tracknumbers=${s.trackingNumber}`
                          }
                          target="_blank" 
                          rel="noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase text-blue-400 hover:text-blue-300 bg-blue-500/10 rounded-lg border border-blue-500/20 hover:bg-blue-500/20 transition-all"
                        >
                          <span>Original</span>
                          <ExternalLink size={10} />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Details: Samples Grid & Code Creator Form */}
                {isExpanded && (
                  <div className="bg-slate-50 border-t border-slate-100 p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h5 className="text-sm font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                        <Layers size={16} />
                        Detalle de Muestras a Recibir
                      </h5>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-wider border-b border-slate-200">
                            <th className="px-4 py-3">Muestra / Descripción</th>
                            <th className="px-4 py-3">Dimensiones / Peso</th>
                            <th className="px-4 py-3">Modelo / Costo</th>
                            <th className="px-4 py-3 text-center">Código SAP de Muestra</th>
                            <th className="px-4 py-3 text-right">Acción</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                          {s.samples.map(item => (
                            <tr key={item.id} className="hover:bg-slate-50/50">
                              <td className="px-4 py-3.5">
                                <p className="font-bold text-slate-900">{item.commercialDescription}</p>
                                <p className="text-[10px] text-slate-400 font-medium mt-0.5">{item.fullDescription}</p>
                              </td>
                              <td className="px-4 py-3.5 space-y-0.5">
                                <p><span className="text-slate-450">Alto/Ancho:</span> {item.alto} x {item.ancho}</p>
                                <p><span className="text-slate-450">Prof/Peso:</span> {item.profundidad} / {item.peso}</p>
                              </td>
                              <td className="px-4 py-3.5 space-y-0.5">
                                <p><span className="text-slate-450">Modelo:</span> {item.codigoModelo}</p>
                                <p><span className="text-slate-450">Costo:</span> USD {item.costoUnitario.toFixed(2)}</p>
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                {item.code ? (
                                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-lg font-mono font-bold border border-green-200">
                                    {item.code}
                                  </span>
                                ) : item.status === 'solicitado' ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-yellow-50 text-yellow-700 rounded-lg text-[10px] font-bold border border-yellow-200">
                                    <Clock size={12} />
                                    Solicitado a Planeamiento
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-orange-50 text-orange-700 rounded-lg text-[10px] font-bold border border-orange-200">
                                    <AlertTriangle size={12} />
                                    Código Requerido
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3.5 text-right">
                                {item.code ? (
                                  <span className="text-green-500 font-bold text-[10px] uppercase tracking-wider flex items-center justify-end gap-1">
                                    <CheckCircle2 size={12} /> Listo
                                  </span>
                                ) : (
                                  <div className="flex justify-end gap-1.5">
                                    <button
                                      onClick={() => handleOpenPlanningRequest(s.id, item)}
                                      className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-black uppercase tracking-tight transition-all active:scale-95 shadow-sm"
                                    >
                                      <Mail size={10} />
                                      Solicitar
                                    </button>
                                    <button
                                      onClick={() => handleOpenAssignCode(s.id, item)}
                                      className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase tracking-tight transition-all active:scale-95 shadow-sm border border-slate-700"
                                      title="Simular respuesta de planeamiento asignando código directamente"
                                    >
                                      <FileCode size={10} />
                                      Asignar
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* MODAL: REGISTRAR MUESTRA (Nueva Solicitud) */}
      {isNewModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-55 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-8 shadow-2xl relative border border-slate-100 max-h-[90vh] overflow-y-auto space-y-6">
            <button 
              onClick={() => setIsNewModalOpen(false)}
              className="absolute right-6 top-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
            >
              <X size={20} />
            </button>

            <div className="text-center">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
                <Truck size={24} />
              </div>
              <h3 className="text-xl font-black text-slate-950 tracking-tight">Nueva Solicitud de Importación</h3>
              <p className="text-slate-500 text-xs mt-1">Registra un envío de muestras desde el proveedor con sus datos de aduana y tracking</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
              {/* Left Column: Info General */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-3 bg-blue-600 rounded-full"></span>
                    Información General
                  </h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Proveedor *</label>
                      <select 
                        value={newShipment.supplierId} 
                        onChange={(e) => {
                          const id = e.target.value;
                          const s = suppliers.find(x => x.id === id);
                          setNewShipment(prev => ({ 
                            ...prev, 
                            supplierId: id,
                            supplierName: s ? (s.commercialAlias || s.legalName) : ''
                          }));
                        }}
                        className="w-full mt-1.5 px-3.5 py-2.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      >
                        <option value="">Seleccione un proveedor...</option>
                        {suppliers.map(s => (
                          <option key={s.id} value={s.id}>{s.commercialAlias || s.legalName}</option>
                        ))}
                      </select>
                      {/* Fallback text input in case provider is not in master data */}
                      {!newShipment.supplierId && (
                        <input
                          type="text"
                          placeholder="O escriba el nombre del proveedor..."
                          value={newShipment.supplierName}
                          onChange={(e) => setNewShipment(prev => ({ ...prev, supplierName: e.target.value }))}
                          className="w-full mt-2 px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                      )}
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Línea o Categoría Proveedor (ej: DISEÑO INFANTIL)</label>
                      <input 
                        type="text"
                        placeholder="Ej: DISEÑO INFANTIL, METALMECÁNICA"
                        value={newShipment.supplierLine}
                        onChange={(e) => setNewShipment(prev => ({ ...prev, supplierLine: e.target.value }))}
                        className="w-full mt-1.5 px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Responsable Titular *</label>
                        <input 
                          type="text"
                          placeholder="Nombre completo"
                          value={newShipment.responsible}
                          onChange={(e) => setNewShipment(prev => ({ ...prev, responsible: e.target.value }))}
                          className="w-full mt-1.5 px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Delegado de Recepción</label>
                        <input 
                          type="text"
                          placeholder="Nombre del delegado"
                          value={newShipment.delegate}
                          onChange={(e) => setNewShipment(prev => ({ ...prev, delegate: e.target.value }))}
                          className="w-full mt-1.5 px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-3 bg-red-600 rounded-full"></span>
                    Información de Tracking Courier
                  </h4>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Transportadora</label>
                        <select
                          value={newShipment.carrier}
                          onChange={(e) => setNewShipment(prev => ({ ...prev, carrier: e.target.value as 'DHL' | 'FedEx' }))}
                          className="w-full mt-1.5 px-3.5 py-2.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                        >
                          <option value="DHL">DHL Express</option>
                          <option value="FedEx">FedEx Courier</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tracking Number *</label>
                        <input
                          type="text"
                          placeholder="Código de rastreo"
                          value={newShipment.trackingNumber}
                          onChange={(e) => setNewShipment(prev => ({ ...prev, trackingNumber: e.target.value }))}
                          className="w-full mt-1.5 px-3.5 py-2.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">País / Origen</label>
                        <input
                          type="text"
                          placeholder="Ej: NAGOYA, HONG KONG"
                          value={newShipment.origin}
                          onChange={(e) => setNewShipment(prev => ({ ...prev, origin: e.target.value.toUpperCase() }))}
                          className="w-full mt-1.5 px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Destino / Oficina</label>
                        <input
                          type="text"
                          placeholder="Ej: LIMA, CALLAO"
                          value={newShipment.destination}
                          onChange={(e) => setNewShipment(prev => ({ ...prev, destination: e.target.value.toUpperCase() }))}
                          className="w-full mt-1.5 px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Gestión Documental */}
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <span className="w-1.5 h-3 bg-purple-600 rounded-full"></span>
                      Gestión Documental
                    </h4>
                    <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-black">
                      {newShipment.documents.length} ADJUNTOS
                    </span>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tipo Documento</label>
                        <select 
                          value={docType} 
                          onChange={(e) => setDocType(e.target.value)}
                          className="w-full mt-1 px-3 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none"
                        >
                          <option value="FACTURA COMERCIAL">🧾 FACTURA COMERCIAL</option>
                          <option value="COTIZACIÓN">📄 COTIZACIÓN</option>
                          <option value="CERTIFICADO OEKOTEX">📜 CERTIFICADO OEKOTEX</option>
                          <option value="OTROS DOCUMENTOS">📂 OTROS DOCUMENTOS</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nombre / Ref</label>
                        <div className="flex gap-2 mt-1">
                          <input 
                            type="text" 
                            placeholder="Ej: INV-2026-001"
                            value={docName}
                            onChange={(e) => setDocName(e.target.value)}
                            className="flex-1 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none"
                          />
                          <button
                            onClick={handleAddDoc}
                            className="bg-blue-600 text-white px-3 rounded-xl text-xs font-black uppercase tracking-tight hover:bg-blue-700 transition-all active:scale-95"
                          >
                            Adjuntar
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* List of attachments */}
                    <div className="space-y-1.5">
                      {newShipment.documents.length === 0 ? (
                        <div className="text-center py-6 text-slate-400 text-xs">
                          <Upload className="mx-auto opacity-25 mb-1.5" size={24} />
                          <p className="font-semibold">Sin documentos adjuntos todavía</p>
                        </div>
                      ) : (
                        newShipment.documents.map((doc, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-200/50">
                            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                              <FileText size={12} className="text-slate-400" />
                              {doc.name}
                            </span>
                            <button
                              onClick={() => {
                                setNewShipment(prev => ({
                                  ...prev,
                                  documents: prev.documents.filter((_, i) => i !== idx)
                                }));
                              }}
                              className="text-slate-350 hover:text-red-500 p-1"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Fila por Fila Muestras Editor */}
            <div className="border-t border-slate-100 pt-6 space-y-4">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-3 bg-green-500 rounded-full"></span>
                Ingresar Muestras Incluidas (Fila por Fila)
              </h4>

              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="lg:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Descripción Comercial *</label>
                    <input
                      type="text"
                      placeholder="Ej: Muestra Tela Dryfit Roja"
                      value={newSampleRow.commercialDescription}
                      onChange={(e) => setNewSampleRow(prev => ({ ...prev, commercialDescription: e.target.value }))}
                      className="w-full mt-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none"
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Descripción Completa / Técnica *</label>
                    <input
                      type="text"
                      placeholder="Ej: Rollo de tela poliéster 100%..."
                      value={newSampleRow.fullDescription}
                      onChange={(e) => setNewSampleRow(prev => ({ ...prev, fullDescription: e.target.value }))}
                      className="w-full mt-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alto</label>
                    <input
                      type="text"
                      value={newSampleRow.alto}
                      onChange={(e) => setNewSampleRow(prev => ({ ...prev, alto: e.target.value }))}
                      className="w-full mt-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ancho</label>
                    <input
                      type="text"
                      value={newSampleRow.ancho}
                      onChange={(e) => setNewSampleRow(prev => ({ ...prev, ancho: e.target.value }))}
                      className="w-full mt-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Profundidad</label>
                    <input
                      type="text"
                      value={newSampleRow.profundidad}
                      onChange={(e) => setNewSampleRow(prev => ({ ...prev, profundidad: e.target.value }))}
                      className="w-full mt-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Peso</label>
                    <input
                      type="text"
                      value={newSampleRow.peso}
                      onChange={(e) => setNewSampleRow(prev => ({ ...prev, peso: e.target.value }))}
                      className="w-full mt-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Modelo de Fábrica</label>
                    <input
                      type="text"
                      value={newSampleRow.codigoModelo}
                      onChange={(e) => setNewSampleRow(prev => ({ ...prev, codigoModelo: e.target.value }))}
                      className="w-full mt-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Costo Unit. (USD)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newSampleRow.costoUnitario}
                      onChange={(e) => setNewSampleRow(prev => ({ ...prev, costoUnitario: parseFloat(e.target.value) || 0 }))}
                      className="w-full mt-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleAddSampleRow}
                    className="flex items-center gap-1.5 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tight hover:bg-slate-800 transition-all shadow active:scale-95"
                  >
                    <Plus size={14} />
                    Agregar Muestra a la Lista
                  </button>
                </div>

                {/* Grid of added samples */}
                <div className="space-y-2">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    Muestras Registradas ({newShipment.samples.length})
                  </span>
                  {newShipment.samples.length === 0 ? (
                    <div className="text-center py-4 bg-white rounded-xl border border-slate-200/50 text-slate-400 text-xs font-semibold">
                      Ninguna muestra registrada aún. Añade al menos una arriba.
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-xl border border-slate-200/60 bg-white text-xs divide-y divide-slate-100">
                      {newShipment.samples.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3 hover:bg-slate-50/50">
                          <div>
                            <p className="font-bold text-slate-800">{item.commercialDescription}</p>
                            <p className="text-[10px] text-slate-450">{item.fullDescription} — {item.alto}x{item.ancho}x{item.profundidad} ({item.peso})</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-bold text-slate-500">
                              USD {item.costoUnitario.toFixed(2)}
                            </span>
                            <button
                              onClick={() => handleRemoveNewSample(idx)}
                              className="text-slate-350 hover:text-red-500 p-1"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 border-t border-slate-100 pt-6">
              <button 
                onClick={() => setIsNewModalOpen(false)}
                className="px-5 py-3 text-xs font-black uppercase tracking-tight text-slate-500 hover:bg-slate-50 rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleCreateShipment}
                className="px-6 py-3 text-xs font-black uppercase tracking-tight bg-slate-900 text-white hover:bg-slate-800 rounded-xl shadow-lg hover:shadow-xl active:scale-95 transition-all"
              >
                Confirmar Registro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SOLICITUD DE CÓDIGO (Excel Planning Form) */}
      {isPlanningModalOpen && selectedSampleItem && planningForm && emailPreview && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-55 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-8 shadow-2xl relative border border-slate-100 max-h-[90vh] overflow-y-auto space-y-6">
            <button 
              onClick={() => {
                setIsPlanningModalOpen(false);
                setSelectedSampleItem(null);
              }}
              className="absolute right-6 top-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
            >
              <X size={20} />
            </button>

            <div className="text-center">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
                <FileSpreadsheet size={24} />
              </div>
              <h3 className="text-xl font-black text-slate-950 tracking-tight">Formulario de Creación de Código de Muestra</h3>
              <p className="text-slate-500 text-xs mt-1">
                Complete los datos técnicos requeridos por el equipo de Planeamiento para generar el código SAP de la muestra.
              </p>
            </div>

            {/* Excel Row Form (Styled beautifully) */}
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/80 space-y-6">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-3 mb-2">
                <FileSpreadsheet className="text-green-600" size={18} />
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">
                  Plantilla de Carga de Planeamiento
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Descripción Comercial</label>
                  <input
                    type="text"
                    value={planningForm.commercialDescription}
                    onChange={(e) => setPlanningForm({ ...planningForm, commercialDescription: e.target.value })}
                    className="w-full mt-1 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Descripción Completa / Técnica</label>
                  <input
                    type="text"
                    value={planningForm.fullDescription}
                    onChange={(e) => setPlanningForm({ ...planningForm, fullDescription: e.target.value })}
                    className="w-full mt-1 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Código Modelo (Ej: BTN-20)</label>
                  <input
                    type="text"
                    value={planningForm.codigoModelo}
                    onChange={(e) => setPlanningForm({ ...planningForm, codigoModelo: e.target.value })}
                    className="w-full mt-1 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Alto (cm)</label>
                  <input
                    type="text"
                    value={planningForm.alto}
                    onChange={(e) => setPlanningForm({ ...planningForm, alto: e.target.value })}
                    className="w-full mt-1 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ancho (cm)</label>
                  <input
                    type="text"
                    value={planningForm.ancho}
                    onChange={(e) => setPlanningForm({ ...planningForm, ancho: e.target.value })}
                    className="w-full mt-1 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Profundidad (cm)</label>
                  <input
                    type="text"
                    value={planningForm.profundidad}
                    onChange={(e) => setPlanningForm({ ...planningForm, profundidad: e.target.value })}
                    className="w-full mt-1 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Peso (kg)</label>
                  <input
                    type="text"
                    value={planningForm.peso}
                    onChange={(e) => setPlanningForm({ ...planningForm, peso: e.target.value })}
                    className="w-full mt-1 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Unid. Medida</label>
                  <input
                    type="text"
                    value={planningForm.unidadMedida}
                    onChange={(e) => setPlanningForm({ ...planningForm, unidadMedida: e.target.value })}
                    className="w-full mt-1 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Presentación</label>
                  <input
                    type="text"
                    value={planningForm.presentacion}
                    onChange={(e) => setPlanningForm({ ...planningForm, presentacion: e.target.value })}
                    className="w-full mt-1 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Costo Unit. (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={planningForm.costoUnitario}
                    onChange={(e) => setPlanningForm({ ...planningForm, costoUnitario: parseFloat(e.target.value) || 0 })}
                    className="w-full mt-1 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sujeto a Lote</label>
                  <select
                    value={planningForm.sujetoALote}
                    onChange={(e) => setPlanningForm({ ...planningForm, sujetoALote: e.target.value as 'SI' | 'NO' })}
                    className="w-full mt-1 px-3 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none"
                  >
                    <option value="SI">SÍ</option>
                    <option value="NO">NO</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Almacén Destino</label>
                  <input
                    type="text"
                    value={planningForm.almacen}
                    onChange={(e) => setPlanningForm({ ...planningForm, almacen: e.target.value })}
                    className="w-full mt-1 px-3 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ficha Técnica En</label>
                  <select
                    value={planningForm.fichaTecnicaEn}
                    onChange={(e) => setPlanningForm({ ...planningForm, fichaTecnicaEn: e.target.value as 'SI' | 'NO' })}
                    className="w-full mt-1 px-3 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none"
                  >
                    <option value="SI">SÍ</option>
                    <option value="NO">NO</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Modo de Compra</label>
                  <input
                    type="text"
                    value={planningForm.modoCompra}
                    readOnly
                    className="w-full mt-1 px-3 py-2 text-xs font-bold text-slate-500 bg-slate-100 border border-slate-200 rounded-lg outline-none cursor-default"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Finalidad</label>
                  <input
                    type="text"
                    value={planningForm.finalidad}
                    readOnly
                    className="w-full mt-1 px-3 py-2 text-xs font-bold text-slate-500 bg-slate-100 border border-slate-200 rounded-lg outline-none cursor-default"
                  />
                </div>
              </div>
            </div>

            {/* Email notification preview */}
            <div className="space-y-2">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Mail size={14} className="text-blue-500" />
                Vista Previa de Correo a Enviar
              </h4>
              <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 text-slate-350 space-y-3 font-mono text-[10px] md:text-xs">
                <p><span className="text-slate-500">Para:</span> {emailPreview.to.join(', ')}</p>
                <p><span className="text-slate-500">Asunto:</span> {emailPreview.subject}</p>
                <div className="border-t border-slate-800 pt-3 text-slate-200 whitespace-pre-wrap leading-relaxed">
                  {emailPreview.body}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-3 border-t border-slate-100 pt-6">
              <button 
                onClick={() => {
                  setIsPlanningModalOpen(false);
                  setSelectedSampleItem(null);
                }}
                className="px-5 py-3 text-xs font-black uppercase tracking-tight text-slate-500 hover:bg-slate-50 rounded-xl transition-all"
              >
                Cerrar
              </button>
              <button 
                onClick={handleSendPlanningEmail}
                className="px-6 py-3 text-xs font-black uppercase tracking-tight bg-blue-650 text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg hover:shadow-xl active:scale-95 transition-all"
              >
                Enviar Solicitud
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ASIGNAR CÓDIGO SAP (Simulando Planeamiento) */}
      {isCodeModalOpen && selectedSampleItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-55">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl relative border border-slate-100 space-y-6">
            <button 
              onClick={() => {
                setIsCodeModalOpen(false);
                setSelectedSampleItem(null);
              }}
              className="absolute right-6 top-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
            >
              <X size={20} />
            </button>

            <div className="text-center">
              <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
                <FileCode size={24} />
              </div>
              <h3 className="text-xl font-black text-slate-950 tracking-tight">Asignación de Código SAP</h3>
              <p className="text-slate-500 text-xs mt-1">
                Ingrese el código de material SAP creado por Planeamiento para esta muestra.
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60">
                <p className="text-xs text-slate-550 font-semibold uppercase tracking-wider">Muestra seleccionada:</p>
                <p className="text-sm font-bold text-slate-800 mt-0.5">{selectedSampleItem.item.commercialDescription}</p>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">{selectedSampleItem.item.fullDescription}</p>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nuevo Código SAP *</label>
                <input
                  type="text"
                  placeholder="Ej: 3120MUES085"
                  value={customSapCode}
                  onChange={(e) => setCustomSapCode(e.target.value)}
                  className="w-full mt-1.5 px-3.5 py-2.5 text-sm font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 pt-6">
              <button 
                onClick={() => {
                  setIsCodeModalOpen(false);
                  setSelectedSampleItem(null);
                }}
                className="px-4 py-2 text-xs font-black uppercase tracking-tight text-slate-500 hover:bg-slate-50 rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveSapCode}
                className="px-4 py-2 text-xs font-black uppercase tracking-tight bg-slate-900 text-white hover:bg-slate-800 rounded-xl transition-all shadow-md active:scale-95"
              >
                Guardar Código
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: TRACKING LOG DETAIL (Historial de Envíos) */}
      {isHistoryModalOpen && selectedShipment && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-55">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl relative border border-slate-100 max-h-[85vh] overflow-y-auto space-y-6">
            <button 
              onClick={() => {
                setIsHistoryModalOpen(false);
                setSelectedShipment(null);
              }}
              className="absolute right-6 top-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
            >
              <X size={20} />
            </button>

            <div className="text-center">
              <div className="w-12 h-12 bg-slate-50 text-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
                <Truck size={24} />
              </div>
              <h3 className="text-xl font-black text-slate-950 tracking-tight">Historial de Envío</h3>
              <p className="text-slate-500 text-xs mt-1">
                Trazabilidad detallada registrada por la transportadora ({selectedShipment.carrier})
              </p>
            </div>

            <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 font-mono text-xs">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
                <span className="text-slate-400">Cargo: <span className="text-white font-black">{selectedShipment.id}</span></span>
                <span className="text-slate-400">Rastreo: <span className="text-white font-black">{selectedShipment.trackingNumber}</span></span>
              </div>

              {/* Vertical Timeline logs */}
              <div className="relative border-l border-slate-800 ml-3 pl-6 space-y-6">
                {selectedShipment.trackingHistory.map((log, index) => (
                  <div key={index} className="relative">
                    {/* Circle marker */}
                    <span className={`absolute -left-[30px] top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-slate-950 border ${
                      index === 0 ? 'border-red-500 bg-red-500' : 'border-slate-800 bg-slate-900'
                    }`} />
                    
                    <div>
                      <p className={`font-bold ${index === 0 ? 'text-white' : 'text-slate-300'}`}>{log.status}</p>
                      <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                        <MapPin size={10} />
                        {log.location} — {log.date}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end border-t border-slate-100 pt-6">
              <button 
                onClick={() => {
                  setIsHistoryModalOpen(false);
                  setSelectedShipment(null);
                }}
                className="px-5 py-2.5 text-xs font-black uppercase tracking-tight bg-slate-900 text-white hover:bg-slate-800 rounded-xl transition-all shadow-md active:scale-95"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
