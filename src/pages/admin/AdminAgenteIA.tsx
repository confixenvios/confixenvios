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

interface Config {
  id: string;
  is_active: boolean;
  priority_mode: string;
  weight_calculation_mode?: string;
  preferred_carriers: string[];
  additional_rules: string | null;
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
      const { error } = await supabase
        .from("ai_quote_config")
        .update(updates)
        .eq("id", config?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-quote-config"] });
      toast.success("Configuração atualizada com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao atualizar configuração");
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
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configuração
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
                  {getPriorityLabel(config?.priority_mode || "balanced")}
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
                    ? 'Utilizar apenas o peso informado pelo usuário'
                    : config?.weight_calculation_mode === 'cubed_weight'
                    ? 'Calcular e usar o peso cubado (comprimento × largura × altura ÷ 6000)'
                    : 'Compara peso informado vs peso cubado e utiliza sempre o maior valor entre os dois'
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

                            {log.all_options_analyzed && typeof log.all_options_analyzed === 'object' && Object.keys(log.all_options_analyzed).length > 0 && (
                              <div className="mt-3">
                                <div className="text-xs font-medium text-muted-foreground mb-2">Todas as opções analisadas pela IA:</div>
                                <div className="space-y-1">
                                  {Object.entries(log.all_options_analyzed).map(([tableName, data]: [string, any]) => (
                                    <div 
                                      key={tableName} 
                                      className={`text-xs p-2 rounded ${
                                        tableName === log.selected_pricing_table_name 
                                          ? 'bg-primary/10 border border-primary/20' 
                                          : 'bg-muted/30'
                                      }`}
                                    >
                                      <div className="flex justify-between">
                                        <span className="font-medium">{tableName}</span>
                                        <span className="font-mono">
                                          R$ {data.price?.toFixed(2) || '0.00'} - {data.days || 0} dias
                                        </span>
                                      </div>
                                    </div>
                                  ))}
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
