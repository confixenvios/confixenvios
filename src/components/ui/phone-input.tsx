import React, { useState, useEffect } from "react";
import InputMask from "react-input-mask";
import { Input } from "./input";

interface PhoneInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

/**
 * PhoneInput component that supports both Brazilian landline (10 digits) 
 * and mobile (11 digits) phone formats:
 * - Landline: (XX) XXXX-XXXX
 * - Mobile: (XX) XXXXX-XXXX
 */
export const PhoneInput = ({ 
  value, 
  onChange, 
  placeholder = "(00) 0000-0000", 
  className = "h-12",
  required = false 
}: PhoneInputProps) => {
  // Extract only digits from value
  const digits = value?.replace(/\D/g, "") || "";
  
  // Determine mask based on number of digits
  // If 11+ digits, use mobile format. If 10 or less, use landline format
  const mask = digits.length > 10 ? "(99) 99999-9999" : "(99) 9999-99999";
  
  // Dynamic placeholder based on current input
  const dynamicPlaceholder = digits.length > 10 ? "(00) 00000-0000" : "(00) 0000-0000";

  return (
    <InputMask
      mask={mask}
      value={value}
      onChange={onChange}
      maskChar={null}
    >
      {(inputProps: any) => (
        <Input 
          {...inputProps} 
          type="tel" 
          placeholder={placeholder || dynamicPlaceholder} 
          className={className}
          required={required}
        />
      )}
    </InputMask>
  );
};

export default PhoneInput;
