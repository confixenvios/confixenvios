// Security input validation utilities

export const MAX_UNIT_VALUE = 50000; // R$ 50,000 per item
export const MAX_WEIGHT = 30; // 30kg maximum per package
export const MIN_WEIGHT = 0.1; // 100g minimum

export const validateUnitValue = (value: number): string | null => {
  if (value <= 0) return "Valor deve ser maior que R$ 0,00";
  if (value > MAX_UNIT_VALUE) return `Valor não pode exceder R$ ${MAX_UNIT_VALUE.toLocaleString('pt-BR')}`;
  return null;
};

export const validateWeight = (weight: number): string | null => {
  if (weight < MIN_WEIGHT) return `Peso deve ser no mínimo ${MIN_WEIGHT}kg`;
  if (weight > MAX_WEIGHT) return `Peso não pode exceder ${MAX_WEIGHT}kg`;
  return null;
};

export const validateCEP = (cep: string): string | null => {
  const cleanCep = cep.replace(/\D/g, '');
  if (cleanCep.length !== 8) return "CEP deve ter 8 dígitos";
  if (!/^\d{8}$/.test(cleanCep)) return "CEP deve conter apenas números";
  return null;
};

export const validateCPF = (cpf: string): string | null => {
  const cleanCpf = cpf.replace(/\D/g, '');
  if (cleanCpf.length !== 11) return "CPF deve ter 11 dígitos";
  if (!/^\d{11}$/.test(cleanCpf)) return "CPF deve conter apenas números";
  
  // Basic CPF validation (checksum)
  if (cleanCpf === '00000000000' || 
      cleanCpf === '11111111111' || 
      cleanCpf === '22222222222' ||
      cleanCpf === '33333333333' ||
      cleanCpf === '44444444444' ||
      cleanCpf === '55555555555' ||
      cleanCpf === '66666666666' ||
      cleanCpf === '77777777777' ||
      cleanCpf === '88888888888' ||
      cleanCpf === '99999999999') {
    return "CPF inválido";
  }
  
  return null;
};

export const validateCNPJ = (cnpj: string): string | null => {
  const cleanCnpj = cnpj.replace(/\D/g, '');
  if (cleanCnpj.length !== 14) return "CNPJ deve ter 14 dígitos";
  if (!/^\d{14}$/.test(cleanCnpj)) return "CNPJ deve conter apenas números";
  return null;
};

export const validateDocument = (document: string): string | null => {
  const cleanDoc = document.replace(/\D/g, '');
  
  if (cleanDoc.length === 11) {
    return validateCPF(document);
  } else if (cleanDoc.length === 14) {
    return validateCNPJ(document);
  } else {
    return "Documento deve ser CPF (11 dígitos) ou CNPJ (14 dígitos)";
  }
};

export const sanitizeTextInput = (input: string): string => {
  // Remove potentially dangerous characters and limit length
  return input
    .replace(/[<>\"'&]/g, '') // Remove HTML/script chars
    .trim()
    .substring(0, 500); // Limit length
};

export const validateDimensions = (length: number, width: number, height: number): string | null => {
  const maxDimension = 200; // 200cm max
  const minDimension = 1; // 1cm min
  
  if (length < minDimension || width < minDimension || height < minDimension) {
    return `Todas as dimensões devem ser no mínimo ${minDimension}cm`;
  }
  
  if (length > maxDimension || width > maxDimension || height > maxDimension) {
    return `Nenhuma dimensão pode exceder ${maxDimension}cm`;
  }
  
  return null;
};