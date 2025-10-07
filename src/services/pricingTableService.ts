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

      // Processar tabelas em paralelo
      console.log(`📊 Processando ${tables.length} tabelas de preço ativas...`);
      const quotePromises = tables.map(async (table) => {
        try {
          console.log(`🔍 Analisando tabela: ${table.name}`);
          // Timeout de 6 segundos por tabela
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

      const quotes = (await Promise.all(quotePromises)).filter(q => q !== null) as PricingTableQuote[];

      if (quotes.length === 0) {
        console.log('❌ Nenhuma cotação válida encontrada nas tabelas, usando fallback');
        return await this.getFallbackQuote({ destinyCep, weight, quantity });
      }

      console.log(`💰 Total de ${quotes.length} cotações encontradas`);
      quotes.forEach(q => {
        console.log(`  - ${q.tableName}: R$${q.economicPrice.toFixed(2)} em ${q.economicDays} dias`);
      });

      // Selecionar melhor cotação: priorizar menor preço, em caso de empate escolher menor prazo
      quotes.sort((a, b) => {
        const priceDiff = a.economicPrice - b.economicPrice;
        if (Math.abs(priceDiff) < 0.01) { // Se preços são praticamente iguais (diferença < 1 centavo)
          return a.economicDays - b.economicDays; // Escolher menor prazo
        }
        return priceDiff; // Caso contrário, escolher menor preço
      });
      
      const bestQuote = quotes[0];
      console.log(`✅ MELHOR COTAÇÃO: ${bestQuote.tableName} - R$${bestQuote.economicPrice.toFixed(2)} em ${bestQuote.economicDays} dias`);
      console.log(`📋 Tabela ID: ${bestQuote.tableId} | Zona: ${bestQuote.zone}`);
      
      return bestQuote;

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
    let matchingRow = data.find((row: any) => {
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

    // Se não encontrou faixa exata e há configuração de peso excedente, buscar a maior faixa disponível no CEP
    if (!matchingRow && table.excess_weight_threshold_kg && table.excess_weight_charge_per_kg) {
      console.log(`🔍 [findPriceInData] Peso ${appliedWeight}kg excede faixas. Buscando maior faixa disponível no CEP...`);
      
      const rowsInCepRange = data.filter((row: any) => {
        const cepStart = String(row.CEP_INICIO || row.cep_inicio || '').replace(/\D/g, '').padStart(8, '0');
        const cepEnd = String(row.CEP_FIM || row.cep_fim || '').replace(/\D/g, '').padStart(8, '0');
        return cleanCep >= cepStart && cleanCep <= cepEnd;
      });
      
      if (rowsInCepRange.length > 0) {
        // Encontrar a linha com o maior PESO_MAX
        matchingRow = rowsInCepRange.reduce((max: any, row: any) => {
          const maxWeight = Number(max?.PESO_MAX || max?.peso_max || 0);
          const rowWeight = Number(row.PESO_MAX || row.peso_max || 0);
          return rowWeight > maxWeight ? row : max;
        }, rowsInCepRange[0]);
        
        console.log(`✅ [findPriceInData] Usando maior faixa disponível: até ${matchingRow.PESO_MAX || matchingRow.peso_max}kg`);
      }
    }

    if (!matchingRow) return null;

    const basePrice = Number(matchingRow.PRECO || matchingRow.preco || 0);
    const days = Number(matchingRow.PRAZO || matchingRow.prazo || 5);
    
    if (basePrice <= 0) return null;

    // Apply excess weight charge if applicable (sempre sobre o peso REAL, não cubado)
    let excessWeightCharge = 0;
    if (table.excess_weight_threshold_kg && table.excess_weight_charge_per_kg && 
        weight > table.excess_weight_threshold_kg) {
      const excessWeight = weight - table.excess_weight_threshold_kg;
      excessWeightCharge = excessWeight * table.excess_weight_charge_per_kg;
      console.log(`💰 [findPriceInData] Cobrança de excedente: ${excessWeight}kg (${weight}kg - ${table.excess_weight_threshold_kg}kg) × R$${table.excess_weight_charge_per_kg} = R$${excessWeightCharge.toFixed(2)}`);
    }

    let totalPrice = basePrice * quantity;
    const basePriceWithQuantity = totalPrice; // Guardar preço base antes do seguro
    
    // Aplicar Seguro (0.6% do valor da mercadoria declarada)
    let insuranceValue: number | undefined;
    
    if (merchandiseValue && merchandiseValue > 0) {
      const insurancePercentage = 0.006; // 0.6%
      
      insuranceValue = merchandiseValue * insurancePercentage;
      totalPrice += insuranceValue;
      console.log(`🛡️ Seguro (0.6%): R$ ${insuranceValue.toFixed(2)}`);
    }

    // Add excess weight charge to total
    totalPrice += excessWeightCharge;

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
      insuranceValue,
      basePrice: Number(basePriceWithQuantity.toFixed(2)),
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
    let priceRow = priceSheet.data.find((row: any) => {
      const rowZone = row.ZONA || row.zona || row.REGIAO || row.regiao || 'PADRAO';
      const weightMin = Number(row.PESO_MIN || row.peso_min || 0);
      const weightMax = Number(row.PESO_MAX || row.peso_max || 99999);
      
      return (
        String(rowZone).toLowerCase() === String(zone).toLowerCase() && 
        appliedWeight >= weightMin && 
        appliedWeight <= weightMax
      );
    });
    
    // Se não encontrou faixa exata e há configuração de peso excedente, buscar a maior faixa disponível para a zona
    if (!priceRow && table.excess_weight_threshold_kg && table.excess_weight_charge_per_kg) {
      console.log(`🔍 [combineSheetsData] Peso ${appliedWeight}kg excede faixas. Buscando maior faixa na zona ${zone}...`);
      
      const rowsInZone = priceSheet.data.filter((row: any) => {
        const rowZone = row.ZONA || row.zona || row.REGIAO || row.regiao || 'PADRAO';
        return String(rowZone).toLowerCase() === String(zone).toLowerCase();
      });
      
      if (rowsInZone.length > 0) {
        // Encontrar a linha com o maior PESO_MAX
        priceRow = rowsInZone.reduce((max: any, row: any) => {
          const maxWeight = Number(max?.PESO_MAX || max?.peso_max || 0);
          const rowWeight = Number(row.PESO_MAX || row.peso_max || 0);
          return rowWeight > maxWeight ? row : max;
        }, rowsInZone[0]);
        
        console.log(`✅ [combineSheetsData] Usando maior faixa: até ${priceRow.PESO_MAX || priceRow.peso_max}kg`);
      }
    }
    
    if (!priceRow) {
      // Fallback: buscar maior faixa disponível se peso exceder e houver config de excesso
      if (table.excess_weight_threshold_kg && table.excess_weight_charge_per_kg) {
        console.log(`🔍 [combineSheetsData FALLBACK] Buscando maior faixa disponível para aplicar excesso...`);
        
        const allRows = priceSheet.data.filter((row: any) => {
          const weightMax = Number(row.PESO_MAX || row.peso_max || 0);
          return weightMax > 0;
        });
        
        if (allRows.length > 0) {
          priceRow = allRows.reduce((max: any, row: any) => {
            const maxWeight = Number(max?.PESO_MAX || max?.peso_max || 0);
            const rowWeight = Number(row.PESO_MAX || row.peso_max || 0);
            return rowWeight > maxWeight ? row : max;
          }, allRows[0]);
          
          console.log(`✅ [combineSheetsData FALLBACK] Usando maior faixa: até ${priceRow.PESO_MAX || priceRow.peso_max}kg`);
        }
      } else {
        // Fallback tradicional: buscar por peso apenas se não encontrar por zona
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
      
      if (!priceRow) return null;
    }
    
    const basePrice = Number(priceRow.PRECO || priceRow.preco || 0);
    if (basePrice <= 0) return null;
    
    // Apply excess weight charge if applicable (sempre sobre o peso REAL, não cubado)
    let excessWeightCharge = 0;
    if (table.excess_weight_threshold_kg && table.excess_weight_charge_per_kg && 
        weight > table.excess_weight_threshold_kg) {
      const excessWeight = weight - table.excess_weight_threshold_kg;
      excessWeightCharge = excessWeight * table.excess_weight_charge_per_kg;
      console.log(`💰 [combineSheetsData] Cobrança de excedente: ${excessWeight}kg (${weight}kg - ${table.excess_weight_threshold_kg}kg) × R$${table.excess_weight_charge_per_kg} = R$${excessWeightCharge.toFixed(2)}`);
    }
    
    let totalPrice = basePrice * quantity;
    const basePriceWithQuantity = totalPrice; // Guardar preço base antes do seguro
    
    // Aplicar Seguro (0.6% do valor da mercadoria declarada)
    let insuranceValue: number | undefined;
    
    if (merchandiseValue && merchandiseValue > 0) {
      const insurancePercentage = 0.006; // 0.6%
      
      insuranceValue = merchandiseValue * insurancePercentage;
      totalPrice += insuranceValue;
      console.log(`[combineSheetsData] 🛡️ Seguro (0.6%): R$ ${insuranceValue.toFixed(2)}`);
    }
    
    // Add excess weight charge to total
    totalPrice += excessWeightCharge;
    
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
      insuranceValue,
      basePrice: Number(basePriceWithQuantity.toFixed(2)),
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
   * Valida os dados da tabela - VALIDAÇÃO FLEXÍVEL para aceitar diferentes estruturas
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

    console.log(`🔍 Validando tabela com ${data.length} linhas`);
    console.log('📋 Colunas encontradas:', Object.keys(data[0]));

    // Tentar detectar padrão de colunas automaticamente
    const firstRow = data[0];
    const columnKeys = Object.keys(firstRow);
    
    // Verificar se há dados numéricos e de texto que possam representar preços, pesos e CEPs
    let hasPriceColumn = false;
    let hasWeightColumn = false;
    let hasCepColumn = false;
    let hasDaysColumn = false;

    columnKeys.forEach(key => {
      const lowerKey = key.toLowerCase();
      const value = firstRow[key];
      
      // Detectar coluna de preço
      if (lowerKey.includes('preco') || lowerKey.includes('price') || lowerKey.includes('valor')) {
        hasPriceColumn = true;
      }
      
      // Detectar coluna de peso
      if (lowerKey.includes('peso') || lowerKey.includes('weight') || lowerKey.includes('kg')) {
        hasWeightColumn = true;
      }
      
      // Detectar coluna de CEP
      if (lowerKey.includes('cep') || lowerKey.includes('zip')) {
        hasCepColumn = true;
      }
      
      // Detectar coluna de prazo
      if (lowerKey.includes('prazo') || lowerKey.includes('dias') || lowerKey.includes('days')) {
        hasDaysColumn = true;
      }
    });

    // Validação flexível: apenas verificar se há dados estruturados
    if (!hasPriceColumn && !hasWeightColumn && !hasCepColumn) {
      warnings.push('Estrutura de colunas não reconhecida automaticamente. A IA irá tentar processar a tabela de qualquer forma.');
    }

    // Contar linhas válidas (linhas que têm pelo menos 3 valores não vazios)
    data.forEach((row, index) => {
      const lineNumber = index + 1;
      const values = Object.values(row).filter(v => v !== null && v !== undefined && String(v).trim() !== '');
      
      if (values.length >= 3) {
        validRows++;
      } else {
        warnings.push(`Linha ${lineNumber}: poucos dados (${values.length} valores)`);
      }
    });

    // Validação passa se tiver pelo menos 70% de linhas válidas
    const validPercentage = (validRows / data.length) * 100;
    const isValid = validPercentage >= 70;
    
    if (!isValid) {
      errors.push(`Apenas ${validPercentage.toFixed(1)}% das linhas são válidas (mínimo: 70%)`);
    } else {
      console.log(`✅ Validação aprovada: ${validPercentage.toFixed(1)}% de linhas válidas`);
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