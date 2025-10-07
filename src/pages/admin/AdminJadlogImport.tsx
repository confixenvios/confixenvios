import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload, Database, CheckCircle, Loader2 } from "lucide-react";
import { parseJadlogTable, getAllJadlogData, type JadlogSheetData } from '@/utils/parseJadlogTable';
import { supabase } from '@/integrations/supabase/client';
const jadlogTableFile = '/src/assets/TABELA_JAD_LOG_VENDA.xlsx';

const AdminJadlogImport = () => {
  const [sheets, setSheets] = useState<JadlogSheetData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingData, setIsCheckingData] = useState(true);
  const [recordCount, setRecordCount] = useState(0);
  const { toast } = useToast();

  // Verificar e importar automaticamente se necessário
  useEffect(() => {
    checkAndImportData();
  }, []);

  const checkAndImportData = async () => {
    setIsCheckingData(true);
    try {
      // Verificar se já existem dados
      const { count, error } = await supabase
        .from('jadlog_pricing')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;

      setRecordCount(count || 0);

      // Se não há dados, importar automaticamente
      if (!count || count === 0) {
        console.log('📊 Tabela vazia, iniciando importação automática...');
        await handleImportToSupabase();
      } else {
        console.log(`✅ Tabela já contém ${count} registros`);
      }
    } catch (error) {
      console.error('Erro ao verificar dados:', error);
    } finally {
      setIsCheckingData(false);
    }
  };

  const handleImportToSupabase = async () => {
    setIsLoading(true);
    try {
      // Processar CSV local
      const response = await fetch('/TABELA_PRECO_JADLOG.csv');
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

      // Atualizar contagem
      setRecordCount(importedPricing);
      
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
          Gerenciar importação da tabela de preços Jadlog
        </p>
      </div>

      {isCheckingData ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Verificando dados existentes...</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Status da Tabela Jadlog
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Registros na tabela</p>
                    <p className="text-sm text-muted-foreground">
                      {recordCount > 0 
                        ? `${recordCount} preços cadastrados` 
                        : 'Tabela vazia - aguardando importação'}
                    </p>
                  </div>
                  <div className={`flex items-center gap-2 ${recordCount > 0 ? 'text-green-600' : 'text-yellow-600'}`}>
                    {recordCount > 0 ? (
                      <>
                        <CheckCircle className="h-5 w-5" />
                        <span className="font-medium">Ativo</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-5 w-5" />
                        <span className="font-medium">Pendente</span>
                      </>
                    )}
                  </div>
                </div>

                <Button 
                  onClick={handleImportToSupabase}
                  disabled={isLoading}
                  className="w-full"
                  variant={recordCount > 0 ? "outline" : "default"}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      {recordCount > 0 ? 'Reimportar Preços Jadlog' : '🚀 Importar Preços Jadlog'}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {sheets.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Última Análise
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {sheets.length} abas encontradas na planilha
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminJadlogImport;
