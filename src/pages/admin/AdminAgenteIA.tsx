import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Bot, Settings, History, Play, Plus, Trash2, Edit, DollarSign, Weight, Package } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Config {
  id: string;
  is_active: boolean;
  priority_mode: string;
  preferred_carriers: string[];
  additional_rules: string | null;
}

interface Additional {
  id: string;
  name: string;
  type: string;
  calculation_method: string;
  value: number;
  weight_range_min: number | null;
  weight_range_max: number | null;
  is_active: boolean;
}

interface QuoteLog {
  id: string;
  created_at: string;
  origin_cep: string;
  destination_cep: string;
  total_weight: number;
  total_volume: number;
  selected_pricing_table_name: string;
  base_price: number;
  additionals_applied: any[];
  final_price: number;
  delivery_days: number;
  priority_used: string;
}

const AdminAgenteIA = () => {
  const queryClient = useQueryClient();
  const [newAdditional, setNewAdditional] = useState({
    name: "",
    type: "other",
    calculation_method: "percentage",
    value: 0,
    weight_range_min: null as number | null,
    weight_range_max: null as number | null,
  });
  const [editingAdditional, setEditingAdditional] = useState<Additional | null>(null);
  const [simulationData, setSimulationData] = useState({
    origin_cep: "",
    destination_cep: "",
    weight: 0,
    length: 0,
    width: 0,
    height: 0,
  });

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

  // Buscar adicionais
  const { data: additionals = [] } = useQuery({
    queryKey: ["freight-additionals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("freight_additionals")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Additional[];
    },
  });

  // Buscar logs
  const { data: logs = [] } = useQuery({
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

  // Criar adicional
  const createAdditionalMutation = useMutation({
    mutationFn: async (additional: typeof newAdditional) => {
      const { error } = await supabase
        .from("freight_additionals")
        .insert([additional]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["freight-additionals"] });
      toast.success("Adicional criado com sucesso!");
      setNewAdditional({
        name: "",
        type: "other",
        calculation_method: "percentage",
        value: 0,
        weight_range_min: null,
        weight_range_max: null,
      });
    },
    onError: () => {
      toast.error("Erro ao criar adicional");
    },
  });

  // Atualizar adicional
  const updateAdditionalMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Additional> }) => {
      const { error } = await supabase
        .from("freight_additionals")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["freight-additionals"] });
      toast.success("Adicional atualizado com sucesso!");
      setEditingAdditional(null);
    },
    onError: () => {
      toast.error("Erro ao atualizar adicional");
    },
  });

  // Deletar adicional
  const deleteAdditionalMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("freight_additionals")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["freight-additionals"] });
      toast.success("Adicional deletado com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao deletar adicional");
    },
  });

  const getTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      ad_valorem: "Ad Valorem",
      gris: "GRIS",
      insurance: "Seguro",
      weight_fee: "Taxa por Peso",
      other: "Outro",
    };
    return types[type] || type;
  };

  const getPriorityLabel = (mode: string) => {
    const modes: Record<string, string> = {
      lowest_price: "Menor Preço",
      fastest_delivery: "Menor Prazo",
      balanced: "Equilíbrio",
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
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="agent-status">Status:</Label>
            <Badge variant={config?.is_active ? "default" : "destructive"}>
              {config?.is_active ? "ATIVO" : "INATIVO"}
            </Badge>
          </div>
          <Switch
            id="agent-status"
            checked={config?.is_active || false}
            onCheckedChange={(checked) =>
              updateConfigMutation.mutate({ is_active: checked })
            }
          />
        </div>
      </div>

      <Tabs defaultValue="config" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configuração
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Auditoria
          </TabsTrigger>
          <TabsTrigger value="simulation" className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            Simulação
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-6">
          {/* Prioridade de Cotação */}
          <Card>
            <CardHeader>
              <CardTitle>Prioridade de Cotação</CardTitle>
              <CardDescription>
                Defina como o agente deve priorizar as cotações
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={config?.priority_mode || "balanced"}
                onValueChange={(value) =>
                  updateConfigMutation.mutate({ priority_mode: value })
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="lowest_price" id="lowest_price" />
                  <Label htmlFor="lowest_price">Menor Preço</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fastest_delivery" id="fastest_delivery" />
                  <Label htmlFor="fastest_delivery">Menor Prazo</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="balanced" id="balanced" />
                  <Label htmlFor="balanced">Equilíbrio (Preço + Prazo)</Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Regras Adicionais */}
          <Card>
            <CardHeader>
              <CardTitle>Regras Adicionais</CardTitle>
              <CardDescription>
                Instruções específicas para o agente considerar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Ex: Não considerar frete aéreo, priorizar entregas na região sul..."
                value={config?.additional_rules || ""}
                onChange={(e) =>
                  updateConfigMutation.mutate({ additional_rules: e.target.value })
                }
                rows={4}
              />
            </CardContent>
          </Card>

          {/* Generalidades / Adicionais */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Generalidades (Adicionais de Frete)
              </CardTitle>
              <CardDescription>
                Configure os adicionais que serão aplicados automaticamente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Formulário de Novo Adicional */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Novo
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Novo Adicional de Frete</DialogTitle>
                    <DialogDescription>
                      Configure um novo adicional para ser aplicado automaticamente
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Nome</Label>
                      <Input
                        id="name"
                        value={newAdditional.name}
                        onChange={(e) =>
                          setNewAdditional({ ...newAdditional, name: e.target.value })
                        }
                        placeholder="Ex: Ad Valorem Padrão"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="type">Tipo</Label>
                        <Select
                          value={newAdditional.type}
                          onValueChange={(value) =>
                            setNewAdditional({ ...newAdditional, type: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ad_valorem">Ad Valorem</SelectItem>
                            <SelectItem value="gris">GRIS</SelectItem>
                            <SelectItem value="insurance">Seguro</SelectItem>
                            <SelectItem value="weight_fee">Taxa por Peso</SelectItem>
                            <SelectItem value="other">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="calc_method">Método de Cálculo</Label>
                        <Select
                          value={newAdditional.calculation_method}
                          onValueChange={(value) =>
                            setNewAdditional({
                              ...newAdditional,
                              calculation_method: value,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">Percentual (%)</SelectItem>
                            <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="value">
                        Valor ({newAdditional.calculation_method === "percentage" ? "%" : "R$"})
                      </Label>
                      <Input
                        id="value"
                        type="number"
                        step="0.01"
                        value={newAdditional.value}
                        onChange={(e) =>
                          setNewAdditional({
                            ...newAdditional,
                            value: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                    {newAdditional.type === "weight_fee" && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="weight_min">Peso Mínimo (kg)</Label>
                          <Input
                            id="weight_min"
                            type="number"
                            step="0.1"
                            value={newAdditional.weight_range_min || ""}
                            onChange={(e) =>
                              setNewAdditional({
                                ...newAdditional,
                                weight_range_min: parseFloat(e.target.value) || null,
                              })
                            }
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="weight_max">Peso Máximo (kg)</Label>
                          <Input
                            id="weight_max"
                            type="number"
                            step="0.1"
                            value={newAdditional.weight_range_max || ""}
                            onChange={(e) =>
                              setNewAdditional({
                                ...newAdditional,
                                weight_range_max: parseFloat(e.target.value) || null,
                              })
                            }
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={() => createAdditionalMutation.mutate(newAdditional)}
                    >
                      Salvar Adicional
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Lista de Adicionais */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Faixa Peso</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {additionals.map((additional) => (
                    <TableRow key={additional.id}>
                      <TableCell className="font-medium">{additional.name}</TableCell>
                      <TableCell>{getTypeLabel(additional.type)}</TableCell>
                      <TableCell>
                        {additional.calculation_method === "percentage"
                          ? "Percentual"
                          : "Fixo"}
                      </TableCell>
                      <TableCell>
                        {additional.calculation_method === "percentage"
                          ? `${additional.value}%`
                          : `R$ ${additional.value.toFixed(2)}`}
                      </TableCell>
                      <TableCell>
                        {additional.weight_range_min && additional.weight_range_max
                          ? `${additional.weight_range_min} - ${additional.weight_range_max} kg`
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={additional.is_active}
                          onCheckedChange={(checked) =>
                            updateAdditionalMutation.mutate({
                              id: additional.id,
                              updates: { is_active: checked },
                            })
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            deleteAdditionalMutation.mutate(additional.id)
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Cotações Processadas</CardTitle>
              <CardDescription>
                Acompanhe todas as cotações processadas pelo agente IA
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Origem → Destino</TableHead>
                    <TableHead>Peso/Volume</TableHead>
                    <TableHead>Tabela</TableHead>
                    <TableHead>Valor Base</TableHead>
                    <TableHead>Adicionais</TableHead>
                    <TableHead>Valor Final</TableHead>
                    <TableHead>Prazo</TableHead>
                    <TableHead>Prioridade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", {
                          locale: ptBR,
                        })}
                      </TableCell>
                      <TableCell>
                        {log.origin_cep} → {log.destination_cep}
                      </TableCell>
                      <TableCell>
                        {log.total_weight.toFixed(2)} kg / {log.total_volume.toFixed(4)} m³
                      </TableCell>
                      <TableCell className="font-medium">
                        {log.selected_pricing_table_name || "-"}
                      </TableCell>
                      <TableCell>R$ {log.base_price.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {log.additionals_applied.length} aplicados
                        </Badge>
                      </TableCell>
                      <TableCell className="font-bold text-primary">
                        R$ {log.final_price.toFixed(2)}
                      </TableCell>
                      <TableCell>{log.delivery_days} dias</TableCell>
                      <TableCell>
                        <Badge>{getPriorityLabel(log.priority_used)}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="simulation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Simulação Interna
              </CardTitle>
              <CardDescription>
                Teste o agente com dados personalizados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="sim_origin">CEP Origem</Label>
                    <Input
                      id="sim_origin"
                      placeholder="00000-000"
                      value={simulationData.origin_cep}
                      onChange={(e) =>
                        setSimulationData({
                          ...simulationData,
                          origin_cep: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="sim_dest">CEP Destino</Label>
                    <Input
                      id="sim_dest"
                      placeholder="00000-000"
                      value={simulationData.destination_cep}
                      onChange={(e) =>
                        setSimulationData({
                          ...simulationData,
                          destination_cep: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="sim_weight">Peso (kg)</Label>
                    <Input
                      id="sim_weight"
                      type="number"
                      step="0.1"
                      value={simulationData.weight}
                      onChange={(e) =>
                        setSimulationData({
                          ...simulationData,
                          weight: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="sim_length">Comprimento (cm)</Label>
                    <Input
                      id="sim_length"
                      type="number"
                      value={simulationData.length}
                      onChange={(e) =>
                        setSimulationData({
                          ...simulationData,
                          length: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="sim_width">Largura (cm)</Label>
                    <Input
                      id="sim_width"
                      type="number"
                      value={simulationData.width}
                      onChange={(e) =>
                        setSimulationData({
                          ...simulationData,
                          width: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="sim_height">Altura (cm)</Label>
                    <Input
                      id="sim_height"
                      type="number"
                      value={simulationData.height}
                      onChange={(e) =>
                        setSimulationData({
                          ...simulationData,
                          height: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>
                <Button className="w-full" size="lg">
                  <Play className="h-4 w-4 mr-2" />
                  Executar Simulação
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminAgenteIA;