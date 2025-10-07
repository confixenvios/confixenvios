import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload, Database, CheckCircle } from "lucide-react";
import { parseJadlogTable, getAllJadlogData, type JadlogSheetData } from '@/utils/parseJadlogTable';
const jadlogTableFile = '/src/assets/TABELA_JAD_LOG_VENDA.xlsx';

const AdminJadlogImport = () => {
  const [sheets, setSheets] = useState<JadlogSheetData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleAnalyzeTable = async () => {
    setIsLoading(true);
    try {
      const sheetsData = await parseJadlogTable(jadlogTableFile);
      setSheets(sheetsData);
      
      console.log('📊 Estrutura da tabela Jadlog:', sheetsData);
      
      toast({
        title: "Tabela analisada!",
        description: `Encontradas ${sheetsData.length} abas na tabela`,
      });
    } catch (error) {
      console.error('Erro ao analisar:', error);
      toast({
        title: "Erro ao analisar tabela",
        description: "Verifique o console para mais detalhes",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportToSupabase = async () => {
    setIsLoading(true);
    try {
      // Processar CSV local
      const response = await fetch('/src/assets/TABELA_PRECO_JADLOG.csv');
      const csvText = await response.text();
      const lines = csvText.split('\n');
      
      console.log('📊 Total de linhas no CSV:', lines.length);
      
      if (lines.length < 4) {
        throw new Error('CSV inválido - menos de 4 linhas');
      }
      
      // Processar cabeçalhos
      const originRow = lines[0].split(',');
      const destRow = lines[1].split(',');
      const tariffRow = lines[2].split(',');
      
      console.log('🔍 Primeira linha (origem):', originRow.slice(0, 10));
      console.log('🔍 Segunda linha (destino):', destRow.slice(0, 10));
      console.log('🔍 Terceira linha (tarifas):', tariffRow.slice(0, 10));
      
      const { supabase } = await import('@/integrations/supabase/client');
      const pricingData: any[] = [];
      
      // Processar linhas de dados (a partir da linha 4)
      for (let i = 3; i < lines.length; i++) {
        const row = lines[i].split(',');
        if (row.length < 3) continue;
        
        // Primeira coluna tem o peso máximo
        const weightMax = parseFloat(row[0]);
        if (isNaN(weightMax)) continue;
        
        // Peso mínimo é o peso máximo da linha anterior (ou 0 para a primeira linha de dados)
        const weightMin = i > 3 ? parseFloat(lines[i-1].split(',')[0]) : 0;
        
        console.log(`⚖️ Linha ${i}: Peso ${weightMin} - ${weightMax}kg`);
        
        // Processar cada coluna de preço
        for (let j = 3; j < row.length && j < destRow.length; j++) {
          const priceStr = row[j];
          if (!priceStr || priceStr.trim() === '') continue;
          
          // Remover formatação brasileira de moeda
          const cleanPrice = priceStr
            .replace(/R\$/g, '')
            .replace(/\s/g, '')
            .replace(/\./g, '')
            .replace(',', '.');
          
          const price = parseFloat(cleanPrice);
          if (isNaN(price) || price === 0) continue;
          
          // Extrair informações dos cabeçalhos
          const destinationState = destRow[j]?.trim();
          const tariffType = tariffRow[j]?.trim();
          const originState = 'GO'; // Fixo para esta tabela
          
          if (destinationState && tariffType && destinationState !== '' && tariffType !== '') {
            pricingData.push({
              origin_state: originState,
              destination_state: destinationState,
              tariff_type: tariffType,
              weight_min: weightMin,
              weight_max: weightMax,
              price: price
            });
          }
        }
      }
      
      console.log(`📦 Total de registros preparados: ${pricingData.length}`);
      console.log('📋 Primeiros 5 registros:', pricingData.slice(0, 5));
      
      if (pricingData.length === 0) {
        throw new Error('Nenhum dado válido encontrado no CSV');
      }
      
      // Limpar tabela existente
      console.log('🗑️ Limpando dados existentes...');
      const { error: deleteError } = await supabase
        .from('jadlog_pricing')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
      
      if (deleteError) {
        console.error('❌ Erro ao limpar tabela:', deleteError);
        throw deleteError;
      }
      
      // Inserir em lotes de 100
      let importedPricing = 0;
      for (let i = 0; i < pricingData.length; i += 100) {
        const batch = pricingData.slice(i, i + 100);
        console.log(`📤 Inserindo lote ${Math.floor(i/100) + 1} de ${Math.ceil(pricingData.length/100)}...`);
        
        const { error } = await supabase
          .from('jadlog_pricing')
          .insert(batch);
        
        if (error) {
          console.error('❌ Erro ao inserir lote:', error);
          throw error;
        }
        
        importedPricing += batch.length;
        console.log(`✅ ${importedPricing} preços importados de ${pricingData.length}...`);
      }
      
      toast({
        title: "✅ Importação concluída!",
        description: `${importedPricing} preços da Jadlog importados com sucesso`,
      });
      
    } catch (error) {
      console.error('❌ Erro ao importar:', error);
      toast({
        title: "Erro ao importar",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Importar Tabela Jadlog</h1>
        <p className="text-muted-foreground">
          Analise e importe a estrutura completa da tabela de preços Jadlog
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Passo 1: Analisar Estrutura
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleAnalyzeTable}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Analisando...' : 'Analisar Tabela Jadlog'}
            </Button>
          </CardContent>
        </Card>

        {sheets.length > 0 && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Abas Encontradas ({sheets.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sheets.map((sheet, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <h3 className="font-bold text-lg mb-2">{sheet.sheetName}</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        {sheet.rowCount} linhas de dados
                      </p>
                      <div className="text-xs">
                        <strong>Colunas:</strong> {sheet.headers.join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Passo 2: Criar Tabelas no Supabase
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Importar a tabela de preços Jadlog (CSV) diretamente para o Supabase.
                </p>
                <Button 
                  onClick={handleImportToSupabase}
                  disabled={isLoading}
                  className="w-full"
                  variant="default"
                >
                  {isLoading ? 'Importando tabela Jadlog...' : '🚀 Importar Preços Jadlog'}
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminJadlogImport;
