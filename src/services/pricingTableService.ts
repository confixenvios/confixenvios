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
  adValoremValue?: number;
  grisValue?: number;
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
  /**
   * Busca cotações de todas as tabelas ativas e retorna a melhor opção
   */
  static async getMultiTableQuote({
    destinyCep,
    weight,
    quantity = 1,
    length,
    width,
    height,
    merchandiseValue
  }: {
    destinyCep: string;
    weight: number;
    quantity?: number;
    length?: number;
    width?: number;
    height?: number;
    merchandiseValue?: number;
  }): Promise<PricingTableQuote | null> {
    try {
      // OTIMIZAÇÃO: Cache para evitar chamadas repetidas desnecessárias
      const cacheKey = 'active_pricing_tables';
      const cachedTables = sessionStorage.getItem(cacheKey);
      let tables: any[] = [];

      if (cachedTables) {
        const { data, timestamp } = JSON.parse(cachedTables);
        // Cache válido por 2 minutos
        if (Date.now() - timestamp < 2 * 60 * 1000) {
          tables = data;
          console.log('Usando tabelas em cache');
        }
      }

      // Se não há cache ou expirou, buscar do banco
      if (tables.length === 0) {
        console.log('Buscando tabelas ativas no banco...');
        const { data, error } = await supabase
          .from('pricing_tables')
          .select('*')
          .eq('is_active', true)
          .eq('validation_status', 'valid');

        if (error) throw error;

        tables = data || [];
        
        // Cachear o resultado (incluindo arrays vazios)
        sessionStorage.setItem(cacheKey, JSON.stringify({
          data: tables,
          timestamp: Date.now()
        }));
      }

      if (tables.length === 0) {
        console.log('Nenhuma tabela ativa encontrada, usando fallback imediatamente');
        return await this.getFallbackQuote({ destinyCep, weight, quantity });
      }

      // OTIMIZAÇÃO: Processar tabelas em paralelo com timeout reduzido
      const quotePromises = tables.map(async (table) => {
        try {
          // Timeout de 4 segundos por tabela
          return await Promise.race([
            this.getQuoteFromTable(table, { destinyCep, weight, quantity, length, width, height, merchandiseValue }),
            new Promise<null>((_, reject) => 
              setTimeout(() => reject(new Error('Timeout')), 4000)
            )
          ]);
        } catch (error) {
          console.error(`Erro ao processar tabela ${table.name}:`, error);
          return null;
        }
      });

      // Aguardar todas as cotações com timeout global de 8 segundos
      const quotes = await Promise.race([
        Promise.all(quotePromises),
        new Promise<(PricingTableQuote | null)[]>((resolve) => 
          setTimeout(() => resolve([]), 8000)
        )
      ]);

      const validQuotes = quotes.filter((quote): quote is PricingTableQuote => quote !== null);

      if (validQuotes.length === 0) {
        console.log('Nenhuma cotação válida encontrada, usando fallback');
        return await this.getFallbackQuote({ destinyCep, weight, quantity });
      }

      // Retorna a cotação com melhor preço econômico
      return validQuotes.reduce((best, current) => 
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
    { destinyCep, weight, quantity, length, width, height, merchandiseValue }: { 
      destinyCep: string; 
      weight: number; 
      quantity: number;
      length?: number;
      width?: number;
      height?: number;
      merchandiseValue?: number;
    }
  ): Promise<PricingTableQuote | null> {
    // Para tabelas do Google Sheets, fazer requisição para buscar dados
    if (table.source_type === 'google_sheets') {
      return await this.processGoogleSheetsTable(table, { destinyCep, weight, quantity, length, width, height, merchandiseValue });
    }
    
    // Para arquivos upload, processar arquivo
    if (table.source_type === 'upload' && table.file_url) {
      return await this.processUploadedTable(table, { destinyCep, weight, quantity, length, width, height, merchandiseValue });
    }

    return null;
  }

  /**
   * Processa tabela do Google Sheets - lê todas as abas e combina informações
   */
  private static async processGoogleSheetsTable(
    table: any,
    { destinyCep, weight, quantity, length, width, height, merchandiseValue }: { 
      destinyCep: string; 
      weight: number; 
      quantity: number;
      length?: number;
      width?: number;
      height?: number;
      merchandiseValue?: number;
    }
  ): Promise<PricingTableQuote | null> {
    try {
      // Timeout para operações do Google Sheets
      const sheetsTimeout = 6000; // 6 segundos

      // Obter todas as abas da planilha com timeout
      const sheetNames = await Promise.race([
        this.getSheetNames(table.google_sheets_url),
        new Promise<string[]>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout ao buscar abas')), sheetsTimeout)
        )
      ]);

      if (!sheetNames || sheetNames.length === 0) {
        console.error('Nenhuma aba encontrada na planilha');
        return null;
      }

      // OTIMIZAÇÃO: Processar abas em paralelo (máximo 3 simultaneamente para não sobrecarregar)
      const processSheet = async (sheetName: string): Promise<{ name: string; data: any[] } | null> => {
        try {
          const gid = await this.getSheetGid(table.google_sheets_url, sheetName);
          if (gid === null) return null;

          const csvUrl = this.convertGoogleSheetsUrl(table.google_sheets_url, gid);
          
          // Timeout específico para cada requisição
          const response = await Promise.race([
            fetch(csvUrl),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Timeout na requisição')), 4000)
            )
          ]);
          
          if (!response.ok) return null;

          const csvData = await response.text();
          const workbook = XLSX.read(csvData, { type: 'string' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json(worksheet);

          return data && data.length > 0 ? { name: sheetName, data } : null;
        } catch (error) {
          console.error(`Erro ao processar aba ${sheetName}:`, error);
          return null;
        }
      };

      // Processar até 3 abas em paralelo para não sobrecarregar
      const results: ({ name: string; data: any[] } | null)[] = [];
      for (let i = 0; i < sheetNames.length; i += 3) {
        const batch = sheetNames.slice(i, i + 3);
        const batchResults = await Promise.all(batch.map(processSheet));
        results.push(...batchResults);
      }

      const allSheetsData = results.filter((result): result is { name: string; data: any[] } => 
        result !== null
      );

      if (allSheetsData.length === 0) {
        console.error('Nenhuma aba válida encontrada');
        return null;
      }

      // Tentar encontrar preço em cada aba
      for (const sheetData of allSheetsData) {
        const quote = this.findPriceInData(sheetData.data, table, { destinyCep, weight, quantity, length, width, height, merchandiseValue });
        if (quote) {
          // Adicionar informação da aba utilizada
          quote.zoneName = `${table.name} - ${sheetData.name}`;
          return quote;
        }
      }

      // Se não encontrou em nenhuma aba, tentar combinar dados (para casos especiais)
      return this.combineSheetsData(allSheetsData, table, { destinyCep, weight, quantity, length, width, height, merchandiseValue });
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
    { destinyCep, weight, quantity, length, width, height, merchandiseValue }: { 
      destinyCep: string; 
      weight: number; 
      quantity: number;
      length?: number;
      width?: number;
      height?: number;
      merchandiseValue?: number;
    }
  ): Promise<PricingTableQuote | null> {
    try {
      const response = await fetch(table.file_url);
      if (!response.ok) throw new Error('Erro ao acessar arquivo');
      
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet);

      return this.findPriceInData(data, table, { destinyCep, weight, quantity, length, width, height, merchandiseValue });
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
    { destinyCep, weight, quantity, length, width, height, merchandiseValue }: { 
      destinyCep: string; 
      weight: number; 
      quantity: number;
      length?: number;
      width?: number;
      height?: number;
      merchandiseValue?: number;
    }
  ): PricingTableQuote | null {
    // Validar dimensões máximas da tabela ANTES de calcular
    if (length && width && height) {
      if (table.max_length_cm && length > table.max_length_cm) {
        console.log(`Dimensão excedida: Comprimento ${length}cm > ${table.max_length_cm}cm (tabela ${table.name})`);
        return null;
      }
      if (table.max_width_cm && width > table.max_width_cm) {
        console.log(`Dimensão excedida: Largura ${width}cm > ${table.max_width_cm}cm (tabela ${table.name})`);
        return null;
      }
      if (table.max_height_cm && height > table.max_height_cm) {
        console.log(`Dimensão excedida: Altura ${height}cm > ${table.max_height_cm}cm (tabela ${table.name})`);
        return null;
      }
    }
    
    const cleanCep = destinyCep.replace(/\D/g, '').padStart(8, '0');
    
    // Calcular peso cubado se houver dimensões e regra configurada
    let cubicWeight: number | undefined;
    let appliedWeight = weight;
    
    if (length && width && height && table.cubic_meter_kg_equivalent) {
      // Converter dimensões de cm para metros e calcular volume em m³
      const volumeM3 = (length / 100) * (width / 100) * (height / 100);
      cubicWeight = volumeM3 * table.cubic_meter_kg_equivalent;
      
      // Usar o maior peso entre real e cubado
      appliedWeight = Math.max(weight, cubicWeight);
      
      console.log(`Peso real: ${weight}kg | Peso cubado: ${cubicWeight.toFixed(2)}kg | Aplicado: ${appliedWeight.toFixed(2)}kg`);
    }
    
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
        appliedWeight >= weightMin &&
        appliedWeight <= weightMax
      );
    });

    if (!matchingRow) return null;

    const basePrice = Number(matchingRow.PRECO || matchingRow.preco || 0);
    const days = Number(matchingRow.PRAZO || matchingRow.prazo || 5);
    
    if (basePrice <= 0) return null;

    let totalPrice = basePrice * quantity;
    
    // Aplicar Ad Valorem e GRIS se houver valor da mercadoria e percentuais configurados
    let adValoremValue: number | undefined;
    let grisValue: number | undefined;
    
    if (merchandiseValue && merchandiseValue > 0) {
      if (table.ad_valorem_percentage && table.ad_valorem_percentage > 0) {
        adValoremValue = (merchandiseValue * table.ad_valorem_percentage) / 100;
        totalPrice += adValoremValue;
        console.log(`Ad Valorem (${table.ad_valorem_percentage}%): R$ ${adValoremValue.toFixed(2)}`);
      }
      
      if (table.gris_percentage && table.gris_percentage > 0) {
        grisValue = (merchandiseValue * table.gris_percentage) / 100;
        totalPrice += grisValue;
        console.log(`GRIS (${table.gris_percentage}%): R$ ${grisValue.toFixed(2)}`);
      }
    }

    return {
      economicPrice: Number(totalPrice.toFixed(2)),
      expressPrice: Number((totalPrice * 1.6).toFixed(2)),
      economicDays: days,
      expressDays: Math.max(1, days - 2),
      zone: matchingRow.ZONA || matchingRow.zona || 'AUTO',
      zoneName: `${table.name} - Zona ${matchingRow.ZONA || 'AUTO'}`,
      tableId: table.id,
      tableName: table.name,
      cnpj: table.cnpj,
      adValoremValue,
      grisValue,
      cubicWeight,
      appliedWeight
    };
  }

  /**
   * Combina dados de múltiplas abas quando necessário
   */
  private static combineSheetsData(
    allSheetsData: { name: string; data: any[] }[],
    table: any,
    { destinyCep, weight, quantity, length, width, height, merchandiseValue }: { 
      destinyCep: string; 
      weight: number; 
      quantity: number;
      length?: number;
      width?: number;
      height?: number;
      merchandiseValue?: number;
    }
  ): PricingTableQuote | null {
    // Validar dimensões máximas da tabela ANTES de processar
    if (length && width && height) {
      if (table.max_length_cm && length > table.max_length_cm) {
        console.log(`Dimensão excedida: Comprimento ${length}cm > ${table.max_length_cm}cm (tabela ${table.name})`);
        return null;
      }
      if (table.max_width_cm && width > table.max_width_cm) {
        console.log(`Dimensão excedida: Largura ${width}cm > ${table.max_width_cm}cm (tabela ${table.name})`);
        return null;
      }
      if (table.max_height_cm && height > table.max_height_cm) {
        console.log(`Dimensão excedida: Altura ${height}cm > ${table.max_height_cm}cm (tabela ${table.name})`);
        return null;
      }
    }
    
    const cleanCep = destinyCep.replace(/\D/g, '').padStart(8, '0');
    
    // Procurar aba de preços (contém PRECO e PESO)
    const priceSheet = allSheetsData.find(sheet => 
      sheet.data.some(row => 
        (row.PRECO || row.preco) && 
        (row.PESO_MIN || row.peso_min || row.PESO_MAX || row.peso_max)
      )
    );
    
    // Procurar aba de prazos/abrangência (contém CEP e PRAZO)
    const deliverySheet = allSheetsData.find(sheet => 
      sheet.data.some(row => 
        (row.CEP_INICIO || row.cep_inicio) && 
        (row.PRAZO || row.prazo)
      )
    );
    
    if (!priceSheet || !deliverySheet) {
      return null;
    }
    
    // 1. Buscar informações de prazo e zona na aba de abrangência/prazo
    const deliveryRow = deliverySheet.data.find((row: any) => {
      const cepStart = String(row.CEP_INICIO || row.cep_inicio || '').replace(/\D/g, '').padStart(8, '0');
      const cepEnd = String(row.CEP_FIM || row.cep_fim || '').replace(/\D/g, '').padStart(8, '0');
      return cleanCep >= cepStart && cleanCep <= cepEnd;
    });
    
    if (!deliveryRow) return null;
    
    const zone = deliveryRow.ZONA || deliveryRow.zona || deliveryRow.REGIAO || deliveryRow.regiao || 'PADRAO';
    const days = Number(deliveryRow.PRAZO || deliveryRow.prazo || 5);
    
    // Calcular peso cubado se aplicável
    let appliedWeight = weight;
    let cubicWeight: number | undefined;
    
    if (length && width && height && table.cubic_meter_kg_equivalent) {
      const volumeM3 = (length / 100) * (width / 100) * (height / 100);
      cubicWeight = volumeM3 * table.cubic_meter_kg_equivalent;
      appliedWeight = Math.max(weight, cubicWeight);
    }
    
    // 2. Buscar preço na aba de preços usando zona e peso
    const priceRow = priceSheet.data.find((row: any) => {
      const rowZone = row.ZONA || row.zona || row.REGIAO || row.regiao || 'PADRAO';
      const weightMin = Number(row.PESO_MIN || row.peso_min || 0);
      const weightMax = Number(row.PESO_MAX || row.peso_max || 99999);
      
      return (
        String(rowZone).toLowerCase() === String(zone).toLowerCase() && 
        appliedWeight >= weightMin && 
        appliedWeight <= weightMax
      );
    });
    
    if (!priceRow) {
      // Fallback: buscar por peso apenas se não encontrar por zona
      const fallbackPriceRow = priceSheet.data.find((row: any) => {
        const weightMin = Number(row.PESO_MIN || row.peso_min || 0);
        const weightMax = Number(row.PESO_MAX || row.peso_max || 99999);
        return weight >= weightMin && weight <= weightMax;
      });
      
      if (!fallbackPriceRow) return null;
      
      const basePrice = Number(fallbackPriceRow.PRECO || fallbackPriceRow.preco || 0);
      if (basePrice <= 0) return null;
      
      const totalPrice = basePrice * quantity;
      
      return {
        economicPrice: Number(totalPrice.toFixed(2)),
        expressPrice: Number((totalPrice * 1.6).toFixed(2)),
        economicDays: days,
        expressDays: Math.max(1, days - 2),
        zone: String(zone),
        zoneName: `${table.name} - Combinado (${priceSheet.name} + ${deliverySheet.name})`,
        tableId: table.id,
        tableName: table.name,
        cnpj: table.cnpj
      };
    }
    
    const basePrice = Number(priceRow.PRECO || priceRow.preco || 0);
    if (basePrice <= 0) return null;
    
    let totalPrice = basePrice * quantity;
    
    // Aplicar Ad Valorem e GRIS
    let adValoremValue: number | undefined;
    let grisValue: number | undefined;
    
    if (merchandiseValue && merchandiseValue > 0) {
      if (table.ad_valorem_percentage && table.ad_valorem_percentage > 0) {
        adValoremValue = (merchandiseValue * table.ad_valorem_percentage) / 100;
        totalPrice += adValoremValue;
      }
      
      if (table.gris_percentage && table.gris_percentage > 0) {
        grisValue = (merchandiseValue * table.gris_percentage) / 100;
        totalPrice += grisValue;
      }
    }
    
    return {
      economicPrice: Number(totalPrice.toFixed(2)),
      expressPrice: Number((totalPrice * 1.6).toFixed(2)),
      economicDays: days,
      expressDays: Math.max(1, days - 2),
      zone: String(zone),
      zoneName: `${table.name} - Combinado (${priceSheet.name} + ${deliverySheet.name})`,
      tableId: table.id,
      tableName: table.name,
      cnpj: table.cnpj,
      adValoremValue,
      grisValue,
      cubicWeight,
      appliedWeight
    };
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
      
      // Timeout de 4 segundos para buscar abas
      const response = await Promise.race([
        fetch(xlsxUrl),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout ao acessar Google Sheets')), 4000)
        )
      ]);
      
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