import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload, Database, CheckCircle, Loader2 } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';

const AdminJadlogImport = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingData, setIsCheckingData] = useState(true);
  const [recordCount, setRecordCount] = useState(0);
  const [importDetails, setImportDetails] = useState<{
    pricing: number;
    zones: number;
    sheets: string[];
  } | null>(null);
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
        .from('jadlog_preco')
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
        setImportDetails({
          pricing: data.imported_pricing,
          zones: data.imported_zones,
          sheets: data.sheets_processed || []
        });
        
        toast({
          title: "✅ Importação concluída!",
          description: `${data.imported_pricing} preços e ${data.imported_zones} zonas importados de ${data.sheets_processed?.length || 0} abas`,
        });

        // Atualizar contagem
        setRecordCount(data.imported_pricing + data.imported_zones);
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
          Gerenciar importação da tabela de preços e zonas Jadlog do Google Sheets
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
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Registros na tabela:</span>
                      <span className="text-lg font-semibold ml-4">{recordCount.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {recordCount > 0 ? (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-green-600">Tabela ativa e populada</span>
                        </>
                      ) : (
                        <>
                          <Database className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm text-yellow-600">Tabela vazia - importação necessária</span>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Fonte: Google Sheets (ID: 1GPAhV94gwZWkVGsO-ribwjAJNQJGAF2RAX79WXOajtc)
                    </p>
                  </div>
                </div>

                {importDetails && (
                  <div className="p-4 bg-muted rounded-lg space-y-2">
                    <p className="font-medium text-sm">Última importação:</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Preços:</span>
                        <span className="ml-2 font-medium">{importDetails.pricing.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Zonas:</span>
                        <span className="ml-2 font-medium">{importDetails.zones.toLocaleString()}</span>
                      </div>
                    </div>
                    {importDetails.sheets.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Abas processadas: {importDetails.sheets.join(', ')}
                      </p>
                    )}
                  </div>
                )}

                <Button 
                  onClick={handleImportToSupabase}
                  disabled={isLoading}
                  className="w-full"
                  variant={recordCount > 0 ? "outline" : "default"}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importando do Google Sheets...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      {recordCount > 0 ? 'Reimportar do Google Sheets' : '🚀 Importar do Google Sheets'}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">ℹ️ Como funciona</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>• A importação busca os dados diretamente do Google Sheets</p>
              <p>• Todas as abas da planilha são processadas automaticamente</p>
              <p>• Os dados são validados e importados para as tabelas jadlog_preco e jadlog_zones</p>
              <p>• O processo é automático ao acessar esta página pela primeira vez</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default AdminJadlogImport;
