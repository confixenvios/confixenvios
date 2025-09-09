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

    // Build payload in the exact format requested
    const webhookPayload = {
      event: "shipment_created",
      shipmentId: fullShipment.tracking_code,
      clienteId: fullShipment.user_id ? `CID${fullShipment.user_id.substring(0, 8)}` : 'GUEST',
      status: "CRIADO",
      
      // Company branches data (required for CTE)
      empresa: {
        filial_principal: {
          cnpj: mainBranch.cnpj,
          razao_social: mainBranch.name,
          nome_fantasia: mainBranch.fantasy_name || mainBranch.name,
          endereco: {
            cep: mainBranch.cep,
            rua: mainBranch.street,
            numero: mainBranch.number,
            complemento: mainBranch.complement || '',
            bairro: mainBranch.neighborhood,
            cidade: mainBranch.city,
            estado: mainBranch.state
          },
          contato: {
            telefone: mainBranch.phone || '',
            email: mainBranch.email || ''
          }
        },
        filiais: branches?.map(branch => ({
          id: branch.id,
          cnpj: branch.cnpj,
          razao_social: branch.name,
          nome_fantasia: branch.fantasy_name || branch.name,
          endereco: {
            cep: branch.cep,
            rua: branch.street,
            numero: branch.number,
            complemento: branch.complement || '',
            bairro: branch.neighborhood,
            cidade: branch.city,
            estado: branch.state
          },
          contato: {
            telefone: branch.phone || '',
            email: branch.email || ''
          },
          is_matriz: branch.is_main_branch,
          ativa: branch.active
        })) || []
      },
      
      remetente: {
        nome: fullShipment.sender_address?.name || '',
        cpf_cnpj: shipmentData?.addressData?.sender?.document || '',
        telefone: shipmentData?.addressData?.sender?.phone || '',
        email: shipmentData?.addressData?.sender?.email || '',
        endereco: {
          cep: fullShipment.sender_address?.cep || '',
          rua: fullShipment.sender_address?.street || '',
          numero: fullShipment.sender_address?.number || '',
          bairro: fullShipment.sender_address?.neighborhood || '',
          cidade: fullShipment.sender_address?.city || '',
          estado: fullShipment.sender_address?.state || '',
          complemento: fullShipment.sender_address?.complement || ''
        }
      },
      
      destinatario: {
        nome: fullShipment.recipient_address?.name || '',
        cpf_cnpj: shipmentData?.addressData?.recipient?.document || '',
        telefone: shipmentData?.addressData?.recipient?.phone || '',
        email: shipmentData?.addressData?.recipient?.email || '',
        endereco: {
          cep: fullShipment.recipient_address?.cep || '',
          rua: fullShipment.recipient_address?.street || '',
          numero: fullShipment.recipient_address?.number || '',
          bairro: fullShipment.recipient_address?.neighborhood || '',
          cidade: fullShipment.recipient_address?.city || '',
          estado: fullShipment.recipient_address?.state || '',
          complemento: fullShipment.recipient_address?.complement || ''
        }
      },
      
      coleta: {
        tipo: fullShipment.pickup_option === 'dropoff' ? 'BALCÃO' : 'DOMICILIAR',
        local_coleta: fullShipment.pickup_option === 'dropoff' 
          ? 'Endereço do remetente' 
          : `${fullShipment.sender_address?.street}, ${fullShipment.sender_address?.number}`
      },
      
      mercadoria: {
        quantidade: shipmentData?.technicalData?.quantity || 1,
        valor_unitario: shipmentData?.merchandiseDetails?.unitValue || shipmentData?.quoteData?.unitValue || 0,
        valor_total: shipmentData?.merchandiseDetails?.totalValue || shipmentData?.quoteData?.totalMerchandiseValue || 0,
        descricao: shipmentData?.merchandiseDescription || shipmentData?.documentData?.merchandiseDescription || 'Mercadoria'
      },
      
      pacote: {
        peso: fullShipment.weight || 0,
        dimensoes: {
          comprimento: fullShipment.length || 0,
          largura: fullShipment.width || 0,
          altura: fullShipment.height || 0
        },
        formato: fullShipment.format || 'Caixa'
      },
      
      documento_fiscal: {
        tipo: shipmentData?.documentType === 'nfe' ? 'NOTA_FISCAL' : 'DECLARACAO',
        chave_nfe: shipmentData?.nfeKey || shipmentData?.nfeChave || null,
        valor_declarado: shipmentData?.merchandiseDetails?.totalValue || shipmentData?.quoteData?.totalMerchandiseValue || 0
      },
      
      frete: {
        tipo: fullShipment.selected_option === 'express' ? 'Expresso' : 'Econômico',
        valor: shipmentData?.deliveryDetails?.shippingPrice || shipmentData?.quoteData?.shippingQuote?.economicPrice || 0,
        prazo: shipmentData?.deliveryDetails?.estimatedDays ? `${shipmentData.deliveryDetails.estimatedDays} dias úteis` : 'A calcular'
      }
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