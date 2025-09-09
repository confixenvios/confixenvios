// Função para disparar webhook manualmente via código JavaScript
async function dispatchWebhookManually() {
  const { supabase } = await import('./src/integrations/supabase/client.ts');
  
  console.log('Iniciando disparo manual do webhook...');
  
  try {
    const { data, error } = await supabase.functions.invoke('shipment-webhook-dispatch', {
      body: {
        shipmentId: '3b69900c-748f-4e79-ba32-e80076c6adac',
        shipmentData: {
          addressData: {
            recipient: {
              document: '54007348000130',
              email: 'juriexpressgyn@gmail.com', 
              phone: '(62) 99919-1433'
            },
            sender: {
              document: '81746318104',
              email: 'ksobrgo@gmail.com',
              phone: '(62) 99919-1438'
            }
          },
          deliveryDetails: {
            shippingPrice: 1,
            estimatedDays: 5
          },
          merchandiseDetails: {
            totalValue: 125,
            unitValue: 125
          },
          technicalData: {
            quantity: 1
          },
          merchandiseDescription: 'Evelope de documentos',
          documentType: 'declaration',
          quoteData: {
            totalMerchandiseValue: 125,
            unitValue: 125,
            shippingQuote: {
              economicPrice: 1
            }
          }
        }
      }
    });

    if (error) {
      console.error('Erro ao disparar webhook:', error);
      return { success: false, error };
    } else {
      console.log('Webhook disparado com sucesso:', data);
      return { success: true, data };
    }
  } catch (err) {
    console.error('Erro na execução:', err);
    return { success: false, error: err };
  }
}

// Executar automaticamente
if (typeof window !== 'undefined') {
  // Se estiver no browser, executar após um delay
  setTimeout(dispatchWebhookManually, 2000);
} else {
  // Se estiver no Node.js
  dispatchWebhookManually();
}

export { dispatchWebhookManually };