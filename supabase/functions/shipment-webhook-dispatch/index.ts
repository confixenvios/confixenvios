import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { shipmentId, shipmentData } = await req.json();
    
    console.log('Shipment webhook dispatch - Starting for shipment ID:', shipmentId);
    console.log('Shipment webhook dispatch - Data:', shipmentData);

    // Create Supabase service client
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get active integration for webhook dispatch
    const { data: integration, error: integrationError } = await supabaseService
      .from('integrations')
      .select('webhook_url, secret_key')
      .eq('active', true)
      .single();

    if (integrationError || !integration?.webhook_url) {
      console.log('Shipment webhook dispatch - No active integration found');
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'No active webhook integration configured' 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Get full shipment data with addresses
    const { data: fullShipment, error: shipmentError } = await supabaseService
      .from('shipments')
      .select(`
        *,
        sender_address:addresses!shipments_sender_address_id_fkey(*),
        recipient_address:addresses!shipments_recipient_address_id_fkey(*)
      `)
      .eq('id', shipmentId)
      .single();

    if (shipmentError || !fullShipment) {
      console.error('Shipment webhook dispatch - Error fetching shipment:', shipmentError);
      throw new Error('Shipment not found');
    }

    // Extract personal data from quote_data (where it's usually stored)
    const senderPersonalData = {
      document: fullShipment.quote_data?.addressData?.sender?.document || 
                fullShipment.quote_data?.senderData?.document ||
                fullShipment.quote_data?.sender?.document || '',
      phone: fullShipment.quote_data?.addressData?.sender?.phone || 
             fullShipment.quote_data?.senderData?.phone ||
             fullShipment.quote_data?.sender?.phone || '',
      email: fullShipment.quote_data?.addressData?.sender?.email || 
             fullShipment.quote_data?.senderData?.email ||
             fullShipment.quote_data?.sender?.email || ''
    };

    const recipientPersonalData = {
      document: fullShipment.quote_data?.addressData?.recipient?.document || 
                fullShipment.quote_data?.recipientData?.document ||
                fullShipment.quote_data?.recipient?.document || '',
      phone: fullShipment.quote_data?.addressData?.recipient?.phone || 
             fullShipment.quote_data?.recipientData?.phone ||
             fullShipment.quote_data?.recipient?.phone || '',
      email: fullShipment.quote_data?.addressData?.recipient?.email || 
             fullShipment.quote_data?.recipientData?.email ||
             fullShipment.quote_data?.recipient?.email || ''
    };

    console.log('Shipment webhook dispatch - Sender personal data:', senderPersonalData);
    console.log('Shipment webhook dispatch - Recipient personal data:', recipientPersonalData);

    // Get pricing table information (for CNPJ do transportador)
    // Try to get table ID from shipment or from quote_data
    const tableId = fullShipment.pricing_table_id || 
                    fullShipment.quote_data?.quoteData?.shippingQuote?.tableId ||
                    fullShipment.quote_data?.shippingQuote?.tableId;
    
    console.log('Pricing table ID found:', tableId);
    
    let transportadorCNPJ = '';
    
    if (tableId) {
      const { data: pricingTable, error: pricingTableError } = await supabaseService
        .from('pricing_tables')
        .select('cnpj, name')
        .eq('id', tableId)
        .single();
      
      if (pricingTableError) {
        console.error('Error fetching pricing table:', pricingTableError);
      } else if (pricingTable) {
        transportadorCNPJ = pricingTable.cnpj || '';
        console.log('✓ Transportador CNPJ encontrado:', transportadorCNPJ, 'da tabela:', pricingTable.name);
      } else {
        console.log('⚠ Pricing table not found for ID:', tableId);
      }
    } else {
      console.log('⚠ No pricing table ID available in shipment data');
    }
    
    // Get company branches data (required information)
    const { data: branches, error: branchesError } = await supabaseService
      .from('company_branches')
      .select('*')
      .eq('active', true)
      .order('is_main_branch', { ascending: false });

    if (branchesError) {
      console.error('Shipment webhook dispatch - Error fetching branches:', branchesError);
      throw new Error('Failed to fetch company branches data');
    }

    const mainBranch = branches?.find(b => b.is_main_branch) || branches?.[0];
    
    if (!mainBranch) {
      console.error('Shipment webhook dispatch - No company branch found');
      throw new Error('No company branch configured - required for CTE dispatch');
    }

    // Extract data from fullShipment.quote_data
    const quoteData = fullShipment.quote_data || {};
    const addressData = quoteData.addressData || {};
    const merchandiseDetails = quoteData.merchandiseDetails || {};
    const deliveryDetails = quoteData.deliveryDetails || {};
    
    // Get quantity of volumes (default to 1)
    const quantityVolumes = quoteData.quantity || quoteData.volumes || 1;
    
    // Get NFe key from multiple possible locations
    const nfeKey = quoteData.fiscalData?.nfeAccessKey || 
                   quoteData.nfeKey || 
                   quoteData.nfeChave || 
                   quoteData.documentData?.nfeKey ||
                   quoteData.documentData?.fiscalData?.nfeAccessKey || '';

    // Helper function to extract document from different formats  
    const extractDocument = (doc: string) => {
      if (!doc) return '';
      return doc.replace(/[^\d]/g, ''); // Remove formatting
    };

    // Helper function to format address for CTE
    const formatAddress = (address: any, personalData: any) => ({
      cpf: extractDocument(personalData.document || '').length === 11 ? extractDocument(personalData.document || '') : '',
      cnpj: extractDocument(personalData.document || '').length === 14 ? extractDocument(personalData.document || '') : '',
      inscricaoEstadual: '',
      nome: address?.name || '',
      razaoSocial: address?.name || '',
      telefone: personalData.phone || '',
      email: personalData.email || '',
      Endereco: {
        cep: address?.cep?.replace(/[^\d]/g, '') || '',
        logradouro: address?.street || '',
        numero: address?.number || '',
        complemento: address?.complement || '',
        pontoReferencia: address?.reference || '',
        bairro: address?.neighborhood || '',
        nomeCidade: address?.city || '',
        siglaEstado: address?.state || '',
        idCidadeIBGE: '',
        pais: 'Brasil',
        lat: '',
        lng: ''
      }
    });

    // Build CTE payload in the exact format requested
    const webhookPayload = {
      idLote: fullShipment.tracking_code || '',
      cnpjEmbarcadorOrigem: mainBranch.cnpj.replace(/[^\d]/g, ''),
      cnpjTransportador: transportadorCNPJ ? transportadorCNPJ.replace(/[^\d]/g, '') : '',
      sincPLP: 0,
      retornoEDI: true,
      listaSolicitacoes: [
        {
          idSolicitacaoInterno: fullShipment.tracking_code || '',
          idServico: fullShipment.selected_option === 'express' ? 1 : 2,
          vlicms: 0,
          vladicional: 0,
          tpvalor: true,
          nrordencargaexterno: 1,
          QtCarga: 1,
          tpgeramdfe: false,
          dtPrazoInicio: new Date().toISOString(),
          dtPrazoFim: new Date(Date.now() + (deliveryDetails.estimatedDays || 5) * 24 * 60 * 60 * 1000).toISOString(),
          
          // Tomador do Serviço (quem paga o frete - no caso, o remetente)
          TomadorServico: formatAddress(fullShipment.sender_address, senderPersonalData),
          
          // Remetente
          Remetente: formatAddress(fullShipment.sender_address, senderPersonalData),
          
          // Destinatário  
          Destinatario: formatAddress(fullShipment.recipient_address, recipientPersonalData),
          
          // Recebedor (mesmo que destinatário)
          Recebedor: formatAddress(fullShipment.recipient_address, recipientPersonalData),
          
          // Expedidor (mesmo que remetente)
          Expedidor: formatAddress(fullShipment.sender_address, senderPersonalData),
          
         LogisticaReversa: {
            flagColetaPortaria: fullShipment.pickup_option === 'dropoff',
            flagColetaSemEmbalagem: false
          },
          
          DadosAgendamento: {
            dtAgendamento: new Date().toISOString().split('T')[0],
            periodo: 1
          },
          
           listaOperacoes: [
             {
               idTipoDocumento: 0,
               nroNotaFiscal: 0,
               serieNotaFiscal: 0,
               dtEmissaoNotaFiscal: new Date().toISOString(),
               chaveNotaFiscal: nfeKey || '',
              nroCarga: fullShipment.tracking_code || '',
              nroPedido: fullShipment.tracking_code || '',
              qtdeVolumes: quantityVolumes,
              qtdeItens: 1,
              pesoTotal: fullShipment.weight || 0,
              cubagemTotal: ((fullShipment.length || 0) * (fullShipment.width || 0) * (fullShipment.height || 0)) / 1000000, // m³
              valorMercadoria: merchandiseDetails.totalValue || quoteData.quoteData?.totalMerchandiseValue || 0,
              valorICMS: 0,
              valorPendenteCompra: 0,
              
              // Gerar lista de volumes dinamicamente baseado na quantidade
              listaVolumes: Array.from({ length: quantityVolumes }, (_, index) => {
                const volumeNumber = index + 1;
                const trackingCode = fullShipment.tracking_code || '';
                const pesoVolume = (fullShipment.weight || 0) / quantityVolumes;
                const cubagemVolume = ((fullShipment.length || 0) * (fullShipment.width || 0) * (fullShipment.height || 0)) / 1000000 / quantityVolumes;
                const contentDescription = quoteData.merchandiseDescription || 
                                          quoteData.documentData?.merchandiseDescription || 
                                          quoteData.fiscalData?.contentDescription || 
                                          'Mercadoria diversa';
                
                return {
                  idVolume: volumeNumber,
                  nroEtiqueta: `${trackingCode}-${volumeNumber}`,
                  codigoBarras: `${trackingCode}-${volumeNumber}`,
                  pesoVolume: pesoVolume,
                  cubagemVolume: cubagemVolume,
                  altura: (fullShipment.height || 0) / 100, // Convert cm to m
                  largura: (fullShipment.width || 0) / 100,
                  comprimento: (fullShipment.length || 0) / 100,
                  conteudo: contentDescription
                };
              }),
              
              listaItens: [
                {
                  idItem: 1,
                  nroEtiqueta: fullShipment.tracking_code || '',
                  codigoItem: 'ITEM001',
                  descricaoItem: quoteData.merchandiseDescription || 
                                quoteData.documentData?.merchandiseDescription || 
                                quoteData.fiscalData?.contentDescription || 
                                'Mercadoria diversa',
                  tipoItem: 'GERAL',
                  qtde: '1'
                }
              ],
              
              chaveCTeAnterior: '',
              linkCTe: '',
              base64CTe: ''
            }
          ]
        }
      ]
    };

    console.log('Shipment webhook dispatch - Payload prepared:', JSON.stringify(webhookPayload, null, 2));

    // Dispatch webhook
    const webhookResponse = await fetch(integration.webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Confix-Envios/1.0',
        ...(integration.secret_key && { 'Authorization': `Bearer ${integration.secret_key}` })
      },
      body: JSON.stringify(webhookPayload)
    });

    const responseText = await webhookResponse.text();
    console.log('Shipment webhook dispatch - Response status:', webhookResponse.status);
    console.log('Shipment webhook dispatch - Response body:', responseText);

    // Log webhook dispatch
    await supabaseService.from('webhook_logs').insert({
      event_type: 'shipment_created',
      shipment_id: shipmentId,
      payload: webhookPayload,
      response_status: webhookResponse.status,
      response_body: { 
        webhook_dispatched: true, 
        response: responseText,
        integration_url: integration.webhook_url
      }
    });

    return new Response(JSON.stringify({ 
      success: true,
      webhook_status: webhookResponse.status,
      message: 'Webhook dispatched successfully'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('Shipment webhook dispatch - Error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});