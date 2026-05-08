
import { toast } from 'sonner';
import { ProductRecord, DocumentVersion, AssignmentInfo, InfoRequest } from '../types';

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
   * Notifies final approval (Planning).
   */
  sendApprovalEmail: async (record: ProductRecord, version: DocumentVersion, moduleType: string) => {
    const recipients = record.correoProveedor || [];
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
      await outlookService.send(recipients, subject, outlookService.wrapInTemplate(title, content));
      toast.success('Notificación de aprobación enviada');
    } catch (e) {
      toast.error('Error al enviar notificación de aprobación');
    }
  },

  /**
   * Notifies an observation/rejection.
   */
  sendObservationEmail: async (record: ProductRecord, stage: string, comments: string, type: string) => {
    // Usually notify the designer or the person who uploaded it.
    // For now, let's notify a default coordination email or the designer if assigned.
    const designerEmail = record.artworkAssignment?.designer || 'coordinacion_id@sole.com.pe';
    
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
      await outlookService.send(designerEmail, subject, outlookService.wrapInTemplate(title, content));
      toast.info('Notificación de observación enviada al responsable');
    } catch (e) {
      console.error(e);
    }
  },

  /**
   * Notifies a new info request.
   */
  sendInfoRequestEmail: async (record: ProductRecord, request: InfoRequest, type: string) => {
    // Notify the product manager or purchaser (usually the one who can provide info)
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
      // In a real scenario, we'd have the PM's email. Using buzon as fallback.
      await outlookService.send('coordinacion_id@sole.com.pe', subject, outlookService.wrapInTemplate(title, content));
    } catch (e) {
      console.error(e);
    }
  },

  /**
   * Notifies an assignment.
   */
  sendAssignmentEmail: async (record: ProductRecord, designer: string, type: string) => {
    const subject = `[ASIGNACIÓN] - Nuevo proyecto asignado: ${record.codigoSAP}`;
    const title = 'Nueva Tarea Asignada';
    const content = `
      <p>Hola <strong>${designer}</strong>,</p>
      <p>Se te ha asignado un nuevo proyecto en el módulo de <strong>${type}</strong>.</p>
      <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px; margin: 16px 0;">
        <p style="margin: 0;"><strong>Código SAP:</strong> ${record.codigoSAP}</p>
        <p style="margin: 4px 0;"><strong>Descripción:</strong> ${record.descripcionSAP}</p>
        <p style="margin: 4px 0;"><strong>Marca:</strong> ${record.marca}</p>
      </div>
      <p>Por favor, revisa el cronograma y los documentos adjuntos en el portal.</p>
    `;

    try {
      // Map name to email if possible, or use the name if it's already an email
      const targetEmail = designer.includes('@') ? designer : 'diseño_grafico@sole.com.pe';
      await outlookService.send(targetEmail, subject, outlookService.wrapInTemplate(title, content));
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
      await outlookService.send('coordinacion_id@sole.com.pe', subject, outlookService.wrapInTemplate(title, content));
      toast.info('Notificación de inicio de flujo enviada');
    } catch (e) {
      console.error(e);
    }
  }
};
