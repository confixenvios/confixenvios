import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// URL do webhook para gerar etiqueta
const LABEL_WEBHOOK_URL = "https://webhook.grupoconfix.com/webhook/f5d4f949-29fd-4200-b7a1-b9a140e8c16c";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { shipmentId, shipmentData } = await req.json();
    
    console.log('🚀 [AUTO-LABEL] Iniciando disparo automático para shipment:', shipmentId);

    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Buscar dados completos da remessa
    const { data: shipment, error: shipmentError } = await supabaseService
      .from('shipments')
      .select(`
        *,
        sender_address:addresses!shipments_sender_address_id_fkey(*),
        recipient_address:addresses!shipments_recipient_address_id_fkey(*)
      `)
      .eq('id', shipmentId)
      .single();

    if (shipmentError || !shipment) {
      console.error('❌ [AUTO-LABEL] Erro ao buscar remessa:', shipmentError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Remessa não encontrada'
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log('📦 [AUTO-LABEL] Remessa encontrada:', shipment.tracking_code);

    // Buscar dados da tabela de preços
    let pricingTableData = null;
    if (shipment.pricing_table_name) {
      const { data } = await supabaseService
        .from('pricing_tables')
        .select('*')
        .eq('name', shipment.pricing_table_name)
        .single();
      pricingTableData = data;
    }

    // Determinar transportadora selecionada
    const getSelectedCarrier = () => {
      const directCarrier = (shipment.quote_data as any)?.deliveryDetails?.selectedCarrier;
      if (directCarrier && (directCarrier === 'jadlog' || directCarrier === 'magalog')) {
        return directCarrier;
      }
      
      const quoteInfo = (shipment.quote_data as any)?.quoteData?.shippingQuote;
      if (!quoteInfo) return 'jadlog';
      
      const jadlog = quoteInfo.jadlog;
      const magalog = quoteInfo.magalog;
      
      if (jadlog && !magalog) return 'jadlog';
      if (magalog && !jadlog) return 'magalog';
      
      const paidAmount = (shipment.payment_data as any)?.amount || 
                        (shipment.quote_data as any)?.deliveryDetails?.totalPrice;
      
      if (paidAmount && jadlog && magalog) {
        if (Math.abs(paidAmount - jadlog.preco_total) < 0.01) return 'jadlog';
        if (Math.abs(paidAmount - magalog.preco_total) < 0.01) return 'magalog';
      }
      
      return 'jadlog';
    };

    const selectedCarrier = getSelectedCarrier();
    console.log('🚛 [AUTO-LABEL] Transportadora selecionada:', selectedCarrier);

    // Preparar payload para o webhook
    const webhookData: Record<string, string> = {
      shipment_id: shipment.id,
      tracking_code: shipment.tracking_code || '',
      status: shipment.status || '',
      created_at: shipment.created_at || '',
      
      // Dimensões e peso
      weight: String(shipment.weight || 0),
      length: String(shipment.length || 0),
      width: String(shipment.width || 0),
      height: String(shipment.height || 0),
      format: shipment.format || '',
      
      // Opções de envio
      selected_option: shipment.selected_option || '',
      pickup_option: shipment.pickup_option || '',
      document_type: shipment.document_type || '',
      pricing_table_name: shipment.pricing_table_name || '',
      pricing_table_id: shipment.pricing_table_id || '',
      selected_carrier: selectedCarrier,
      
      // CTE
      cte_key: shipment.cte_key || '',
      label_pdf_url: shipment.label_pdf_url || '',
      
      // Remetente
      sender_name: shipment.sender_address?.name || '',
      sender_street: shipment.sender_address?.street || '',
      sender_number: shipment.sender_address?.number || '',
      sender_complement: shipment.sender_address?.complement || '',
      sender_neighborhood: shipment.sender_address?.neighborhood || '',
      sender_city: shipment.sender_address?.city || '',
      sender_state: shipment.sender_address?.state || '',
      sender_cep: shipment.sender_address?.cep || '',
      sender_phone: (shipment.quote_data as any)?.addressData?.sender?.phone || '',
      sender_document: (shipment.quote_data as any)?.addressData?.sender?.document || '',
      sender_email: (shipment.quote_data as any)?.addressData?.sender?.email || '',
      sender_inscricao_estadual: (shipment.quote_data as any)?.addressData?.sender?.inscricaoEstadual || '',
      
      // Destinatário
      recipient_name: shipment.recipient_address?.name || '',
      recipient_street: shipment.recipient_address?.street || '',
      recipient_number: shipment.recipient_address?.number || '',
      recipient_complement: shipment.recipient_address?.complement || '',
      recipient_neighborhood: shipment.recipient_address?.neighborhood || '',
      recipient_city: shipment.recipient_address?.city || '',
      recipient_state: shipment.recipient_address?.state || '',
      recipient_cep: shipment.recipient_address?.cep || '',
      recipient_phone: (shipment.quote_data as any)?.addressData?.recipient?.phone || '',
      recipient_document: (shipment.quote_data as any)?.addressData?.recipient?.document || '',
      recipient_email: (shipment.quote_data as any)?.addressData?.recipient?.email || '',
      recipient_inscricao_estadual: (shipment.quote_data as any)?.addressData?.recipient?.inscricaoEstadual || '',
      
      // Descrição do conteúdo
      content_description: (shipment.quote_data as any)?.fiscalData?.contentDescription || 
                          (shipment.quote_data as any)?.documentData?.merchandiseDescription ||
                          (shipment.quote_data as any)?.descricaoMercadoria || '',
      
      // Dados como JSON
      quote_data: shipment.quote_data ? JSON.stringify(shipment.quote_data) : '',
      payment_data: shipment.payment_data ? JSON.stringify(shipment.payment_data) : '',
      pricing_table_data: pricingTableData ? JSON.stringify(pricingTableData) : '',
      
      // Peso total e valor total
      peso_total: String((shipment.quote_data as any)?.quoteData?.totalWeight || shipment.weight || 0),
      valor_total: String((shipment.quote_data as any)?.deliveryDetails?.totalPrice || 
                         (shipment.payment_data as any)?.amount || 0),
      valor_mercadoria: String((shipment.quote_data as any)?.quoteData?.totalMerchandiseValue || 0),
      prazo: String((shipment.quote_data as any)?.deliveryDetails?.deliveryDays || 5),
    };

    // Adicionar volumes
    const volumes = (shipment.quote_data as any)?.merchandiseDetails?.volumes || 
                   (shipment.quote_data as any)?.technicalData?.volumes || 
                   (shipment.quote_data as any)?.quoteData?.volumes || [];
    
    webhookData['total_volumes'] = String(volumes.length || 1);
    
    volumes.forEach((vol: any, index: number) => {
      const num = index + 1;
      webhookData[`volume${num}_peso`] = String(vol.weight || vol.peso || 0);
      webhookData[`volume${num}_comprimento`] = String(vol.length || vol.comprimento || 0);
      webhookData[`volume${num}_largura`] = String(vol.width || vol.largura || 0);
      webhookData[`volume${num}_altura`] = String(vol.height || vol.altura || 0);
      webhookData[`volume${num}_tipo`] = vol.merchandiseType || vol.tipoMercadoria || 'normal';
    });

    // Calcular peso real e cubado
    const quoteInfo = (shipment.quote_data as any)?.quoteData?.shippingQuote;
    let userInputWeight = volumes.reduce((sum: number, vol: any) => sum + (Number(vol.weight) || Number(vol.peso) || 0), 0) || shipment.weight || 0;
    let carrierPesoCubado = 0;
    
    if (selectedCarrier === 'jadlog' && quoteInfo?.jadlog) {
      carrierPesoCubado = quoteInfo.jadlog.peso_cubado || 0;
    } else if (selectedCarrier === 'magalog' && quoteInfo?.magalog) {
      carrierPesoCubado = quoteInfo.magalog.peso_cubado || 0;
    }
    
    webhookData['peso_real'] = String(userInputWeight);
    webhookData['peso_cubado'] = String(carrierPesoCubado);

    console.log('📤 [AUTO-LABEL] Enviando para webhook:', LABEL_WEBHOOK_URL);

    // Enviar para o webhook
    const response = await fetch(LABEL_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webhookData)
    });

    console.log('📡 [AUTO-LABEL] Status da resposta:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [AUTO-LABEL] Erro na resposta:', errorText);
      
      // Logar erro
      await supabaseService.from('webhook_logs').insert({
        shipment_id: shipmentId,
        event_type: 'auto_label_dispatch_error',
        payload: webhookData,
        response_status: response.status,
        response_body: { error: errorText }
      });
      
      return new Response(JSON.stringify({
        success: false,
        error: `Webhook retornou erro: ${response.status}`,
        details: errorText
      }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Processar resposta - esperar o código e etiqueta
    let responseData;
    try {
      responseData = await response.json();
      
      // Se for array, pegar primeiro item (formato Jadlog)
      if (Array.isArray(responseData)) {
        responseData = responseData[0];
      }
      
      console.log('📦 [AUTO-LABEL] Resposta recebida:', JSON.stringify({
        codigo: responseData?.codigo,
        hasEtiqueta: !!responseData?.etiqueta,
        status: responseData?.status
      }));
    } catch {
      responseData = {};
      console.log('⚠️ [AUTO-LABEL] Resposta não é JSON válido');
    }

    // Extrair código e etiqueta da resposta
    const codigo = responseData?.codigo;
    let etiquetaBase64 = responseData?.etiqueta;
    
    // Etiqueta pode vir no formato Jadlog (objeto com 'arquivo')
    if (typeof etiquetaBase64 === 'object' && etiquetaBase64?.arquivo) {
      etiquetaBase64 = etiquetaBase64.arquivo;
    }

    // Se recebeu código e etiqueta, processar
    if (codigo && etiquetaBase64) {
      console.log('✅ [AUTO-LABEL] Código recebido:', codigo);
      
      // Decodificar e salvar PDF
      try {
        const base64Data = etiquetaBase64.replace(/^data:application\/pdf;base64,/, '');
        const pdfBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        
        const filename = `etiqueta_${codigo}_${Date.now()}.pdf`;
        const filePath = `labels/${filename}`;
        
        const { error: uploadError } = await supabaseService.storage
          .from('shipping-labels')
          .upload(filePath, pdfBuffer, {
            contentType: 'application/pdf',
            upsert: true
          });
        
        if (uploadError) {
          console.error('❌ [AUTO-LABEL] Erro ao salvar PDF:', uploadError);
        } else {
          const { data: publicUrlData } = supabaseService.storage
            .from('shipping-labels')
            .getPublicUrl(filePath);
          
          const labelPdfUrl = publicUrlData.publicUrl;
          console.log('🔗 [AUTO-LABEL] PDF salvo:', labelPdfUrl);
          
          // Atualizar remessa com código como tracking_code e URL da etiqueta
          const { error: updateError } = await supabaseService
            .from('shipments')
            .update({
              tracking_code: codigo,
              cte_key: codigo,
              label_pdf_url: labelPdfUrl,
              status: 'LABEL_GENERATED',
              updated_at: new Date().toISOString()
            })
            .eq('id', shipmentId);
          
          if (updateError) {
            console.error('❌ [AUTO-LABEL] Erro ao atualizar remessa:', updateError);
          } else {
            console.log('✅ [AUTO-LABEL] Remessa atualizada com código:', codigo);
          }
          
          // Logar sucesso
          await supabaseService.from('webhook_logs').insert({
            shipment_id: shipmentId,
            event_type: 'auto_label_dispatch_success',
            payload: { codigo, old_tracking_code: shipment.tracking_code },
            response_status: 200,
            response_body: { label_pdf_url: labelPdfUrl, new_tracking_code: codigo }
          });
          
          return new Response(JSON.stringify({
            success: true,
            codigo: codigo,
            tracking_code: codigo,
            label_pdf_url: labelPdfUrl,
            message: 'Etiqueta gerada e remessa atualizada com sucesso'
          }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }
      } catch (pdfError) {
        console.error('❌ [AUTO-LABEL] Erro ao processar PDF:', pdfError);
      }
    }

    // Se não recebeu etiqueta imediata, logar e retornar
    await supabaseService.from('webhook_logs').insert({
      shipment_id: shipmentId,
      event_type: 'auto_label_dispatch_pending',
      payload: webhookData,
      response_status: 200,
      response_body: responseData
    });

    return new Response(JSON.stringify({
      success: true,
      pending: true,
      message: 'Webhook enviado, aguardando retorno da etiqueta',
      codigo: codigo || null
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error('❌ [AUTO-LABEL] Erro inesperado:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
