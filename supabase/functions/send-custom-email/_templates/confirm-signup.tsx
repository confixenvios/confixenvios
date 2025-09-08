import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Img,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface ConfirmSignupEmailProps {
  supabase_url: string
  email_action_type: string
  redirect_to: string
  token_hash: string
  token: string
  user_email: string
}

export const ConfirmSignupEmail = ({
  token,
  supabase_url,
  email_action_type,
  redirect_to,
  token_hash,
  user_email,
}: ConfirmSignupEmailProps) => (
  <Html>
    <Head />
    <Preview>Confirme sua conta na Confix Envios</Preview>
    <Body style={main}>
      <Container style={container}>
        <div style={logoContainer}>
          <Heading style={h1}>Confix Envios</Heading>
          <Text style={subtitle}>Sistema de Gestão de Entregas</Text>
        </div>

        <Heading style={h2}>Confirme sua conta</Heading>
        
        <Text style={text}>
          Olá! Obrigado por se cadastrar na <strong>Confix Envios</strong>.
        </Text>
        
        <Text style={text}>
          Para começar a usar nossa plataforma de gestão de entregas, você precisa confirmar seu email clicando no botão abaixo:
        </Text>

        <div style={buttonContainer}>
          <Link
            href={`${supabase_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`}
            target="_blank"
            style={button}
          >
            Confirmar Email e Acessar Área do Cliente
          </Link>
        </div>

        <Text style={text}>
          Ou copie e cole este código de confirmação temporário:
        </Text>
        <code style={code}>{token}</code>

        <Text style={disclaimer}>
          Se você não se cadastrou na Confix Envios, pode ignorar este email com segurança.
        </Text>

        <div style={footer}>
          <Text style={footerText}>
            <strong>Confix Envios</strong><br />
            Sua solução completa para gestão de entregas
          </Text>
          <Text style={footerContact}>
            Em caso de dúvidas, entre em contato conosco.
          </Text>
        </div>
      </Container>
    </Body>
  </Html>
)

export default ConfirmSignupEmail

const main = {
  backgroundColor: '#f6f6f6',
}

const container = {
  backgroundColor: '#ffffff',
  paddingLeft: '32px',
  paddingRight: '32px',
  paddingTop: '24px',
  paddingBottom: '24px',
  margin: '0 auto',
  maxWidth: '600px',
  borderRadius: '8px',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
}

const logoContainer = {
  textAlign: 'center' as const,
  marginBottom: '32px',
  paddingBottom: '24px',
  borderBottom: '2px solid #e5e7eb',
}

const h1 = {
  color: '#1f2937',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '0',
  padding: '0',
  background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
}

const subtitle = {
  color: '#6b7280',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  fontSize: '16px',
  fontWeight: 'normal',
  margin: '8px 0 0 0',
}

const h2 = {
  color: '#1f2937',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0 0 24px 0',
  textAlign: 'center' as const,
}

const text = {
  color: '#374151',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 0',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#3b82f6',
  borderRadius: '6px',
  color: '#ffffff',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 32px',
  transition: 'background-color 0.2s',
}

const code = {
  display: 'inline-block',
  padding: '16px 24px',
  width: 'auto',
  backgroundColor: '#f3f4f6',
  borderRadius: '6px',
  border: '1px solid #d1d5db',
  color: '#1f2937',
  fontFamily: 'monospace',
  fontSize: '14px',
  fontWeight: 'bold',
  letterSpacing: '2px',
  textAlign: 'center' as const,
  margin: '16px auto',
  display: 'block',
}

const disclaimer = {
  color: '#6b7280',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  fontSize: '14px',
  lineHeight: '20px',
  margin: '32px 0 16px 0',
  textAlign: 'center' as const,
}

const footer = {
  borderTop: '1px solid #e5e7eb',
  paddingTop: '24px',
  marginTop: '32px',
  textAlign: 'center' as const,
}

const footerText = {
  color: '#1f2937',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  fontSize: '14px',
  fontWeight: 'bold',
  margin: '0 0 8px 0',
}

const footerContact = {
  color: '#6b7280',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  fontSize: '12px',
  margin: '0',
}