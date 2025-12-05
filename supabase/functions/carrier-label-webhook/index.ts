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

    // Parse request body
    const body = await req.json();
    console.log('📦 Carrier label webhook received:', JSON.stringify({
      codigo: body.codigo,
      shipmentId: body.shipmentId,
      status: body.status,
      hasEtiqueta: !!body.etiqueta,
      etiquetaLength: body.etiqueta?.length || 0
    }));

    const { codigo, etiqueta, shipmentId, status } = body;

    // Validate required fields
    if (!shipmentId) {
      console.error('❌ Missing shipmentId');
      return new Response(
        JSON.stringify({ success: false, error: 'shipmentId é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!etiqueta) {
      console.error('❌ Missing etiqueta (base64 PDF)');
      return new Response(
        JSON.stringify({ success: false, error: 'etiqueta (base64 PDF) é obrigatória' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the shipment
    const { data: shipment, error: findError } = await supabase
      .from('shipments')
      .select('id, tracking_code')
      .eq('id', shipmentId)
      .single();

    if (findError || !shipment) {
      console.error('❌ Shipment not found:', shipmentId, findError);
      return new Response(
        JSON.stringify({ success: false, error: 'Remessa não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Found shipment:', shipment.id, 'tracking:', shipment.tracking_code);

    // Decode base64 PDF
    let pdfBuffer: Uint8Array;
    try {
      // Remove data URL prefix if present
      const base64Data = etiqueta.replace(/^data:application\/pdf;base64,/, '');
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

    // If carrier returned a tracking code, update it
    if (codigo) {
      updateData.cte_key = codigo;
    }

    const { error: updateError } = await supabase
      .from('shipments')
      .update(updateData)
      .eq('id', shipmentId);

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
      shipment_id: shipmentId,
      event_type: 'carrier_label_received',
      payload: { codigo, status, etiqueta_size: etiqueta.length },
      response_status: 200,
      response_body: { label_pdf_url: labelPdfUrl }
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Etiqueta salva com sucesso',
        label_pdf_url: labelPdfUrl,
        shipment_id: shipmentId,
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
