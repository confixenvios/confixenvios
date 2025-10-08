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
    console.log('🔍 Verificando dados da tabela jadlog_pricing...');
    try {
      // Verificar se já existem dados
      const { count, error } = await supabase
        .from('jadlog_pricing')
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error('❌ Erro ao verificar dados:', error);
        toast({
          title: "Erro ao verificar tabela",
          description: error.message,
          variant: "destructive",
        });
        throw error;
      }

      console.log(`📊 Tabela contém ${count || 0} registros`);
      setRecordCount(count || 0);

      // Se não há dados, importar automaticamente
      if (!count || count === 0) {
        console.log('📊 Tabela vazia, iniciando importação automática...');
        await handleImportToSupabase();
      } else {
        console.log(`✅ Tabela já contém ${count} registros`);
      }
    } catch (error) {
      console.error('❌ Erro ao verificar dados:', error);
      toast({
        title: "Erro ao verificar tabela",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsCheckingData(false);
    }
  };

  const handleImportToSupabase = async () => {
    setIsLoading(true);
    try {
      console.log('🚀 Iniciando importação via Google Sheets...');
      
      // Chamar edge function que importa do Google Sheets
      const { data, error } = await supabase.functions.invoke('import-jadlog-data');
      
      if (error) {
        console.error('❌ Erro ao chamar edge function:', error);
        throw error;
      }
      
      console.log('📊 Resposta da importação:', data);
      
      if (data.success) {
        toast({
          title: "✅ Importação concluída!",
          description: `${data.imported_pricing} preços e ${data.imported_zones} zonas da Jadlog importados com sucesso`,
        });

        // Atualizar contagem
        setRecordCount(data.imported_pricing);
      } else {
        throw new Error(data.error || 'Erro desconhecido na importação');
      }
      
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
