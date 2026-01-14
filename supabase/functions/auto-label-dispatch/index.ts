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

    // Preparar payload no formato exato esperado pelo webhook de etiqueta
    const quoteData = shipment.quote_data as any;
    const pricingTableName = shipment.pricing_table_name || quoteData?.deliveryDetails?.selectedCarrier || selectedCarrier;
    
    // Extrair dados da cotação
    const shippingQuote = quoteData?.quoteData?.shippingQuote;
    const selectedQuote = shippingQuote?.[selectedCarrier] || shippingQuote?.jadlog;
    const totalPrice = quoteData?.deliveryDetails?.totalPrice || (shipment.payment_data as any)?.amount || 0;
    const merchandiseValue = quoteData?.quoteData?.totalMerchandiseValue || quoteData?.fiscalData?.merchandise_value || 0;
    const deliveryDays = quoteData?.deliveryDetails?.deliveryDays || selectedQuote?.prazo || 5;
    
    // Dados do documento
    const documentType = shipment.document_type || quoteData?.documentType || quoteData?.fiscalData?.type || 'declaracao_conteudo';
    const nfeKey = quoteData?.nfeKey || quoteData?.fiscalData?.nfe_key || quoteData?.nfeChave || '';
    const merchandiseDescription = quoteData?.merchandiseDescription || quoteData?.descricaoMercadoria || 
                                   quoteData?.fiscalData?.contentDescription || 'MERCADORIA';
    
    // Determinar tipo de documento para o campo 'tipo' (1=NFe, 2=CTe, 3=Declaração)
    let tipoDoc = '3'; // Default: Declaração
    if (documentType === 'nfe' || nfeKey) {
      tipoDoc = '1';
    } else if (documentType === 'cte') {
      tipoDoc = '2';
    }
    
    // Calcular peso e cubagem
    const volumes = quoteData?.merchandiseDetails?.volumes || 
                   quoteData?.technicalData?.volumes || 
                   quoteData?.quoteData?.volumes || [];
    
    const totalWeight = volumes.reduce((sum: number, vol: any) => 
      sum + (Number(vol.weight) || Number(vol.peso) || 0), 0) || shipment.weight || 1;
    
    let totalCubagem = 0;
    volumes.forEach((vol: any) => {
      const l = (Number(vol.length) || Number(vol.comprimento) || 0) / 100;
      const w = (Number(vol.width) || Number(vol.largura) || 0) / 100;
      const h = (Number(vol.height) || Number(vol.altura) || 0) / 100;
      totalCubagem += l * w * h;
    });
    
    // Preparar payload no formato exato esperado
    const webhookData: Record<string, string> = {
      // Valores e preços
      valorTotal: String(totalPrice),
      'mercadoria_valorDeclarado': String(merchandiseValue),
      
      // Prazo e transportadora
      remessa_prazo: String(deliveryDays),
      transportadora_nome: selectedCarrier,
      transportadora_servico: quoteData?.deliveryDetails?.selectedOption || 'economic',
      cnpjTransportadorDestinto: '',
      
      // Expedidor (empresa emissora)
      expedidor: pricingTableData?.name || 'Juri Express',
      
      // Remetente
      remetente_nome: shipment.sender_address?.name || '',
      remetente_documento: quoteData?.addressData?.sender?.document || '',
      remetente_inscricaoEstadual: quoteData?.addressData?.sender?.inscricaoEstadual || '',
      remetente_email: quoteData?.addressData?.sender?.email || '',
      remetente_telefone: quoteData?.addressData?.sender?.phone || '',
      remetente_endereco: shipment.sender_address?.street || '',
      remetente_numero: shipment.sender_address?.number || '',
      remetente_complemento: shipment.sender_address?.complement || '',
      remetente_bairro: shipment.sender_address?.neighborhood || '',
      remetente_cidade: shipment.sender_address?.city || '',
      remetente_estado: shipment.sender_address?.state || '',
      remetente_cep: shipment.sender_address?.cep || '',
      
      // Destinatário
      destinatario_nome: shipment.recipient_address?.name || '',
      destinatario_documento: quoteData?.addressData?.recipient?.document || '',
      destinatario_inscricaoEstadual: quoteData?.addressData?.recipient?.inscricaoEstadual || '',
      destinatario_email: quoteData?.addressData?.recipient?.email || '',
      destinatario_telefone: quoteData?.addressData?.recipient?.phone || '',
      destinatario_endereco: shipment.recipient_address?.street || '',
      destinatario_numero: shipment.recipient_address?.number || '',
      destinatario_complemento: shipment.recipient_address?.complement || '',
      destinatario_bairro: shipment.recipient_address?.neighborhood || '',
      destinatario_cidade: shipment.recipient_address?.city || '',
      destinatario_estado: shipment.recipient_address?.state || '',
      destinatario_cep: shipment.recipient_address?.cep || '',
      
      // Tipo de documento e chave
      tipo: tipoDoc,
      chaveNotaFiscal: nfeKey || '99999999999999999999999999999999999999999999',
      descricaoMercadoria: merchandiseDescription,
      
      // Peso e dimensões gerais
      remessa_peso: String(totalWeight),
      remessa_cubagemTotal: totalCubagem.toFixed(3),
      remessa_largura: String(shipment.width || 0),
      remessa_comprimento: String(shipment.length || 0),
      remessa_altura: String(shipment.height || 0),
      remessa_formato: shipment.format || 'pacote',
      
      // IDs
      shipmentId: shipment.id,
      trackingCode: shipment.tracking_code || '',
    };

    // Adicionar volumes no formato esperado
    // Volumes já foram calculados acima
    
    volumes.forEach((vol: any, index: number) => {
      const num = index + 1;
      const volPeso = Number(vol.weight) || Number(vol.peso) || 0;
      const volComp = Number(vol.length) || Number(vol.comprimento) || 0;
      const volLarg = Number(vol.width) || Number(vol.largura) || 0;
      const volAlt = Number(vol.height) || Number(vol.altura) || 0;
      const volCubagem = (volComp / 100) * (volLarg / 100) * (volAlt / 100);
      
      webhookData[`volume${num}_peso`] = String(volPeso);
      webhookData[`volume${num}_comprimento`] = String(volComp);
      webhookData[`volume${num}_largura`] = String(volLarg);
      webhookData[`volume${num}_altura`] = String(volAlt);
      webhookData[`volume${num}_cubagemVolume`] = volCubagem.toFixed(3);
      webhookData[`volume${num}_tipoMercadoria`] = vol.merchandiseType || vol.tipoMercadoria || shipment.format || 'normal';
    });

    console.log('📤 [AUTO-LABEL] Payload formatado:', JSON.stringify(webhookData, null, 2));

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
