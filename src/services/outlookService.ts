
import { toast } from 'sonner';
import { ProductRecord, DocumentVersion } from '../types';

/**
 * Service to simulate Outlook integration for sending automated emails.
 * Real implementation would use Microsoft Graph API with OAuth2.
 */
export const outlookService = {
  /**
   * Simulates sending an approval email with attachments.
   */
  sendApprovalEmail: async (
    record: ProductRecord,
    version: DocumentVersion,
    moduleType: string
  ) => {
    const sender = 'choyos@sole.com.pe';
    const recipients = record.correoProveedor || [];
    
    if (recipients.length === 0) {
      console.warn('No recipients found for record:', record.codigoSAP);
      return;
    }

    const attachments = version.files.map(f => f.name).join(', ');
    const subject = `[APROBACIÓN PLANEAMIENTO] - ${record.codigoSAP} - ${record.descripcionSAP}`;
    
    const body = `
      Estimados,
      
      Se les informa que todas las áreas han aprobado el documento de ${moduleType} 
      para el producto ${record.codigoSAP}.
      
      Versión: V${version.version}
      Archivos adjuntos: ${attachments}
      
      Saludos,
      Equipo de I+D
      
    `;

    console.log(`[OUTLOOK SIMULATION] From: ${sender}`);
    console.log(`[OUTLOOK SIMULATION] To: ${recipients.join(', ')}`);
    console.log(`[OUTLOOK SIMULATION] Subject: ${subject}`);
    console.log(`[OUTLOOK SIMULATION] Body: ${body}`);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    toast.success(`Correo enviado exitosamente desde ${sender} a ${recipients[0]}...`, {
      description: `Se adjuntaron ${version.files.length} documentos.`,
      duration: 5000,
    });

    return true;
  }
};
