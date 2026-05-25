
import { toast } from 'sonner';
import { ProductRecord, DocumentVersion, AssignmentInfo, InfoRequest, CalendarTask } from '../types';
import { SupabaseService } from '../lib/SupabaseService';

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

  /**
   * Helper to generate a deep link to the portal
   */
  getModuleUrl: (type: string) => {
    const t = type?.toLowerCase() || '';
    let moduleParam = 'artwork_followup'; // default
    if (t.includes('technical') || t.includes('fichas') || t.includes('técnica')) moduleParam = 'technical_datasheet';
    if (t.includes('commercial') || t.includes('comercial')) moduleParam = 'commercial_sheet';
    
    // In browser context
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://portal-management.mtindustrial.com.pe';
    return `${origin}?module=${moduleParam}`;
  },

  /**
   * Generic send method
   */
  send: async (to: string | string[], subject: string, htmlBody: string) => {
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, body: htmlBody }),
      });

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
  getDepartmentEmailsForRecord: async (department: string, record: ProductRecord): Promise<string[]> => {
    try {
      const profiles = await SupabaseService.getProfiles();
      return (profiles || [])
        .filter(p => {
          if (p.department?.toLowerCase() !== department.toLowerCase() || !p.is_active) return false;
          // Global access if no scopes defined or admin
          if (p.role === 'admin' || !p.scopes || p.scopes.length === 0) return true;
          
          return p.scopes.some((scope: any) => {
            const matchBrand = !scope.brand || scope.brand === record.marca;
            const matchLine = !scope.line || scope.line === record.linea;
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
    const recipients = [...new Set([...providerRecipients, designerEmail, ...adminEmails].filter(Boolean))];
    if (recipients.length === 0) return;

    const subject = `[APROBACIÓN FINAL] - ${record.codigoSAP} - ${record.descripcionSAP}`;
    const title = 'Documento Aprobado';
    const content = `
      <p>Estimados,</p>
      <p>Se les informa que el documento de <strong>${moduleType}</strong> para el producto <strong>${record.codigoSAP}</strong> ha sido aprobado por todas las áreas correspondientes.</p>
      <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 12px; margin: 16px 0;">
        <p style="margin: 0;"><strong>Código SAP:</strong> ${record.codigoSAP}</p>
        <p style="margin: 4px 0;"><strong>Descripción:</strong> ${record.descripcionSAP}</p>
        <p style="margin: 4px 0;"><strong>Versión:</strong> V${version.version}</p>
      </div>
      <p>Ya pueden proceder con el siguiente paso del proceso.</p>
    `;

    try {
      const actionUrl = outlookService.getModuleUrl(moduleType);
      await outlookService.send(recipients, subject, outlookService.wrapInTemplate(title, content, actionUrl));
      toast.success('Notificación de aprobación enviada');
    } catch (e) {
      toast.error('Error al enviar notificación de aprobación');
    }
  },

  /**
   * Notifies an intermediate stage approval.
   */
  sendStageApprovalEmail: async (record: ProductRecord, version: DocumentVersion, stage: string, stageName: string, comments: string, user: string, moduleType: string = 'artwork') => {
    const subject = `[APROBACIÓN ${stage}] - ${record.codigoSAP} - ${record.descripcionSAP}`;
    const title = `Documento Aprobado (${stage})`;
    
    // Determine the next stage and its recipients
    let nextRecipients: string[] = [];
    if (stage === 'I+D') {
      nextRecipients = await outlookService.getDepartmentEmailsForRecord('Marketing', record);
    } else if (stage === 'MKT') {
      nextRecipients = record.correoProveedor || [];
    } else if (stage === 'PROV') {
      nextRecipients = await outlookService.getDepartmentEmailsForRecord('Planeamiento', record);
    }

    const content = `
      <p>Se ha registrado la <strong>${stageName}</strong> para el producto <strong>${record.codigoSAP}</strong>.</p>
      <p><strong>Versión:</strong> V${version.version}</p>
      <p><strong>Aprobado por:</strong> ${user}</p>
      ${comments ? `<p><strong>Comentarios:</strong> ${comments}</p>` : ''}
      <p>El flujo continuará a la siguiente etapa de revisión.</p>
    `;

    try {
      const adminEmails = await outlookService.getAdminEmails();
      const designerEmail = record.artworkAssignment?.designerEmail || 
                            record.technicalAssignment?.designerEmail || 
                            record.commercialAssignment?.designerEmail || 
                            '';
      
      const recipients = [...new Set([designerEmail, ...adminEmails, ...nextRecipients])].filter(Boolean);
      const actionUrl = outlookService.getModuleUrl(moduleType);
      await outlookService.send(recipients, subject, outlookService.wrapInTemplate(title, content, actionUrl));
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
    const content = `
      <p>Hola,</p>
      <p>Se han registrado observaciones en el flujo de <strong>${type}</strong> para el producto <strong>${record.codigoSAP}</strong> durante la etapa de <strong>${stage}</strong>.</p>
      <div style="background-color: #fff7ed; border-left: 4px solid #ea580c; padding: 16px; margin: 16px 0;">
        <p style="margin: 0; font-weight: bold; color: #9a3412;">Comentarios:</p>
        <p style="margin: 8px 0 0; font-style: italic;">"${comments || 'Sin comentarios adicionales'}"</p>
      </div>
      <p>Por favor, revisar y subir una nueva versión corregida.</p>
    `;

    try {
      const resolvedDesigner = await outlookService.resolveEmail(designerEmail);
      const adminEmails = await outlookService.getAdminEmails();
      const recipients = [...new Set([...resolvedDesigner, ...adminEmails])].filter(Boolean);
      
      const actionUrl = outlookService.getModuleUrl(type);
      await outlookService.send(recipients, subject, outlookService.wrapInTemplate(title, content, actionUrl));
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
      await outlookService.send(recipients, subject, outlookService.wrapInTemplate(title, content, actionUrl));
    } catch (e) {
      console.error(e);
    }
  },

  /**
   * Notifies an assignment.
   */
  sendAssignmentEmail: async (info: { code?: string; description: string; brand?: string }, assignee: string, type: string) => {
    const subject = `[ASIGNACIÓN] - Nuevo pendiente asignado: ${info.code || ''} ${info.description}`;
    const title = 'Nueva Tarea Asignada';
    const content = `
      <p>Hola <strong>${assignee}</strong>,</p>
      <p>Se te ha asignado un nuevo pendiente en el módulo de <strong>${type}</strong>.</p>
      <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px; margin: 16px 0;">
        ${info.code ? `<p style="margin: 0;"><strong>Código/ID:</strong> ${info.code}</p>` : ''}
        <p style="margin: 4px 0;"><strong>Descripción:</strong> ${info.description}</p>
        ${info.brand ? `<p style="margin: 4px 0;"><strong>Marca:</strong> ${info.brand}</p>` : ''}
      </div>
      <p>Por favor, revisa los detalles en el portal.</p>
    `;

    try {
      const assigneeEmails = await outlookService.resolveEmail(assignee);
      const adminEmails = await outlookService.getAdminEmails();
      const recipients = [...new Set([...assigneeEmails, ...adminEmails])].filter(Boolean);
      
      const actionUrl = outlookService.getModuleUrl(type);
      await outlookService.send(recipients, subject, outlookService.wrapInTemplate(title, content, actionUrl));
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
    const content = `
      <p>Se ha iniciado un nuevo flujo de revisión para el producto <strong>${record.codigoSAP} - ${record.descripcionSAP}</strong>.</p>
      <div style="background-color: #f1f5f9; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 0;"><strong>Módulo:</strong> ${type}</p>
        <p style="margin: 4px 0;"><strong>Versión:</strong> V${version.version}</p>
        <p style="margin: 4px 0;"><strong>Subido por:</strong> ${version.uploadedBy}</p>
        <p style="margin: 4px 0;"><strong>Descripción:</strong> ${version.changeDescription || 'Sin descripción'}</p>
      </div>
      <p>Por favor, ingrese al portal para realizar la aprobación técnica o de marketing según corresponda.</p>
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
      await outlookService.send(recipients, subject, outlookService.wrapInTemplate(title, content, actionUrl));
      toast.info('Notificación de inicio de flujo enviada');
    } catch (e) {
      console.error(e);
    }
  },

  /**
   * Notifies that a new tracking record has been created.
   */
  sendNewTrackingEmail: async (info: { code?: string; description: string; supplier?: string; brand?: string }, type: string) => {
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
      </div>
      <p>El siguiente paso es realizar las asignaciones correspondientes o cargar documentación.</p>
    `;

    try {
      const adminEmails = await outlookService.getAdminEmails();
      const idEmails = await outlookService.getDepartmentEmailsForRecord('I+D', null as any); // fallback
      const recipients = [...new Set([...adminEmails, ...idEmails])].filter(Boolean);
      
      const actionUrl = outlookService.getModuleUrl(type);
      await outlookService.send(recipients, subject, outlookService.wrapInTemplate(title, content, actionUrl));
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
  }
};
