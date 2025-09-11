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
  /**
   * Busca cotações de todas as tabelas ativas e retorna a melhor opção
   */
  static async getMultiTableQuote({
    destinyCep,
    weight,
    quantity = 1
  }: {
    destinyCep: string;
    weight: number;
    quantity?: number;
  }): Promise<PricingTableQuote | null> {
    try {
      // Buscar todas as tabelas ativas
      const { data: tables, error } = await supabase
        .from('pricing_tables')
        .select('*')
        .eq('is_active', true)
        .eq('validation_status', 'valid');

      if (error) throw error;

      if (!tables || tables.length === 0) {
        // Fallback para o sistema antigo
        return await this.getFallbackQuote({ destinyCep, weight, quantity });
      }

      const quotes: PricingTableQuote[] = [];

      // Buscar cotações de cada tabela
      for (const table of tables) {
        try {
          const quote = await this.getQuoteFromTable(table, { destinyCep, weight, quantity });
          if (quote) {
            quotes.push(quote);
          }
        } catch (error) {
          console.error(`Erro ao processar tabela ${table.name}:`, error);
          // Continua para a próxima tabela
        }
      }

      if (quotes.length === 0) {
        // Fallback para o sistema antigo se nenhuma tabela retornar cotação
        return await this.getFallbackQuote({ destinyCep, weight, quantity });
      }

      // Retorna a cotação com melhor preço econômico
      return quotes.reduce((best, current) => 
        current.economicPrice < best.economicPrice ? current : best
      );

    } catch (error) {
      console.error('Erro ao buscar cotações multi-tabela:', error);
      // Fallback para o sistema antigo em caso de erro
      return await this.getFallbackQuote({ destinyCep, weight, quantity });
    }
  }

  /**
   * Obtém cotação de uma tabela específica
   */
  private static async getQuoteFromTable(
    table: any, 
    { destinyCep, weight, quantity }: { destinyCep: string; weight: number; quantity: number }
  ): Promise<PricingTableQuote | null> {
    // Para tabelas do Google Sheets, fazer requisição para buscar dados
    if (table.source_type === 'google_sheets') {
      return await this.processGoogleSheetsTable(table, { destinyCep, weight, quantity });
    }
    
    // Para arquivos upload, processar arquivo
    if (table.source_type === 'upload' && table.file_url) {
      return await this.processUploadedTable(table, { destinyCep, weight, quantity });
    }

    return null;
  }

  /**
   * Processa tabela do Google Sheets - lê todas as abas e combina informações
   */
  private static async processGoogleSheetsTable(
    table: any,
    { destinyCep, weight, quantity }: { destinyCep: string; weight: number; quantity: number }
  ): Promise<PricingTableQuote | null> {
    try {
      // Obter todas as abas da planilha
      const sheetNames = await this.getSheetNames(table.google_sheets_url);
      if (!sheetNames || sheetNames.length === 0) {
        console.error('Nenhuma aba encontrada na planilha');
        return null;
      }

      const allSheetsData: { name: string; data: any[] }[] = [];

      // Ler dados de todas as abas
      for (const sheetName of sheetNames) {
        try {
          const gid = await this.getSheetGid(table.google_sheets_url, sheetName);
          if (gid === null) continue;

          const csvUrl = this.convertGoogleSheetsUrl(table.google_sheets_url, gid);
          const response = await fetch(csvUrl);
          if (!response.ok) continue;

          const csvData = await response.text();
          const workbook = XLSX.read(csvData, { type: 'string' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json(worksheet);

          if (data && data.length > 0) {
            allSheetsData.push({ name: sheetName, data });
          }
        } catch (error) {
          console.error(`Erro ao processar aba ${sheetName}:`, error);
          continue;
        }
      }

      if (allSheetsData.length === 0) {
        console.error('Nenhuma aba válida encontrada');
        return null;
      }

      // Tentar encontrar preço em cada aba
      for (const sheetData of allSheetsData) {
        const quote = this.findPriceInData(sheetData.data, table, { destinyCep, weight, quantity });
        if (quote) {
          // Adicionar informação da aba utilizada
          quote.zoneName = `${table.name} - ${sheetData.name}`;
          return quote;
        }
      }

      // Se não encontrou em nenhuma aba, tentar combinar dados (para casos especiais)
      return this.combineSheetsData(allSheetsData, table, { destinyCep, weight, quantity });
    } catch (error) {
      console.error('Erro ao processar Google Sheets:', error);
      return null;
    }
  }

  /**
   * Processa arquivo enviado
   */
  private static async processUploadedTable(
    table: any,
    { destinyCep, weight, quantity }: { destinyCep: string; weight: number; quantity: number }
  ): Promise<PricingTableQuote | null> {
    try {
      const response = await fetch(table.file_url);
      if (!response.ok) throw new Error('Erro ao acessar arquivo');
      
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet);

      return this.findPriceInData(data, table, { destinyCep, weight, quantity });
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      return null;
    }
  }

  /**
   * Busca preço nos dados da planilha
   */
  private static findPriceInData(
    data: any[],
    table: any,
    { destinyCep, weight, quantity }: { destinyCep: string; weight: number; quantity: number }
  ): PricingTableQuote | null {
    const cleanCep = destinyCep.replace(/\D/g, '').padStart(8, '0');
    
    // Buscar linha correspondente ao CEP e peso
    // Assumindo estrutura: CEP_INICIO, CEP_FIM, PESO_MIN, PESO_MAX, PRECO, PRAZO
    const matchingRow = data.find((row: any) => {
      const cepStart = String(row.CEP_INICIO || row.cep_inicio || '').replace(/\D/g, '').padStart(8, '0');
      const cepEnd = String(row.CEP_FIM || row.cep_fim || '').replace(/\D/g, '').padStart(8, '0');
      const weightMin = Number(row.PESO_MIN || row.peso_min || 0);
      const weightMax = Number(row.PESO_MAX || row.peso_max || 99999);
      
      return (
        cleanCep >= cepStart &&
        cleanCep <= cepEnd &&
        weight >= weightMin &&
        weight <= weightMax
      );
    });

    if (!matchingRow) return null;

    const basePrice = Number(matchingRow.PRECO || matchingRow.preco || 0);
    const days = Number(matchingRow.PRAZO || matchingRow.prazo || 5);
    
    if (basePrice <= 0) return null;

    const totalPrice = basePrice * quantity;

    return {
      economicPrice: Number(totalPrice.toFixed(2)),
      expressPrice: Number((totalPrice * 1.6).toFixed(2)),
      economicDays: days,
      expressDays: Math.max(1, days - 2),
      zone: matchingRow.ZONA || matchingRow.zona || 'AUTO',
      zoneName: `${table.name} - Zona ${matchingRow.ZONA || 'AUTO'}`,
      tableId: table.id,
      tableName: table.name,
      cnpj: table.cnpj
    };
  }

  /**
   * Combina dados de múltiplas abas quando necessário
   */
  private static combineSheetsData(
    allSheetsData: { name: string; data: any[] }[],
    table: any,
    { destinyCep, weight, quantity }: { destinyCep: string; weight: number; quantity: number }
  ): PricingTableQuote | null {
    // Lógica para combinar dados de diferentes abas
    // Por exemplo: uma aba com preços e outra com abrangência
    const cleanCep = destinyCep.replace(/\D/g, '').padStart(8, '0');
    
    // Procurar por aba de abrangência/CEPs
    const coverageSheet = allSheetsData.find(sheet => 
      sheet.name.toLowerCase().includes('abrang') || 
      sheet.name.toLowerCase().includes('cep') ||
      sheet.data.some(row => row.CEP_INICIO || row.cep_inicio)
    );
    
    // Procurar por aba de preços
    const priceSheet = allSheetsData.find(sheet => 
      sheet.name.toLowerCase().includes('prec') ||
      sheet.name.toLowerCase().includes('peso') ||
      sheet.data.some(row => row.PRECO || row.preco)
    );
    
    if (!coverageSheet && !priceSheet) {
      return null;
    }
    
    // Se temos duas abas distintas, combinar informações
    if (coverageSheet && priceSheet && coverageSheet !== priceSheet) {
      // Buscar zona na aba de abrangência
      const coverageRow = coverageSheet.data.find((row: any) => {
        const cepStart = String(row.CEP_INICIO || row.cep_inicio || '').replace(/\D/g, '').padStart(8, '0');
        const cepEnd = String(row.CEP_FIM || row.cep_fim || '').replace(/\D/g, '').padStart(8, '0');
        return cleanCep >= cepStart && cleanCep <= cepEnd;
      });
      
      if (!coverageRow) return null;
      
      const zone = coverageRow.ZONA || coverageRow.zona || coverageRow.REGIAO || coverageRow.regiao;
      const days = Number(coverageRow.PRAZO || coverageRow.prazo || 5);
      
      // Buscar preço na aba de preços usando zona e peso
      const priceRow = priceSheet.data.find((row: any) => {
        const rowZone = row.ZONA || row.zona || row.REGIAO || row.regiao;
        const weightMin = Number(row.PESO_MIN || row.peso_min || 0);
        const weightMax = Number(row.PESO_MAX || row.peso_max || 99999);
        
        return rowZone === zone && weight >= weightMin && weight <= weightMax;
      });
      
      if (!priceRow) return null;
      
      const basePrice = Number(priceRow.PRECO || priceRow.preco || 0);
      if (basePrice <= 0) return null;
      
      const totalPrice = basePrice * quantity;
      
      return {
        economicPrice: Number(totalPrice.toFixed(2)),
        expressPrice: Number((totalPrice * 1.6).toFixed(2)),
        economicDays: days,
        expressDays: Math.max(1, days - 2),
        zone: String(zone),
        zoneName: `${table.name} - Zona ${zone}`,
        tableId: table.id,
        tableName: table.name,
        cnpj: table.cnpj
      };
    }
    
    return null;
  }

  /**
   * Fallback para o sistema antigo de cotação
   */
  private static async getFallbackQuote({ destinyCep, weight, quantity }: {
    destinyCep: string;
    weight: number;
    quantity: number;
  }): Promise<PricingTableQuote | null> {
    try {
      // Usar o sistema antigo como fallback
      const { calculateShippingQuote } = await import('./shippingService');
      const quote = await calculateShippingQuote({ destinyCep, weight, quantity });
      
      return {
        ...quote,
        tableId: 'legacy',
        tableName: 'Sistema Legado',
        cnpj: '00000000000000'
      };
    } catch (error) {
      console.error('Erro no fallback:', error);
      return null;
    }
  }

  /**
   * Converte URL do Google Sheets para formato de export CSV
   */
  private static convertGoogleSheetsUrl(url: string, gid: string = '0'): string {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) throw new Error('URL inválida do Google Sheets');
    
    const spreadsheetId = match[1];
    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
  }

  /**
   * Obtém lista de abas disponíveis na planilha Google Sheets
   */
  static async getSheetNames(googleSheetsUrl: string): Promise<string[]> {
    try {
      // Para obter os nomes das abas, precisamos fazer download como Excel
      const match = googleSheetsUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (!match) throw new Error('URL inválida do Google Sheets');
      
      const spreadsheetId = match[1];
      const xlsxUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`;
      
      const response = await fetch(xlsxUrl);
      if (!response.ok) throw new Error('Erro ao acessar Google Sheets');
      
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      
      return workbook.SheetNames;
    } catch (error) {
      console.error('Erro ao obter nomes das abas:', error);
      return [];
    }
  }

  /**
   * Obtém GID de uma aba específica pelo nome
   */
  static async getSheetGid(googleSheetsUrl: string, sheetName: string): Promise<string | null> {
    try {
      // Método para obter GID específico da aba
      // Por limitações da API pública do Google Sheets, vamos usar uma abordagem alternativa
      // Tentaremos GIDs comuns primeiro (0, 1, 2, etc.) e verificar qual corresponde ao nome
      const match = googleSheetsUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (!match) throw new Error('URL inválida do Google Sheets');
      
      const spreadsheetId = match[1];
      const xlsxUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`;
      
      const response = await fetch(xlsxUrl);
      if (!response.ok) throw new Error('Erro ao acessar Google Sheets');
      
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      
      const sheetIndex = workbook.SheetNames.indexOf(sheetName);
      if (sheetIndex === -1) return null;
      
      // Retorna o índice como GID (padrão do Google Sheets)
      return sheetIndex.toString();
    } catch (error) {
      console.error('Erro ao obter GID da aba:', error);
      return null;
    }
  }

  /**
   * Valida uma tabela de preços - processa todas as abas quando necessário
   */
  static async validatePricingTable(tableId: string): Promise<ValidationResult> {
    try {
      const { data: table, error } = await supabase
        .from('pricing_tables')
        .select('*')
        .eq('id', tableId)
        .single();

      if (error || !table) {
        throw new Error('Tabela não encontrada');
      }

      let allData: any[] = [];

      // Buscar dados da tabela
      if (table.source_type === 'google_sheets') {
        // Obter todas as abas da planilha
        const sheetNames = await this.getSheetNames(table.google_sheets_url);
        
        if (!sheetNames || sheetNames.length === 0) {
          throw new Error('Nenhuma aba encontrada na planilha');
        }

        // Processar todas as abas
        for (const sheetName of sheetNames) {
          try {
            const gid = await this.getSheetGid(table.google_sheets_url, sheetName);
            if (gid === null) continue;

            const csvUrl = this.convertGoogleSheetsUrl(table.google_sheets_url, gid);
            const response = await fetch(csvUrl);
            if (!response.ok) continue;

            const csvData = await response.text();
            const workbook = XLSX.read(csvData, { type: 'string' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(worksheet);

            if (data && data.length > 0) {
              allData = allData.concat(data);
            }
          } catch (error) {
            console.error(`Erro ao processar aba ${sheetName}:`, error);
            continue;
          }
        }
      } else if (table.file_url) {
        const response = await fetch(table.file_url);
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        allData = XLSX.utils.sheet_to_json(worksheet);
      }

      // Validar estrutura dos dados combinados
      const result = this.validateTableData(allData);

      // Atualizar status da validação no banco
      const { error: updateError } = await supabase
        .from('pricing_tables')
        .update({
          validation_status: result.isValid ? 'valid' : 'invalid',
          validation_errors: result.errors.length > 0 ? result.errors : null,
          last_validation_at: new Date().toISOString()
        })
        .eq('id', tableId);

      if (updateError) {
        console.error('Erro ao atualizar status de validação:', updateError);
      }

      return result;
    } catch (error) {
      console.error('Erro na validação:', error);
      return {
        isValid: false,
        errors: [error instanceof Error ? error.message : 'Erro desconhecido'],
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

  /**
   * Valida os dados da tabela
   */
  private static validateTableData(data: any[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const missingCeps: string[] = [];
    const missingWeights: number[] = [];
    let validRows = 0;

    if (!Array.isArray(data) || data.length === 0) {
      errors.push('Tabela vazia ou formato inválido');
      return {
        isValid: false,
        errors,
        warnings,
        summary: {
          totalRows: 0,
          validRows: 0,
          invalidRows: 0,
          missingCeps,
          missingWeights
        }
      };
    }

    // Verificar se tem as colunas necessárias
    const firstRow = data[0];
    const requiredColumns = ['CEP_INICIO', 'CEP_FIM', 'PESO_MIN', 'PESO_MAX', 'PRECO', 'PRAZO'];
    const altColumns = ['cep_inicio', 'cep_fim', 'peso_min', 'peso_max', 'preco', 'prazo'];
    
    const hasRequiredColumns = requiredColumns.some(col => col in firstRow) ||
                              altColumns.some(col => col in firstRow);
    
    if (!hasRequiredColumns) {
      errors.push('Colunas obrigatórias não encontradas. Esperado: CEP_INICIO, CEP_FIM, PESO_MIN, PESO_MAX, PRECO, PRAZO');
    }

    // Validar cada linha
    data.forEach((row, index) => {
      const lineNumber = index + 1;
      let isValidRow = true;

      // Validar CEPs
      const cepStart = String(row.CEP_INICIO || row.cep_inicio || '').replace(/\D/g, '');
      const cepEnd = String(row.CEP_FIM || row.cep_fim || '').replace(/\D/g, '');
      
      if (!cepStart || cepStart.length !== 8) {
        errors.push(`Linha ${lineNumber}: CEP_INICIO inválido`);
        isValidRow = false;
      }
      
      if (!cepEnd || cepEnd.length !== 8) {
        errors.push(`Linha ${lineNumber}: CEP_FIM inválido`);
        isValidRow = false;
      }

      // Validar pesos
      const weightMin = Number(row.PESO_MIN || row.peso_min);
      const weightMax = Number(row.PESO_MAX || row.peso_max);
      
      if (isNaN(weightMin) || weightMin < 0) {
        errors.push(`Linha ${lineNumber}: PESO_MIN inválido`);
        isValidRow = false;
      }
      
      if (isNaN(weightMax) || weightMax <= 0) {
        errors.push(`Linha ${lineNumber}: PESO_MAX inválido`);
        isValidRow = false;
      }
      
      if (weightMin >= weightMax) {
        errors.push(`Linha ${lineNumber}: PESO_MIN deve ser menor que PESO_MAX`);
        isValidRow = false;
      }

      // Validar preço
      const price = Number(row.PRECO || row.preco);
      if (isNaN(price) || price <= 0) {
        errors.push(`Linha ${lineNumber}: PRECO inválido`);
        isValidRow = false;
      }

      // Validar prazo
      const days = Number(row.PRAZO || row.prazo);
      if (isNaN(days) || days <= 0) {
        errors.push(`Linha ${lineNumber}: PRAZO inválido`);
        isValidRow = false;
      }

      if (isValidRow) {
        validRows++;
      }
    });

    const isValid = errors.length === 0;
    
    if (!isValid) {
      warnings.push(`${errors.length} erro(s) encontrado(s) na validação`);
    }

    return {
      isValid,
      errors,
      warnings,
      summary: {
        totalRows: data.length,
        validRows,
        invalidRows: data.length - validRows,
        missingCeps,
        missingWeights
      }
    };
  }
}