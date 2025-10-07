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
      // Obter todos os dados do Excel
      const allData = await getAllJadlogData(jadlogTableFile);
      
      console.log('📦 Dados completos:', allData);
      
      const { supabase } = await import('@/integrations/supabase/client');
      
      let importedPricing = 0;
      let importedZones = 0;
      
      // Processar a primeira aba (PREÇO)
      const firstSheet = Object.keys(allData)[0];
      const sheetData = allData[firstSheet] as any[];
      
      if (!sheetData || sheetData.length < 4) {
        throw new Error('Estrutura da planilha inválida');
      }
      
      console.log('📊 Processando aba:', firstSheet);
      console.log('📝 Total de linhas:', sheetData.length);
      
      // Extrair cabeçalhos das 3 primeiras linhas
      const originRow = sheetData[0]; // Linha ORIGEM (GO repetido)
      const destRow = sheetData[1];   // Linha DESTINO (estados)
      const tariffRow = sheetData[2]; // Linha TIPO DE TARIFA
      
      console.log('🔍 Origem:', originRow);
      console.log('🔍 Destino:', destRow);
      console.log('🔍 Tarifas:', tariffRow);
      
      // Preparar dados de pricing
      const pricingData: any[] = [];
      
      // Processar cada linha de peso (a partir da linha 4)
      for (let i = 3; i < Math.min(sheetData.length, 50); i++) {
        const row = sheetData[i];
        if (!row || Object.keys(row).length === 0) continue;
        
        // Primeira coluna tem o peso máximo
        const weightMax = parseFloat(Object.values(row)[0] as string);
        if (isNaN(weightMax)) continue;
        
        // Peso mínimo é o peso máximo da linha anterior (ou 0 para a primeira)
        const weightMin = i > 3 ? parseFloat(Object.values(sheetData[i-1])[0] as string) : 0;
        
        console.log(`⚖️ Faixa de peso: ${weightMin} - ${weightMax}kg`);
        
        // Processar cada coluna (cada tarifa/destino)
        const values = Object.values(row);
        for (let j = 1; j < values.length && j < destRow.__EMPTY_3?.length; j++) {
          const priceStr = values[j] as string;
          if (!priceStr) continue;
          
          // Extrair preço (remover R$ e converter)
          const price = parseFloat(priceStr.replace(/[R$\s]/g, '').replace(',', '.'));
          if (isNaN(price) || price === 0) continue;
          
          // Extrair informações da tarifa
          const destinationState = Object.values(destRow)[j] as string;
          const tariffType = Object.values(tariffRow)[j] as string;
          const originState = 'GO'; // Fixo para esta tabela
          
          if (destinationState && tariffType) {
            pricingData.push({
              origin_state: originState,
              destination_state: destinationState.trim(),
              tariff_type: tariffType.trim(),
              weight_min: weightMin,
              weight_max: weightMax,
              price: price
            });
          }
        }
      }
      
      console.log(`📦 Total de registros de preço: ${pricingData.length}`);
      console.log('📋 Amostra dos dados:', pricingData.slice(0, 5));
      
      if (pricingData.length > 0) {
        // Limpar tabela existente
        console.log('🗑️ Limpando dados existentes...');
        await supabase.from('jadlog_pricing').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        
        // Inserir em lotes de 100
        for (let i = 0; i < pricingData.length; i += 100) {
          const batch = pricingData.slice(i, i + 100);
          console.log(`📤 Inserindo lote ${Math.floor(i/100) + 1}...`);
          
          const { error } = await supabase.from('jadlog_pricing').insert(batch);
          
          if (error) {
            console.error('❌ Erro ao inserir:', error);
            throw error;
          }
          
          importedPricing += batch.length;
          console.log(`✅ ${importedPricing} preços importados...`);
        }
      }
      
      toast({
        title: "Importação concluída!",
        description: `${importedPricing} preços importados com sucesso`,
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
                  Isso processará o arquivo Excel local e importará os dados para a tabela jadlog_pricing no Supabase.
                </p>
                <Button 
                  onClick={handleImportToSupabase}
                  disabled={isLoading}
                  className="w-full"
                  variant="default"
                >
                  {isLoading ? 'Importando dados...' : 'Importar Dados para Supabase'}
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
