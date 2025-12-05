import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body - handle array response from Jadlog
    let body = await req.json();
    
    // If response is array, take first item
    if (Array.isArray(body)) {
      body = body[0];
    }
    
    console.log('📦 Carrier label webhook received:', JSON.stringify({
      codigo: body.codigo,
      shipmentId: body.shipmentId,
      tracking_code: body.tracking_code,
      status: body.status,
      hasEtiqueta: !!body.etiqueta,
      etiquetaType: typeof body.etiqueta
    }));

    const { codigo, shipmentId, status } = body;
    
    // Handle etiqueta - can be string or object with 'arquivo' property (Jadlog format)
    let etiquetaBase64 = body.etiqueta;
    if (typeof body.etiqueta === 'object' && body.etiqueta?.arquivo) {
      etiquetaBase64 = body.etiqueta.arquivo;
      console.log('📄 Etiqueta extraída do formato Jadlog (etiqueta.arquivo)');
    }
    
    // Get tracking_code from body (can be sent separately or we'll use shipmentId)
    const trackingCode = body.tracking_code || body.trackingCode;

    // Validate - need at least one identifier
    if (!shipmentId && !trackingCode) {
      console.error('❌ Missing shipmentId or tracking_code');
      return new Response(
        JSON.stringify({ success: false, error: 'shipmentId ou tracking_code é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!etiquetaBase64) {
      console.error('❌ Missing etiqueta (base64 PDF)');
      return new Response(
        JSON.stringify({ success: false, error: 'etiqueta (base64 PDF) é obrigatória' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the shipment - try multiple strategies
    let shipment = null;
    let findError = null;
    
    // Strategy 1: Try by UUID if it looks like a UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (shipmentId && uuidRegex.test(shipmentId)) {
      console.log('🔍 Buscando por UUID:', shipmentId);
      const result = await supabase
        .from('shipments')
        .select('id, tracking_code')
        .eq('id', shipmentId)
        .maybeSingle();
      
      shipment = result.data;
      findError = result.error;
    }
    
    // Strategy 2: Try by tracking_code (exact match)
    if (!shipment && trackingCode) {
      console.log('🔍 Buscando por tracking_code:', trackingCode);
      const result = await supabase
        .from('shipments')
        .select('id, tracking_code')
        .eq('tracking_code', trackingCode)
        .maybeSingle();
      
      shipment = result.data;
      findError = result.error;
    }
    
    // Strategy 3: Try by tracking_code with year prefix pattern (e.g., "2025QLKXXK")
    if (!shipment && trackingCode) {
      // Remove common prefixes
      const cleanCode = trackingCode.replace(/^(ID|CONFIX-|CFX-)/i, '');
      console.log('🔍 Buscando por tracking_code limpo:', cleanCode);
      const result = await supabase
        .from('shipments')
        .select('id, tracking_code')
        .eq('tracking_code', cleanCode)
        .maybeSingle();
      
      shipment = result.data;
      findError = result.error;
    }
    
    // Strategy 4: Try partial match on tracking_code using LIKE
    if (!shipment && trackingCode) {
      console.log('🔍 Buscando por tracking_code parcial:', trackingCode);
      const result = await supabase
        .from('shipments')
        .select('id, tracking_code')
        .ilike('tracking_code', `%${trackingCode}%`)
        .limit(1)
        .maybeSingle();
      
      shipment = result.data;
      findError = result.error;
    }

    if (!shipment) {
      console.error('❌ Shipment not found. Tried shipmentId:', shipmentId, 'tracking_code:', trackingCode, 'Error:', findError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Remessa não encontrada',
          searched: { shipmentId, trackingCode }
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Found shipment:', shipment.id, 'tracking:', shipment.tracking_code);

    // Decode base64 PDF
    let pdfBuffer: Uint8Array;
    try {
      // Remove data URL prefix if present
      const base64Data = etiquetaBase64.replace(/^data:application\/pdf;base64,/, '');
      pdfBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      console.log('✅ Decoded PDF, size:', pdfBuffer.length, 'bytes');
    } catch (decodeError) {
      console.error('❌ Failed to decode base64 PDF:', decodeError);
      return new Response(
        JSON.stringify({ success: false, error: 'Falha ao decodificar PDF base64' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate filename
    const filename = `etiqueta_${shipment.tracking_code || shipment.id}_${Date.now()}.pdf`;
    const filePath = `labels/${filename}`;

    console.log('📤 Uploading to storage:', filePath);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('shipping-labels')
      .upload(filePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      console.error('❌ Storage upload failed:', uploadError);
      return new Response(
        JSON.stringify({ success: false, error: 'Falha ao salvar PDF: ' + uploadError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Upload successful:', uploadData.path);

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('shipping-labels')
      .getPublicUrl(filePath);

    const labelPdfUrl = publicUrlData.publicUrl;
    console.log('🔗 Public URL:', labelPdfUrl);

    // Update shipment with label URL and carrier code
    const updateData: any = {
      label_pdf_url: labelPdfUrl,
      updated_at: new Date().toISOString()
    };

    // If carrier returned a tracking code (codigo), save it
    if (codigo) {
      updateData.cte_key = codigo;
    }

    const { error: updateError } = await supabase
      .from('shipments')
      .update(updateData)
      .eq('id', shipment.id);

    if (updateError) {
      console.error('❌ Failed to update shipment:', updateError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'PDF salvo mas falha ao atualizar remessa: ' + updateError.message,
          label_pdf_url: labelPdfUrl
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Shipment updated successfully');

    // Log the webhook
    await supabase.from('webhook_logs').insert({
      shipment_id: shipment.id,
      event_type: 'carrier_label_received',
      payload: { codigo, status, etiqueta_size: etiquetaBase64.length, original_shipmentId: shipmentId },
      response_status: 200,
      response_body: { label_pdf_url: labelPdfUrl }
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Etiqueta salva com sucesso',
        label_pdf_url: labelPdfUrl,
        shipment_id: shipment.id,
        tracking_code: shipment.tracking_code
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
