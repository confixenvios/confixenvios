import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, type } = await req.json();
    
    if (!url || !type) {
      return new Response(
        JSON.stringify({ error: 'URL and type are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching Webmania document:', { url, type });

    const webmaniaToken = Deno.env.get('WEBMANIA_BEARER_TOKEN');
    
    if (!webmaniaToken) {
      console.error('WEBMANIA_BEARER_TOKEN not configured');
      return new Response(
        JSON.stringify({ error: 'Webmania token not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch document from Webmania with bearer token
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${webmaniaToken}`,
        'Accept': type === 'xml' ? 'application/xml' : 'application/pdf',
      },
    });

    if (!response.ok) {
      console.error('Webmania API error:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch document from Webmania',
          details: errorText,
          status: response.status 
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the document content
    const documentBlob = await response.blob();
    const documentBuffer = await documentBlob.arrayBuffer();

    console.log('Document fetched successfully, size:', documentBuffer.byteLength);

    // Return the document with appropriate content type
    return new Response(documentBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': type === 'xml' ? 'application/xml' : 'application/pdf',
        'Content-Disposition': `inline; filename="document.${type === 'xml' ? 'xml' : 'pdf'}"`,
      },
    });

  } catch (error) {
    console.error('Error in webmania-document-fetch:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});