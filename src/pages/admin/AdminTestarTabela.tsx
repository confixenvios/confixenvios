import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, AlertTriangle, Play, Loader2, Database } from "lucide-react";
import { toast } from "sonner";
import { 
  validatePricingTables, 
  testPriceCalculation, 
  findZonesWithoutPricing,
  type ValidationResult,
  type PriceTestResult 
} from "@/services/priceValidationService";

const AdminTestarTabela = () => {
  const [loading, setLoading] = useState(false);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [testResults, setTestResults] = useState<PriceTestResult[]>([]);
  const [zonesWithoutPricing, setZonesWithoutPricing] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('validation');

  const runCompleteValidation = async () => {
    setLoading(true);
    try {
      // Executar todas as validações em paralelo
        const [validation, tests, missingZones] = await Promise.all([
          validatePricingTables(),
          testPriceCalculation([0.5, 1, 2, 5, 10, 15, 20, 25, 30]),
          findZonesWithoutPricing()
        ]);

      setValidationResults(validation);
      setTestResults(tests);
      setZonesWithoutPricing(missingZones);

      const totalIssues = validation.reduce((acc, result) => acc + result.issues.length, 0);
      const totalFailedTests = tests.filter(test => !test.found).length;

      if (totalIssues === 0 && totalFailedTests === 0 && missingZones.length === 0) {
        toast.success("✅ Todas as validações passaram! Tabelas estão consistentes.");
      } else {
        toast.warning(`⚠️ Encontrados ${totalIssues} problemas na estrutura e ${totalFailedTests} falhas nos testes.`);
      }
    } catch (error) {
      console.error('Erro na validação:', error);
      toast.error("Erro ao executar validação das tabelas");
    } finally {
      setLoading(false);
    }
  };

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'GAP': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'OVERLAP': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'MISSING_ZONE': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'INVALID_RANGE': return <XCircle className="w-4 h-4 text-red-500" />;
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
            Este teste verifica lacunas, sobreposições e inconsistências nas tabelas de preço e zones.
          </p>
        </CardContent>
      </Card>

      {(validationResults.length > 0 || testResults.length > 0) && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="validation">Validação Estrutural</TabsTrigger>
            <TabsTrigger value="tests">Testes de Preço</TabsTrigger>
            <TabsTrigger value="summary">Resumo</TabsTrigger>
          </TabsList>

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
                            <XCircle className="w-5 h-5 text-red-500" />
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
                        <TableCell className="text-red-600 text-sm">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Zonas Validadas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{validationResults.length}</div>
                  <p className="text-sm text-muted-foreground">
                    {validationResults.filter(r => r.hasCompleteRanges).length} com estrutura completa
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Testes Realizados</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{testResults.length}</div>
                  <p className="text-sm text-muted-foreground">
                    {testResults.filter(t => t.found).length} sucessos, {testResults.filter(t => !t.found).length} falhas
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
            </div>

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