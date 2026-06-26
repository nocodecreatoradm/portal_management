
import { toast } from 'sonner';
import { ProductRecord, DocumentVersion, AssignmentInfo, InfoRequest, CalendarTask, QualityClaim } from '../types';
import { SupabaseService } from '../lib/SupabaseService';
import { supabase } from '../lib/supabase';

/**
 * Service to send emails using Microsoft Graph API through our backend.
 */
export const outlookService = {
  /**
   * Helper to wrap content in a professional HTML template.
   */
  wrapInTemplate: (title: string, content: string, actionUrl?: string) => {
    return `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
        <div style="background-color: #0f172a; padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 20px; letter-spacing: 1px;">PORTAL DE GESTIÓN I+D</h1>
        </div>
        <div style="padding: 32px;">
          <h2 style="color: #1e293b; margin-top: 0; font-size: 18px; border-bottom: 2px solid #f1f5f9; padding-bottom: 12px;">${title}</h2>
          <div style="color: #475569; line-height: 1.6; font-size: 14px; margin-top: 20px;">
            ${content}
          </div>
          ${actionUrl ? `
            <div style="margin-top: 32px; text-align: center;">
              <a href="${actionUrl}" style="background-color: #ea580c; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Ver Detalles en el Portal</a>
            </div>
          ` : ''}
        </div>
        <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #f1f5f9;">
          <p style="margin: 0; color: #94a3b8; font-size: 12px;">&copy; ${new Date().getFullYear()} MT Industrial S.A.C. - Todos los derechos reservados.</p>
          <p style="margin: 4px 0 0; color: #cbd5e1; font-size: 10px;">Este es un mensaje automático, por favor no responder.</p>
        </div>
      </div>
    `;
  },

  getModuleUrl: (type: string) => {
    const t = type?.toLowerCase() || '';
    let moduleParam = 'artwork_followup'; // default
    if (t.includes('technical') || t.includes('fichas') || t.includes('técnica')) moduleParam = 'technical_datasheet';
    if (t.includes('commercial') || t.includes('comercial')) moduleParam = 'commercial_datasheet';
    if (t.includes('import')) moduleParam = 'import_tracking';
    
    // In browser context
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://portal-management.mtindustrial.com.pe';
    return `${origin}?module=${moduleParam}`;
  },

  /**
   * Generic send method
   */
  send: async (to: string | string[], subject: string, htmlBody: string, sapCode?: string, isArtwork?: boolean) => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const token = localStorage.getItem('auth_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers,
        body: JSON.stringify({ to, subject, body: htmlBody, sapCode, isArtwork }),
      });

      if (response.status === 401) {
        await supabase.auth.signOut();
        throw new Error('Sesión expirada. Por favor, inicie sesión de nuevo.');
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al enviar el correo');
      }
      return true;
    } catch (error) {
      console.error('Email service error:', error);
      throw error;
    }
  },

  /**
   * Helper to resolve a name to an email using Supabase profiles.
   */
  resolveEmail: async (nameOrEmail: string): Promise<string[]> => {
    if (!nameOrEmail) return [];
    if (nameOrEmail.includes('@')) return [nameOrEmail];

    try {
      const profiles = await SupabaseService.getProfiles();
      const profile = profiles?.find(p => p.full_name?.toLowerCase() === nameOrEmail.toLowerCase());
      return profile?.email ? [profile.email] : [];
    } catch (e) {
      console.error('Error resolving email:', e);
      return [];
    }
  },

  /**
   * Helper to get all emails for a specific department/stage.
   */
  getDepartmentEmails: async (department: string): Promise<string[]> => {
    try {
      const profiles = await SupabaseService.getProfiles();
      return (profiles || [])
        .filter(p => p.department?.toLowerCase() === department.toLowerCase() && p.is_active)
        .map(p => p.email)
        .filter(Boolean);
    } catch (e) {
      console.error('Error getting department emails:', e);
      return [];
    }
  },

  /**
   * Helper to get all emails for a specific department/stage filtered by record's brand/line scopes.
   */
  getDepartmentEmailsForRecord: async (department: string, record: ProductRecord | null | undefined): Promise<string[]> => {
    try {
      const profiles = await SupabaseService.getProfiles();
      return (profiles || [])
        .filter(p => {
          if (p.department?.toLowerCase() !== department.toLowerCase() || !p.is_active) return false;
          // Global access if no scopes defined or admin
          if (p.role === 'admin' || !p.scopes || p.scopes.length === 0) return true;
          
          return p.scopes.some((scope: any) => {
            const matchBrand = !scope.brand || (record && scope.brand === record.marca);
            const matchLine = !scope.line || (record && scope.line === record.linea);
            return matchBrand && matchLine;
          });
        })
        .map(p => p.email)
        .filter(Boolean);
    } catch (e) {
      console.error('Error getting scoped department emails:', e);
      return [];
    }
  },

  /**
   * Helper to get all administrator emails.
   */
  getAdminEmails: async (): Promise<string[]> => {
    try {
      const profiles = await SupabaseService.getProfiles();
      return (profiles || [])
        .filter(p => p.role?.toLowerCase() === 'admin' && p.is_active)
        .map(p => p.email)
        .filter(Boolean);
    } catch (e) {
      console.error('Error getting admin emails:', e);
      return [];
    }
  },

  /**
   * Helper to get all emails of users belonging to the Planning department or having Planning roles.
   */
  getPlanningEmails: async (): Promise<string[]> => {
    try {
      const profiles = await SupabaseService.getProfiles();
      return (profiles || [])
        .filter(p => p.is_active && (
          p.role?.toLowerCase() === 'jefe de planeamiento' || 
          p.role?.toLowerCase() === 'planeamiento' ||
          p.department?.toLowerCase() === 'planeamiento'
        ))
        .map(p => p.email)
        .filter(Boolean);
    } catch (e) {
      console.error('Error getting planning emails:', e);
      return [];
    }
  },

  /**
   * Helper to get the latest file versions for each category.
   */
  getLatestFiles: (record: ProductRecord, docType: string = 'artwork') => {
    const docArrayKey = docType === 'artwork' || docType === 'Artes' ? 'artworks' : 
                        docType === 'technical' || docType === 'Fichas' ? 'technicalSheets' : 'commercialSheets';
    const docs = record[docArrayKey] || [];
    
    // Group by category and find the latest version
    const latestDocs = Object.values(
      docs.reduce((acc: any, v: any) => {
        if (!v) return acc;
        const key = v.category || 'General';
        if (!acc[key] || acc[key].version < v.version) {
          acc[key] = v;
        }
        return acc;
      }, {} as Record<string, DocumentVersion>)
    ) as DocumentVersion[];

    // Extract all files from these latest versions
    const filesList: { name: string; url: string; category: string; version: number }[] = [];
    latestDocs.forEach(d => {
      if (d.files && Array.isArray(d.files)) {
        d.files.forEach(f => {
          filesList.push({
            name: f.name || f.originalName || 'Archivo',
            url: f.url,
            category: d.category || 'General',
            version: d.version
          });
        });
      }
    });
    return filesList;
  },

  /**
   * Helper to generate a clean HTML block with the latest active files
   */
  generateFilesListHTML: (files: { name: string; url: string; category: string; version: number }[]) => {
    if (!files || files.length === 0) return '';
    return `
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p style="margin: 0 0 12px 0; font-weight: bold; color: #1e293b;">Últimas versiones activas por categoría / Latest active versions by category:</p>
        <ul style="margin: 0; padding-left: 20px;">
          ${files.map(f => `
            <li style="margin-bottom: 8px;">
              <strong>[${f.category} - V${f.version}]</strong>: 
              <a href="${f.url}" target="_blank" style="color: #2563eb; text-decoration: underline; font-weight: 500;">${f.name}</a>
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  },

  /**
   * Helper to generate a clean HTML table summarizing the status of all current artwork files
   */
  generateStatusTableHTML: (record: ProductRecord) => {
    const currentVersions = record.artworks || [];
    const latestByCategory = Object.values(
      currentVersions.reduce((acc, v) => {
        if (!v) return acc;
        const key = v.category || 'Others';
        if (!acc[key] || acc[key].version < v.version) acc[key] = v;
        return acc;
      }, {} as Record<string, DocumentVersion>)
    ).sort((a: any, b: any) => (a.category || '').localeCompare(b.category || '')) as DocumentVersion[];

    if (latestByCategory.length === 0) return '';

    const getStatusBadge = (status: string) => {
      switch (status) {
        case 'approved':
          return '<span style="color: #10b981; font-weight: bold; background-color: #ecfdf5; padding: 4px 8px; border-radius: 6px; border: 1px solid #a7f3d0; font-size: 11px; display: inline-block;">Aprobado</span>';
        case 'approved_with_observation':
          return '<span style="color: #3b82f6; font-weight: bold; background-color: #eff6ff; padding: 4px 8px; border-radius: 6px; border: 1px solid #bfdbfe; font-size: 11px; display: inline-block;">Aprobado c/ Obs.</span>';
        case 'rejected':
          return '<span style="color: #ef4444; font-weight: bold; background-color: #fef2f2; padding: 4px 8px; border-radius: 6px; border: 1px solid #fca5a5; font-size: 11px; display: inline-block;">Rechazado</span>';
        case 'pending':
          return '<span style="color: #f59e0b; font-weight: bold; background-color: #fffbeb; padding: 4px 8px; border-radius: 6px; border: 1px solid #fde68a; font-size: 11px; display: inline-block;">Pendiente</span>';
        case 'not_started':
          return '<span style="color: #6b7280; background-color: #f3f4f6; padding: 4px 8px; border-radius: 6px; border: 1px solid #e5e7eb; font-size: 11px; font-style: italic; display: inline-block;">No iniciado</span>';
        case 'not_required':
          return '<span style="color: #9ca3af; background-color: #f9fafb; padding: 4px 8px; border-radius: 6px; border: 1px solid #f3f4f6; font-size: 11px; display: inline-block;">No requerido</span>';
        default:
          return `<span style="font-size: 11px; display: inline-block;">${status || '-'}</span>`;
      }
    };

    let rows = '';
    latestByCategory.forEach(v => {
      rows += `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 12px 10px; font-weight: bold; color: #334155; font-size: 13px;">${v.category || 'Otros'} (V${v.version})</td>
          <td style="padding: 12px 10px; text-align: center;">${getStatusBadge(v.idApproval?.status || 'not_started')}</td>
          <td style="padding: 12px 10px; text-align: center;">${getStatusBadge(v.mktApproval?.status || 'not_started')}</td>
          <td style="padding: 12px 10px; text-align: center;">${getStatusBadge(v.provApproval?.status || 'not_started')}</td>
          <td style="padding: 12px 10px; text-align: center;">${getStatusBadge(v.planApproval?.status || 'not_started')}</td>
        </tr>
      `;
    });

    return `
      <div style="margin: 24px 0; overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; min-width: 500px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: left; border: 1px solid #e2e8f0; border-radius: 8px;">
          <thead>
            <tr style="background-color: #f8fafc; border-bottom: 2px solid #cbd5e1;">
              <th style="padding: 12px 10px; color: #475569; font-size: 11px; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px;">Componente / Archivo</th>
              <th style="padding: 12px 10px; color: #475569; font-size: 11px; text-transform: uppercase; font-weight: bold; text-align: center; letter-spacing: 0.5px; width: 100px;">I+D</th>
              <th style="padding: 12px 10px; color: #475569; font-size: 11px; text-transform: uppercase; font-weight: bold; text-align: center; letter-spacing: 0.5px; width: 100px;">MKT</th>
              <th style="padding: 12px 10px; color: #475569; font-size: 11px; text-transform: uppercase; font-weight: bold; text-align: center; letter-spacing: 0.5px; width: 100px;">PROV</th>
              <th style="padding: 12px 10px; color: #475569; font-size: 11px; text-transform: uppercase; font-weight: bold; text-align: center; letter-spacing: 0.5px; width: 100px;">PLAN</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  },

  /**
   * Notifies final approval (Planning).
   */
  sendApprovalEmail: async (record: ProductRecord, version: DocumentVersion, moduleType: string) => {
    const providerRecipients = record.correoProveedor || [];
    
    // Also notify the designer/technical responsible
    const designerEmail = record.artworkAssignment?.designerEmail || 
                          record.technicalAssignment?.designerEmail || 
                          record.commercialAssignment?.designerEmail || 
                          '';
    
    const adminEmails = await outlookService.getAdminEmails();
    const idEmails = await outlookService.getDepartmentEmailsForRecord('I+D', record);
    const mktEmails = await outlookService.getDepartmentEmailsForRecord('Marketing', record);
    const planEmails = await outlookService.getDepartmentEmailsForRecord('Planeamiento', record);
    const planningRolesEmails = await outlookService.getPlanningEmails();

    const recipients = [...new Set([
      ...providerRecipients, 
      designerEmail, 
      ...adminEmails,
      ...idEmails,
      ...mktEmails,
      ...planEmails,
      ...planningRolesEmails
    ].filter(Boolean))];

    if (recipients.length === 0) return;

    const proforma = version.proformaNumber || '-';
    const solped = version.solpedNumber || '-';
    const cargoReady = version.estimatedShipmentDate || '-';

    const subject = `[APROBACIÓN FINAL] - Confirmación de Planificación - ${record.codigoSAP} - ${record.descripcionSAP}`;
    const title = 'Final Approval and Planning Confirmed';

    const content = `
      <p>Dear Supplier and Team,</p>
      <p>Good day.</p>
      <p>We would like to inform you that the planning data associated with the approved artwork/documents for <strong>${record.codigoSAP} – ${record.descripcionSAP}</strong> has been completed and confirmed in the portal.</p>
      <p>The following information is shared for coordination and traceability purposes:</p>
      
      <div style="margin: 20px 0; overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 13px; text-align: left; border: 1px solid #e2e8f0; border-radius: 8px;">
          <thead>
            <tr style="background-color: #f8fafc; border-bottom: 2px solid #cbd5e1;">
              <th style="padding: 10px; color: #475569; font-weight: bold; width: 50%;">Field</th>
              <th style="padding: 10px; color: #475569; font-weight: bold;">Confirmed Information</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px; font-weight: bold; color: #334155;">Proforma Invoice</td>
              <td style="padding: 10px; color: #475569;">${proforma}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px; font-weight: bold; color: #334155;">Solped</td>
              <td style="padding: 10px; color: #475569;">${solped}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px; font-weight: bold; color: #334155;">Cargo Ready</td>
              <td style="padding: 10px; color: #0284c7; font-weight: bold;">${cargoReady}</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <p>The <strong>Cargo Ready</strong> date should be considered as a reference for process follow-up and coordination with the involved areas.</p>
      <p>This message is for informational purposes, in order to ensure that the supplier and internal teams are aligned with the confirmed planning information.</p>
      <p>In case of any observation, discrepancy or pending information, please report it through the portal.</p>
      <br/>
      <p style="margin: 0;">Best regards,</p>
      <p style="margin: 0;"><strong>R&D Management Portal</strong></p>
      <p style="margin: 0;">Grupo Sole</p>
    `;

    try {
      const actionUrl = outlookService.getModuleUrl(moduleType);
      const isArtwork = moduleType === 'artwork' || moduleType === 'Artes';
      await outlookService.send(recipients, subject, outlookService.wrapInTemplate(title, content, actionUrl), record.codigoSAP, isArtwork);
      toast.success('Notificación de aprobación enviada');
    } catch (e) {
      toast.error('Error al enviar notificación de aprobación');
    }
  },

  /**
   * Notifies final datasheet approval (Technical or Commercial Sheet).
   */
  sendFinalDatasheetApprovalEmail: async (record: ProductRecord, version: DocumentVersion, moduleType: 'technical_sheet' | 'commercial_sheet') => {
    const isTechnical = moduleType === 'technical_sheet';
    const typeLabel = isTechnical ? 'Ficha Técnica' : 'Ficha Comercial';
    
    const subject = `[APROBACIÓN FINAL] - ${typeLabel} - ${record.codigoSAP} - ${record.descripcionSAP}`;
    const title = `${typeLabel} Aprobada`;

    const docTypeParam = isTechnical ? 'technical' : 'commercial';
    const activeFiles = outlookService.getLatestFiles(record, docTypeParam);
    const filesListHTML = outlookService.generateFilesListHTML(activeFiles);

    const comments = version.idApproval?.comments || '';
    const user = version.idApproval?.user || 'I+D';

    const content = `
      <p>Nos complace informarle que la <strong>${typeLabel}</strong> para el producto <strong>${record.codigoSAP} - ${record.descripcionSAP}</strong> ha recibido la aprobación final por parte de I+D.</p>
      <div style="background-color: #f1f5f9; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 0;"><strong>Producto:</strong> ${record.codigoSAP} - ${record.descripcionSAP}</p>
        <p style="margin: 4px 0;"><strong>Marca:</strong> ${record.marca || '-'}</p>
        <p style="margin: 4px 0;"><strong>Línea:</strong> ${record.linea || '-'}</p>
        <p style="margin: 4px 0;"><strong>Versión:</strong> V${version.version}</p>
        <p style="margin: 4px 0;"><strong>Aprobado por:</strong> ${user}</p>
        ${comments ? `<p style="margin: 4px 0;"><strong>Comentarios de la aprobación:</strong> ${comments}</p>` : ''}
      </div>

      ${filesListHTML}

      <p>El flujo para este documento ha finalizado correctamente. Los archivos aprobados ya están disponibles en el portal para su consulta y uso respectivo.</p>
    `;

    try {
      const designerEmail = isTechnical 
        ? (record.technicalAssignment?.designerEmail || '') 
        : (record.commercialAssignment?.designerEmail || '');
      
      const adminEmails = await outlookService.getAdminEmails();
      const idEmails = await outlookService.getDepartmentEmailsForRecord('I+D', record);
      const mktEmails = await outlookService.getDepartmentEmailsForRecord('Marketing', record);
      const planEmails = await outlookService.getDepartmentEmailsForRecord('Planeamiento', record);
      const planningRolesEmails = await outlookService.getPlanningEmails();

      const recipients = [...new Set([
        designerEmail, 
        ...adminEmails,
        ...idEmails,
        ...mktEmails,
        ...planEmails,
        ...planningRolesEmails
      ].filter(Boolean))];

      if (recipients.length === 0) return;

      const actionUrl = outlookService.getModuleUrl(moduleType);
      await outlookService.send(recipients, subject, outlookService.wrapInTemplate(title, content, actionUrl));
      toast.success('Notificación de aprobación final enviada');
    } catch (e) {
      console.error('Error sending final datasheet approval email:', e);
      toast.error('Error al enviar la notificación de aprobación final');
    }
  },

  /**
   * Sends the bulk email request to Planning and Admins for SAP Code creation.
   */
  sendSamplePlanningRequestEmail: async (shipment: any, pendingItems: any[]) => {
    if (!shipment || !pendingItems || pendingItems.length === 0) return false;

    const subject = `[Solicitud de Creación de Códigos de Muestras] - Envío ${shipment.trackingNumber || shipment.quoteName || shipment.id || ''}`;
    const title = 'Solicitud de Creación de Códigos SAP';

    // Build the list of samples in HTML format
    const samplesHTML = pendingItems.map((x, index) => `
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: left;">
        <h3 style="margin-top: 0; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; font-size: 15px; font-weight: bold;">
          Muestra #${index + 1}: ${x.commercialDescription}
        </h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: left;">
          <tbody>
            <tr>
              <td style="padding: 6px 0; font-weight: bold; color: #475569; width: 40%;">Descripción Comercial:</td>
              <td style="padding: 6px 0; color: #1e293b;">${x.commercialDescription}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold; color: #475569;">Descripción Completa:</td>
              <td style="padding: 6px 0; color: #1e293b;">${x.fullDescription}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold; color: #475569;">Dimensiones (Alto x Ancho x Prof.):</td>
              <td style="padding: 6px 0; color: #1e293b;">${x.alto} (alto) x ${x.ancho} (ancho) x ${x.profundidad} (profundidad)</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold; color: #475569;">Peso:</td>
              <td style="padding: 6px 0; color: #1e293b;">${x.peso}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold; color: #475569;">Unidad de Medida / Presentación:</td>
              <td style="padding: 6px 0; color: #1e293b;">${x.unidadMedida} / ${x.presentacion}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold; color: #475569;">Costo Unitario:</td>
              <td style="padding: 6px 0; color: #1e293b; font-weight: bold;">USD ${typeof x.costoUnitario === 'number' ? x.costoUnitario.toFixed(2) : parseFloat(x.costoUnitario || 0).toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold; color: #475569;">Sujeto a Lote:</td>
              <td style="padding: 6px 0; color: #1e293b;">${x.sujetoALote}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold; color: #475569;">Código Modelo:</td>
              <td style="padding: 6px 0; color: #1e293b; font-family: monospace;">${x.codigoModelo || '-'}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold; color: #475569;">Modo de Compra / Finalidad:</td>
              <td style="padding: 6px 0; color: #1e293b;">${x.modoCompra} / ${x.finalidad}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold; color: #475569;">Almacén Destino:</td>
              <td style="padding: 6px 0; color: #1e293b;">${x.almacen}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold; color: #475569;">Ficha Técnica En:</td>
              <td style="padding: 6px 0; color: #1e293b;">${x.fichaTecnicaEn || 'SI'}</td>
            </tr>
          </tbody>
        </table>
      </div>
    `).join('');

    // Build the list of attached documents
    let documentLinesHTML = '';
    const documentLines: string[] = [];
    if (shipment.quoteName) {
      documentLines.push(`
        <li style="margin-bottom: 8px;">
          <strong>Cotización principal:</strong> 
          <a href="${shipment.quoteUrl}" target="_blank" style="color: #2563eb; text-decoration: underline; font-weight: 500;">${shipment.quoteName}</a>
        </li>
      `);
    }
    if (shipment.documents && shipment.documents.length > 0) {
      shipment.documents.forEach((doc: any) => {
        documentLines.push(`
          <li style="margin-bottom: 8px;">
            <strong>${doc.name.split(':')[0]}:</strong> 
            <a href="${doc.url}" target="_blank" style="color: #2563eb; text-decoration: underline; font-weight: 500;">${doc.name}</a>
          </li>
        `);
      });
    }

    if (documentLines.length > 0) {
      documentLinesHTML = `
        <div style="background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; margin: 20px 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: left;">
          <p style="margin: 0 0 10px 0; font-weight: bold; color: #334155; font-size: 13px;">Documentación Adjunta del Envío:</p>
          <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #475569; line-height: 1.5;">
            ${documentLines.join('')}
          </ul>
        </div>
      `;
    }

    const content = `
      <p>Estimado equipo de Planeamiento y Administradores,</p>
      <p>Se solicita la creación de los códigos de material SAP para las siguientes muestras importadas pertenecientes al envío <strong>${shipment.id}</strong> (Tracking: <strong>${shipment.trackingNumber || 'Pendiente'}</strong>, Transportadora: <strong>${shipment.carrier}</strong>):</p>
      
      <div style="margin-top: 20px;">
        ${samplesHTML}
      </div>

      ${documentLinesHTML}

      <p style="margin-top: 24px;">Agradecemos su pronta atención para la generación de estos códigos a la brevedad.</p>
      <br/>
      <p style="margin: 0;">Atentamente,</p>
      <p style="margin: 0;"><strong>Equipos de Investigación y Desarrollo</strong></p>
      <p style="margin: 0;">Grupo Sole</p>
    `;

    try {
      const adminEmails = await outlookService.getAdminEmails();
      const planningRolesEmails = await outlookService.getPlanningEmails();
      
      const recipients = [...new Set([
        'planeamientomt@sole.com.pe', 
        'importaciones@sole.com.pe',
        'admin@sole.com.pe',
        ...adminEmails,
        ...planningRolesEmails
      ].filter(Boolean))];

      const actionUrl = outlookService.getModuleUrl('import_tracking');
      const htmlBody = outlookService.wrapInTemplate(title, content, actionUrl);
      
      await outlookService.send(recipients, subject, htmlBody);
      return true;
    } catch (e) {
      console.error('Error sending sample planning request email:', e);
      throw e;
    }
  },

  /**
   * Notifies an intermediate stage approval.
   */
  sendStageApprovalEmail: async (record: ProductRecord, version: DocumentVersion, stage: string, stageName: string, comments: string, user: string, moduleType: string = 'artwork') => {
    let subject = `[APROBACIÓN ${stage}] - ${record.codigoSAP} - ${record.descripcionSAP}`;
    let title = `Documento Aprobado (${stage})`;
    
    // Determine the next stage and its recipients, as well as the current stage (who just approved)
    let nextRecipients: string[] = [];
    let currentStageRecipients: string[] = [];
    if (stage === 'I+D') {
      nextRecipients = await outlookService.getDepartmentEmailsForRecord('Marketing', record);
      currentStageRecipients = await outlookService.getDepartmentEmailsForRecord('I+D', record);
    } else if (stage === 'MKT') {
      nextRecipients = record.correoProveedor || [];
      currentStageRecipients = await outlookService.getDepartmentEmailsForRecord('Marketing', record);
    } else if (stage === 'PROV') {
      nextRecipients = await outlookService.getDepartmentEmailsForRecord('Planeamiento', record);
      currentStageRecipients = []; // Don't send this email to the provider
    }

    const statusTable = moduleType === 'artwork' ? outlookService.generateStatusTableHTML(record) : '';
    const activeFiles = outlookService.getLatestFiles(record, moduleType === 'artwork' ? 'artwork' : 'technical');
    const filesListHTML = outlookService.generateFilesListHTML(activeFiles);

    if (stage === 'I+D') {
      subject = `[FLUJO DE ARTE] - Listo para revisión de Marketing - ${record.codigoSAP} - ${record.descripcionSAP}`;
      title = `Pendiente de Aprobación por Marketing`;
    } else if (stage === 'MKT') {
      subject = `[ARTWORK APPROVAL] - Pending Provider Review - ${record.codigoSAP} - ${record.descripcionSAP}`;
      title = `Pending Artwork Review and Acceptance`;
    } else if (stage === 'PROV') {
      subject = `[PLANEAMIENTO] - Supplier Approved Artwork - Pending Info - ${record.codigoSAP} - ${record.descripcionSAP}`;
      title = `Supplier Approved Artwork - Planning Info Required`;
    }

    let content = '';
    if (stage === 'MKT') {
      content = `
        <p>Dear Supplier,</p>
        <p>Good day.</p>
        <p>The approved artworks for <strong>${record.codigoSAP} – ${record.descripcionSAP}</strong> have been released and are available for download through the links below:</p>
        
        ${filesListHTML}

        <p>Please carefully review all the documents before production and confirm that the files are correct and complete.</p>
        <p>If you have any observation, discrepancy, missing document, printing limitation or technical concern, please inform us immediately before proceeding.</p>
        <p>If everything is correct and there are no observations, you may proceed with production using only the approved files. Previous versions must be deleted or replaced to avoid mistakes. No change, adjustment or redesign is allowed without prior written approval from Grupo Sole.</p>
        <p>Before starting production, please confirm by email your acceptance of the approved artworks, always copying <strong>planeamientomt@sole.com.pe</strong>.</p>
        <br/>
        <p style="margin: 0;">Best regards,</p>
        <p style="margin: 0;"><strong>Grupo Sole – Rinnai Corporation</strong></p>
        <p style="margin: 0;">R&D / Artwork Management Team</p>
      `;
    } else if (stage === 'PROV') {
      content = `
        <p>Dear Planning Team,</p>
        <p>Good day.</p>
        <p>Please be informed that the supplier has approved the artwork for the following product:</p>
        <p style="margin-left: 10px; line-height: 1.5; background-color: #f8fafc; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <strong>Product:</strong> ${record.codigoSAP} – ${record.descripcionSAP}<br/>
          <strong>Brand:</strong> ${record.marca || '-'}<br/>
          <strong>Line:</strong> ${record.linea || '-'}<br/>
          <strong>Version:</strong> V${version.version}<br/>
          <strong>Category/Subcategory:</strong> ${version.category || '-'} – ${version.subcategory || '-'}
        </p>
        
        ${filesListHTML ? `<div style="margin-top: 15px; margin-bottom: 20px;">${filesListHTML}</div>` : ''}

        <p>To continue with the approval flow and ensure the correct implementation of the change, please complete the following information for the order where the approved artwork will be applied:</p>
        
        <ol style="margin-left: 20px; padding-left: 0; line-height: 1.6;">
          <li style="margin-bottom: 12px;">
            <strong>1. Cargo Ready</strong><br/>
            <span style="color: #64748b; font-size: 13px; display: block; margin-top: 2px;">Estimated shipment date of the order where the change will be implemented.</span>
          </li>
          <li style="margin-bottom: 12px;">
            <strong>2. Proforma Invoice Number</strong><br/>
            <span style="color: #64748b; font-size: 13px; display: block; margin-top: 2px;">Proforma invoice related to the order where the approved artwork will be applied.</span>
          </li>
          <li style="margin-bottom: 12px;">
            <strong>3. Solped Number</strong><br/>
            <span style="color: #64748b; font-size: 13px; display: block; margin-top: 2px;">Solped related to the purchase/import request.</span>
          </li>
          <li style="margin-bottom: 12px;">
            <strong>4. Comments or observations</strong><br/>
            <span style="color: #64748b; font-size: 13px; display: block; margin-top: 2px;">Please include any relevant additional information regarding the implementation of this change.</span>
          </li>
        </ol>

        <p style="background-color: #fff7ed; border-left: 4px solid #ea580c; padding: 14px; margin: 20px 0; font-size: 13px; color: #9a3412; border-radius: 4px;">
          This information must be completed before closing the Planning approval stage, in order to ensure proper traceability and avoid applying the approved artwork to the wrong order or leaving the change without implementation.
        </p>

        <p style="margin-top: 24px; margin-bottom: 0;">Best regards,</p>
        <p style="margin: 0;"><strong>R&D Team</strong></p>
        <p style="margin: 0;">Grupo Sole</p>
      `;
    } else {
      content = `
        <p>Se ha completado y aprobado la etapa de <strong>${stageName}</strong> para el producto <strong>${record.codigoSAP} - ${record.descripcionSAP}</strong>.</p>
        <p><strong>Aprobado por:</strong> ${user}</p>
        ${comments ? `<p><strong>Comentarios de la etapa:</strong> ${comments}</p>` : ''}
        
        ${filesListHTML}

        ${statusTable ? `
        <p style="margin-top: 24px; font-weight: bold; color: #1e293b;">Estado Actual de Aprobaciones:</p>
        ${statusTable}
        ` : ''}
        
        <p>El flujo ha avanzado automáticamente y requiere su revisión en la siguiente fase.</p>
      `;
    }

    try {
      const adminEmails = await outlookService.getAdminEmails();
      const designerEmail = record.artworkAssignment?.designerEmail || 
                            record.technicalAssignment?.designerEmail || 
                            record.commercialAssignment?.designerEmail || 
                            '';
      
      let extraPlanningRecipients: string[] = [];
      if (stage === 'MKT') {
        extraPlanningRecipients = await outlookService.getPlanningEmails();
      }
      
      const recipients = [...new Set([
        designerEmail, 
        ...adminEmails, 
        ...nextRecipients, 
        ...currentStageRecipients,
        ...extraPlanningRecipients
      ])].filter(Boolean);
      const actionUrl = outlookService.getModuleUrl(moduleType);
      const isArtwork = moduleType === 'artwork' || moduleType === 'Artes';
      await outlookService.send(recipients, subject, outlookService.wrapInTemplate(title, content, actionUrl), record.codigoSAP, isArtwork);
    } catch (e) {
      console.error('Error sending stage approval email:', e);
    }
  },

  /**
   * Notifies an observation/rejection.
   */
  sendObservationEmail: async (record: ProductRecord, stage: string, comments: string, type: string) => {
    const designerEmail = record.artworkAssignment?.designerEmail || 
                          record.technicalAssignment?.designerEmail || 
                          record.commercialAssignment?.designerEmail || 
                          '';
    
    const subject = `[OBSERVACIÓN] - ${record.codigoSAP} - ${stage}`;
    const title = 'Documento con Observaciones';
    
    const statusTable = type === 'artwork' || type === 'Artes' ? outlookService.generateStatusTableHTML(record) : '';
    const activeFiles = outlookService.getLatestFiles(record, type === 'artwork' || type === 'Artes' ? 'artwork' : 'technical');
    const filesListHTML = outlookService.generateFilesListHTML(activeFiles);

    const content = `
      <p>Hola,</p>
      <p>Se han registrado observaciones en el flujo de <strong>${type}</strong> para el producto <strong>${record.codigoSAP} - ${record.descripcionSAP}</strong> durante la etapa de <strong>${stage}</strong>.</p>
      <div style="background-color: #fff7ed; border-left: 4px solid #ea580c; padding: 16px; margin: 16px 0;">
        <p style="margin: 0; font-weight: bold; color: #9a3412;">Comentarios/Observaciones:</p>
        <p style="margin: 8px 0 0; font-style: italic;">"${comments || 'Sin comentarios adicionales'}"</p>
      </div>

      ${filesListHTML}

      ${statusTable ? `
      <p style="margin-top: 24px; font-weight: bold; color: #1e293b;">Resumen de Aprobaciones del Sistema:</p>
      ${statusTable}
      ` : ''}

      <p>Por favor, ingresar al portal para revisar y subir una nueva versión corregida.</p>
    `;

    try {
      const resolvedDesigner = await outlookService.resolveEmail(designerEmail);
      const adminEmails = await outlookService.getAdminEmails();
      const recipients = [...new Set([...resolvedDesigner, ...adminEmails])].filter(Boolean);
      
      const actionUrl = outlookService.getModuleUrl(type);
      const isArtwork = type === 'artwork' || type === 'Artes';
      await outlookService.send(recipients, subject, outlookService.wrapInTemplate(title, content, actionUrl), record.codigoSAP, isArtwork);
      toast.success('Notificación de observación enviada');
    } catch (e) {
      console.error(e);
    }
  },

  /**
   * Notifies a new info request.
   */
  sendInfoRequestEmail: async (record: ProductRecord, request: InfoRequest, type: string) => {
    const subject = `[SOLICITUD DE INFO] - ${record.codigoSAP}`;
    const title = 'Nueva Solicitud de Información';
    const content = `
      <p>Se requiere información adicional para avanzar con el proceso de <strong>${type}</strong>.</p>
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p style="margin: 0; color: #64748b; font-size: 12px; text-transform: uppercase; font-weight: bold;">Solicitado por ${request.requestedBy}:</p>
        <p style="margin: 12px 0 0; font-weight: 500;">${request.requestText}</p>
      </div>
      <p>Por favor, ingrese al portal para responder a esta solicitud.</p>
    `;

    try {
      const adminEmails = await outlookService.getAdminEmails();
      const designerEmail = record.artworkAssignment?.designerEmail || 
                            record.technicalAssignment?.designerEmail || 
                            record.commercialAssignment?.designerEmail || 
                            '';
      const resolvedProvider = await outlookService.resolveEmail(record.correoProveedor?.[0] || record.proveedor);
      const recipients = [...new Set([...resolvedProvider, ...adminEmails, designerEmail])].filter(Boolean);
      
      const actionUrl = outlookService.getModuleUrl(type);
      const isArtwork = type === 'artwork' || type === 'Artes';
      await outlookService.send(recipients, subject, outlookService.wrapInTemplate(title, content, actionUrl), record.codigoSAP, isArtwork);
    } catch (e) {
      console.error(e);
    }
  },

  /**
   * Notifies an assignment.
   */
  sendAssignmentEmail: async (info: { code?: string; description: string; brand?: string }, assignee: string, type: string) => {
    const subject = `[ASIGNACIÓN] - Nueva tarea asignada: ${info.code || ''} - ${info.description}`;
    const title = 'Nueva Tarea Asignada';
    const content = `
      <p>Hola <strong>${assignee}</strong>,</p>
      <p>Se te ha asignado una nueva tarea en el módulo de <strong>${type}</strong> correspondiente al siguiente registro:</p>
      
      <div style="margin: 20px 0; overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 13px; text-align: left; border: 1px solid #e2e8f0; border-radius: 8px;">
          <thead>
            <tr style="background-color: #f8fafc; border-bottom: 2px solid #cbd5e1;">
              <th style="padding: 10px; color: #475569; font-weight: bold; width: 40%;">Campo</th>
              <th style="padding: 10px; color: #475569; font-weight: bold;">Información</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px; font-weight: bold; color: #334155;">Código/ID</td>
              <td style="padding: 10px; color: #475569;">${info.code || '-'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px; font-weight: bold; color: #334155;">Descripción</td>
              <td style="padding: 10px; color: #475569;">${info.description || '-'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px; font-weight: bold; color: #334155;">Marca</td>
              <td style="padding: 10px; color: #475569;">${info.brand || '-'}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px; font-weight: bold; color: #334155;">Módulo</td>
              <td style="padding: 10px; color: #475569;">${type}</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <p>Por favor, ingresa al portal para revisar el detalle de la solicitud y continuar con la gestión del artwork/documento asignado.</p>
      <p>Es importante cumplir con los plazos establecidos en el flujo, a fin de asegurar la continuidad del proceso y evitar retrasos en las siguientes etapas.</p>
      <p>En caso identifiques algún inconveniente, información incompleta, restricción técnica o cualquier observación que pueda afectar el avance de la solicitud, deberás registrarlo oportunamente a través del portal.</p>
      <p>Una vez completada la gestión correspondiente, el flujo continuará según las etapas definidas.</p>
      <p>Gracias por tu apoyo.</p>
      <br/>
      <p style="margin: 0;">Saludos,</p>
      <p style="margin: 0;"><strong>Portal de Gestión I+D</strong></p>
      <p style="margin: 0;">Grupo Sole</p>
    `;

    try {
      const assigneeEmails = await outlookService.resolveEmail(assignee);
      const adminEmails = await outlookService.getAdminEmails();
      const recipients = [...new Set([...assigneeEmails, ...adminEmails])].filter(Boolean);
      
      const actionUrl = outlookService.getModuleUrl(type);
      const isArtwork = type === 'artwork' || type === 'Artes';
      await outlookService.send(recipients, subject, outlookService.wrapInTemplate(title, content, actionUrl), info.code, isArtwork);
      toast.success('Notificación de asignación enviada');
    } catch (e) {
      console.error(e);
    }
  },

  /**
   * Notifies that a new version has been uploaded and the flow has started.
   */
  sendFlowStartEmail: async (record: ProductRecord, version: DocumentVersion, type: string) => {
    const subject = `[NUEVA VERSIÓN] - ${record.codigoSAP} lista para revisión`;
    const title = 'Nuevo Documento para Revisar';
    
    const statusTable = type === 'artwork' || type === 'Artes' ? outlookService.generateStatusTableHTML(record) : '';
    const activeFiles = outlookService.getLatestFiles(record, type === 'artwork' || type === 'Artes' ? 'artwork' : 'technical');
    const filesListHTML = outlookService.generateFilesListHTML(activeFiles);

    const content = `
      <p>Se ha iniciado un nuevo flujo de revisión para el producto <strong>${record.codigoSAP} - ${record.descripcionSAP}</strong>.</p>
      <div style="background-color: #f1f5f9; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 0;"><strong>Módulo:</strong> ${type}</p>
        <p style="margin: 4px 0;"><strong>Versión:</strong> V${version.version}</p>
        <p style="margin: 4px 0;"><strong>Subido por:</strong> ${version.uploadedBy}</p>
        <p style="margin: 4px 0;"><strong>Descripción:</strong> ${version.changeDescription || 'Sin descripción'}</p>
      </div>

      ${statusTable ? `
      <p style="margin-top: 24px; font-weight: bold; color: #1e293b;">Detalle de Archivos en este Flujo:</p>
      ${statusTable}
      ` : ''}

      ${filesListHTML}

      <p>Por favor, ingrese al portal para realizar la aprobación técnica de I+D.</p>
    `;

    try {
      // Find recipients for the first stage (usually I+D)
      const idEmails = await outlookService.getDepartmentEmailsForRecord('I+D', record);
      // Also notify the assignee if any
      const designerEmail = record.artworkAssignment?.designerEmail || 
                            record.technicalAssignment?.designerEmail || 
                            record.commercialAssignment?.designerEmail || 
                            '';
      
      const adminEmails = await outlookService.getAdminEmails();
      const recipients = [...new Set([...idEmails, designerEmail, ...adminEmails].filter(Boolean))];
      
      const actionUrl = outlookService.getModuleUrl(type);
      const isArtwork = type === 'artwork' || type === 'Artes';
      await outlookService.send(recipients, subject, outlookService.wrapInTemplate(title, content, actionUrl), record.codigoSAP, isArtwork);
      toast.info('Notificación de inicio de flujo enviada');
    } catch (e) {
      console.error(e);
    }
  },

  /**
   * Notifies that a new tracking record has been created.
   */
  sendNewTrackingEmail: async (
    info: { 
      code?: string; 
      description: string; 
      supplier?: string; 
      brand?: string;
      creatorEmail?: string;
      assignee?: string;
      assigneeEmail?: string;
    }, 
    type: string
  ) => {
    const subject = `[NUEVO REGISTRO] - ${info.code || ''} ${info.description} creado`;
    const title = 'Nuevo Registro en el Sistema';
    const content = `
      <p>Se ha registrado un nuevo elemento en el sistema en el módulo de <strong>${type}</strong>.</p>
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p style="margin: 0;"><strong>Módulo:</strong> ${type}</p>
        ${info.code ? `<p style="margin: 4px 0;"><strong>Código/ID:</strong> ${info.code}</p>` : ''}
        <p style="margin: 4px 0;"><strong>Descripción:</strong> ${info.description}</p>
        ${info.supplier ? `<p style="margin: 4px 0;"><strong>Proveedor:</strong> ${info.supplier}</p>` : ''}
        ${info.brand ? `<p style="margin: 4px 0;"><strong>Marca:</strong> ${info.brand}</p>` : ''}
        ${info.assignee ? `<p style="margin: 4px 0;"><strong>Asignado a:</strong> ${info.assignee}</p>` : ''}
      </div>
      <p>El siguiente paso es realizar las asignaciones correspondientes o cargar documentación.</p>
    `;

    try {
      const adminEmails = await outlookService.getAdminEmails();
      const idEmails = await outlookService.getDepartmentEmailsForRecord('I+D', null as any); // fallback
      
      const additionalRecipients: string[] = [];
      if (info.creatorEmail) additionalRecipients.push(info.creatorEmail);
      if (info.assigneeEmail) additionalRecipients.push(info.assigneeEmail);
      if (info.assignee) {
        const resolved = await outlookService.resolveEmail(info.assignee);
        additionalRecipients.push(...resolved);
      }

      const recipients = [...new Set([...adminEmails, ...idEmails, ...additionalRecipients])].filter(Boolean);
      
      const actionUrl = outlookService.getModuleUrl(type);
      const isArtwork = type === 'artwork' || type === 'Artes';
      await outlookService.send(recipients, subject, outlookService.wrapInTemplate(title, content, actionUrl), info.code, isArtwork);
    } catch (e) {
      console.error(e);
    }
  },

  /**
   * Notifies about calendar tasks.
   */
  sendCalendarNotification: async (task: Partial<CalendarTask>, isNew: boolean = true) => {
    const subject = `[CALENDARIO] - ${isNew ? 'Nueva Tarea' : 'Tarea Actualizada'}: ${task.title}`;
    const title = isNew ? 'Nueva Actividad en Calendario' : 'Actividad Actualizada';
    
    const content = `
      <p>Se ha ${isNew ? 'registrado' : 'actualizado'} una actividad en el calendario de I+D.</p>
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p style="margin: 0;"><strong>Título:</strong> ${task.title}</p>
        <p style="margin: 4px 0;"><strong>Tipo:</strong> ${task.type}</p>
        <p style="margin: 4px 0;"><strong>Responsable/Asignado:</strong> ${task.assignee || task.requester || 'Sin asignar'}</p>
        ${task.deadline ? `<p style="margin: 4px 0;"><strong>Fecha Límite:</strong> ${task.deadline}</p>` : ''}
        ${task.description ? `<p style="margin: 12px 0 0; font-style: italic;">"${task.description}"</p>` : ''}
      </div>
      <p>Por favor, revise los detalles en el módulo de Calendario del portal.</p>
    `;

    try {
      const adminEmails = await outlookService.getAdminEmails();
      const idEmails = await outlookService.getDepartmentEmailsForRecord('I+D', null as any); // fallback
      const recipients = [...new Set([...adminEmails, ...idEmails])].filter(Boolean);
      
      const origin = typeof window !== 'undefined' ? window.location.origin : 'https://portal-management.mtindustrial.com.pe';
      const actionUrl = `${origin}?module=calendar`;
      
      await outlookService.send(recipients, subject, outlookService.wrapInTemplate(title, content, actionUrl));
      if (isNew) toast.success('Notificación de calendario enviada');
    } catch (e) {
      console.error('Error sending calendar notification:', e);
    }
  },

  /**
   * Helper to retrieve all quality claim notification recipients.
   * Includes Gerente de Innovación y Calidad, Jefe de Calidad, Mejora Continua, Admins, Técnico I+D, and the assignee designer.
   */
  getQualityClaimRecipients: async (record: ProductRecord): Promise<string[]> => {
    try {
      const designerEmail = record.artworkAssignment?.designerEmail || 
                            record.technicalAssignment?.designerEmail || 
                            record.commercialAssignment?.designerEmail || 
                            '';

      const profiles = await SupabaseService.getProfiles();
      const recipients: string[] = [];

      if (designerEmail) {
        recipients.push(designerEmail);
      }

      (profiles || []).forEach(p => {
        if (!p.is_active || !p.email) return;

        const roleLower = (p.role || '').toLowerCase();
        const deptLower = (p.department || '').toLowerCase();

        // 1. Admin
        const isAdmin = roleLower === 'admin' || roleLower === 'administrador';

        // 2. Gerente de Innovación y Calidad
        const isGerenteInnovacion = 
          roleLower === 'gerente_innovacion' || 
          roleLower === 'gerente de innovación y calidad' || 
          roleLower === 'gerente de innovacion y calidad' ||
          (roleLower.includes('gerente') && (roleLower.includes('innovac') || deptLower === 'i+d'));

        // 3. Jefe de Calidad
        const isJefeCalidad = 
          roleLower === 'jefe_calidad' || 
          roleLower === 'jefe de calidad' || 
          (roleLower.includes('jefe') && roleLower.includes('calidad')) ||
          (deptLower === 'calidad' && roleLower.includes('jefe'));

        // 4. Mejora Continua
        const isMejoraContinua = 
          roleLower === 'mejora_continua' || 
          roleLower === 'mejora continua' || 
          deptLower === 'mejora continua' || 
          deptLower === 'mejoracontinua' ||
          p.email.toLowerCase() === 'mejoracontinua@sole.com.pe';

        // 5. Técnico I+D
        const isTecnicoID = 
          roleLower === 'tecnico_id' || 
          roleLower === 'técnico de i+d' || 
          roleLower === 'tecnico de i+d' || 
          roleLower === 'técnico i+d' || 
          roleLower === 'tecnico i+d' || 
          (deptLower === 'i+d' && (roleLower.includes('tecnico') || roleLower.includes('técnico')));

        if (isAdmin || isGerenteInnovacion || isJefeCalidad || isMejoraContinua || isTecnicoID) {
          recipients.push(p.email);
        }
      });

      // Include fallback improvement email
      recipients.push('mejoracontinua@sole.com.pe');

      return [...new Set(recipients)].filter(Boolean);
    } catch (e) {
      console.error('Error getting quality claim recipients:', e);
      return ['mejoracontinua@sole.com.pe'];
    }
  },

  /**
   * Notifies a new quality claim/observation.
   */
  sendQualityClaimEmail: async (record: ProductRecord, claim: any) => {
    const recipients = await outlookService.getQualityClaimRecipients(record);
    if (recipients.length === 0) return;

    const subject = `[RECLAMO DE CALIDAD] - ${record.codigoSAP} - ${claim.documentCategory}`;
    const title = 'Nuevo Reclamo de Calidad Registrado';

    const content = `
      <p>Estimado equipo,</p>
      <p>Se ha registrado un nuevo reclamo de calidad para el producto <strong>${record.codigoSAP} - ${record.descripcionSAP}</strong>.</p>
      
      <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 16px 0; border-radius: 8px;">
        <p style="margin: 0; font-weight: bold; color: #991b1b;">Detalles del Reclamo:</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px;">
          <tr>
            <td style="padding: 4px 0; font-weight: bold; color: #7f1d1d; width: 140px;">Registrado por:</td>
            <td style="padding: 4px 0; color: #4b5563;">${claim.responsibleName}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-weight: bold; color: #7f1d1d;">Tipo de Defecto:</td>
            <td style="padding: 4px 0; color: #4b5563;">${claim.defectType}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-weight: bold; color: #7f1d1d;">Documento / Arte:</td>
            <td style="padding: 4px 0; color: #4b5563;">${claim.documentCategory}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-weight: bold; color: #7f1d1d;">Fecha de Inicio:</td>
            <td style="padding: 4px 0; color: #4b5563;">${claim.claimStartDate}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-weight: bold; color: #7f1d1d; vertical-align: top;">Observaciones:</td>
            <td style="padding: 4px 0; color: #4b5563; white-space: pre-wrap;">${claim.comments || 'Sin comentarios adicionales'}</td>
          </tr>
        </table>
      </div>

      <p>Por favor, ingresar al portal para revisar y subsanar el error a la brevedad.</p>
    `;

    try {
      const actionUrl = outlookService.getModuleUrl(claim.trackingType);
      await outlookService.send(recipients, subject, outlookService.wrapInTemplate(title, content, actionUrl));
      toast.success('Notificación de reclamo de calidad enviada');
    } catch (e) {
      console.error('Error sending quality claim email:', e);
    }
  },

  /**
   * Notifies that a quality claim/observation has been resolved (subsanado).
   */
  sendQualityClaimResolvedEmail: async (record: ProductRecord, claim: any) => {
    const recipients = await outlookService.getQualityClaimRecipients(record);
    if (recipients.length === 0) return;

    const subject = `[RECLAMO SUBSANADO] - ${record.codigoSAP} - ${claim.documentCategory}`;
    const title = 'Reclamo de Calidad Subsanado';

    const content = `
      <p>Estimado equipo,</p>
      <p>Se informa que se ha subsanado el reclamo de calidad registrado para el producto <strong>${record.codigoSAP} - ${record.descripcionSAP}</strong>.</p>
      
      <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; margin: 16px 0; border-radius: 8px;">
        <p style="margin: 0; font-weight: bold; color: #065f46;">Detalles de la Subsanación:</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px;">
          <tr>
            <td style="padding: 4px 0; font-weight: bold; color: #065f46; width: 140px;">Subsanado por:</td>
            <td style="padding: 4px 0; color: #4b5563;">${claim.resolvedBy || 'Diseño'}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-weight: bold; color: #065f46;">Documento / Arte:</td>
            <td style="padding: 4px 0; color: #4b5563;">${claim.documentCategory}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-weight: bold; color: #065f46;">Fecha de Término:</td>
            <td style="padding: 4px 0; color: #4b5563;">${claim.claimEndDate || new Date().toISOString().split('T')[0]}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-weight: bold; color: #065f46; vertical-align: top;">Comentarios de Solución:</td>
            <td style="padding: 4px 0; color: #4b5563; white-space: pre-wrap;">${claim.resolutionComments || 'Sin comentarios adicionales'}</td>
          </tr>
        </table>
      </div>

      <p>Por favor, ingresar al portal para validar las correcciones realizadas.</p>
    `;

    try {
      const actionUrl = outlookService.getModuleUrl(claim.trackingType);
      await outlookService.send(recipients, subject, outlookService.wrapInTemplate(title, content, actionUrl));
      toast.success('Notificación de subsanación de reclamo enviada');
    } catch (e) {
      console.error('Error sending quality claim resolved email:', e);
    }
  }
};
