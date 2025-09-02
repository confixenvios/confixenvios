import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Play, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { calculateShippingQuote } from '@/services/shippingService';

interface TestResult {
  city: string;
  state: string;
  cep: string;
  weight: number;
  success: boolean;
  economicPrice?: number;
  expressPrice?: number;
  economicDays?: number;
  expressDays?: number;
  zone?: string;
  zoneName?: string;
  error?: string;
}

const ShippingTestRunner = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [summary, setSummary] = useState<{
    total: number;
    success: number;
    failed: number;
    successRate: string;
  } | null>(null);

  const testCases = [
    { city: 'São Paulo', state: 'SP', cep: '01310-100', weight: 10 },
    { city: 'Rio de Janeiro', state: 'RJ', cep: '20040-020', weight: 10 },
    { city: 'Belo Horizonte', state: 'MG', cep: '30112-000', weight: 10 },
    { city: 'Salvador', state: 'BA', cep: '40070-110', weight: 10 },
    { city: 'Cuiabá', state: 'MT', cep: '78000-000', weight: 10 },
    { city: 'Goiânia', state: 'GO', cep: '74000-000', weight: 10 },
    { city: 'Brasília', state: 'DF', cep: '70040-010', weight: 10 },
    { city: 'Porto Alegre', state: 'RS', cep: '90000-000', weight: 10 },
    { city: 'Curitiba', state: 'PR', cep: '80010-000', weight: 10 },
    { city: 'Florianópolis', state: 'SC', cep: '88000-000', weight: 10 },
    { city: 'Vitória', state: 'ES', cep: '29000-000', weight: 10 },
    { city: 'Campo Grande', state: 'MS', cep: '79000-000', weight: 10 },
    { city: 'Recife', state: 'PE', cep: '50000-000', weight: 10 },
    { city: 'Fortaleza', state: 'CE', cep: '60000-000', weight: 10 },
    { city: 'João Pessoa', state: 'PB', cep: '58000-000', weight: 10 },
    { city: 'Natal', state: 'RN', cep: '59000-000', weight: 10 },
    { city: 'Maceió', state: 'AL', cep: '57000-000', weight: 10 },
    { city: 'Aracaju', state: 'SE', cep: '49000-000', weight: 10 },
    { city: 'Teresina', state: 'PI', cep: '64000-000', weight: 10 },
    { city: 'São Luís', state: 'MA', cep: '65000-000', weight: 10 },
    { city: 'Belém', state: 'PA', cep: '66000-000', weight: 10 },
    { city: 'Palmas', state: 'TO', cep: '77000-000', weight: 10 }
  ];

  const runTests = async () => {
    setIsRunning(true);
    setResults([]);
    setSummary(null);
    
    toast.info("🧪 Iniciando teste completo do sistema de frete...");

    const testResults: TestResult[] = [];

    for (const testCase of testCases) {
      try {
        const quote = await calculateShippingQuote({
          destinyCep: testCase.cep,
          weight: testCase.weight,
          quantity: 1
        });

        testResults.push({
          ...testCase,
          success: true,
          economicPrice: quote.economicPrice,
          expressPrice: quote.expressPrice,
          economicDays: quote.economicDays,
          expressDays: quote.expressDays,
          zone: quote.zone,
          zoneName: quote.zoneName
        });

      } catch (error) {
        testResults.push({
          ...testCase,
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }
    }

    const successCount = testResults.filter(r => r.success).length;
    const totalCount = testResults.length;
    const successRate = ((successCount / totalCount) * 100).toFixed(1);

    setResults(testResults);
    setSummary({
      total: totalCount,
      success: successCount,
      failed: totalCount - successCount,
      successRate
    });

    setIsRunning(false);

    if (successCount === totalCount) {
      toast.success(`🎉 Todos os ${totalCount} testes passaram! Sistema funcionando perfeitamente.`);
    } else {
      toast.warning(`⚠️ ${totalCount - successCount} de ${totalCount} testes falharam.`);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Teste Completo do Sistema de Frete
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Este teste valida cotações para todas as capitais brasileiras com 10kg.
          </p>
          
          <Button 
            onClick={runTests}
            disabled={isRunning}
            className="w-full"
          >
            {isRunning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Executando testes...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Executar Teste Completo
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {summary && (
        <Card>
          <CardHeader>
            <CardTitle>Resumo dos Testes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{summary.total}</div>
                <div className="text-sm text-muted-foreground">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{summary.success}</div>
                <div className="text-sm text-muted-foreground">Sucessos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{summary.failed}</div>
                <div className="text-sm text-muted-foreground">Falhas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{summary.successRate}%</div>
                <div className="text-sm text-muted-foreground">Taxa de Sucesso</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resultados Detalhados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {results.map((result, index) => (
                <div 
                  key={index}
                  className={`p-4 rounded-lg border ${
                    result.success 
                      ? 'border-green-200 bg-green-50' 
                      : 'border-blue-200 bg-blue-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {result.success ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-blue-600" />
                      )}
                      <span className="font-semibold">
                        {result.city}/{result.state}
                      </span>
                      <Badge variant="outline">{result.cep}</Badge>
                    </div>
                    <Badge variant={result.success ? "default" : "destructive"}>
                      {result.success ? "OK" : "ERRO"}
                    </Badge>
                  </div>

                  {result.success ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Econômica:</span>
                        <br />
                        <span className="font-medium">
                          R$ {result.economicPrice?.toFixed(2)} - {result.economicDays} dias
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Expressa:</span>
                        <br />
                        <span className="font-medium">
                          R$ {result.expressPrice?.toFixed(2)} - {result.expressDays} dias
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Zona:</span>
                        <br />
                        <span className="font-medium">{result.zone} ({result.zoneName})</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-blue-600">
                      <span className="font-medium">Erro:</span> {result.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ShippingTestRunner;