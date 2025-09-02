import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let responseStatus = 500;
  let responseBody: any = { error: 'Internal server error' };
  let payload: any = {};
  let sourceIp = 'unknown';
  let userAgent = 'unknown';

  try {
    payload = await req.json();
    sourceIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    userAgent = req.headers.get('user-agent') || 'unknown';
    
    console.log('Received TMS webhook:', JSON.stringify(payload, null, 2));
    
    // Create service role client to bypass RLS
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { 
      event,
      shipmentId, 
      pedidoExterno, 
      labelPdfUrl, 
      status = 'LABEL_AVAILABLE' 
    } = payload;

    console.log(`Processing TMS webhook for shipment: ${shipmentId}`);
    console.log('Event:', event);
    console.log('Status:', status);

    if (!shipmentId) {
      throw new Error('shipmentId is required');
    }

    // Find shipment by ID
    const { data: shipment, error: shipmentError } = await supabaseService
      .from('shipments')
      .select('*')
      .eq('id', shipmentId)
      .single();

    if (shipmentError || !shipment) {
      throw new Error(`Shipment not found: ${shipmentError?.message}`);
    }

    console.log(`Found shipment: ${shipment.id}, current status: ${shipment.status}`);

    // Update shipment with label information
    const updateData: any = {
      status: status === 'ETIQUETA_DISPONIVEL' ? 'LABEL_AVAILABLE' : status,
      updated_at: new Date().toISOString()
    };

    if (pedidoExterno) {
      updateData.cte_key = pedidoExterno;
    }

    if (labelPdfUrl) {
      updateData.label_pdf_url = labelPdfUrl;
    }

    const { error: updateError } = await supabaseService
      .from('shipments')
      .update(updateData)
      .eq('id', shipment.id);

    if (updateError) {
      throw new Error(`Failed to update shipment: ${updateError.message}`);
    }

    console.log(`Successfully updated shipment ${shipment.id} to status: ${updateData.status}`);

    responseStatus = 200;
    responseBody = {
      success: true,
      message: 'Shipment updated successfully',
      shipmentId: shipment.id,
      status: updateData.status
    };

    return new Response(JSON.stringify(responseBody), {
      status: responseStatus,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in webhook-tms:', error);
    responseStatus = 500;
    responseBody = {
      error: error.message,
      success: false
    };
    
    return new Response(JSON.stringify(responseBody), {
      status: responseStatus,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } finally {
    // Log the webhook call to database (best effort, don't fail if this fails)
    try {
      const supabaseService = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );
      
      await supabaseService
        .from('webhook_logs')
        .insert({
          shipment_id: payload.shipmentId || 'unknown',
          event_type: payload.event || 'unknown',
          payload: payload,
          response_status: responseStatus,
          response_body: responseBody,
          source_ip: sourceIp,
          user_agent: userAgent
        });
    } catch (logError) {
      console.error('Failed to log webhook call:', logError);
    }
  }
};

serve(handler);