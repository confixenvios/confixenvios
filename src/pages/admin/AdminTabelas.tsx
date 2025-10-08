import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Database, 
  Upload, 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  ExternalLink,
  FileSpreadsheet,
  Eye
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { TableImportStatus } from "@/components/admin/TableImportStatus";

interface PricingTable {
  id: string;
  name: string;
  cnpj: string;
  company_branch_id: string;
  source_type: string;
  file_url?: string;
  google_sheets_url?: string;
  sheet_name?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  validation_status: string;
  validation_errors?: any;
  last_validation_at?: string;
  ad_valorem_percentage?: number;
  gris_percentage?: number;
  cubic_meter_kg_equivalent?: number;
  max_length_cm?: number;
  max_width_cm?: number;
  max_height_cm?: number;
  excess_weight_threshold_kg?: number;
  excess_weight_charge_per_kg?: number;
  company_branches?: {
    name: string;
    fantasy_name: string;
  };
}

interface CompanyBranch {
  id: string;
  name: string;
  fantasy_name?: string;
}

const AdminTabelas = () => {
  const [pricingTables, setPricingTables] = useState<PricingTable[]>([]);
  const [companyBranches, setCompanyBranches] = useState<CompanyBranch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<PricingTable | null>(null);
  const [viewingTable, setViewingTable] = useState<PricingTable | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [tableRecordCounts, setTableRecordCounts] = useState<Record<string, number>>({});
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState<{
    name: string;
    company_branch_id: string;
    source_type: 'upload' | 'google_sheets';
    google_sheets_url: string;
    sheet_name: string;
    file: File | null;
    cubic_meter_kg_equivalent: number;
    max_length_cm: number;
    max_width_cm: number;
    max_height_cm: number;
  }>({
    name: '',
    company_branch_id: '',
    source_type: 'upload',
    google_sheets_url: '',
    sheet_name: '',
    file: null,
    cubic_meter_kg_equivalent: 167,
    max_length_cm: 200,
    max_width_cm: 200,
    max_height_cm: 200
  });

  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [isLoadingSheets, setIsLoadingSheets] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch pricing tables
      const { data: tablesData, error: tablesError } = await supabase
        .from('pricing_tables')
        .select(`
          *,
          company_branches (
            name,
            fantasy_name
          )
        `)
        .order('created_at', { ascending: false });

      if (tablesError) throw tablesError;

      // Fetch company branches
      const { data: branchesData, error: branchesError } = await supabase
        .from('company_branches')
        .select('id, name, fantasy_name')
        .eq('active', true)
        .order('name');

      if (branchesError) throw branchesError;

      setPricingTables(tablesData || []);
      setCompanyBranches(branchesData || []);
      
      // Verificar contagem de registros para cada tabela
      if (tablesData) {
        const counts: Record<string, number> = {};
        for (const table of tablesData) {
          const lowerName = table.name.toLowerCase();
          
          if (lowerName.includes('jadlog')) {
            const { count: pricingCount } = await supabase
              .from('jadlog_pricing')
              .select('*', { count: 'exact', head: true });
            const { count: zonesCount } = await supabase
              .from('jadlog_zones')
              .select('*', { count: 'exact', head: true });
            counts[table.id] = (pricingCount || 0) + (zonesCount || 0);
          } else if (lowerName.includes('magalog')) {
            const { count: pricingCount } = await supabase
              .from('shipping_pricing_magalog' as any)
              .select('*', { count: 'exact', head: true });
            const { count: zonesCount } = await supabase
              .from('shipping_zones_magalog' as any)
              .select('*', { count: 'exact', head: true });
            counts[table.id] = (pricingCount || 0) + (zonesCount || 0);
          }
        }
        setTableRecordCounts(counts);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar as tabelas de preços",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleValidateAllTables = async () => {
    if (pricingTables.length === 0) {
      toast({
        title: "Aviso",
        description: "Nenhuma tabela cadastrada para validar"
      });
      return;
    }

    setIsLoading(true);
    const auditResults: any[] = [];

    try {
      toast({
        title: "🤖 Auditoria IA Iniciada",
        description: "A IA está analisando todas as tabelas de preços...",
      });

      // Auditar cada tabela com IA
      for (const table of pricingTables) {
        console.log(`\n🔍 === AUDITORIA IA: ${table.name} ===`);
        
        try {
          const { PricingTableService } = await import('@/services/pricingTableService');
          
          // 1. Validar estrutura da tabela
          console.log(`📋 Validando estrutura da tabela ${table.name}...`);
          const validationResult = await PricingTableService.validatePricingTable(table.id);
          
          // 2. Testar leitura de todas as abas
          console.log(`📚 Testando leitura de abas da tabela ${table.name}...`);
          let sheetsCount = 0;
          let sheetsData: any = {};
          
          if (table.source_type === 'google_sheets' && table.google_sheets_url) {
            const sheets = await PricingTableService.getSheetNames(table.google_sheets_url);
            sheetsCount = sheets.length;
            sheetsData = { sheets, total: sheetsCount };
            console.log(`  ✅ ${sheetsCount} abas encontradas:`, sheets);
          }
          
          // 3. Teste prático: fazer cotação real
          console.log(`🧪 Testando cotação real na tabela ${table.name}...`);
          let quoteTest = null;
          try {
            // Teste com CEP de São Paulo e peso de 5kg
            quoteTest = await PricingTableService.getQuoteFromTable(table, {
              destinyCep: '01310-100',
              weight: 5,
              quantity: 1
            });
            
            if (quoteTest) {
              console.log(`  ✅ Cotação teste bem-sucedida: R$${quoteTest.economicPrice.toFixed(2)} em ${quoteTest.economicDays} dias`);
            } else {
              console.log(`  ⚠️ Nenhuma cotação encontrada para o teste`);
            }
          } catch (error) {
            console.error(`  ❌ Erro no teste de cotação:`, error);
          }
          
          // 4. Análise IA dos resultados
          const auditScore = {
            structure: validationResult.isValid ? 100 : 0,
            sheets: sheetsCount > 0 ? 100 : 0,
            quote: quoteTest !== null ? 100 : 0,
            overall: 0
          };
          auditScore.overall = Math.round((auditScore.structure + auditScore.sheets + auditScore.quote) / 3);
          
          const auditReport = {
            tableName: table.name,
            tableId: table.id,
            status: auditScore.overall >= 70 ? 'approved' : 'failed',
            score: auditScore,
            details: {
              validation: validationResult,
              sheets: sheetsData,
              quoteTest: quoteTest ? {
                success: true,
                price: quoteTest.economicPrice,
                days: quoteTest.economicDays,
                zone: quoteTest.zone
              } : { success: false },
              errors: validationResult.errors,
              warnings: validationResult.warnings
            }
          };
          
          auditResults.push(auditReport);
          
          // Log resultado da auditoria
          console.log(`\n📊 RESULTADO DA AUDITORIA: ${table.name}`);
          console.log(`  Score Geral: ${auditScore.overall}%`);
          console.log(`  Status: ${auditReport.status === 'approved' ? '✅ APROVADA' : '❌ REPROVADA'}`);
          console.log(`  - Estrutura: ${auditScore.structure}%`);
          console.log(`  - Abas: ${auditScore.sheets}%`);
          console.log(`  - Cotação: ${auditScore.quote}%`);
          
        } catch (error) {
          console.error(`❌ Erro na auditoria da tabela ${table.name}:`, error);
          auditResults.push({
            tableName: table.name,
            tableId: table.id,
            status: 'error',
            score: { overall: 0 },
            error: error instanceof Error ? error.message : 'Erro desconhecido'
          });
        }
      }

      // Gerar relatório final
      const approvedTables = auditResults.filter(r => r.status === 'approved').length;
      const failedTables = auditResults.filter(r => r.status === 'failed').length;
      const errorTables = auditResults.filter(r => r.status === 'error').length;
      
      console.log(`\n\n🎯 === RELATÓRIO FINAL DA AUDITORIA IA ===`);
      console.log(`Total de tabelas: ${auditResults.length}`);
      console.log(`✅ Aprovadas: ${approvedTables}`);
      console.log(`⚠️ Reprovadas: ${failedTables}`);
      console.log(`❌ Com erro: ${errorTables}`);
      console.log(`\nDetalhes por tabela:`);
      auditResults.forEach(r => {
        console.log(`  ${r.status === 'approved' ? '✅' : r.status === 'failed' ? '⚠️' : '❌'} ${r.tableName}: Score ${r.score.overall}%`);
      });

      toast({
        title: "🤖 Auditoria IA Concluída",
        description: `✅ ${approvedTables} aprovadas | ⚠️ ${failedTables} reprovadas | ❌ ${errorTables} com erro`,
      });

      // Recarregar dados para mostrar status atualizado
      fetchData();
    } catch (error) {
      console.error('❌ Erro crítico na auditoria:', error);
      toast({
        title: "Erro na Auditoria",
        description: "Erro durante a auditoria das tabelas",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `pricing-tables/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('pricing-tables')
      .upload(filePath, file);

    if (uploadError) {
      throw new Error(`Erro no upload: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
      .from('pricing-tables')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let fileUrl = '';
      
      if (formData.source_type === 'upload' && formData.file) {
        fileUrl = await handleFileUpload(formData.file);
      }

      const tableData = {
        name: formData.name,
        cnpj: null,
        company_branch_id: formData.company_branch_id,
        source_type: formData.source_type,
        file_url: formData.source_type === 'upload' ? fileUrl : null,
        google_sheets_url: formData.source_type === 'google_sheets' ? formData.google_sheets_url : null,
        sheet_name: formData.source_type === 'google_sheets' && formData.sheet_name ? formData.sheet_name : null,
        is_active: true,
        validation_status: 'pending',
        cubic_meter_kg_equivalent: formData.cubic_meter_kg_equivalent,
        max_length_cm: formData.max_length_cm > 0 ? formData.max_length_cm : null,
        max_width_cm: formData.max_width_cm > 0 ? formData.max_width_cm : null,
        max_height_cm: formData.max_height_cm > 0 ? formData.max_height_cm : null
      };

      let error;
      if (editingTable) {
        ({ error } = await supabase
          .from('pricing_tables')
          .update(tableData)
          .eq('id', editingTable.id));
      } else {
        ({ error } = await supabase
          .from('pricing_tables')
          .insert([tableData]));
      }

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Tabela ${editingTable ? 'atualizada' : 'cadastrada'} com sucesso`
      });

      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Erro ao salvar tabela:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao salvar tabela",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadAvailableSheets = async (url: string) => {
    if (!url || formData.source_type !== 'google_sheets') return;

    setIsLoadingSheets(true);
    try {
      const { PricingTableService } = await import('@/services/pricingTableService');
      const sheets = await PricingTableService.getSheetNames(url);
      setAvailableSheets(sheets);
    } catch (error) {
      console.error('Erro ao carregar abas:', error);
      toast({
        title: "Aviso",
        description: "Não foi possível carregar as abas da planilha",
        variant: "destructive"
      });
    } finally {
      setIsLoadingSheets(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta tabela?')) return;

    try {
      const { error } = await supabase
        .from('pricing_tables')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Tabela excluída com sucesso"
      });

      fetchData();
    } catch (error) {
      console.error('Erro ao excluir tabela:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir tabela",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (table: PricingTable) => {
    setEditingTable(table);
    setFormData({
      name: table.name,
      company_branch_id: table.company_branch_id,
      source_type: (table.source_type === 'google_sheets' ? 'google_sheets' : 'upload') as 'upload' | 'google_sheets',
      google_sheets_url: table.google_sheets_url || '',
      sheet_name: table.sheet_name || '',
      file: null,
      cubic_meter_kg_equivalent: table.cubic_meter_kg_equivalent ?? 167,
      max_length_cm: table.max_length_cm ?? 200,
      max_width_cm: table.max_width_cm ?? 200,
      max_height_cm: table.max_height_cm ?? 200
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      company_branch_id: '',
      source_type: 'upload',
      google_sheets_url: '',
      sheet_name: '',
      file: null,
      cubic_meter_kg_equivalent: 167,
      max_length_cm: 200,
      max_width_cm: 200,
      max_height_cm: 200
    });
    setEditingTable(null);
    setAvailableSheets([]);
  };

  const getValidationBadge = (status: string) => {
    switch (status) {
      case 'valid':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Válida</Badge>;
      case 'invalid':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Inválida</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
    }
  };

  return (
    <div className="px-2 py-4 md:px-6 md:py-8 min-h-screen bg-background">
      <div className="w-full max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center">
              <Database className="mr-2 md:mr-3 h-6 w-6 md:h-8 md:w-8 text-primary" />
              Gestão de Tabelas
            </h1>
            <p className="text-muted-foreground mt-2">
              Gerencie as tabelas de preços das transportadoras
            </p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Nova Tabela
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingTable ? 'Editar Tabela' : 'Nova Tabela de Preços'}
                </DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome da Tabela</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Ex: Magalog"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="branch">Filial</Label>
                  <Select value={formData.company_branch_id} onValueChange={(value) => setFormData({...formData, company_branch_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma filial" />
                    </SelectTrigger>
                    <SelectContent>
                      {companyBranches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.fantasy_name || branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Tipo de Origem</Label>
                  <Select value={formData.source_type} onValueChange={(value: 'upload' | 'google_sheets') => setFormData({...formData, source_type: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upload">Upload de Arquivo</SelectItem>
                      <SelectItem value="google_sheets">Google Planilhas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.source_type === 'upload' && (
                  <div>
                    <Label htmlFor="file">Arquivo (.xlsx, .csv)</Label>
                    <Input
                      id="file"
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={(e) => setFormData({...formData, file: e.target.files?.[0] || null})}
                      required={!editingTable}
                    />
                  </div>
                )}

                {formData.source_type === 'google_sheets' && (
                  <>
                    <div>
                      <Label htmlFor="sheets_url">URL do Google Planilhas</Label>
                      <Textarea
                        id="sheets_url"
                        value={formData.google_sheets_url}
                        onChange={(e) => {
                          setFormData({...formData, google_sheets_url: e.target.value});
                          if (e.target.value) {
                            loadAvailableSheets(e.target.value);
                          }
                        }}
                        placeholder="https://docs.google.com/spreadsheets/d/..."
                        required
                        rows={3}
                      />
                    </div>

                    {availableSheets.length > 0 && (
                      <div>
                        <Label htmlFor="sheet_name">Aba da Planilha (Opcional)</Label>
                        <Select 
                          value={formData.sheet_name} 
                          onValueChange={(value) => setFormData({...formData, sheet_name: value})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma aba ou deixe em branco para usar a primeira" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Primeira aba (padrão)</SelectItem>
                            {availableSheets.map((sheet) => (
                              <SelectItem key={sheet} value={sheet}>
                                {sheet}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {isLoadingSheets && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Carregando abas disponíveis...
                          </p>
                        )}
                      </div>
                    )}
                    </>
                  )}

                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="font-semibold text-sm">Regras de Precificação</h3>
                    
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <Label htmlFor="cubic_meter">Equivalência Cúbica (kg/m³)</Label>
                        <Input
                          id="cubic_meter"
                          type="number"
                          step="1"
                          min="0"
                          value={formData.cubic_meter_kg_equivalent}
                          onChange={(e) => setFormData({...formData, cubic_meter_kg_equivalent: parseFloat(e.target.value) || 0})}
                          placeholder="167"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Quantos kg equivalem a 1 metro cúbico (ex: 167 significa que 1m³ = 167kg)
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="font-semibold text-sm">Restrições de Dimensões</h3>
                    <p className="text-xs text-muted-foreground">
                      Se alguma dimensão exceder os limites, o frete não será calculado
                    </p>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="max_length">Comprimento Máx. (cm)</Label>
                        <Input
                          id="max_length"
                          type="number"
                          step="1"
                          min="0"
                          value={formData.max_length_cm}
                          onChange={(e) => setFormData({...formData, max_length_cm: parseFloat(e.target.value) || 0})}
                          placeholder="200"
                        />
                      </div>

                      <div>
                        <Label htmlFor="max_width">Largura Máx. (cm)</Label>
                        <Input
                          id="max_width"
                          type="number"
                          step="1"
                          min="0"
                          value={formData.max_width_cm}
                          onChange={(e) => setFormData({...formData, max_width_cm: parseFloat(e.target.value) || 0})}
                          placeholder="200"
                        />
                      </div>

                      <div>
                        <Label htmlFor="max_height">Altura Máx. (cm)</Label>
                        <Input
                          id="max_height"
                          type="number"
                          step="1"
                          min="0"
                          value={formData.max_height_cm}
                          onChange={(e) => setFormData({...formData, max_height_cm: parseFloat(e.target.value) || 0})}
                          placeholder="200"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Salvando..." : editingTable ? "Atualizar" : "Cadastrar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <FileSpreadsheet className="w-5 h-5 mr-2" />
                Tabelas Cadastradas
              </div>
              <Button 
                variant="outline"
                onClick={handleValidateAllTables}
                disabled={isLoading}
                className="bg-gradient-to-r from-primary/10 to-primary/5 hover:from-primary/20 hover:to-primary/10 border-primary/30"
              >
                <Database className="w-4 h-4 mr-2" />
                {isLoading ? 'Auditando com IA...' : '🤖 Auditar com IA'}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : pricingTables.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma tabela cadastrada ainda
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Filial</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Atualização</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pricingTables.map((table) => (
                      <TableRow key={table.id}>
                        <TableCell className="font-medium">{table.name}</TableCell>
                        <TableCell>
                          {table.company_branches?.fantasy_name || table.company_branches?.name || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {table.source_type === 'upload' ? (
                              <>
                                <Upload className="w-3 h-3 mr-1" />
                                Upload
                              </>
                            ) : (
                              <>
                                <ExternalLink className="w-3 h-3 mr-1" />
                                Google Sheets
                              </>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={tableRecordCounts[table.id] > 0 ? 'default' : 'secondary'}>
                            {tableRecordCounts[table.id] > 0 ? 'Completa' : 'Pendente'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(table.updated_at).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setViewingTable(table);
                                setIsViewDialogOpen(true);
                              }}
                              title="Visualizar e Importar"
                            >
                              <Eye className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(table)}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(table.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal de Visualização e Importação */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                {viewingTable?.name}
              </DialogTitle>
            </DialogHeader>
            
            {viewingTable && (
              <TableImportStatus
                tableName={viewingTable.name}
                tableId={viewingTable.id}
                googleSheetsUrl={viewingTable.google_sheets_url}
                sourceType={viewingTable.source_type}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminTabelas;