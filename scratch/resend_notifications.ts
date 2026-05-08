
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function resend() {
  console.log('Fetching products...');
  const { data: products, error } = await supabase
    .from('products')
    .select('*');

  if (error) {
    console.error('Error fetching products:', error);
    return;
  }

  console.log(`Found ${products.length} products.`);

  for (const product of products) {
    // Check for assignments
    const assignments = [
      { info: product.artworkAssignment, type: 'Artes' },
      { info: product.technicalAssignment, type: 'Fichas' },
      { info: product.commercialAssignment, type: 'Fichas' }
    ].filter(a => a.info && a.info.designer);

    for (const { info, type } of assignments) {
      console.log(`Resending assignment for ${product.codigoSAP} to ${info.designerEmail || info.designer}`);
      
      const email = info.designerEmail || (info.designer.includes('@') ? info.designer : 'onunez@sole.com.pe');
      
      // Call the Production API
      try {
        const response = await fetch('https://no-code-creation-portal-management.jppsfv.easypanel.host/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: email,
            subject: `[REENVÍO - ASIGNACIÓN] - Nuevo proyecto asignado: ${product.codigoSAP}`,
            body: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                <div style="background-color: #0f172a; padding: 24px; text-align: center; color: white;">
                  <h1>PORTAL DE GESTIÓN I+D</h1>
                </div>
                <div style="padding: 32px;">
                  <h2>Nueva Tarea Asignada (Reenvío)</h2>
                  <p>Se te ha asignado el seguimiento para: <strong>${product.codigoSAP} - ${product.descripcionSAP}</strong></p>
                  <p><strong>Módulo:</strong> ${type}</p>
                </div>
              </div>
            `
          })
        });
        console.log(`Response for ${product.codigoSAP}: ${response.status}`);
      } catch (err) {
        console.error(`Error sending for ${product.codigoSAP}:`, err);
      }
    }
  }
}

resend();
