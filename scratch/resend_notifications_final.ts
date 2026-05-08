
import fetch from 'node-fetch';

const products = [
  { sap: '3126EMB728', desc: 'CAJA PURIFICADOR AGUA SOLE PRESTIGE', email: 'rveliz@sole.com.pe', type: 'Artes' },
  { sap: '123', desc: 'Prueba calentador', email: 'rveliz@sole.com.pe', type: 'Artes' },
  { sap: 'prueba', desc: 'prueba', email: 'rveliz@sole.com.pe', type: 'Artes' },
  { sap: '3120SOLEGASNM08V2C', desc: 'CALENT. INST. GN MULTIPUNTO 8L C/AC', email: 'rveliz@sole.com.pe', type: 'Artes' },
  { sap: '4444', desc: '444wefw', email: 'rveliz@sole.com.pe', type: 'Artes' },
  { sap: '3126EMB729', desc: 'CAJA CARTUCHO PURIFICADOR FILSOL021V2C', email: 'rveliz@sole.com.pe', type: 'Artes' }
];

async function resend() {
  for (const p of products) {
    console.log(`Resending for ${p.sap}...`);
    try {
      const response = await fetch('https://no-code-creation-portal-management.jppsfv.easypanel.host/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: p.email,
          subject: `[REENVÍO - ASIGNACIÓN] - Nuevo proyecto asignado: ${p.sap}`,
          attachments: [],
          body: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
              <div style="background-color: #0f172a; padding: 24px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 20px; letter-spacing: 1px;">PORTAL DE GESTIÓN I+D</h1>
              </div>
              <div style="padding: 32px;">
                <h2 style="color: #1e293b; margin-top: 0; font-size: 18px; border-bottom: 2px solid #f1f5f9; padding-bottom: 12px;">Nueva Tarea Asignada (Reenvío)</h2>
                <div style="color: #475569; line-height: 1.6; font-size: 14px; margin-top: 20px;">
                  <p>Hola,</p>
                  <p>Se te ha asignado un nuevo proyecto para seguimiento:</p>
                  <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; margin: 16px 0;">
                    <p style="margin: 0;"><strong>Producto:</strong> ${p.sap} - ${p.desc}</p>
                    <p style="margin: 4px 0;"><strong>Módulo:</strong> ${p.type}</p>
                  </div>
                  <p>Por favor, ingresa al portal para revisar los detalles y cronogramas.</p>
                </div>
              </div>
              <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #f1f5f9;">
                <p style="margin: 0; color: #94a3b8; font-size: 12px;">&copy; 2026 MT Industrial S.A.C. - Todos los derechos reservados.</p>
              </div>
            </div>
          `
        })
      });
      console.log(`${p.sap}: ${response.status}`);
    } catch (err) {
      console.error(`Error for ${p.sap}:`, err);
    }
  }
}

resend();
