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
    
    // Delay de 5 segundos para garantir que o CTE já foi gerado pela Webmania
    console.log('Shipment webhook dispatch - Aguardando 5 segundos para CTE ser processado...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log('Shipment webhook dispatch - Delay concluído, continuando processamento...');

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

    // Get CTE data from cte_emissoes table
    const { data: cteData, error: cteError } = await supabaseService
      .from('cte_emissoes')
      .select('chave_cte, numero_cte, serie, status, uuid_cte')
      .eq('shipment_id', shipmentId)
      .eq('status', 'aprovado')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cteError) {
      console.log('Shipment webhook dispatch - Error fetching CTE data (non-blocking):', cteError);
    }
    
    console.log('Shipment webhook dispatch - CTE data found:', cteData);

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
             fullShipment.quote_data?.sender?.email || '',
      inscricaoEstadual: fullShipment.quote_data?.addressData?.sender?.inscricaoEstadual || 
                        fullShipment.quote_data?.senderData?.inscricaoEstadual ||
                        fullShipment.quote_data?.sender?.inscricaoEstadual || ''
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
             fullShipment.quote_data?.recipient?.email || '',
      inscricaoEstadual: fullShipment.quote_data?.addressData?.recipient?.inscricaoEstadual || 
                        fullShipment.quote_data?.recipientData?.inscricaoEstadual ||
                        fullShipment.quote_data?.recipient?.inscricaoEstadual || ''
    };

    console.log('Shipment webhook dispatch - Sender personal data:', senderPersonalData);
    console.log('Shipment webhook dispatch - Recipient personal data:', recipientPersonalData);

    // Get company branches data (required for Expedidor info)
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
    
    // Get volumes information - can be array with detailed volumes or just quantity
    const volumesData = quoteData.volumes || quoteData.quoteData?.volumes || merchandiseDetails.volumes || [];
    const quantityVolumes = Array.isArray(volumesData) && volumesData.length > 0 
      ? volumesData.length 
      : (quoteData.quantity || 1);
    
    console.log('Volumes data found:', Array.isArray(volumesData) ? `${volumesData.length} volumes` : 'using quantity', quantityVolumes);
    
    // Get NFe key (only used when tipo = 1)
    const nfeKey = quoteData.fiscalData?.nfeAccessKey || 
                   quoteData.nfeKey || 
                   quoteData.nfeChave || 
                   quoteData.documentData?.nfeKey ||
                   quoteData.documentData?.fiscalData?.nfeAccessKey || '';

    // Helper function to clean numbers
    const onlyNumbers = (str: string) => str ? str.replace(/[^\d]/g, '') : '';

    // Get shipping price
    const valorFrete = deliveryDetails.shippingPrice || 
      deliveryDetails.totalPrice || 
      (fullShipment.selected_option === 'express' 
        ? (quoteData.quoteData?.shippingQuote?.expressPrice || quoteData.shippingQuote?.expressPrice || 0)
        : (quoteData.quoteData?.shippingQuote?.economicPrice || quoteData.shippingQuote?.economicPrice || 0));

    // Get declared value
    const valorDeclarado = merchandiseDetails.totalValue || 
                          quoteData.quoteData?.totalMerchandiseValue || 
                          quoteData.totalMerchandiseValue || 0;

    // Get estimated days
    const prazo = deliveryDetails.estimatedDays || 
                  quoteData.quoteData?.shippingQuote?.deliveryDays || 
                  quoteData.shippingQuote?.deliveryDays || 5;

    // Get carrier info
    const transportadoraNome = quoteData.quoteData?.shippingQuote?.tableName || 
                               quoteData.shippingQuote?.tableName || 
                               fullShipment.pricing_table_name || 'magalog';
    
    const transportadoraServico = fullShipment.selected_option || 'express';

    // Get merchandise description
    const descricaoMercadoria = quoteData.merchandiseDescription || 
                                quoteData.documentData?.merchandiseDescription || 
                                quoteData.fiscalData?.contentDescription || 
                                merchandiseDetails.description ||
                                'Mercadoria diversa';

    // Calculate total cubagem
    let totalCubagem = 0;
    if (merchandiseDetails.cubicWeight) {
      totalCubagem = parseFloat(merchandiseDetails.cubicWeight);
    } else if (merchandiseDetails.volumes && Array.isArray(merchandiseDetails.volumes)) {
      totalCubagem = merchandiseDetails.volumes.reduce((sum: number, vol: any) => {
        return sum + (parseFloat(vol.cubicWeight) || 0);
      }, 0);
    } else {
      for (let i = 0; i < quantityVolumes; i++) {
        const specificVolume = Array.isArray(volumesData) && volumesData[i];
        if (specificVolume) {
          const altura = parseFloat(specificVolume.height) / 100;
          const largura = parseFloat(specificVolume.width) / 100;
          const comprimento = parseFloat(specificVolume.length) / 100;
          totalCubagem += altura * largura * comprimento;
        } else {
          const cubagem = ((fullShipment.length || 0) * (fullShipment.width || 0) * (fullShipment.height || 0)) / 1000000 / quantityVolumes;
          totalCubagem += cubagem;
        }
      }
    }
    totalCubagem = parseFloat(totalCubagem.toFixed(3));

    // Determine tipo: "1" = Nota Fiscal, "3" = Declaração de Conteúdo
    const tipo = fullShipment.document_type === 'declaracao_conteudo' ? "3" : "1";

    // Build FLAT webhook payload (format expected by n8n)
    const webhookPayload: Record<string, any> = {
      // Valores principais
      valorTotal: valorFrete,
      mercadoria_valorDeclarado: valorDeclarado,
      remessa_prazo: prazo,
      transportadora_nome: transportadoraNome,
      transportadora_servico: transportadoraServico,
      cnpjTransportadorDestinto: '',
      expedidor: mainBranch.fantasy_name || mainBranch.name || 'Juri Express',
      
      // Remetente
      remetente_nome: fullShipment.sender_address?.name || '',
      remetente_documento: senderPersonalData.document || '',
      remetente_inscricaoEstadual: senderPersonalData.inscricaoEstadual || '',
      remetente_email: senderPersonalData.email || '',
      remetente_telefone: senderPersonalData.phone || '',
      remetente_endereco: fullShipment.sender_address?.street || '',
      remetente_numero: fullShipment.sender_address?.number || '',
      remetente_complemento: fullShipment.sender_address?.complement || '',
      remetente_bairro: fullShipment.sender_address?.neighborhood || '',
      remetente_cidade: fullShipment.sender_address?.city || '',
      remetente_estado: fullShipment.sender_address?.state || '',
      remetente_cep: fullShipment.sender_address?.cep || '',
      
      // Destinatário
      destinatario_nome: fullShipment.recipient_address?.name || '',
      destinatario_documento: recipientPersonalData.document || '',
      destinatario_inscricaoEstadual: recipientPersonalData.inscricaoEstadual || '',
      destinatario_email: recipientPersonalData.email || '',
      destinatario_telefone: recipientPersonalData.phone || '',
      destinatario_endereco: fullShipment.recipient_address?.street || '',
      destinatario_numero: fullShipment.recipient_address?.number || '',
      destinatario_complemento: fullShipment.recipient_address?.complement || '',
      destinatario_bairro: fullShipment.recipient_address?.neighborhood || '',
      destinatario_cidade: fullShipment.recipient_address?.city || '',
      destinatario_estado: fullShipment.recipient_address?.state || '',
      destinatario_cep: fullShipment.recipient_address?.cep || '',
      
      // Tipo documento: "1" = Nota, "3" = Declaração
      tipo: tipo,
      
      // Chave da nota fiscal (só usado quando tipo = "1")
      chaveNotaFiscal: tipo === "1" ? nfeKey : '',
      
      // Descrição da mercadoria
      descricaoMercadoria: descricaoMercadoria,
      
      // Dados da remessa
      remessa_peso: fullShipment.weight || 0,
      remessa_cubagemTotal: totalCubagem,
      remessa_largura: fullShipment.width || 0,
      remessa_comprimento: fullShipment.length || 0,
      remessa_altura: fullShipment.height || 0,
      remessa_formato: fullShipment.format || 'normal',
      
      // IDs e CTE
      shipmentId: shipmentId,
      trackingCode: fullShipment.tracking_code || '',
      cte_chave: cteData?.chave_cte || fullShipment.cte_key || '',
      cte_numero: cteData?.numero_cte || '',
      cte_serie: cteData?.serie || '1'
    };

    // Add volume-specific data dynamically (volume1_, volume2_, volume3_, etc.)
    for (let i = 0; i < quantityVolumes && i < 10; i++) {
      const volumeNum = i + 1;
      const merchandiseVolume = merchandiseDetails.volumes && merchandiseDetails.volumes[i];
      const specificVolume = Array.isArray(volumesData) && volumesData[i];
      
      let pesoVolume, cubagemVolume, altura, largura, comprimento, tipoMercadoria;
      
      if (merchandiseVolume) {
        pesoVolume = parseFloat(merchandiseVolume.weight) || 0;
        cubagemVolume = parseFloat((merchandiseVolume.cubicWeight || 0).toFixed(3));
        altura = parseFloat(merchandiseVolume.height) || 0;
        largura = parseFloat(merchandiseVolume.width) || 0;
        comprimento = parseFloat(merchandiseVolume.length) || 0;
        tipoMercadoria = merchandiseVolume.type || fullShipment.format || 'normal';
      } else if (specificVolume) {
        pesoVolume = parseFloat(specificVolume.weight) || 0;
        altura = parseFloat(specificVolume.height) || 0;
        largura = parseFloat(specificVolume.width) || 0;
        comprimento = parseFloat(specificVolume.length) || 0;
        cubagemVolume = parseFloat(((altura/100) * (largura/100) * (comprimento/100)).toFixed(3));
        tipoMercadoria = specificVolume.type || fullShipment.format || 'normal';
      } else {
        pesoVolume = (fullShipment.weight || 0) / quantityVolumes;
        cubagemVolume = parseFloat((totalCubagem / quantityVolumes).toFixed(3));
        altura = fullShipment.height || 0;
        largura = fullShipment.width || 0;
        comprimento = fullShipment.length || 0;
        tipoMercadoria = fullShipment.format || 'normal';
      }

      webhookPayload[`volume${volumeNum}_peso`] = pesoVolume;
      webhookPayload[`volume${volumeNum}_comprimento`] = comprimento;
      webhookPayload[`volume${volumeNum}_largura`] = largura;
      webhookPayload[`volume${volumeNum}_altura`] = altura;
      webhookPayload[`volume${volumeNum}_cubagemVolume`] = cubagemVolume;
      webhookPayload[`volume${volumeNum}_tipoMercadoria`] = tipoMercadoria;
    }

    console.log('Shipment webhook dispatch - FLAT Payload prepared:', JSON.stringify(webhookPayload, null, 2));

    // Dispatch webhook as query parameters (form data style for n8n)
    // n8n expects data in query.* format, so we send as JSON but n8n will parse it
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
