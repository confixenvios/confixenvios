import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, AlertTriangle, Play, Loader2, Database, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { 
  validatePricingTables, 
  testPriceCalculation, 
  findZonesWithoutPricing,
  testAllZonesComplete,
  type ValidationResult,
  type PriceTestResult,
  type CompleteTestResult 
} from "@/services/priceValidationService";

const AdminTestarTabela = () => {
  const [loading, setLoading] = useState(false);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [testResults, setTestResults] = useState<PriceTestResult[]>([]);
  const [completeTestResults, setCompleteTestResults] = useState<CompleteTestResult[]>([]);
  const [zonesWithoutPricing, setZonesWithoutPricing] = useState<string[]>([]);
  const [testSummary, setTestSummary] = useState<{
    totalZones: number;
    totalTests: number;
    successfulTests: number;
    failedTests: number;
    statesCovered: string[];
    expectedRegions: string[];
    missingRegions: string[];
  } | null>(null);
  const [activeTab, setActiveTab] = useState('validation');

  const runCompleteValidation = async () => {
    setLoading(true);
    try {
      toast.info("🔍 Iniciando teste completo de todas as regiões...");
      
      // Executar teste completo de todas as zonas
      const completeTest = await testAllZonesComplete();
      
      // Executar validações adicionais em paralelo
      const [validation, tests, missingZones] = await Promise.all([
        validatePricingTables(),
        testPriceCalculation([0.5, 1, 2, 5, 10, 15, 20, 25, 30]),
        findZonesWithoutPricing()
      ]);

      setCompleteTestResults(completeTest.results);
      setTestSummary({
        totalZones: completeTest.totalZones,
        totalTests: completeTest.totalTests,
        successfulTests: completeTest.successfulTests,
        failedTests: completeTest.failedTests,
        statesCovered: completeTest.statesCovered,
        expectedRegions: completeTest.expectedRegions,
        missingRegions: completeTest.missingRegions
      });
      setValidationResults(validation);
      setTestResults(tests);
      setZonesWithoutPricing(missingZones);

      const totalIssues = validation.reduce((acc, result) => acc + result.issues.length, 0);
      const problemZones = completeTest.results.filter(r => !r.hasAllPrices).length;

      // Relatório detalhado
      console.log("=== RELATÓRIO COMPLETO DE VALIDAÇÃO ===");
      console.log(`📊 Total de zonas testadas: ${completeTest.totalZones}`);
      console.log(`🧪 Total de testes realizados: ${completeTest.totalTests}`);
      console.log(`✅ Testes bem-sucedidos: ${completeTest.successfulTests}`);
      console.log(`❌ Testes falharam: ${completeTest.failedTests}`);
      console.log(`🗺️ Estados cobertos: ${completeTest.statesCovered.join(', ')}`);
      console.log(`🏷️ Regiões esperadas: ${completeTest.expectedRegions.length}`);
      console.log(`❗ Regiões faltando: ${completeTest.missingRegions.length}`);
      console.log(`⚠️ Zonas com problemas: ${problemZones}`);
      
      if (completeTest.missingRegions.length > 0) {
        console.log(`🚨 Regiões faltando na base:`, completeTest.missingRegions);
      }

      if (completeTest.failedTests === 0 && totalIssues === 0 && missingZones.length === 0 && completeTest.missingRegions.length === 0) {
        toast.success(`✅ PERFEITO! Teste completo passou! ${completeTest.totalTests} testes realizados com sucesso em ${completeTest.totalZones} zonas. Todas as ${completeTest.expectedRegions.length} regiões estão funcionando corretamente.`);
      } else if (completeTest.missingRegions.length > 0) {
        toast.error(`🚨 REGIÕES FALTANDO: ${completeTest.missingRegions.length} das ${completeTest.expectedRegions.length} regiões esperadas não estão na base de dados! Isso impede cotações para essas áreas.`);
      } else {
        toast.error(`🚨 LACUNAS DETECTADAS: ${problemZones} zonas com problemas, ${completeTest.failedTests}/${completeTest.totalTests} falhas encontradas. Verificar faixas de peso faltando!`);
      }
    } catch (error) {
      console.error('Erro na validação:', error);
      toast.error("Erro ao executar teste completo das tabelas");
    } finally {
      setLoading(false);
    }
  };

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'GAP': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'OVERLAP': return <XCircle className="w-4 h-4 text-blue-500" />;
      case 'MISSING_ZONE': return <XCircle className="w-4 h-4 text-blue-500" />;
      case 'INVALID_RANGE': return <XCircle className="w-4 h-4 text-blue-500" />;
      default: return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getIssueColor = (type: string) => {
    switch (type) {
      case 'GAP': return 'orange';
      case 'OVERLAP': return 'red';
      case 'MISSING_ZONE': return 'red';
      case 'INVALID_RANGE': return 'red';
      default: return 'yellow';
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center">
          <Database className="mr-3 h-8 w-8 text-primary" />
          Teste e Validação de Tabelas
        </h1>
        <p className="text-muted-foreground mt-2">
          Validação automática da consistência entre tabelas de zonas, abrangência e preços
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Executar Validação Completa</CardTitle>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={runCompleteValidation} 
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Executando validação...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Rodar Validação de Preços
              </>
            )}
          </Button>
          <p className="text-sm text-muted-foreground mt-2">
            Este teste completo valida TODOS os CEPs e pesos de todas as zonas cadastradas na tabela.
          </p>
        </CardContent>
      </Card>

      {(validationResults.length > 0 || testResults.length > 0) && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="complete">Teste Completo</TabsTrigger>
            <TabsTrigger value="validation">Validação Estrutural</TabsTrigger>
            <TabsTrigger value="tests">Testes de Preço</TabsTrigger>
            <TabsTrigger value="summary">Resumo</TabsTrigger>
          </TabsList>

          <TabsContent value="complete">
            <Card>
              <CardHeader>
                <CardTitle>Teste Completo - Todos os CEPs e Zonas</CardTitle>
                {testSummary && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge variant="outline">{testSummary.totalZones} zonas testadas</Badge>
                    <Badge variant="outline">{testSummary.totalTests} testes realizados</Badge>
                    <Badge className="bg-green-100 text-green-800">{testSummary.successfulTests} sucessos</Badge>
                    <Badge variant="destructive">{testSummary.failedTests} falhas</Badge>
                    {completeTestResults.length > 0 && (
                      <Badge variant="secondary">{[...new Set(completeTestResults.map(r => r.state))].length} estados</Badge>
                    )}
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {/* Alerta para problemas críticos */}
                {completeTestResults.some(r => !r.hasAllPrices) && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      🚨 <strong>ATENÇÃO: Lacunas na Tabela de Preços Detectadas!</strong><br/>
                      Foram encontradas {completeTestResults.filter(r => !r.hasAllPrices).length} zonas com lacunas nas faixas de peso. 
                      Isso está causando os erros "Não há preço configurado" que aparecem na cotação. 
                      <strong>As zonas com problemas estão marcadas em vermelho abaixo.</strong>
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {/* Mostrar primeiro as zonas com problemas */}
                  {completeTestResults
                    .sort((a, b) => {
                      if (a.hasAllPrices && !b.hasAllPrices) return 1;
                      if (!a.hasAllPrices && b.hasAllPrices) return -1;
                      return a.zone.localeCompare(b.zone);
                    })
                    .map((result) => (
                    <div key={result.zone} className={`border rounded-lg p-4 ${!result.hasAllPrices ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold">{result.zone}</h3>
                          <Badge variant="outline">{result.state} {result.zoneType}</Badge>
                          <Badge variant="outline" className="text-xs">{result.cepRange}</Badge>
                          {result.hasAllPrices ? (
                            <Badge className="bg-green-100 text-green-800">✓ OK</Badge>
                          ) : (
                            <Badge variant="destructive">🚨 {result.missingWeights.length} FAIXAS FALTANDO</Badge>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {result.deliveryDays}d normal, {result.expressDeliveryDays}d expresso
                        </div>
                      </div>
                      
                      {!result.hasAllPrices && (
                        <Alert variant="destructive" className="mb-3">
                          <AlertCircle className="w-4 h-4" />
                          <AlertDescription>
                            <strong>⚠️ FAIXAS DE PESO SEM PREÇO CONFIGURADO:</strong><br/>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {result.missingWeights.map((weight) => (
                                <Badge key={weight} variant="destructive" className="text-xs">
                                  {weight}kg
                                </Badge>
                              ))}
                            </div>
                            <div className="text-sm mt-2 text-blue-800">
                              🚨 <strong>Essas lacunas estão causando erro "Não há preço configurado" no sistema de cotação!</strong>
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                        {result.testResults.slice(0, 9).map((test, index) => (
                          <div key={index} className={`p-2 rounded border ${test.success ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
                            <div className="font-mono">{test.cep} - {test.weight}kg</div>
                            {test.success ? (
                              <div className="text-green-700">
                                R$ {test.economicPrice?.toFixed(2)} / R$ {test.expressPrice?.toFixed(2)}
                              </div>
                            ) : (
                              <div className="text-blue-700 text-xs">{test.error}</div>
                            )}
                          </div>
                        ))}
                        {result.testResults.length > 9 && (
                          <div className="p-2 rounded border bg-gray-50 border-gray-200 flex items-center justify-center text-muted-foreground">
                            +{result.testResults.length - 9} mais testes
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="validation">
            <Card>
              <CardHeader>
                <CardTitle>Validação da Estrutura das Tabelas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {validationResults.map((result) => (
                    <div key={result.zone} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold">{result.zone}</h3>
                          <Badge variant="outline">{result.state} {result.zoneType === 'CAP' ? 'Capital' : 'Interior'}</Badge>
                          {result.hasCompleteRanges ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <XCircle className="w-5 h-5 text-blue-500" />
                          )}
                        </div>
                        <Badge variant={result.hasCompleteRanges ? "default" : "destructive"}>
                          {result.issues.length} problemas
                        </Badge>
                      </div>
                      
                      {result.issues.length > 0 && (
                        <div className="space-y-2">
                          {result.issues.map((issue, index) => (
                            <Alert key={index}>
                              <div className="flex items-start space-x-2">
                                {getIssueIcon(issue.type)}
                                <div className="flex-1">
                                  <AlertDescription>
                                    <Badge className="mr-2" variant="outline" style={{color: getIssueColor(issue.type)}}>
                                      {issue.type}
                                    </Badge>
                                    {issue.description}
                                  </AlertDescription>
                                </div>
                              </div>
                            </Alert>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tests">
            <Card>
              <CardHeader>
                <CardTitle>Resultados dos Testes de Preço</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Zona</TableHead>
                      <TableHead>Peso (kg)</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Preço</TableHead>
                      <TableHead>Erro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {testResults.map((test, index) => (
                      <TableRow key={index}>
                        <TableCell>{test.zone}</TableCell>
                        <TableCell>{test.weight}kg</TableCell>
                        <TableCell>
                          {test.found ? (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Encontrado
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <XCircle className="w-3 h-3 mr-1" />
                              Não encontrado
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {test.price ? `R$ ${test.price.toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell className="text-blue-600 text-sm">
                          {test.error || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="summary">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Zonas Testadas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{testSummary?.totalZones || validationResults.length}</div>
                  <p className="text-sm text-muted-foreground">
                    {testSummary ? 
                      `${testSummary.successfulTests} testes bem-sucedidos` :
                      `${validationResults.filter(r => r.hasCompleteRanges).length} com estrutura completa`
                    }
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Testes Realizados</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{testSummary?.totalTests || testResults.length}</div>
                  <p className="text-sm text-muted-foreground">
                    {testSummary ?
                      `${testSummary.failedTests} falhas encontradas` :
                      `${testResults.filter(t => t.found).length} sucessos, ${testResults.filter(t => !t.found).length} falhas`
                    }
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Zonas sem Preço</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{zonesWithoutPricing.length}</div>
                  <p className="text-sm text-muted-foreground">
                    {zonesWithoutPricing.length > 0 ? zonesWithoutPricing.join(', ') : 'Nenhuma'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Regiões da Tabela</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {testSummary?.expectedRegions.length || 0}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {testSummary?.missingRegions.length ? (
                      <span className="text-blue-600">
                        {testSummary.missingRegions.length} regiões faltando na base
                      </span>
                    ) : (
                      'Todas as regiões encontradas'
                    )}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Card de análise de regiões */}
            {testSummary && testSummary.missingRegions.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>🚨 Regiões Faltando na Base de Dados</CardTitle>
                </CardHeader>
                <CardContent>
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>CRÍTICO:</strong> {testSummary.missingRegions.length} regiões da tabela de preços não foram encontradas na base de dados.
                      Isso significa que essas regiões não podem ser cotadas pelo sistema.
                    </AlertDescription>
                  </Alert>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {testSummary.missingRegions.map((region) => (
                      <Badge key={region} variant="destructive" className="justify-center">
                        {region}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Card de estados cobertos */}
            {testSummary && testSummary.statesCovered.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Estados Cobertos na Base</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {testSummary.statesCovered.map((state) => (
                      <Badge key={state} variant="outline">
                        {state}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mt-3">
                    Total: {testSummary.statesCovered.length} de 22 estados brasileiros + ES e MT
                  </p>
                </CardContent>
              </Card>
            )}

            {validationResults.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Problemas Encontrados por Tipo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {['GAP', 'OVERLAP', 'MISSING_ZONE', 'INVALID_RANGE'].map(type => {
                      const count = validationResults.reduce((acc, result) => 
                        acc + result.issues.filter(issue => issue.type === type).length, 0
                      );
                      return count > 0 && (
                        <div key={type} className="flex items-center justify-between p-2 border rounded">
                          <div className="flex items-center space-x-2">
                            {getIssueIcon(type)}
                            <span className="font-medium">{type}</span>
                          </div>
                          <Badge variant="outline">{count}</Badge>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default AdminTestarTabela;