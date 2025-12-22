// Validações e sanitizações para campos de endereço B2B

// Nome: apenas letras (incluindo acentos) e espaços, até 40 caracteres
export const sanitizeName = (value: string): string => {
  return value
    .replace(/[^a-zA-ZÀ-ÿ\s]/g, '')
    .slice(0, 40);
};

// CEP: apenas números, até 8 dígitos (formato com máscara: 00000-000)
export const sanitizeCep = (value: string): string => {
  return value
    .replace(/\D/g, '')
    .slice(0, 8);
};

// CEP com máscara
export const formatCep = (value: string): string => {
  return sanitizeCep(value)
    .replace(/(\d{5})(\d)/, '$1-$2');
};

// Rua: letras, números e espaços, até 40 caracteres
export const sanitizeStreet = (value: string): string => {
  return value
    .replace(/[^a-zA-ZÀ-ÿ0-9\s.,\-]/g, '')
    .slice(0, 40);
};

// Número: apenas números, até 6 caracteres
export const sanitizeNumber = (value: string): string => {
  return value
    .replace(/\D/g, '')
    .slice(0, 6);
};

// Complemento: letras, números e espaços, até 40 caracteres
export const sanitizeComplement = (value: string): string => {
  return value
    .replace(/[^a-zA-ZÀ-ÿ0-9\s.,\-/]/g, '')
    .slice(0, 40);
};

// Bairro: letras, números e espaços, até 40 caracteres
export const sanitizeNeighborhood = (value: string): string => {
  return value
    .replace(/[^a-zA-ZÀ-ÿ0-9\s.,\-]/g, '')
    .slice(0, 40);
};

// Cidade: letras, números e espaços, até 40 caracteres
export const sanitizeCity = (value: string): string => {
  return value
    .replace(/[^a-zA-ZÀ-ÿ0-9\s.,\-]/g, '')
    .slice(0, 40);
};

// Estado: apenas letras maiúsculas, 2 caracteres (UF)
export const sanitizeState = (value: string): string => {
  return value
    .replace(/[^a-zA-Z]/g, '')
    .toUpperCase()
    .slice(0, 2);
};

// Referência: letras, números e espaços, até 40 caracteres
export const sanitizeReference = (value: string): string => {
  return value
    .replace(/[^a-zA-ZÀ-ÿ0-9\s.,\-/]/g, '')
    .slice(0, 40);
};

// Nome Contato: apenas letras (incluindo acentos) e espaços, até 40 caracteres
export const sanitizeContactName = (value: string): string => {
  return value
    .replace(/[^a-zA-ZÀ-ÿ\s]/g, '')
    .slice(0, 40);
};

// Telefone Contato: apenas números, até 11 dígitos
export const sanitizePhone = (value: string): string => {
  return value
    .replace(/\D/g, '')
    .slice(0, 11);
};

// Telefone com máscara
export const formatPhone = (value: string): string => {
  const digits = sanitizePhone(value);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

// Documento (CPF/CNPJ): apenas números, até 14 dígitos (máximo CNPJ)
export const sanitizeDocument = (value: string): string => {
  return value
    .replace(/\D/g, '')
    .slice(0, 14);
};

// Documento com máscara (CPF ou CNPJ)
export const formatDocument = (value: string): string => {
  const digits = sanitizeDocument(value);
  if (digits.length <= 11) {
    // Formato CPF: 000.000.000-00
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  } else {
    // Formato CNPJ: 00.000.000/0000-00
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
    if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
    if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  }
};
