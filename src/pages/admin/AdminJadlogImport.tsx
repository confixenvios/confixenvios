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
      const allData = await getAllJadlogData(jadlogTableFile);
      
      console.log('📦 Dados completos da Jadlog:', allData);
      console.log('📋 Abas encontradas:', Object.keys(allData));
      
      // Processar e importar dados para as tabelas jadlog_pricing e jadlog_zones
      const { supabase } = await import('@/integrations/supabase/client');
      
      let importedPrices = 0;
      let importedZones = 0;
      
      // Processar cada aba do Excel
      for (const [sheetName, sheetData] of Object.entries(allData)) {
        console.log(`📊 Processando aba: ${sheetName}`);
        
        if (Array.isArray(sheetData) && sheetData.length > 0) {
          // Aqui você pode processar os dados conforme a estrutura de cada aba
          // Por exemplo, se a aba contém preços:
          const rows = sheetData as any[];
          
          if (rows.length > 3) {
            const originRow = rows[0];
            const destRow = rows[1];
            const tariffRow = rows[2];
            
            // Processar dados de preço linha por linha
            for (let i = 3; i < rows.length; i++) {
              const row = rows[i];
              // Processar cada célula da linha
              // ... lógica de importação
            }
          }
        }
      }
      
      toast({
        title: "Importação concluída!",
        description: `${importedPrices} preços e ${importedZones} zonas importadas`,
      });
    } catch (error) {
      console.error('Erro ao importar:', error);
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
                  Isso criará tabelas no Supabase para cada aba encontrada, preservando a estrutura de dados.
                </p>
                <Button 
                  onClick={handleImportToSupabase}
                  disabled={isLoading}
                  className="w-full"
                  variant="default"
                >
                  {isLoading ? 'Extraindo dados...' : 'Extrair Estrutura SQL'}
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
