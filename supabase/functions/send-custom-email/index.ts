import React from 'npm:react@18.3.1'
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'
import { Resend } from 'npm:resend@4.0.0'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { ConfirmSignupEmail } from './_templates/confirm-signup.tsx'

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string)
const hookSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET') as string

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405,
      headers: corsHeaders 
    })
  }

  try {
    const payload = await req.text()
    const headers = Object.fromEntries(req.headers)
    
    // Verify webhook signature if secret is provided
    if (hookSecret) {
      const wh = new Webhook(hookSecret)
      try {
        wh.verify(payload, headers)
      } catch (error) {
        console.error('Webhook verification failed:', error)
        return new Response(
          JSON.stringify({ error: 'Webhook verification failed' }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        )
      }
    }

    const data = JSON.parse(payload)
    
    const {
      user,
      email_data: { token, token_hash, redirect_to, email_action_type },
    } = data as {
      user: {
        email: string
      }
      email_data: {
        token: string
        token_hash: string
        redirect_to: string
        email_action_type: string
        site_url: string
      }
    }

    // Generate custom email based on action type
    let emailSubject = 'Confix Envios - Confirme sua conta'
    let emailTemplate = ConfirmSignupEmail

    // Customize subject and template based on email action type
    switch (email_action_type) {
      case 'signup':
        emailSubject = 'Confix Envios - Confirme sua conta'
        break
      case 'recovery':
        emailSubject = 'Confix Envios - Redefinir sua senha'
        break
      case 'email_change':
        emailSubject = 'Confix Envios - Confirme seu novo email'
        break
      case 'invite':
        emailSubject = 'Confix Envios - Você foi convidado'
        break
      default:
        emailSubject = 'Confix Envios - Ação necessária'
    }

    // Render the React email template
    const html = await renderAsync(
      React.createElement(emailTemplate, {
        supabase_url: Deno.env.get('SUPABASE_URL') ?? '',
        token,
        token_hash,
        redirect_to,
        email_action_type,
        user_email: user.email,
      })
    )

    // Send email using Resend
    const { data: emailData, error } = await resend.emails.send({
      from: 'Confix Envios <noreply@confixenvios.com.br>',
      to: [user.email],
      subject: emailSubject,
      html,
    })

    if (error) {
      console.error('Resend error:', error)
      throw error
    }

    console.log('Email sent successfully:', emailData)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully',
        email_id: emailData?.id 
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )

  } catch (error: any) {
    console.error('Error in send-custom-email function:', error)
    
    return new Response(
      JSON.stringify({
        error: {
          message: error.message || 'Internal server error',
          code: error.code || 'UNKNOWN_ERROR',
        },
      }),
      {
        status: error.status || 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )
  }
})