
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

async function getAzureAccessToken() {
  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;

  const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const params = new URLSearchParams();
  params.append('client_id', clientId!);
  params.append('scope', 'https://graph.microsoft.com/.default');
  params.append('client_secret', clientSecret!);
  params.append('grant_type', 'client_credentials');

  const response = await fetch(url, {
    method: 'POST',
    body: params,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });

  const data = await response.json() as any;
  if (!response.ok) {
    throw new Error(`Failed to get access token: ${data.error_description || data.error}`);
  }
  return data.access_token;
}

async function sendDirectTestEmail() {
  const userEmail = process.env.AZURE_MAIL_USER;
  const targetEmail = 'onunez@sole.com.pe';
  
  console.log(`Attempting to send direct test email from ${userEmail} to ${targetEmail}...`);

  try {
    const accessToken = await getAzureAccessToken();
    console.log('Access token acquired successfully.');
    
    const url = `https://graph.microsoft.com/v1.0/users/${userEmail}/sendMail`;

    const emailPayload = {
      message: {
        subject: "[PRUEBA DIRECTA] - Verificación de Credenciales RyD_GrupoSole",
        body: {
          contentType: "HTML",
          content: `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #ccc; border-radius: 8px;">
              <h2>Prueba de Conectividad Directa</h2>
              <p>Este correo ha sido enviado utilizando las credenciales locales de Azure AD.</p>
              <p><strong>Remitente:</strong> ${userEmail}</p>
              <p><strong>Fecha:</strong> ${new Date().toLocaleString()}</p>
              <p>Si recibes este correo, las credenciales son correctas y el buzón tiene permisos para enviar.</p>
            </div>
          `,
        },
        toRecipients: [
          { emailAddress: { address: targetEmail } },
        ],
        ccRecipients: [
          { emailAddress: { address: 'RyD_GrupoSole@sole.com.pe' } }
        ]
      },
      saveToSentItems: "true",
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    if (response.ok) {
      console.log('Email sent successfully!');
    } else {
      const errorData = await response.json() as any;
      console.error('Graph API Error:', JSON.stringify(errorData, null, 2));
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
}

sendDirectTestEmail();
