import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Copy, 
  ExternalLink, 
  FileText, 
  Webhook, 
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Code
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AdminDocsIntegracao = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");

  const copyToClipboard = (text: string, description: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: `${description} copiado para a área de transferência.`
    });
  };

  const webhookUrl = `${window.location.origin}/api/webhooks/tms`;

  const exampleOutgoingPayload = `{
  "event": "shipment_confirmed",
  "shipmentId": "SID123",
  "clienteId": "CID456",
  "status": "PAGO_AGUARDANDO_ETIQUETA",
  
  "remetente": {
    "nome": "Loja X",
    "cpfCnpj": "12345678901",
    "telefone": "62999999999",
    "email": "loja@email.com",
    "cep": "74345260",
    "endereco": "Rua H 53",
    "numero": "123",
    "bairro": "Vila Rosa",
    "cidade": "Goiânia",
    "estado": "GO",
    "referencia": "Próximo ao supermercado Y"
  },
  
  "destinatario": {
    "nome": "João da Silva",
    "cpfCnpj": "98765432100",
    "telefone": "11988887777",
    "email": "joao@email.com",
    "cep": "01307001",
    "endereco": "Rua Frei Caneca",
    "numero": "121",
    "bairro": "Consolação",
    "cidade": "São Paulo",
    "estado": "SP",
    "referencia": "Apto 32, Bloco B"
  },
  
  "pacote": {
    "pesoKg": 10.0,
    "comprimentoCm": 20,
    "larguraCm": 20,
    "alturaCm": 20,
    "formato": "CAIXA"
  },
  
  "mercadoria": {
    "quantidade": 1,
    "valorUnitario": 100.00,
    "valorTotal": 100.00,
    "documentoFiscal": {
      "tipo": "DECLARACAO_CONTEUDO",
      "temNotaFiscal": false,
      "chaveNfe": null
    }
  },
  
  "pagamento": {
    "metodo": "PIX",
    "valor": 146.11,
    "status": "PAID",
    "dataPagamento": "2025-09-02T17:35:00Z"
  }
}`;

  const exampleIncomingPayload = `{
  "event": "shipment_label_ready",
  "shipmentId": "SID123",
  "pedidoExterno": "EXT-20250902-98765",
  "labelPdfUrl": "https://tms.externo/etiquetas/SID123.pdf",
  "status": "ETIQUETA_DISPONIVEL"
}`;

  const curlExample = `curl -X POST ${webhookUrl} \\
  -H "Content-Type: application/json" \\
  -d '${exampleIncomingPayload.replace(/\s+/g, ' ')}'`;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Documentação de Integração TMS</h1>
        <p className="text-muted-foreground">
          Guia completo para integração com sistemas de gerenciamento de transporte externos
        </p>
      </div>

      {/* Quick Info */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Integração Assíncrona</AlertTitle>
        <AlertDescription>
          O Confix Envios utiliza webhooks para comunicação assíncrona com TMS externos. 
          Recebemos solicitações de remessa e devolvemos etiquetas através de endpoints REST.
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="outgoing">Webhook Saída</TabsTrigger>
          <TabsTrigger value="incoming">Endpoint Retorno</TabsTrigger>
          <TabsTrigger value="testing">Testes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="w-5 h-5" />
                <span>Fluxo de Integração</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col items-center p-4 border border-border rounded-lg">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                    <CheckCircle className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-center mb-2">1. Pagamento Confirmado</h3>
                  <p className="text-sm text-muted-foreground text-center">
                    Cliente finaliza pagamento no Confix Envios
                  </p>
                </div>

                <div className="flex flex-col items-center p-4 border border-border rounded-lg">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                    <ArrowRight className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-center mb-2">2. Webhook Disparado</h3>
                  <p className="text-sm text-muted-foreground text-center">
                    Confix envia dados consolidados para o TMS via webhook
                  </p>
                </div>

                <div className="flex flex-col items-center p-4 border border-border rounded-lg">
                  <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center mb-3">
                    <FileText className="w-6 h-6 text-success" />
                  </div>
                  <h3 className="font-semibold text-center mb-2">3. Etiqueta Retornada</h3>
                  <p className="text-sm text-muted-foreground text-center">
                    TMS processa e retorna etiqueta via endpoint
                  </p>
                </div>
              </div>

              <Alert>
                <Webhook className="h-4 w-4" />
                <AlertTitle>Endpoint de Retorno</AlertTitle>
                <AlertDescription className="flex items-center justify-between">
                  <span className="font-mono text-sm">{webhookUrl}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(webhookUrl, "URL do endpoint")}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="outgoing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ArrowRight className="w-5 h-5" />
                <span>Webhook de Saída (Confix → TMS)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Informações Técnicas</h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center space-x-2">
                      <Badge variant="secondary">POST</Badge>
                      <span>Método HTTP</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Badge variant="secondary">JSON</Badge>
                      <span>Content-Type: application/json</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Badge variant="secondary">shipment_confirmed</Badge>
                      <span>Evento padrão</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Campos Obrigatórios</h3>
                  <ul className="space-y-1 text-sm">
                    <li>• <code>shipmentId</code> - ID único da remessa</li>
                    <li>• <code>remetente</code> - Dados completos do remetente</li>
                    <li>• <code>destinatario</code> - Dados completos do destinatário</li>
                    <li>• <code>pacote</code> - Dimensões e peso</li>
                    <li>• <code>pagamento</code> - Status e valor pago</li>
                  </ul>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">Exemplo de Payload</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(exampleOutgoingPayload, "Payload de exemplo")}
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    Copiar
                  </Button>
                </div>
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                  <code>{exampleOutgoingPayload}</code>
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="incoming" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ArrowRight className="w-5 h-5 rotate-180" />
                <span>Endpoint de Retorno (TMS → Confix)</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Code className="h-4 w-4" />
                <AlertTitle>Endpoint URL</AlertTitle>
                <AlertDescription className="font-mono">{webhookUrl}</AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Especificações</h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center space-x-2">
                      <Badge variant="secondary">POST</Badge>
                      <span>Método obrigatório</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Badge variant="secondary">JSON</Badge>
                      <span>Content-Type: application/json</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <Badge variant="outline">HTTPS</Badge>
                      <span>Conexão segura obrigatória</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Campos Obrigatórios</h3>
                  <ul className="space-y-1 text-sm">
                    <li>• <code>shipmentId</code> - ID da remessa (localização)</li>
                    <li>• <code>labelPdfUrl</code> - URL da etiqueta em PDF</li>
                    <li>• <code>status</code> - Deve ser "ETIQUETA_DISPONIVEL"</li>
                    <li>• <code>pedidoExterno</code> - Opcional, ID no TMS</li>
                  </ul>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">Payload Esperado</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(exampleIncomingPayload, "Payload de retorno")}
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    Copiar
                  </Button>
                </div>
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                  <code>{exampleIncomingPayload}</code>
                </pre>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Resposta do Confix</h3>
                <pre className="bg-muted p-4 rounded-lg text-xs">
                  <code>{`{
  "success": true,
  "message": "Etiqueta registrada com sucesso para shipmentId=SID123"
}`}</code>
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="testing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ExternalLink className="w-5 h-5" />
                <span>Testando a Integração</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Comando cURL</h3>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">
                    Use este comando para testar o endpoint de retorno:
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(curlExample, "Comando cURL")}
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    Copiar
                  </Button>
                </div>
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                  <code>{curlExample}</code>
                </pre>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Importante para Testes</AlertTitle>
                <AlertDescription>
                  • O <code>shipmentId</code> deve corresponder a uma remessa existente no sistema<br/>
                  • A URL da etiqueta deve ser acessível publicamente<br/>
                  • Use o status exato "ETIQUETA_DISPONIVEL" para ativar o download no painel do cliente
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Status de Resposta</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center space-x-2">
                        <Badge className="bg-success text-success-foreground">200</Badge>
                        <span>Sucesso - Etiqueta registrada</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="destructive">400</Badge>
                        <span>Erro - Payload inválido</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="destructive">404</Badge>
                        <span>Erro - Remessa não encontrada</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="destructive">500</Badge>
                        <span>Erro interno do servidor</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Próximos Passos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Button asChild className="w-full justify-start">
                        <a href="/admin/webhooks/logs">
                          <FileText className="w-4 h-4 mr-2" />
                          Ver Logs de Webhooks
                        </a>
                      </Button>
                      <Button asChild variant="outline" className="w-full justify-start">
                        <a href="/admin/integracoes">
                          <Webhook className="w-4 h-4 mr-2" />
                          Configurar Webhooks
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDocsIntegracao;