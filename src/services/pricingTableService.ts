import { supabase } from "@/integrations/supabase/client";
import * as XLSX from 'xlsx';

export interface PricingTableQuote {
  economicPrice: number;
  expressPrice: number;
  economicDays: number;
  expressDays: number;
  zone: string;
  zoneName: string;
  tableId: string;
  tableName: string;
  cnpj: string;
  insuranceValue?: number;
  basePrice?: number;
  cubicWeight?: number;
  appliedWeight?: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    missingCeps: string[];
    missingWeights: number[];
  };
}

export class PricingTableService {
  static async getMultiTableQuote(params: any): Promise<PricingTableQuote | null> {
    // Não usado - lógica está no shippingService.ts
    return null;
  }

  static async getSheetNames(googleSheetsUrl: string): Promise<string[]> {
    try {
      const match = googleSheetsUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (!match) return [];
      const spreadsheetId = match[1];
      const xlsxUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`;
      const response = await fetch(xlsxUrl);
      if (!response.ok) return [];
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      return workbook.SheetNames;
    } catch {
      return [];
    }
  }

  static async validatePricingData(data: any): Promise<ValidationResult> {
    return {
      isValid: true,
      errors: [],
      warnings: [],
      summary: {
        totalRows: 0,
        validRows: 0,
        invalidRows: 0,
        missingCeps: [],
        missingWeights: []
      }
    };
  }
}
