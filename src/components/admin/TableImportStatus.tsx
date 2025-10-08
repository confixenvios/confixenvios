import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Upload, 
  Database, 
  CheckCircle, 
  Loader2, 
  AlertCircle,
  FileSpreadsheet,
  ExternalLink 
} from "lucide-react";
import { supabase } from '@/integrations/supabase/client';

interface TableImportStatusProps {
  tableName: string;
  tableId: string;
  googleSheetsUrl?: string;
  sourceType: string;
}

export const TableImportStatus = ({ 
  tableName, 
  tableId,
  googleSheetsUrl,
  sourceType
}: TableImportStatusProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingData, setIsCheckingData] = useState(true);
  const [recordCount, setRecordCount] = useState(0);
  const [importDetails, setImportDetails] = useState<{
    pricing: number;
    zones: number;
    sheets: string[];
  } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    checkTableData();
  }, [tableId]);

  const checkTableData = async () => {
    setIsCheckingData(true);
    console.log(`🔍 Verificando dados da tabela ${tableName}...`);
    
    try {
      // Verificar dados específicos da transportadora (por nome)
      const lowerTableName = tableName.toLowerCase();
      
      if (lowerTableName.includes('jadlog')) {
        // Contar registros da tabela Jadlog
        const { count: pricingCount, error: pricingError } = await supabase
          .from('jadlog_pricing')
          .select('*', { count: 'exact', head: true });

        const { count: zonesCount, error: zonesError } = await supabase
          .from('jadlog_zones')
          .select('*', { count: 'exact', head: true });

        if (pricingError || zonesError) {
          throw pricingError || zonesError;
        }

        const total = (pricingCount || 0) + (zonesCount || 0);
        setRecordCount(total);
        
        if (total > 0) {
          setImportDetails({
            pricing: pricingCount || 0,
            zones: zonesCount || 0,
            sheets: []
          });
        }
      } else if (lowerTableName.includes('magalog')) {
        // Contar registros da tabela Magalog - usando rpc para evitar problemas de tipo
        const { count: pricingCount } = await supabase
          .from('shipping_pricing_magalog' as any)
          .select('*', { count: 'exact', head: true });

        const { count: zonesCount } = await supabase
          .from('shipping_zones_magalog' as any)
          .select('*', { count: 'exact', head: true });

        const total = (pricingCount || 0) + (zonesCount || 0);
        setRecordCount(total);
        
        if (total > 0) {
          setImportDetails({
            pricing: pricingCount || 0,
            zones: zonesCount || 0,
            sheets: []
          });
        }
      } else {
        // Para outras transportadoras
        setRecordCount(0);
      }

    } catch (error) {
      console.error('❌ Erro ao verificar dados:', error);
    } finally {
      setIsCheckingData(false);
    }
  };

  const handleImport = async () => {
    setIsLoading(true);
    
    try {
      const lowerTableName = tableName.toLowerCase();
      
      if (lowerTableName.includes('jadlog')) {
        console.log('🚀 Iniciando importação Jadlog...');
        
        const { data, error } = await supabase.functions.invoke('import-jadlog-data');
        
        if (error) throw error;
        
        if (data.success) {
          setImportDetails({
            pricing: data.imported_pricing,
            zones: data.imported_zones,
            sheets: data.sheets_processed || []
          });
          
          setRecordCount(data.imported_pricing + data.imported_zones);
          
          toast({
            title: "✅ Importação concluída!",
            description: `${data.imported_pricing} preços e ${data.imported_zones} zonas importados`,
          });
        }
      } else {
        toast({
          title: "Em desenvolvimento",
          description: `Importação automática para ${tableName} em breve`,
        });
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

  if (isCheckingData) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Verificando dados...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status da Tabela */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Status da Tabela {tableName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-2 flex-1">
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
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm text-yellow-600">Tabela vazia</span>
                    </>
                  )}
                </div>
                
                {googleSheetsUrl && (
                  <div className="flex items-center gap-2 mt-2">
                    <FileSpreadsheet className="h-3 w-3 text-muted-foreground" />
                    <a 
                      href={googleSheetsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      Fonte: Google Sheets 
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Detalhes da Importação */}
            {importDetails && importDetails.pricing > 0 && (
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

            {/* Botão de Importação */}
            {sourceType === 'google_sheets' && (
              <Button 
                onClick={handleImport}
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
                    {recordCount > 0 ? 'Reimportar da Planilha' : 'Importar da Planilha'}
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Informações */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">ℹ️ Como funciona</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• A importação busca os dados diretamente da fonte configurada</p>
          <p>• Todas as abas da planilha são processadas automaticamente</p>
          <p>• Os dados são validados e importados para o banco de dados</p>
          <p>• Use o botão de reimportar para atualizar os dados</p>
        </CardContent>
      </Card>
    </div>
  );
};
