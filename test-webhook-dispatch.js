// Teste manual do webhook dispatch para a remessa ID2025CJULKS
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dhznyjtisfdxzbnzinab.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRoem55anRpc2ZkeHpibnppbmFiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjQwMzI2MCwiZXhwIjoyMDcxOTc5MjYwfQ.X5O7LkU9vdlk7QdGm2vzWCpN5tTW5tRPeDkUf-gpafU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testWebhookDispatch() {
  console.log('Testando webhook dispatch para remessa ID2025CJULKS...');
  
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
      console.error('Erro ao chamar webhook:', error);
    } else {
      console.log('Webhook executado com sucesso:', data);
    }
  } catch (err) {
    console.error('Erro na execução:', err);
  }
}

testWebhookDispatch();