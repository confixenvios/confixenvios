// Utility functions for CPF and CNPJ validation

export const formatDocument = (value: string): string => {
  // Remove all non-numeric characters
  const numericValue = value.replace(/\D/g, '');
  
  if (numericValue.length <= 11) {
    // Format as CPF: 000.000.000-00
    return numericValue
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  } else {
    // Format as CNPJ: 00.000.000/0000-00
    return numericValue
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
  }
};

export const validateCPF = (cpf: string): boolean => {
  // Remove all non-numeric characters
  const cleanCpf = cpf.replace(/\D/g, '');
  
  // Check if CPF has 11 digits
  if (cleanCpf.length !== 11) return false;
  
  // Check if all digits are the same
  if (/^(\d)\1{10}$/.test(cleanCpf)) return false;
  
  // Validate CPF algorithm
  let sum = 0;
  let remainder;
  
  // First verification digit
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleanCpf.substring(i - 1, i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCpf.substring(9, 10))) return false;
  
  sum = 0;
  // Second verification digit
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleanCpf.substring(i - 1, i)) * (12 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCpf.substring(10, 11))) return false;
  
  return true;
};

export const validateCNPJ = (cnpj: string): boolean => {
  // Remove all non-numeric characters
  const cleanCnpj = cnpj.replace(/\D/g, '');
  
  // Check if CNPJ has 14 digits
  if (cleanCnpj.length !== 14) return false;
  
  // Check if all digits are the same
  if (/^(\d)\1{13}$/.test(cleanCnpj)) return false;
  
  // Validate CNPJ algorithm
  let size = cleanCnpj.length - 2;
  let numbers = cleanCnpj.substring(0, size);
  const digits = cleanCnpj.substring(size);
  let sum = 0;
  let pos = size - 7;
  
  // First verification digit
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;
  
  size = size + 1;
  numbers = cleanCnpj.substring(0, size);
  sum = 0;
  pos = size - 7;
  
  // Second verification digit
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;
  
  return true;
};

export const validateDocument = (document: string): { isValid: boolean; type: 'CPF' | 'CNPJ' | null } => {
  const cleanDocument = document.replace(/\D/g, '');
  
  if (cleanDocument.length === 11) {
    return {
      isValid: validateCPF(document),
      type: 'CPF'
    };
  } else if (cleanDocument.length === 14) {
    return {
      isValid: validateCNPJ(document),
      type: 'CNPJ'
    };
  }
  
  return {
    isValid: false,
    type: null
  };
};

export const getDocumentType = (document: string): 'CPF' | 'CNPJ' | null => {
  const cleanDocument = document.replace(/\D/g, '');
  
  if (cleanDocument.length === 11) return 'CPF';
  if (cleanDocument.length === 14) return 'CNPJ';
  
  return null;
};