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
    console.log('Auto webhook dispatcher - Starting...');
    
    // Create Supabase service client
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get pending webhook dispatches (webhooks ready but not yet sent)
    const { data: pendingWebhooks, error: webhookError } = await supabaseService
      .from('webhook_logs')
      .select('*')
      .in('event_type', ['webhook_ready_for_dispatch', 'webhook_status_update_ready'])
      .eq('response_status', 202)
      .order('created_at', { ascending: true })
      .limit(10); // Process up to 10 at a time

    if (webhookError) {
      console.error('Auto webhook dispatcher - Error fetching pending webhooks:', webhookError);
      throw webhookError;
    }

    if (!pendingWebhooks || pendingWebhooks.length === 0) {
      console.log('Auto webhook dispatcher - No pending webhooks found');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No pending webhooks to dispatch',
        processed: 0
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    console.log(`Auto webhook dispatcher - Found ${pendingWebhooks.length} pending webhooks`);

    let successCount = 0;
    let errorCount = 0;

    // Process each pending webhook
    for (const webhook of pendingWebhooks) {
      try {
        console.log(`Auto webhook dispatcher - Processing webhook for shipment: ${webhook.shipment_id}`);
        
        // Call the shipment-webhook-dispatch function
        const { data: dispatchResult, error: dispatchError } = await supabaseService.functions.invoke('shipment-webhook-dispatch', {
          body: {
            shipmentId: webhook.shipment_id,
            shipmentData: webhook.payload?.shipment_data || {}
          }
        });

        if (dispatchError) {
          console.error(`Auto webhook dispatcher - Error dispatching webhook for ${webhook.shipment_id}:`, dispatchError);
          
          // Update the log to mark it as failed
          await supabaseService
            .from('webhook_logs')
            .update({ 
              response_status: 500,
              response_body: { 
                ...webhook.response_body,
                auto_dispatch_error: dispatchError.message,
                auto_dispatch_attempted_at: new Date().toISOString()
              }
            })
            .eq('id', webhook.id);
            
          errorCount++;
          continue;
        }

        // Update the log to mark it as processed
        await supabaseService
          .from('webhook_logs')
          .update({ 
            response_status: 200,
            response_body: { 
              ...webhook.response_body,
              auto_dispatch_success: true,
              auto_dispatch_completed_at: new Date().toISOString(),
              dispatch_result: dispatchResult
            }
          })
          .eq('id', webhook.id);

        console.log(`Auto webhook dispatcher - Successfully dispatched webhook for ${webhook.shipment_id}`);
        successCount++;
        
        // Small delay between dispatches to avoid overwhelming the target server
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`Auto webhook dispatcher - Unexpected error processing webhook ${webhook.id}:`, error);
        errorCount++;
      }
    }

    console.log(`Auto webhook dispatcher - Completed: ${successCount} success, ${errorCount} errors`);

    return new Response(JSON.stringify({ 
      success: true,
      message: `Auto webhook dispatch completed`,
      processed: pendingWebhooks.length,
      successful: successCount,
      errors: errorCount
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('Auto webhook dispatcher - Global error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});