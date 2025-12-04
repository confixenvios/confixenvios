import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { ExternalLink, Key, TestTube } from "lucide-react";
import { calculateExternalQuote } from "@/services/externalQuoteService";

const AdminApiExterna = () => {
  const { toast } = useToast();
  const [testCep, setTestCep] = useState("71001000");
  const [testWeight, setTestWeight] = useState("1.2");
  const [testValue, setTestValue] = useState("120.50");
  const [testingQuote, setTestingQuote] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const handleTestQuote = async () => {
    setTestingQuote(true);
    setTestResult(null);

    try {
      const result = await calculateExternalQuote({
        destinyCep: testCep,
        weight: parseFloat(testWeight),
        quantity: 1,
        merchandiseValue: parseFloat(testValue),
        length: 10,
        width: 10,
        height: 10,
        tipo: "Normal"
      });

      setTestResult(result);
      toast({
        title: "Teste realizado com sucesso!",
        description: `Frete: R$ ${result.economicPrice.toFixed(2)} - Prazo: ${result.economicDays} dias`,
      });
    } catch (error) {
      console.error('[Admin API Externa] Erro no teste:', error);
      toast({
        title: "Erro no teste",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setTestingQuote(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Configuração da API Externa</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie a integração com a API de cálculo de frete Confix
          </p>
        </div>
      </div>

      {/* Informações da API */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Informações da API
          </CardTitle>
          <CardDescription>
            Detalhes da integração configurada
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div>
              <Label>Endpoint da API</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input 
                  value="https://api-frete-confix-producao-production.up.railway.app/frete/confix" 
                  readOnly 
                  className="font-mono text-sm"
                />
                <Button variant="outline" size="icon" asChild>
                  <a 
                    href="https://freteconfix-doc.vercel.app/#/Frete/calcularFrete" 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>

            <div>
              <Label>Método</Label>
              <Input value="POST" readOnly className="mt-1" />
            </div>

            <div>
              <Label>Autenticação</Label>
              <Input value="Bearer Token (JWT)" readOnly className="mt-1" />
            </div>

            <div>
              <Label>Status do Token</Label>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-md">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-green-700 dark:text-green-400">
                      Token configurado e ativo
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    O token está armazenado de forma segura como secret no Supabase
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <Button variant="outline" asChild>
              <a 
                href="https://freteconfix-doc.vercel.app" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Ver Documentação Completa
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Teste da API */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Testar Integração
          </CardTitle>
          <CardDescription>
            Faça um teste real de cotação usando a API externa
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="test-cep">CEP Destino</Label>
              <Input
                id="test-cep"
                value={testCep}
                onChange={(e) => setTestCep(e.target.value)}
                placeholder="71001000"
                maxLength={8}
              />
            </div>

            <div>
              <Label htmlFor="test-weight">Peso (kg)</Label>
              <Input
                id="test-weight"
                type="number"
                step="0.1"
                value={testWeight}
                onChange={(e) => setTestWeight(e.target.value)}
                placeholder="1.2"
              />
            </div>

            <div>
              <Label htmlFor="test-value">Valor Declarado (R$)</Label>
              <Input
                id="test-value"
                type="number"
                step="0.01"
                value={testValue}
                onChange={(e) => setTestValue(e.target.value)}
                placeholder="120.50"
              />
            </div>
          </div>

          <Button 
            onClick={handleTestQuote} 
            disabled={testingQuote}
            className="w-full"
          >
            {testingQuote ? "Testando..." : "Testar Cotação"}
          </Button>

          {testResult && (
            <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <h3 className="font-semibold mb-3">Resultado do Teste:</h3>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Transportadora:</span>
                  <span className="font-medium">{testResult.tableName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor Econômico:</span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    R$ {testResult.economicPrice.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Prazo Econômico:</span>
                  <span className="font-medium">{testResult.economicDays} dias úteis</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor Expresso:</span>
                  <span className="font-medium text-blue-600 dark:text-blue-400">
                    R$ {testResult.expressPrice.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Prazo Expresso:</span>
                  <span className="font-medium">{testResult.expressDays} dias úteis</span>
                </div>
                {testResult.insuranceValue > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Seguro:</span>
                    <span className="font-medium">R$ {testResult.insuranceValue.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instruções */}
      <Card>
        <CardHeader>
          <CardTitle>Como Atualizar o Token</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Para atualizar o token da API:</p>
          <ol className="list-decimal list-inside space-y-2 ml-2">
            <li>Acesse o painel de Secrets do Supabase</li>
            <li>Localize a secret <code className="bg-muted px-1 py-0.5 rounded">CONFIX_API_TOKEN</code></li>
            <li>Atualize com o novo token JWT fornecido pela API Confix</li>
            <li>As alterações são aplicadas automaticamente</li>
          </ol>
          <p className="pt-2">
            O token é armazenado de forma segura e nunca é exposto no código frontend.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminApiExterna;
