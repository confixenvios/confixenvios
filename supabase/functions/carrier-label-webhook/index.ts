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
    let barcode: string | null = null;
    try {
      // Remove data URL prefix if present
      const base64Data = etiquetaBase64.replace(/^data:application\/pdf;base64,/, '');
      pdfBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      console.log('✅ Decoded PDF, size:', pdfBuffer.length, 'bytes');
      
      // Try to extract barcode number from PDF content
      // PDFs contain readable text, we look for the Jadlog barcode pattern
      // Pattern: sequences of digits that match Jadlog format (e.g., 1409480000002700107231001010)
      const pdfText = new TextDecoder('latin1').decode(pdfBuffer);
      
      // Look for 25-28 digit sequences (Jadlog barcode format)
      const barcodePatterns = [
        /\b(\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{2})\b/g, // With spaces
        /\b(\d{26,28})\b/g, // Without spaces - continuous digits
        /\((\d{26,28})\)/g, // In parentheses
      ];
      
      for (const pattern of barcodePatterns) {
        const matches = pdfText.match(pattern);
        if (matches && matches.length > 0) {
          // Get the last match (usually the barcode at bottom of label)
          const rawMatch = matches[matches.length - 1];
          // Clean: remove spaces and non-digits
          barcode = rawMatch.replace(/\D/g, '');
          if (barcode.length >= 25 && barcode.length <= 28) {
            console.log('✅ Extracted barcode from PDF:', barcode);
            break;
          }
          barcode = null;
        }
      }
      
      if (!barcode) {
        console.log('⚠️ Could not extract barcode from PDF, will use codigo as fallback');
      }
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

    // Update shipment with carrier data
    // IMPORTANTE: NÃO salvamos o PDF da Jadlog como label_pdf_url
    // O frontend usa o NationalLabelGenerator para criar a etiqueta Confix customizada
    // O PDF da Jadlog é salvo apenas como referência/backup no webhook_logs
    const updateData: any = {
      updated_at: new Date().toISOString(),
      status: 'LABEL_AVAILABLE' // Status válido no constraint
    };

    // Save carrier_order_id (codigo from Jadlog = order ID)
    if (codigo) {
      updateData.carrier_order_id = codigo;
      // IMPORTANTE: Atualizar o tracking_code para o código da Jadlog
      // Isso permite que o rastreio seja feito pelo código da transportadora
      updateData.tracking_code = codigo;
      console.log('📊 Saving carrier_order_id and updating tracking_code to:', codigo);
    }

    // Save carrier_barcode (extracted from PDF or use shipmentId as fallback)
    // O shipmentId do Jadlog geralmente é o código de barras completo (ex: 14094800000031)
    const finalBarcode = barcode || (shipmentId && shipmentId.length > 10 ? shipmentId : null);
    if (finalBarcode) {
      updateData.carrier_barcode = finalBarcode;
      console.log('📊 Saving carrier_barcode:', finalBarcode);
    }

    console.log('📊 Updating shipment with data:', JSON.stringify(updateData, null, 2));
    console.log('📦 PDF da Jadlog salvo em storage (backup):', labelPdfUrl);

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

    // Log the webhook - salvar URL do PDF da Jadlog como referência
    await supabase.from('webhook_logs').insert({
      shipment_id: shipment.id,
      event_type: 'carrier_label_received',
      payload: { 
        codigo, 
        status, 
        etiqueta_size: etiquetaBase64.length, 
        original_shipmentId: shipmentId,
        jadlog_pdf_url: labelPdfUrl, // URL do PDF original da Jadlog (backup)
        carrier_barcode: finalBarcode
      },
      response_status: 200,
      response_body: { jadlog_pdf_url: labelPdfUrl, carrier_barcode: finalBarcode }
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
