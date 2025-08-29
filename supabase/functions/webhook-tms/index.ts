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

  try {
    const payload = await req.json();
    console.log('Received TMS webhook:', JSON.stringify(payload, null, 2));
    
    // Create service role client to bypass RLS
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { 
      shipmentId, 
      trackingCode, 
      cteKey, 
      labelPdfUrl, 
      status = 'LABEL_AVAILABLE' 
    } = payload;

    if (!shipmentId && !trackingCode) {
      throw new Error('Either shipmentId or trackingCode is required');
    }

    // Find shipment by ID or tracking code
    let query = supabaseService.from('shipments').select('*');
    
    if (shipmentId) {
      query = query.eq('id', shipmentId);
    } else {
      query = query.eq('tracking_code', trackingCode);
    }

    const { data: shipment, error: shipmentError } = await query.single();

    if (shipmentError || !shipment) {
      throw new Error(`Shipment not found: ${shipmentError?.message}`);
    }

    console.log(`Found shipment: ${shipment.id}, current status: ${shipment.status}`);

    // Update shipment with label information
    const updateData: any = {
      status: status,
      updated_at: new Date().toISOString()
    };

    if (cteKey) {
      updateData.cte_key = cteKey;
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

    console.log(`Successfully updated shipment ${shipment.id} to status: ${status}`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Shipment updated successfully',
      shipmentId: shipment.id,
      status: status
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in webhook-tms:', error);
    return new Response(JSON.stringify({
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

serve(handler);