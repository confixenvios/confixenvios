import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Bot, Settings, History } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface Config {
  id: string;
  is_active: boolean;
  priority_mode: string;
  weight_calculation_mode?: string;
  preferred_carriers: string[];
  additional_rules: string | null;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  system_prompt?: string;
  consider_chemical_transport?: boolean;
  prefer_no_dimension_restrictions?: boolean;
}

interface QuoteLog {
  id: string;
  created_at: string;
  origin_cep: string;
  destination_cep: string;
  total_weight: number;
  total_volume: number;
  volumes_data: any;
  selected_pricing_table_id: string;
  selected_pricing_table_name: string;
  base_price: number;
  additionals_applied: any[];
  final_price: number;
  delivery_days: number;
  priority_used: string;
  all_options_analyzed: any;
}

const AdminAgenteIA = () => {
  const queryClient = useQueryClient();

  // Buscar configuração
  const { data: config } = useQuery({
    queryKey: ["ai-quote-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_quote_config")
        .select("*")
        .single();
      if (error) throw error;
      return data as Config;
    },
  });

  // Buscar logs
  const { data: logs = [], isLoading: isLoadingLogs } = useQuery({
    queryKey: ["ai-quote-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_quote_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as QuoteLog[];
    },
  });

  // Atualizar configuração
  const updateConfigMutation = useMutation({
    mutationFn: async (updates: Partial<Config>) => {
      console.log('Atualizando configuração:', updates);
      const { data, error } = await supabase
        .from("ai_quote_config")
        .update(updates)
        .eq("id", config?.id)
        .select();
      
      if (error) {
        console.error('Erro ao atualizar:', error);
        throw error;
      }
      
      console.log('Configuração atualizada com sucesso:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-quote-config"] });
      toast.success("Configuração atualizada com sucesso!");
    },
    onError: (error: any) => {
      console.error('Erro completo:', error);
      toast.error(`Erro ao atualizar: ${error.message || 'Erro desconhecido'}`);
    },
  });

  const getPriorityLabel = (mode: string) => {
    const modes: Record<string, string> = {
      lowest_price: "Prioriza o menor valor total, independente do prazo de entrega",
      fastest_delivery: "Prioriza o menor prazo de entrega, independente do valor",
      balanced: "Busca o melhor equilíbrio entre preço e prazo de entrega",
    };
    return modes[mode] || mode;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bot className="h-8 w-8 text-primary" />
            Agente IA de Cotação
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure e monitore o agente inteligente de cotações automáticas
          </p>
        </div>
        <Badge variant={config?.is_active ? "default" : "secondary"}>
          {config?.is_active ? "ATIVO" : "INATIVO"}
        </Badge>
      </div>

      <Tabs defaultValue="config" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configuração
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            IA Avançado
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Histórico de Cotações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuração do Agente IA</CardTitle>
              <CardDescription>
                Defina como o agente deve processar as cotações
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Prioridade de Cotação</Label>
                <Select 
                  value={config?.priority_mode || "balanced"} 
                  onValueChange={(value) => updateConfigMutation.mutate({ priority_mode: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lowest_price">Menor Preço</SelectItem>
                    <SelectItem value="fastest_delivery">Entrega Mais Rápida</SelectItem>
                    <SelectItem value="balanced">Balanceado (Preço e Prazo)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  {config?.priority_mode === 'lowest_price'
                    ? 'A IA busca em todas as tabelas de transportadoras cadastradas e retorna a opção com MENOR PREÇO'
                    : config?.priority_mode === 'fastest_delivery'
                    ? 'A IA busca em todas as tabelas de transportadoras cadastradas e retorna a opção com MENOR PRAZO de entrega'
                    : 'A IA analisa todas as tabelas de transportadoras e retorna a melhor opção equilibrando PREÇO e PRAZO de entrega'
                  }
                </p>
              </div>

              <div className="space-y-2">
                <Label>Cálculo de Peso</Label>
                <Select 
                  value={config?.weight_calculation_mode || "greater_weight"} 
                  onValueChange={(value) => updateConfigMutation.mutate({ weight_calculation_mode: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="informed_weight">Peso Informado</SelectItem>
                    <SelectItem value="cubed_weight">Peso Cubado</SelectItem>
                    <SelectItem value="greater_weight">Maior Peso (Recomendado)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  {config?.weight_calculation_mode === 'informed_weight' 
                    ? 'Usar apenas o peso informado pelo cliente no formulário para buscar na tabela de preços'
                    : config?.weight_calculation_mode === 'cubed_weight'
                    ? 'Calcular e usar o peso cubado (comprimento × largura × altura ÷ 6000) para buscar na tabela de preços'
                    : 'A IA compara o peso informado com o peso cubado e usa sempre o MAIOR entre os dois para buscar o frete nas tabelas das transportadoras cadastradas'
                  }
                </p>
              </div>

              <div className="flex items-center justify-between space-x-2 pt-4 border-t">
                <div className="space-y-0.5">
                  <Label>Status do Agente</Label>
                  <p className="text-sm text-muted-foreground">
                    {config?.is_active ? "Agente ativo e processando cotações" : "Agente desativado"}
                  </p>
                </div>
                <Switch
                  checked={config?.is_active || false}
                  onCheckedChange={(checked) => updateConfigMutation.mutate({ is_active: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configurações Avançadas da IA</CardTitle>
              <CardDescription>
                Configure o comportamento detalhado do modelo de IA usado para escolher a melhor transportadora
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Modelo da OpenAI</Label>
                <Select 
                  value={config?.model || "gpt-4o-mini"} 
                  onValueChange={(value) => updateConfigMutation.mutate({ model: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o">GPT-4o (Mais inteligente, mais caro)</SelectItem>
                    <SelectItem value="gpt-4o-mini">GPT-4o-mini (Recomendado - Bom equilíbrio)</SelectItem>
                    <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (Mais rápido, mais barato)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Modelo usado para análise quando há múltiplas transportadoras com cobertura
                </p>
              </div>

              <div className="space-y-2">
                <Label>Temperature (Criatividade: {config?.temperature ?? 0.3})</Label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={config?.temperature ?? 0.3}
                  onChange={(e) => updateConfigMutation.mutate({ temperature: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-primary/20 rounded-lg appearance-none cursor-pointer"
                />
                <p className="text-sm text-muted-foreground">
                  Valores baixos (0-0.3): Respostas mais consistentes e previsíveis<br/>
                  Valores altos (0.7-1.0): Respostas mais variadas e criativas
                </p>
              </div>

              <div className="space-y-2">
                <Label>Máximo de Tokens</Label>
                <Select 
                  value={String(config?.max_tokens || 500)} 
                  onValueChange={(value) => updateConfigMutation.mutate({ max_tokens: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="300">300 (Resposta curta)</SelectItem>
                    <SelectItem value="500">500 (Recomendado)</SelectItem>
                    <SelectItem value="800">800 (Resposta detalhada)</SelectItem>
                    <SelectItem value="1000">1000 (Máximo detalhamento)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Quantidade máxima de tokens (palavras) na resposta da IA. Mais tokens = análise mais detalhada mas mais custosa.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Prompt do Sistema (Personalizado)</Label>
                <Textarea
                  value={config?.system_prompt || ''}
                  onChange={(e) => {
                    // Usar estado local para evitar chamadas excessivas
                    const value = e.target.value;
                    // Adicionar debounce manual aqui se necessário
                  }}
                  onBlur={(e) => {
                    const value = e.target.value.trim();
                    if (value && value !== config?.system_prompt) {
                      updateConfigMutation.mutate({ system_prompt: value });
                    }
                  }}
                  placeholder="Você é um especialista em logística que escolhe a melhor transportadora..."
                  className="min-h-[100px] font-mono text-sm"
                />
                <p className="text-sm text-muted-foreground">
                  Prompt personalizado que define a personalidade e comportamento da IA. Deixe vazio para usar o padrão.
                </p>
              </div>

              <div className="flex items-center justify-between space-x-2 pt-4 border-t">
                <div className="space-y-0.5">
                  <Label>Considerar Transporte de Químicos</Label>
                  <p className="text-sm text-muted-foreground">
                    Dar preferência a transportadoras que aceitam produtos químicos
                  </p>
                </div>
                <Switch
                  checked={config?.consider_chemical_transport || false}
                  onCheckedChange={(checked) => updateConfigMutation.mutate({ consider_chemical_transport: checked })}
                />
              </div>

              <div className="flex items-center justify-between space-x-2">
                <div className="space-y-0.5">
                  <Label>Evitar Restrições de Dimensões</Label>
                  <p className="text-sm text-muted-foreground">
                    Preferir transportadoras com menos restrições de tamanho/dimensões
                  </p>
                </div>
                <Switch
                  checked={config?.prefer_no_dimension_restrictions !== false}
                  onCheckedChange={(checked) => updateConfigMutation.mutate({ prefer_no_dimension_restrictions: checked })}
                />
              </div>

              <div className="pt-4 border-t">
                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    💡 Como funciona a IA?
                  </p>
                  <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                    <li>A IA é chamada apenas quando há <strong>múltiplas</strong> transportadoras com cobertura</li>
                    <li>Se apenas 1 transportadora atende, ela é selecionada automaticamente (sem custo de IA)</li>
                    <li>A IA analisa preço, prazo, regras específicas e suas preferências configuradas</li>
                    <li>Consumo típico: ~300-500 tokens por decisão (~$0.001-0.002 USD por cotação)</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Cotações</CardTitle>
              <CardDescription>
                Últimas 50 cotações processadas pelo agente IA com detalhes da decisão
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingLogs ? (
                <div className="text-center py-8">Carregando histórico...</div>
              ) : logs && logs.length > 0 ? (
                <div className="space-y-4">
                  {logs.map((log) => (
                    <Card key={log.id} className="border-l-4 border-l-primary">
                      <CardContent className="pt-6">
                        <div className="space-y-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{log.priority_used}</Badge>
                                <span className="text-sm text-muted-foreground">
                                  {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm")}
                                </span>
                              </div>
                              <div className="font-mono text-sm">
                                <span className="font-semibold">Origem:</span> {log.origin_cep} → <span className="font-semibold">Destino:</span> {log.destination_cep}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-primary">R$ {log.final_price.toFixed(2)}</div>
                              <div className="text-sm text-muted-foreground">{log.delivery_days} dias úteis</div>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-4 py-3 border-y">
                            <div>
                              <div className="text-xs text-muted-foreground">Peso Total</div>
                              <div className="font-semibold">{log.total_weight} kg</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Volume Total</div>
                              <div className="font-semibold">{log.total_volume} m³</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Volumes</div>
                              <div className="font-semibold">{Array.isArray(log.volumes_data) ? log.volumes_data.length : 0}</div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">Tabela Utilizada:</span>
                              <Badge>{log.selected_pricing_table_name || "Não especificada"}</Badge>
                            </div>
                            
                            <div className="bg-muted/50 p-3 rounded-md space-y-2">
                              <div className="text-xs font-medium text-muted-foreground">Detalhes da Cotação:</div>
                              <div className="flex justify-between text-sm">
                                <span>Valor Base:</span>
                                <span className="font-mono">R$ {log.base_price.toFixed(2)}</span>
                              </div>
                              {log.additionals_applied && Array.isArray(log.additionals_applied) && log.additionals_applied.length > 0 && (
                                <div className="space-y-1">
                                  <div className="text-xs font-medium text-muted-foreground">Adicionais Aplicados:</div>
                                  {log.additionals_applied.map((additional: any, idx: number) => (
                                    <div key={idx} className="flex justify-between text-sm pl-2">
                                      <span>• {additional.name || additional.type}</span>
                                      <span className="font-mono text-muted-foreground">
                                        {additional.value ? `R$ ${Number(additional.value).toFixed(2)}` : '-'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {log.all_options_analyzed?.all_quotes && Array.isArray(log.all_options_analyzed.all_quotes) && log.all_options_analyzed.all_quotes.length > 0 && (
                              <div className="mt-4 space-y-3">
                                {log.all_options_analyzed.reasoning && (
                                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                    <div className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-1">
                                      Por que a IA escolheu {log.selected_pricing_table_name}?
                                    </div>
                                    <div className="text-xs text-blue-800 dark:text-blue-200">
                                      {log.all_options_analyzed.reasoning}
                                    </div>
                                  </div>
                                )}

                                <div className="text-sm font-semibold">Comparação de Tabelas Analisadas:</div>
                                <div className="space-y-2">
                                  {log.all_options_analyzed.all_quotes.map((quote: any) => {
                                    const isSelected = quote.table_name === log.selected_pricing_table_name;
                                    return (
                                      <div 
                                        key={quote.table_id} 
                                        className={`p-3 rounded-lg border-2 ${
                                          isSelected
                                            ? 'bg-green-50 dark:bg-green-950/20 border-green-600' 
                                            : quote.has_coverage
                                            ? 'bg-muted/30 border-muted'
                                            : 'bg-destructive/5 border-destructive/20'
                                        }`}
                                      >
                                        <div className="flex items-center justify-between mb-2">
                                          <div className="flex items-center gap-2">
                                            <span className="font-semibold">{quote.table_name}</span>
                                            {isSelected && (
                                              <Badge className="text-xs bg-green-600 hover:bg-green-700 text-white">ESCOLHIDA</Badge>
                                            )}
                                          </div>
                                          {quote.has_coverage && (
                                            <div className="text-right">
                                              <div className="font-bold text-lg">R$ {quote.final_price.toFixed(2)}</div>
                                              <div className="text-xs text-muted-foreground">{quote.delivery_days} dias úteis</div>
                                            </div>
                                          )}
                                        </div>
                                        
                                        {quote.has_coverage ? (
                                          <div className="space-y-2">
                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                              <div>
                                                <span className="text-muted-foreground">Valor Base:</span>
                                                <span className="ml-1 font-mono">R$ {quote.base_price.toFixed(2)}</span>
                                              </div>
                                              {quote.excedente_kg > 0 && (
                                                <div>
                                                  <span className="text-muted-foreground">Excedente ({quote.excedente_kg.toFixed(1)}kg):</span>
                                                  <span className="ml-1 font-mono">R$ {quote.valor_excedente.toFixed(2)}</span>
                                                </div>
                                              )}
                                            </div>
                                            {!isSelected && quote.has_coverage && (
                                              <div className="mt-2 pt-2 border-t border-muted text-xs text-muted-foreground italic">
                                                {quote.final_price > log.final_price 
                                                  ? `⚠️ Não escolhida: Preço R$ ${(quote.final_price - log.final_price).toFixed(2)} mais caro que a opção selecionada`
                                                  : quote.delivery_days > log.delivery_days
                                                  ? `⚠️ Não escolhida: Prazo ${quote.delivery_days - log.delivery_days} dia(s) maior que a opção selecionada`
                                                  : '⚠️ Não escolhida: Conforme critérios de priorização configurados'}
                                              </div>
                                            )}
                                          </div>
                                        ) : (
                                          <div className="space-y-1">
                                            <Badge variant="destructive" className="text-xs">NÃO ATENDE</Badge>
                                            <p className="text-xs text-muted-foreground mt-2">
                                              ❌ Transportadora: <span className="font-semibold">{quote.table_name}</span>. Preço: <span className="font-semibold">Sem cobertura para CEP {log.destination_cep}</span>. Prazo: <span className="font-semibold">-</span>.
                                            </p>
                                            <p className="text-xs text-destructive italic mt-1">
                                              Esta transportadora não atende a faixa de CEP do destino ou não possui tabela de preços para o peso informado.
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma cotação processada ainda
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminAgenteIA;
