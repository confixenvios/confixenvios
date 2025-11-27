/**
 * Gera token de segurança para acesso ao DACTE/XML da Webmania
 * Usando criptografia AES-256-CBC conforme documentação da Webmania
 */

async function createSecureTokenDFe(password: string, uuid: string): Promise<string> {
  // Remove caracteres não numéricos do CPF/CNPJ
  const numericPassword = String(password).replace(/[^0-9]/g, '');
  const dataToHash = `${numericPassword}:${uuid}`;

  const encoder = new TextEncoder();
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(dataToHash));
  const key = await crypto.subtle.importKey('raw', hash, { name: 'AES-CBC' }, false, ['encrypt']);

  const iv = crypto.getRandomValues(new Uint8Array(16));
  const nowSeconds = Math.floor(Date.now() / 1000).toString();

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-CBC', iv },
    key,
    encoder.encode(nowSeconds)
  );

  const tokenData = JSON.stringify({
    data: toBase64(encrypted),
    iv: toBase64(iv),
  });

  return encodeURIComponent(btoa(tokenData));
}

function toBase64(input: ArrayBuffer | Uint8Array): string {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Gera URL autenticada para o DACTE com token de segurança
 * @param chaveCte - Chave do CT-e (44 dígitos)
 * @param uuidCte - UUID do CT-e retornado pela API
 * @param cpfCnpjTomador - CPF/CNPJ do tomador (destinatário)
 * @returns URL do DACTE com token de segurança
 */
export async function generateDacteSecureUrl(
  chaveCte: string,
  uuidCte: string,
  cpfCnpjTomador: string
): Promise<string> {
  try {
    const token = await createSecureTokenDFe(cpfCnpjTomador, uuidCte);
    return `https://api.webmania.com.br/dacte/${chaveCte}/?token=${token}`;
  } catch (error) {
    console.error('Erro ao gerar token do DACTE:', error);
    // Fallback para URL sem token
    return `https://api.webmania.com.br/dacte/${chaveCte}`;
  }
}

/**
 * Gera URL autenticada para o XML com token de segurança
 * @param chaveCte - Chave do CT-e (44 dígitos)
 * @param uuidCte - UUID do CT-e retornado pela API
 * @param cpfCnpjTomador - CPF/CNPJ do tomador (destinatário)
 * @returns URL do XML com token de segurança
 */
export async function generateXmlSecureUrl(
  chaveCte: string,
  uuidCte: string,
  cpfCnpjTomador: string
): Promise<string> {
  try {
    const token = await createSecureTokenDFe(cpfCnpjTomador, uuidCte);
    return `https://api.webmania.com.br/xmlcte/${chaveCte}/?token=${token}`;
  } catch (error) {
    console.error('Erro ao gerar token do XML:', error);
    // Fallback para URL sem token
    return `https://api.webmania.com.br/xmlcte/${chaveCte}`;
  }
}
