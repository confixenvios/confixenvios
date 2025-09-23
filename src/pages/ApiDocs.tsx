import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Code, Copy, Key, Shield, Zap, ArrowLeft, Home } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

const ApiDocs = () => {
  const [selectedTab, setSelectedTab] = useState('overview');

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado para a área de transferência!');
  };

  const exampleRequest = `{
  "remessa_id": "123456",
  "destinatario": {
    "nome": "João da Silva",
    "endereco": "Rua Exemplo, 100",
    "cidade": "São Paulo",
    "uf": "SP",
    "cep": "01000-000"
  },
  "remetente": {
    "nome": "Empresa X",
    "cnpj": "12.345.678/0001-99"
  },
  "servico": "expresso",
  "peso": 2.5
}`;

  const exampleResponse = `{
  "status": "sucesso",
  "remessa_id": "123456",
  "tracking_code": "CF12345678",
  "etiqueta_url": "https://sistema.confix.com.br/etiquetas/CF12345678.pdf",
  "servico": "expresso",
  "peso": 2.5
}`;

  const curlExample = `curl -X POST https://dhznyjtisfdxzbnzinab.supabase.co/functions/v1/api-v1-etiquetas \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer conf_live_your_api_key_here" \\
  -d '${exampleRequest}'`;

  const nodeExample = `const axios = require('axios');

const data = ${exampleRequest};

const config = {
  method: 'post',
  url: 'https://dhznyjtisfdxzbnzinab.supabase.co/functions/v1/api-v1-etiquetas',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': 'Bearer conf_live_your_api_key_here'
  },
  data: data
};

axios(config)
.then((response) => {
  console.log(JSON.stringify(response.data));
})
.catch((error) => {
  console.log(error);
});`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/80">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              to="/" 
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <Home className="h-4 w-4" />
              Voltar ao site
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold">Confix API</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-6 max-w-6xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            API Pública - Documentação
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Integre facilmente com nosso sistema de etiquetas de remessa através da API RESTful. 
            Documentação completa para desenvolvedores.
          </p>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="authentication">Autenticação</TabsTrigger>
            <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
            <TabsTrigger value="examples">Exemplos</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Introdução
                </CardTitle>
                <CardDescription>
                  Nossa API permite integração completa com o sistema de remessas da Confix Envios.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Características</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                    <li>API RESTful com formato JSON</li>
                    <li>Autenticação via API Key</li>
                    <li>Rate limiting por empresa</li>
                    <li>Logs de auditoria completos</li>
                    <li>Geração automática de etiquetas PDF</li>
                  </ul>
                </div>
                
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm">
                    <strong>Base URL:</strong> <code className="bg-background px-2 py-1 rounded">https://dhznyjtisfdxzbnzinab.supabase.co/functions/v1</code>
                  </p>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Precisa de acesso?</strong> Entre em contato conosco para obter sua API Key e começar a integrar.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status da API</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-green-500">
                    Operacional
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Todos os serviços funcionando normalmente
                  </span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="authentication" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Autenticação
                </CardTitle>
                <CardDescription>
                  Todas as requisições devem incluir uma API Key válida no header Authorization.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Formato do Header</h3>
                  <div className="bg-muted p-3 rounded-lg relative">
                    <code className="text-sm">Authorization: Bearer conf_live_your_api_key_here</code>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="absolute top-1 right-1 h-8 w-8 p-0"
                      onClick={() => copyToClipboard('Authorization: Bearer conf_live_your_api_key_here')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Obtendo API Keys</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    As API Keys são fornecidas pela nossa equipe e têm o formato:
                  </p>
                  <code className="bg-muted px-2 py-1 rounded text-sm">conf_live_[32_caracteres_aleatórios]</code>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>Importante:</strong> Mantenha suas API Keys em segurança. Elas permitem acesso completo aos recursos da API.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Rate Limiting</h3>
                  <p className="text-sm text-muted-foreground">
                    Cada API Key tem um limite de 1000 requisições por hora por padrão. 
                    Requisições que excedem o limite retornarão erro 429.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="endpoints" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>POST /api/v1/etiquetas</CardTitle>
                <CardDescription>
                  Cria uma nova etiqueta de remessa e retorna o URL do PDF gerado.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Badge variant="secondary">POST</Badge>
                  <code className="bg-muted px-2 py-1 rounded text-sm">/api/v1/etiquetas</code>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Parâmetros do Request Body</h4>
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2 text-sm font-medium border-b pb-2">
                      <span>Campo</span>
                      <span>Tipo</span>
                      <span>Descrição</span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <code>remessa_id</code>
                      <span className="text-muted-foreground">string</span>
                      <span>ID único da remessa</span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <code>destinatario</code>
                      <span className="text-muted-foreground">object</span>
                      <span>Dados do destinatário</span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 text-sm pl-4">
                      <code>├─ nome</code>
                      <span className="text-muted-foreground">string</span>
                      <span>Nome completo</span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 text-sm pl-4">
                      <code>├─ endereco</code>
                      <span className="text-muted-foreground">string</span>
                      <span>Endereço completo</span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 text-sm pl-4">
                      <code>├─ cidade</code>
                      <span className="text-muted-foreground">string</span>
                      <span>Cidade</span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 text-sm pl-4">
                      <code>├─ uf</code>
                      <span className="text-muted-foreground">string</span>
                      <span>Estado (2 letras)</span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 text-sm pl-4">
                      <code>└─ cep</code>
                      <span className="text-muted-foreground">string</span>
                      <span>CEP (formato: 00000-000)</span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <code>remetente</code>
                      <span className="text-muted-foreground">object</span>
                      <span>Dados do remetente</span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 text-sm pl-4">
                      <code>├─ nome</code>
                      <span className="text-muted-foreground">string</span>
                      <span>Nome da empresa</span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 text-sm pl-4">
                      <code>└─ cnpj</code>
                      <span className="text-muted-foreground">string</span>
                      <span>CNPJ da empresa</span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <code>servico</code>
                      <span className="text-muted-foreground">string</span>
                      <span>"expresso" ou "economico"</span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <code>peso</code>
                      <span className="text-muted-foreground">number</span>
                      <span>Peso em quilogramas</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Respostas</h4>
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className="bg-green-500">200</Badge>
                        <span className="text-sm font-medium">Sucesso</span>
                      </div>
                      <p className="text-sm text-muted-foreground">Etiqueta criada com sucesso.</p>
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="destructive">400</Badge>
                        <span className="text-sm font-medium">Bad Request</span>
                      </div>
                      <p className="text-sm text-muted-foreground">Parâmetros inválidos ou ausentes.</p>
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="destructive">401</Badge>
                        <span className="text-sm font-medium">Unauthorized</span>
                      </div>
                      <p className="text-sm text-muted-foreground">API Key inválida ou ausente.</p>
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="destructive">429</Badge>
                        <span className="text-sm font-medium">Too Many Requests</span>
                      </div>
                      <p className="text-sm text-muted-foreground">Rate limit excedido.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="examples" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Exemplo de Request
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">JSON Request Body</h4>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(exampleRequest)}
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Copiar
                      </Button>
                    </div>
                    <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                      <code>{exampleRequest}</code>
                    </pre>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">Response Body</h4>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(exampleResponse)}
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Copiar
                      </Button>
                    </div>
                    <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                      <code>{exampleResponse}</code>
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Exemplos de Código</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="curl" className="w-full">
                  <TabsList>
                    <TabsTrigger value="curl">cURL</TabsTrigger>
                    <TabsTrigger value="nodejs">Node.js</TabsTrigger>
                  </TabsList>

                  <TabsContent value="curl" className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">cURL</h4>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(curlExample)}
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Copiar
                      </Button>
                    </div>
                    <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                      <code>{curlExample}</code>
                    </pre>
                  </TabsContent>

                  <TabsContent value="nodejs" className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">Node.js (Axios)</h4>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(nodeExample)}
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Copiar
                      </Button>
                    </div>
                    <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                      <code>{nodeExample}</code>
                    </pre>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Teste Rápido</CardTitle>
                <CardDescription>
                  Você pode testar a API diretamente usando uma ferramenta como Postman ou Insomnia.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Dica:</strong> Substitua "conf_live_your_api_key_here" pela sua API Key real nos exemplos acima.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>© 2024 Confix Envios. Documentação da API pública.</p>
        </footer>
      </div>
    </div>
  );
};

export default ApiDocs;