import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// CPF validation with checksum
const isValidCPF = (cpf: string): boolean => {
  const cleanCpf = cpf.replace(/\D/g, '');
  if (cleanCpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleanCpf)) return false;
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCpf[i]) * (10 - i);
  }
  let digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cleanCpf[9])) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCpf[i]) * (11 - i);
  }
  digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cleanCpf[10])) return false;
  
  return true;
};

// CNPJ validation with checksum
const isValidCNPJ = (cnpj: string): boolean => {
  const cleanCnpj = cnpj.replace(/\D/g, '');
  if (cleanCnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cleanCnpj)) return false;
  
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleanCnpj[i]) * weights1[i];
  }
  let digit = sum % 11;
  digit = digit < 2 ? 0 : 11 - digit;
  if (digit !== parseInt(cleanCnpj[12])) return false;
  
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleanCnpj[i]) * weights2[i];
  }
  digit = sum % 11;
  digit = digit < 2 ? 0 : 11 - digit;
  if (digit !== parseInt(cleanCnpj[13])) return false;
  
  return true;
};

// Input validation
const validatePaymentInput = (requestBody: any): { isValid: boolean; error?: string } => {
  const { name, phone, email, cpf, amount, billingType } = requestBody;

  if (!name || !phone || !email || !cpf || !amount) {
    return { isValid: false, error: 'Todos os campos são obrigatórios: nome, telefone, email, CPF e valor' };
  }

  if (typeof name !== 'string' || name.length > 100) {
    return { isValid: false, error: 'Nome inválido' };
  }

  if (typeof email !== 'string' || !email.includes('@') || email.length > 100) {
    return { isValid: false, error: 'Email inválido' };
  }

  const cleanCpf = cpf.replace(/\D/g, '');
  if (cleanCpf.length === 11) {
    if (!isValidCPF(cleanCpf)) {
      return { isValid: false, error: 'CPF inválido. Verifique os dígitos informados.' };
    }
  } else if (cleanCpf.length === 14) {
    if (!isValidCNPJ(cleanCpf)) {
      return { isValid: false, error: 'CNPJ inválido. Verifique os dígitos informados.' };
    }
  } else {
    return { isValid: false, error: 'CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos' };
  }

  if (typeof amount !== 'number' || amount <= 0 || amount > 50000) {
    return { isValid: false, error: 'Valor deve ser entre R$ 0,01 e R$ 50.000,00' };
  }

  const validBillingTypes = ['PIX', 'BOLETO', 'CREDIT_CARD'];
  if (billingType && !validBillingTypes.includes(billingType)) {
    return { isValid: false, error: 'Tipo de pagamento inválido' };
  }

  return { isValid: true };
};

// Get or create Asaas customer
async function getOrCreateCustomer(asaasApiKey: string, customerData: {
  name: string;
  email: string;
  phone: string;
  cpfCnpj: string;
}): Promise<string> {
  const asaasBaseUrl = 'https://api.asaas.com/v3';
  
  // Try to find existing customer by CPF/CNPJ
  const searchResponse = await fetch(`${asaasBaseUrl}/customers?cpfCnpj=${customerData.cpfCnpj}`, {
    method: 'GET',
    headers: {
      'access_token': asaasApiKey,
      'Content-Type': 'application/json',
    },
  });

  if (searchResponse.ok) {
    const searchData = await searchResponse.json();
    if (searchData.data && searchData.data.length > 0) {
      console.log('✅ Cliente existente encontrado:', searchData.data[0].id);
      return searchData.data[0].id;
    }
  }

  // Create new customer
  console.log('📝 Criando novo cliente no Asaas...');
  const createResponse = await fetch(`${asaasBaseUrl}/customers`, {
    method: 'POST',
    headers: {
      'access_token': asaasApiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: customerData.name,
      email: customerData.email,
      phone: customerData.phone.replace(/\D/g, ''),
      cpfCnpj: customerData.cpfCnpj,
      notificationDisabled: false,
    }),
  });

  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    console.error('❌ Erro ao criar cliente:', errorText);
    throw new Error('Erro ao criar cliente no sistema de pagamento');
  }

  const newCustomer = await createResponse.json();
  console.log('✅ Novo cliente criado:', newCustomer.id);
  return newCustomer.id;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔵 Asaas Payment request started');
    
    const requestBody = await req.json();
    console.log('📋 Request body received');
    
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    
    // Validate input
    const validation = validatePaymentInput(requestBody);
    if (!validation.isValid) {
      console.error('❌ Input validation failed:', validation.error);
      return new Response(
        JSON.stringify({ success: false, error: validation.error }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { 
      name, phone, email, cpf, amount, description, userId, 
      quoteData, documentData, isB2B, b2bData,
      billingType = 'PIX', // PIX, BOLETO, CREDIT_CARD
      creditCard, creditCardHolderInfo, installmentCount
    } = requestBody;

    // Get Asaas API key
    const asaasApiKey = Deno.env.get('ASAAS_API_KEY');
    
    if (!asaasApiKey) {
      console.error('❌ ASAAS_API_KEY não encontrada');
      return new Response(
        JSON.stringify({ success: false, error: 'Configuração de pagamento não encontrada' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('✅ API Key Asaas encontrada');

    const asaasBaseUrl = 'https://api.asaas.com/v3';
    const externalId = `confix_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const cleanCpf = cpf.replace(/\D/g, '');

    // Get or create customer in Asaas
    const customerId = await getOrCreateCustomer(asaasApiKey, {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone,
      cpfCnpj: cleanCpf,
    });

    // Save temp quote
    console.log('💾 Salvando cotação temporária...');
    
    let tempQuoteData;
    
    if (isB2B && b2bData) {
      console.log('📦 Fluxo B2B detectado');
      tempQuoteData = {
        external_id: externalId,
        user_id: userId || null,
        sender_data: {
          name: name,
          email: email,
          phone: phone,
          document: cpf,
          clientId: b2bData.clientId,
          pickupAddress: b2bData.pickupAddress || null
        },
        recipient_data: {
          volumeAddresses: b2bData.volumeAddresses || [],
          vehicleType: b2bData.vehicleType,
          deliveryDate: b2bData.deliveryDate,
          pickupAddress: b2bData.pickupAddress || null
        },
        package_data: {
          volumeCount: b2bData.volumeCount || 1,
          volumeWeights: b2bData.volumeWeights || [],
          totalWeight: b2bData.totalWeight || 0,
          volumeAddresses: b2bData.volumeAddresses || [],
          pickupAddress: b2bData.pickupAddress || null
        },
        quote_options: {
          selectedOption: 'b2b_express',
          pickupOption: 'coleta',
          amount: amount,
          description: description || 'B2B Expresso - Confix Envios',
          isB2B: true,
          vehicleType: b2bData.vehicleType,
          pickupAddress: b2bData.pickupAddress || null
        },
        status: 'pending_payment'
      };
    } else {
      if (!quoteData || !quoteData.senderData || !quoteData.recipientData) {
        console.error('❌ Dados da cotação incompletos');
        return new Response(
          JSON.stringify({ success: false, error: 'Dados da cotação não encontrados. Reinicie o processo.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
      
      tempQuoteData = {
        external_id: externalId,
        user_id: userId || null,
        sender_data: quoteData.senderData,
        recipient_data: quoteData.recipientData,
        package_data: quoteData.formData ? {
          weight: parseFloat(quoteData.formData.weight) || 1,
          length: parseFloat(quoteData.formData.length) || 20,
          width: parseFloat(quoteData.formData.width) || 20,
          height: parseFloat(quoteData.formData.height) || 20,
          format: quoteData.formData.format || 'caixa',
          quantity: parseInt(quoteData.formData.quantity) || 1,
          unitValue: parseFloat(quoteData.formData.unitValue) || amount,
          totalValue: quoteData.totalMerchandiseValue || amount
        } : {
          weight: 1, length: 20, width: 20, height: 20,
          format: 'caixa', quantity: 1, unitValue: amount, totalValue: amount
        },
        quote_options: {
          selectedOption: quoteData.selectedOption || 'standard',
          pickupOption: quoteData.pickupOption || 'dropoff',
          amount: amount,
          description: description || 'Pagamento - Confix Envios',
          shippingQuote: quoteData.quoteData?.shippingQuote || null,
          pickupDetails: quoteData.pickupDetails || null,
          documentType: documentData?.documentType || null,
          nfeKey: documentData?.nfeKey || null,
          merchandiseDescription: documentData?.merchandiseDescription || null,
          billingType: billingType
        },
        status: 'pending_payment'
      };
    }

    const { data: savedQuote, error: quoteError } = await supabase
      .from('temp_quotes')
      .insert([tempQuoteData])
      .select()
      .single();

    if (quoteError) {
      console.error('❌ Erro ao salvar cotação temporária:', quoteError);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao processar cotação. Tente novamente.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log('✅ Cotação temporária salva:', savedQuote.id);

    // Calculate due date (today + 1 day for boleto, today for PIX)
    const dueDate = new Date();
    if (billingType === 'BOLETO') {
      dueDate.setDate(dueDate.getDate() + 3);
    }
    const dueDateStr = dueDate.toISOString().split('T')[0];

    // Create payment in Asaas
    const paymentPayload: any = {
      customer: customerId,
      billingType: billingType,
      value: amount,
      dueDate: dueDateStr,
      description: description || 'Pagamento - Confix Envios',
      externalReference: externalId,
    };

    // Add credit card data if applicable
    if (billingType === 'CREDIT_CARD' && creditCard) {
      paymentPayload.creditCard = creditCard;
      paymentPayload.creditCardHolderInfo = creditCardHolderInfo;
      if (installmentCount && installmentCount > 1) {
        paymentPayload.installmentCount = installmentCount;
        paymentPayload.installmentValue = parseFloat((amount / installmentCount).toFixed(2));
      }
    }

    console.log('📤 Enviando para Asaas:', JSON.stringify({ ...paymentPayload, creditCard: creditCard ? '***' : undefined }, null, 2));

    const paymentResponse = await fetch(`${asaasBaseUrl}/payments`, {
      method: 'POST',
      headers: {
        'access_token': asaasApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentPayload)
    });

    if (!paymentResponse.ok) {
      const errorText = await paymentResponse.text();
      console.error('❌ Asaas API error:', errorText);
      
      let errorMessage = 'Erro ao processar pagamento';
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.errors && errorJson.errors.length > 0) {
          errorMessage = errorJson.errors[0].description || errorMessage;
        }
      } catch (e) {}
      
      return new Response(
        JSON.stringify({ success: false, error: errorMessage }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const paymentData = await paymentResponse.json();
    console.log('✅ Pagamento Asaas criado:', paymentData.id);

    // For PIX, get QR Code
    let pixData = null;
    if (billingType === 'PIX') {
      console.log('🔍 Obtendo QR Code PIX...');
      const pixResponse = await fetch(`${asaasBaseUrl}/payments/${paymentData.id}/pixQrCode`, {
        method: 'GET',
        headers: {
          'access_token': asaasApiKey,
          'Content-Type': 'application/json',
        },
      });

      if (pixResponse.ok) {
        pixData = await pixResponse.json();
        console.log('✅ QR Code PIX obtido');
      } else {
        console.error('⚠️ Erro ao obter QR Code:', await pixResponse.text());
      }
    }

    // For Boleto, get bank slip URL
    let boletoData = null;
    if (billingType === 'BOLETO') {
      boletoData = {
        bankSlipUrl: paymentData.bankSlipUrl,
        nossoNumero: paymentData.nossoNumero,
        barCode: paymentData.barCode,
        identificationField: paymentData.identificationField,
      };
    }

    // Log successful creation
    try {
      await supabase.from('webhook_logs').insert({
        event_type: 'asaas_payment_created',
        shipment_id: userId || 'anonymous',
        payload: {
          payment_id: paymentData.id,
          billing_type: billingType,
          amount: amount,
          success: true,
          source: 'create-asaas-payment',
          client_ip: clientIp,
        },
        response_status: 200,
        response_body: { status: 'payment_created' }
      });
    } catch (logError) {
      console.error('⚠️ Log error (non-blocking):', logError);
    }

    console.log('🎉 Payment created successfully');

    // Prepare response based on billing type
    const responseData: any = {
      success: true,
      paymentId: paymentData.id,
      amount: amount,
      billingType: billingType,
      status: paymentData.status,
      externalReference: externalId,
    };

    if (billingType === 'PIX' && pixData) {
      responseData.pixCode = pixData.payload;
      responseData.qrCodeImage = pixData.encodedImage ? `data:image/png;base64,${pixData.encodedImage}` : null;
      responseData.expiresAt = pixData.expirationDate || new Date(Date.now() + 30 * 60 * 1000).toISOString();
    } else if (billingType === 'BOLETO' && boletoData) {
      responseData.bankSlipUrl = boletoData.bankSlipUrl;
      responseData.barCode = boletoData.barCode;
      responseData.identificationField = boletoData.identificationField;
      responseData.dueDate = paymentData.dueDate;
    } else if (billingType === 'CREDIT_CARD') {
      responseData.confirmedDate = paymentData.confirmedDate;
      responseData.creditCard = {
        creditCardBrand: paymentData.creditCard?.creditCardBrand,
        creditCardNumber: paymentData.creditCard?.creditCardNumber,
      };
    }

    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('💥 Payment error:', error);
    
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno. Tente novamente.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
