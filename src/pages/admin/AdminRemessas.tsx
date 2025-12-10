import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Package, Eye, Download, Filter, UserPlus, Truck, Calendar as CalendarIcon, MapPin, Clock, FileText, Send, CheckCircle, XCircle, AlertCircle, Receipt, Loader2, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getAdminShipments, type AdminShipment } from '@/services/shipmentsService';
import { SecureIntegrationsService } from '@/services/secureIntegrationsService';
import { cn } from "@/lib/utils";

import { ShipmentOccurrencesModal } from '@/components/admin/ShipmentOccurrencesModal';

interface Shipment {
  id: string;
  tracking_code: string | null;
  client_name: string;
  user_id?: string;
  pricing_table_name?: string;
  sender_address: {
    name: string;
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    cep: string;
    complement?: string;
    reference?: string;
    phone?: string;
  } | null;
  recipient_address: {
    name: string;
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    cep: string;
    complement?: string;
    reference?: string;
    phone?: string;
  } | null;
  weight: number;
  length: number;
  width: number;
  height: number;
  format: string;
  selected_option: string;
  pickup_option: string;
  quote_data: any;
  payment_data: any;
  status: string;
  created_at: string;
  label_pdf_url: string | null;
  cte_key: string | null;
  motoristas?: {
    nome: string;
    telefone: string;
    email: string;
  };
  cte_emission?: {
    id: string;
    chave_cte: string;
    uuid_cte: string;
    serie: string;
    numero_cte: string;
    status: string;
    motivo: string | null;
    modelo: string;
    xml_url: string | null;
    dacte_url: string | null;
    payload_bruto: any;
    created_at: string;
  } | null;
}

interface Motorista {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  status: string;
}

const AdminRemessas = () => {
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [shipments, setShipments] = useState<AdminShipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [selectedShipmentDetails, setSelectedShipmentDetails] = useState<AdminShipment | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [occurrencesModalOpen, setOccurrencesModalOpen] = useState(false);
  const [selectedShipmentOccurrences, setSelectedShipmentOccurrences] = useState<AdminShipment | null>(null);
  const [cteData, setCteData] = useState<any>(null);
  const [webhookStatuses, setWebhookStatuses] = useState<Record<string, 'sent' | 'pending' | 'error'>>({});
  const [sendingWebhook, setSendingWebhook] = useState<Record<string, boolean>>({});
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  
  // Estados para modal de detalhes B2B
  const [b2bDetailsModalOpen, setB2bDetailsModalOpen] = useState(false);
  const [selectedB2BShipment, setSelectedB2BShipment] = useState<AdminShipment | null>(null);
  const [b2bClientData, setB2bClientData] = useState<any>(null);
  const [sendingB2BWhatsapp, setSendingB2BWhatsapp] = useState<Record<string, boolean>>({});
  const [b2bStatusHistory, setB2bStatusHistory] = useState<any[]>([]);

  // Função para enviar dados B2B via WhatsApp webhook
  const handleSendB2BWhatsAppWebhook = async (shipment: AdminShipment) => {
    const trackingCode = shipment.tracking_code || '';
    if (!trackingCode.startsWith('B2B-')) {
      toast({
        title: "Erro",
        description: "Esta remessa não é do tipo B2B Expresso",
        variant: "destructive"
      });
      return;
    }

    setSendingB2BWhatsapp(prev => ({ ...prev, [shipment.id]: true }));

    try {
      console.log('📤 [B2B WhatsApp] Buscando remessa:', trackingCode);
      
      // Buscar dados completos da remessa B2B
      const { data: b2bShipment, error: b2bError } = await supabase
        .from('b2b_shipments')
        .select('*, b2b_clients(*)')
        .eq('tracking_code', trackingCode)
        .maybeSingle();

      console.log('📤 [B2B WhatsApp] Resultado da busca:', { b2bShipment, b2bError });

      if (b2bError) {
        console.error('❌ [B2B WhatsApp] Erro na query:', b2bError);
        throw new Error(`Erro ao buscar remessa: ${b2bError.message}`);
      }
      
      if (!b2bShipment) {
        console.error('❌ [B2B WhatsApp] Remessa não encontrada para:', trackingCode);
        throw new Error('Remessa B2B não encontrada');
      }

      // Parse observations JSON
      let observations: any = {};
      if (b2bShipment.observations) {
        try {
          observations = typeof b2bShipment.observations === 'string' 
            ? JSON.parse(b2bShipment.observations) 
            : b2bShipment.observations;
        } catch (e) {
          console.warn('Erro ao parsear observations:', e);
        }
      }

      const clientData = b2bShipment.b2b_clients as any || {};

      // Endereço de coleta do observations (selecionado pelo cliente no momento do envio)
      const pickupAddress = observations.pickup_address || null;

      // Montar payload completo para o webhook
      const webhookPayload = {
        // Dados da remessa B2B
        b2b_shipment_id: b2bShipment.id,
        tracking_code: b2bShipment.tracking_code,
        status: b2bShipment.status,
        created_at: b2bShipment.created_at,
        delivery_date: b2bShipment.delivery_date,
        volume_count: b2bShipment.volume_count,
        
        // Dados do cliente B2B
        client_id: clientData?.id,
        client_company_name: clientData?.company_name,
        client_cnpj: clientData?.cnpj,
        client_email: clientData?.email,
        client_phone: clientData?.phone,
        
        // Endereço de coleta selecionado para esta remessa
        pickup_address: pickupAddress ? {
          name: pickupAddress.name,
          contact_name: pickupAddress.contact_name,
          contact_phone: pickupAddress.contact_phone,
          cep: pickupAddress.cep,
          street: pickupAddress.street,
          number: pickupAddress.number,
          complement: pickupAddress.complement,
          neighborhood: pickupAddress.neighborhood,
          city: pickupAddress.city,
          state: pickupAddress.state,
          reference: pickupAddress.reference
        } : {
          // Fallback para endereço padrão do cliente (dados legados)
          cep: clientData?.default_pickup_cep,
          street: clientData?.default_pickup_street,
          number: clientData?.default_pickup_number,
          complement: clientData?.default_pickup_complement,
          neighborhood: clientData?.default_pickup_neighborhood,
          city: clientData?.default_pickup_city,
          state: clientData?.default_pickup_state
        },
        
        // Dados do formulário (observations)
        vehicle_type: observations.vehicle_type,
        total_weight: observations.total_weight,
        volume_weights: observations.volume_weights,
        amount_paid: observations.amount_paid,
        payment_id: observations.payment_id,
        external_id: observations.external_id,
        paid_at: observations.paid_at,
        
        // Endereços de entrega individuais por volume
        volume_addresses: observations.volume_addresses || [],
        
        // Timestamp do envio
        webhook_sent_at: new Date().toISOString()
      };

      console.log('📤 [B2B WhatsApp] Enviando webhook para:', 'https://n8n.grupoconfix.com/webhook-test/disparo-wpp');
      console.log('📤 [B2B WhatsApp] Payload:', webhookPayload);

      const response = await fetch('https://n8n.grupoconfix.com/webhook-test/disparo-wpp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(webhookPayload)
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      console.log('✅ [B2B WhatsApp] Webhook enviado com sucesso');

      toast({
        title: "WhatsApp enviado",
        description: `Dados da remessa ${trackingCode} enviados para processamento`,
      });

    } catch (error) {
      console.error('❌ [B2B WhatsApp] Erro ao enviar webhook:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar dados para WhatsApp",
        variant: "destructive"
      });
    } finally {
      setSendingB2BWhatsapp(prev => ({ ...prev, [shipment.id]: false }));
    }
  };

  // Função para verificar status dos webhooks das remessas
  const checkWebhookStatuses = async (remessas: AdminShipment[]) => {
    try {
      const statuses: Record<string, 'sent' | 'pending' | 'error'> = {};
      
      for (const remessa of remessas) {
        // Só verificar webhook para remessas que foram criadas/pagas (que deveriam ter webhook)
        const shouldHaveWebhook = ['PAID', 'PAYMENT_CONFIRMED', 'LABEL_GENERATED', 'PAGO_AGUARDANDO_ETIQUETA'].includes(remessa.status);
        
        if (!shouldHaveWebhook) {
          statuses[remessa.id] = 'sent'; // Não precisa webhook ainda
          continue;
        }

        const { data: logs, error } = await supabase
          .from('webhook_logs')
          .select('event_type, response_status, created_at')
          .eq('shipment_id', remessa.id)
          .in('event_type', [
            'shipment_created_webhook_triggered', 
            'edge_function_called_success',
            'edge_function_called_success_with_pricing_table',
            'shipment_webhook_dispatched',
            'manual_webhook_dispatch_complete_data'
          ])
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) {
          console.warn(`⚠️ [ADMIN REMESSAS] Erro ao consultar webhook logs para remessa ${remessa.id}:`, error);
          statuses[remessa.id] = 'error';
          continue;
        }

        if (logs && logs.length > 0) {
          const log = logs[0];
          if (log.response_status === 200 || log.response_status === 202) {
            statuses[remessa.id] = 'sent';
          } else {
            statuses[remessa.id] = 'error';
          }
        } else {
          statuses[remessa.id] = 'pending';
        }
      }
      
      setWebhookStatuses(statuses);
    } catch (error) {
      console.error('❌ [ADMIN REMESSAS] Erro ao verificar status dos webhooks:', error);
    }
  };

  const loadShipments = async () => {
    if (authLoading || !user || !isAdmin) {
      console.log('🚫 [ADMIN REMESSAS] Carregamento bloqueado - Auth loading, usuário não autenticado ou não é admin');
      setLoading(false);
      return;
    }

    try {
      console.log('🔄 [ADMIN REMESSAS] Carregando remessas...');
      const adminShipments = await getAdminShipments();
      console.log(`✅ [ADMIN REMESSAS] ${adminShipments.length} remessas carregadas`);
      
      // Buscar CT-es para cada remessa (aprovado ou reprovado)
      const shipmentsWithCte = await Promise.all(
        adminShipments.map(async (shipment) => {
          const { data: cteData, error: cteError } = await supabase
            .from('cte_emissoes')
            .select('*')
            .eq('shipment_id', shipment.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          return {
            ...shipment,
            cte_emission: cteData
          };
        })
      );
      
      setShipments(shipmentsWithCte);
      
      // Verificar status dos webhooks para cada remessa
      await checkWebhookStatuses(shipmentsWithCte);
    } catch (error) {
      console.error('❌ [ADMIN REMESSAS] Erro ao carregar remessas:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar remessas. Tentando novamente...",
        variant: "destructive"
      });
      
      // Tentar novamente após 2 segundos
      setTimeout(() => {
        if (!authLoading && user && isAdmin) {
          loadShipments();
        }
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

  // Verificar autenticação e permissões diretamente
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          console.log('❌ [ADMIN REMESSAS] Usuário não autenticado');
          setAuthLoading(false);
          return;
        }

        setUser(session.user);

        // Verificar se é admin
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id);

        if (roleError) {
          console.error('❌ [ADMIN REMESSAS] Erro ao verificar role:', roleError);
          setAuthLoading(false);
          return;
        }

        const hasAdminRole = roleData?.some(r => r.role === 'admin') || false;
        setIsAdmin(hasAdminRole);
        
        console.log(`✅ [ADMIN REMESSAS] Usuário autenticado. Admin: ${hasAdminRole}`);
        
        if (!hasAdminRole) {
          toast({
            title: "Acesso Negado",
            description: "Você não tem permissão para acessar esta página",
            variant: "destructive"
          });
        }
        
        setAuthLoading(false);
      } catch (error) {
        console.error('❌ [ADMIN REMESSAS] Erro na verificação de auth:', error);
        setAuthLoading(false);
      }
    };

    checkAuth();
  }, []);

  useEffect(() => {
    if (!authLoading && user && isAdmin) {
      loadShipments();
      // Auto-dispatch any pending webhooks when page loads
      autoDispatchPendingWebhooks();
    }
  }, [authLoading, user, isAdmin]);

  // Auto-dispatch function to process pending webhooks
  const autoDispatchPendingWebhooks = async () => {
    try {
      console.log('🔄 [AUTO-DISPATCH] Checking for pending webhooks...');
      
      const { data, error } = await supabase.functions.invoke('auto-webhook-dispatcher', {
        body: {}
      });

      if (error) {
        console.error('❌ [AUTO-DISPATCH] Error:', error);
        return;
      }

      if (data?.processed > 0) {
        console.log(`✅ [AUTO-DISPATCH] Processed ${data.processed} webhooks (${data.successful} successful, ${data.errors} errors)`);
        
        if (data.successful > 0) {
          toast({
            title: "Webhooks Processados",
            description: `${data.successful} webhooks enviados automaticamente`,
          });
          
          // Reload shipments to update webhook status
          setTimeout(loadShipments, 2000);
        }
      } else {
        console.log('ℹ️ [AUTO-DISPATCH] No pending webhooks to process');
      }
    } catch (error) {
      console.error('❌ [AUTO-DISPATCH] Unexpected error:', error);
    }
  };

  // Adicionar auto-refresh a cada 30 segundos
  useEffect(() => {
    if (!authLoading && !user || !isAdmin) return;
    
    const interval = setInterval(() => {
      loadShipments();
    }, 30000);

    return () => clearInterval(interval);
  }, [authLoading, user, isAdmin]);

  // Função para enviar webhook manualmente - envia TODOS os dados da remessa
  const handleSendWebhook = async (shipment: AdminShipment) => {
    setSendingWebhook(prev => ({ ...prev, [shipment.id]: true }));
    
    try {
      console.log('🔄 [WEBHOOK MANUAL] Enviando webhook para remessa:', shipment.tracking_code);
      
      // Buscar dados da tabela de preços se existir o nome da tabela
      let pricingTableData = null;
      if (shipment.pricing_table_name) {
        const { data, error } = await supabase
          .from('pricing_tables')
          .select('*')
          .eq('name', shipment.pricing_table_name)
          .single();
        
        if (!error && data) {
          pricingTableData = data;
        }
      }

      // Preparar todos os dados da remessa para envio
      const webhookData: Record<string, string> = {
        // Dados básicos
        shipment_id: shipment.id || '',
        tracking_code: shipment.tracking_code || '',
        status: shipment.status || '',
        created_at: shipment.created_at || '',
        
        // Dimensões e peso
        weight: String(shipment.weight || 0),
        length: String(shipment.length || 0),
        width: String(shipment.width || 0),
        height: String(shipment.height || 0),
        format: shipment.format || '',
        
        // Opções de envio
        selected_option: shipment.selected_option || '',
        pickup_option: shipment.pickup_option || '',
        document_type: shipment.document_type || '',
        pricing_table_name: shipment.pricing_table_name || '',
        pricing_table_id: shipment.pricing_table_id || '',
        
        // Transportadora selecionada (magalog ou jadlog)
        selected_carrier: (() => {
          // Primeiro, verificar se há selectedCarrier salvo diretamente (remessas novas)
          const directCarrier = (shipment.quote_data as any)?.deliveryDetails?.selectedCarrier;
          if (directCarrier && (directCarrier === 'jadlog' || directCarrier === 'magalog')) {
            return directCarrier;
          }
          
          // Fallback para remessas antigas: usar o PREÇO PAGO como indicador confiável
          const quoteInfo = (shipment.quote_data as any)?.quoteData?.shippingQuote;
          if (!quoteInfo) return '';
          const jadlog = quoteInfo.jadlog;
          const magalog = quoteInfo.magalog;
          if (!jadlog || !magalog) {
            // Se só uma transportadora disponível
            if (jadlog && !magalog) return 'jadlog';
            if (magalog && !jadlog) return 'magalog';
            return '';
          }
          
          // Usar o preço pago como indicador confiável (mais preciso que selected_option para remessas antigas)
          const paidAmount = (shipment.payment_data as any)?.amount || 
                            (shipment.quote_data as any)?.deliveryDetails?.totalPrice ||
                            (shipment.quote_data as any)?.deliveryDetails?.shippingPrice;
          
          if (paidAmount) {
            const jadlogPrice = jadlog.preco_total;
            const magalogPrice = magalog.preco_total;
            
            // Comparar com tolerância de 0.01 para evitar problemas de arredondamento
            if (Math.abs(paidAmount - jadlogPrice) < 0.01) {
              return 'jadlog';
            }
            if (Math.abs(paidAmount - magalogPrice) < 0.01) {
              return 'magalog';
            }
          }
          
          // Último fallback: usar prazo de entrega salvo
          const savedDays = (shipment.quote_data as any)?.deliveryDetails?.deliveryDays;
          if (savedDays) {
            if (savedDays === jadlog.prazo) return 'jadlog';
            if (savedDays === magalog.prazo) return 'magalog';
          }
          
          return '';
        })(),
        
        // CTE
        cte_key: shipment.cte_key || '',
        label_pdf_url: shipment.label_pdf_url || '',
        
        // Remetente
        sender_name: shipment.sender_address?.name || '',
        sender_street: shipment.sender_address?.street || '',
        sender_number: shipment.sender_address?.number || '',
        sender_complement: shipment.sender_address?.complement || '',
        sender_neighborhood: shipment.sender_address?.neighborhood || '',
        sender_city: shipment.sender_address?.city || '',
        sender_state: shipment.sender_address?.state || '',
        sender_cep: shipment.sender_address?.cep || '',
        sender_phone: shipment.sender_address?.phone || '',
        sender_document: (shipment.quote_data as any)?.addressData?.sender?.document || '',
        sender_email: (shipment.quote_data as any)?.addressData?.sender?.email || '',
        sender_inscricao_estadual: (shipment.quote_data as any)?.addressData?.sender?.inscricaoEstadual || '',
        
        // Destinatário
        recipient_name: shipment.recipient_address?.name || '',
        recipient_street: shipment.recipient_address?.street || '',
        recipient_number: shipment.recipient_address?.number || '',
        recipient_complement: shipment.recipient_address?.complement || '',
        recipient_neighborhood: shipment.recipient_address?.neighborhood || '',
        recipient_city: shipment.recipient_address?.city || '',
        recipient_state: shipment.recipient_address?.state || '',
        recipient_cep: shipment.recipient_address?.cep || '',
        recipient_phone: shipment.recipient_address?.phone || '',
        recipient_document: (shipment.quote_data as any)?.addressData?.recipient?.document || '',
        recipient_email: (shipment.quote_data as any)?.addressData?.recipient?.email || '',
        recipient_inscricao_estadual: (shipment.quote_data as any)?.addressData?.recipient?.inscricaoEstadual || '',
        
        // Motorista
        motorista_nome: shipment.motoristas?.nome || '',
        motorista_telefone: shipment.motoristas?.telefone || '',
        motorista_email: shipment.motoristas?.email || '',
        
        // Descrição do conteúdo (declaração de conteúdo)
        content_description: (shipment.quote_data as any)?.fiscalData?.contentDescription || 
                            (shipment.quote_data as any)?.documentData?.merchandiseDescription ||
                            (shipment.quote_data as any)?.descricaoMercadoria ||
                            (shipment.quote_data as any)?.merchandiseDescription || '',
        
        // Dados de cotação e pagamento como JSON
        quote_data: shipment.quote_data ? JSON.stringify(shipment.quote_data) : '',
        payment_data: shipment.payment_data ? JSON.stringify(shipment.payment_data) : '',
        pricing_table_data: pricingTableData ? JSON.stringify(pricingTableData) : '',
        
        // CTE emission se existir
        cte_uuid: shipment.cte_emission?.uuid_cte || '',
        cte_chave: shipment.cte_emission?.chave_cte || '',
        cte_numero: shipment.cte_emission?.numero_cte || '',
        cte_serie: shipment.cte_emission?.serie || '',
        cte_status: shipment.cte_emission?.status || '',
        cte_xml_url: shipment.cte_emission?.xml_url || '',
        cte_dacte_url: shipment.cte_emission?.dacte_url || '',
        
        // Peso total e valor total
        peso_total: String((shipment.quote_data as any)?.quoteData?.totalWeight || 
                          (shipment.quote_data as any)?.technicalData?.totalWeight || 
                          shipment.weight || 0),
        valor_total: String((shipment.quote_data as any)?.deliveryDetails?.totalPrice || 
                           (shipment.quote_data as any)?.quoteData?.shippingQuote?.economicPrice ||
                           (shipment.payment_data as any)?.amount || 0),
        valor_mercadoria: String((shipment.quote_data as any)?.quoteData?.totalMerchandiseValue || 
                                 (shipment.quote_data as any)?.originalFormData?.totalMerchandiseValue || 0),
        prazo: String((shipment.quote_data as any)?.deliveryDetails?.deliveryDays || 
                     (shipment.quote_data as any)?.quoteData?.shippingQuote?.economicDays ||
                     (shipment.quote_data as any)?.quoteData?.shippingQuote?.expressDays || 0),
        
        // peso_real = valor EXATO digitado pelo usuário no campo "Peso (kg)" do formulário
        // peso_cubado = valor EXATO retornado pela API da transportadora selecionada
        ...(() => {
          const quoteInfo = (shipment.quote_data as any)?.quoteData?.shippingQuote;
          // Priorizar merchandiseDetails.volumes que tem os dados completos
          const volumes = (shipment.quote_data as any)?.merchandiseDetails?.volumes || 
                         (shipment.quote_data as any)?.technicalData?.volumes || 
                         (shipment.quote_data as any)?.originalFormData?.volumes ||
                         (shipment.quote_data as any)?.quoteData?.volumes || [];
          
          // peso_real = soma dos pesos digitados pelo usuário nos volumes
          let userInputWeight = 0;
          if (volumes.length > 0) {
            // Suporte para nomes em português (peso) e inglês (weight)
            userInputWeight = volumes.reduce((sum: number, vol: any) => sum + (Number(vol.weight) || Number(vol.peso) || 0), 0);
          } else {
            // Fallback: usar o peso do shipment (que pode ser o peso do formulário)
            userInputWeight = Number(shipment.weight) || 0;
          }
          
          // Determinar transportadora selecionada para obter peso_cubado
          let selectedCarrier = '';
          const directCarrier = (shipment.quote_data as any)?.deliveryDetails?.selectedCarrier;
          if (directCarrier && (directCarrier === 'jadlog' || directCarrier === 'magalog')) {
            selectedCarrier = directCarrier;
          } else if (quoteInfo) {
            const jadlog = quoteInfo.jadlog;
            const magalog = quoteInfo.magalog;
            
            if (jadlog && !magalog) {
              selectedCarrier = 'jadlog';
            } else if (magalog && !jadlog) {
              selectedCarrier = 'magalog';
            } else if (jadlog && magalog) {
              const paidAmount = (shipment.payment_data as any)?.amount || 
                                (shipment.quote_data as any)?.deliveryDetails?.totalPrice ||
                                (shipment.quote_data as any)?.deliveryDetails?.shippingPrice;
              
              if (paidAmount) {
                const jadlogPrice = jadlog.preco_total;
                const magalogPrice = magalog.preco_total;
                
                if (Math.abs(paidAmount - jadlogPrice) < 0.01) {
                  selectedCarrier = 'jadlog';
                } else if (Math.abs(paidAmount - magalogPrice) < 0.01) {
                  selectedCarrier = 'magalog';
                }
              }
              
              if (!selectedCarrier) {
                const savedDays = (shipment.quote_data as any)?.deliveryDetails?.deliveryDays;
                if (savedDays) {
                  if (savedDays === jadlog.prazo) selectedCarrier = 'jadlog';
                  else if (savedDays === magalog.prazo) selectedCarrier = 'magalog';
                }
              }
            }
          }
          
          // Obter peso_cubado EXATO da transportadora selecionada
          let carrierPesoCubado = 0;
          if (selectedCarrier === 'jadlog' && quoteInfo?.jadlog) {
            carrierPesoCubado = quoteInfo.jadlog.peso_cubado;
          } else if (selectedCarrier === 'magalog' && quoteInfo?.magalog) {
            carrierPesoCubado = quoteInfo.magalog.peso_cubado;
          } else {
            carrierPesoCubado = quoteInfo?.jadlog?.peso_cubado || quoteInfo?.magalog?.peso_cubado || 0;
          }
          
          console.log(`📊 [WEBHOOK] peso_real (digitado pelo usuário): ${userInputWeight}, peso_cubado (da transportadora ${selectedCarrier || 'fallback'}): ${carrierPesoCubado}`);
          
          return {
            peso_real: String(userInputWeight),
            peso_cubado: String(carrierPesoCubado)
          };
        })(),
        
        // Volumes individuais mapeados
        ...(() => {
          // Priorizar merchandiseDetails.volumes que tem os nomes em inglês
          const volumes = (shipment.quote_data as any)?.merchandiseDetails?.volumes || 
                         (shipment.quote_data as any)?.technicalData?.volumes || 
                         (shipment.quote_data as any)?.originalFormData?.volumes ||
                         (shipment.quote_data as any)?.quoteData?.volumes || [];
          const volumeParams: Record<string, string> = {};
          volumeParams['total_volumes'] = String(volumes.length);
          
          volumes.forEach((vol: any, index: number) => {
            const num = index + 1;
            // Suporte para nomes em português (quoteData.volumes) e inglês (merchandiseDetails/technicalData)
            volumeParams[`volume${num}_peso`] = String(vol.weight || vol.peso || 0);
            volumeParams[`volume${num}_comprimento`] = String(vol.length || vol.comprimento || 0);
            volumeParams[`volume${num}_largura`] = String(vol.width || vol.largura || 0);
            volumeParams[`volume${num}_altura`] = String(vol.height || vol.altura || 0);
            volumeParams[`volume${num}_tipo`] = vol.merchandiseType || vol.tipoMercadoria || 'normal';
          });
          
          return volumeParams;
        })()
      };

      const webhookUrl = `https://n8n.grupoconfix.com/webhook-test/f5d4f949-29fd-4200-b7a1-b9a140e8c16c`;
      
      console.log('📤 [WEBHOOK MANUAL] Enviando para URL via POST:', webhookUrl);
      console.log('📤 [WEBHOOK MANUAL] Payload:', Object.keys(webhookData).length, 'campos');
      
      // Enviar via POST
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(webhookData)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.log('✅ [WEBHOOK MANUAL] Webhook enviado com sucesso');
      
      // Atualizar status do webhook
      setWebhookStatuses(prev => ({ 
        ...prev, 
        [shipment.id]: 'sent' 
      }));

      toast({
        title: "Webhook Enviado",
        description: `Webhook enviado com sucesso para ${shipment.tracking_code}`,
        variant: "default"
      });

    } catch (error: any) {
      console.error('❌ [WEBHOOK MANUAL] Erro ao enviar webhook:', error);
      
      setWebhookStatuses(prev => ({ 
        ...prev, 
        [shipment.id]: 'error' 
      }));

      toast({
        title: "Erro ao Enviar Webhook",
        description: `Erro ao enviar webhook para ${shipment.tracking_code}: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setSendingWebhook(prev => ({ ...prev, [shipment.id]: false }));
    }
  };

  // Função para obter badge do status do webhook
  const getWebhookStatusBadge = (shipment: AdminShipment) => {
    const status = webhookStatuses[shipment.id];
    const shouldHaveWebhook = ['PAID', 'PAYMENT_CONFIRMED', 'LABEL_GENERATED', 'PAGO_AGUARDANDO_ETIQUETA'].includes(shipment.status);
    
    // Se a remessa não deveria ter webhook ainda, não mostrar badge
    if (!shouldHaveWebhook) {
      return null;
    }
    
    switch (status) {
      case 'sent':
        return (
          <Badge variant="default" className="bg-green-100 text-green-700 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Webhook Enviado
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            Erro no Webhook
          </Badge>
        );
      case 'pending':
      default:
        return (
          <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-orange-200">
            <AlertCircle className="w-3 h-3 mr-1" />
            Webhook Pendente
          </Badge>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'PENDING_LABEL': { label: 'Pendente', variant: 'secondary' as const },
      'PENDING_DOCUMENT': { label: 'Aguardando Documento', variant: 'destructive' as const },
      'PENDING_PAYMENT': { label: 'Aguardando Pagamento', variant: 'destructive' as const },
      'PAYMENT_CONFIRMED': { label: 'Pagamento Confirmado', variant: 'default' as const },
      'PAID': { label: 'Pago', variant: 'default' as const },
      'PENDENTE': { label: 'Pendente', variant: 'secondary' as const },
      'PAGO_AGUARDANDO_ETIQUETA': { label: 'Aguardando Etiqueta', variant: 'secondary' as const },
      'COLETA_ACEITA': { label: 'Coleta Aceita', variant: 'default' as const },
      'ACEITA': { label: 'Aceita', variant: 'default' as const },
      'COLETA_FINALIZADA': { label: 'Coleta Finalizada', variant: 'default' as const },
      'LABEL_AVAILABLE': { label: 'Etiqueta Disponível', variant: 'default' as const },
      'IN_TRANSIT': { label: 'Em Trânsito', variant: 'default' as const },
      'ENTREGA_FINALIZADA': { label: 'Entrega Finalizada', variant: 'success' as const },
      'ENTREGUE': { label: 'Entregue', variant: 'success' as const },
      'DELIVERED': { label: 'Entregue', variant: 'default' as const }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { label: status, variant: 'outline' as const };
    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    );
  };

  // Função para parsear observations de remessas B2B
  const parseB2BObservations = (observations: string | null) => {
    if (!observations) return null;
    try {
      return JSON.parse(observations);
    } catch {
      return null;
    }
  };

  // Handler para ver detalhes de remessa B2B express
  const handleViewB2BShipment = async (shipment: AdminShipment) => {
    setSelectedB2BShipment(shipment);
    setB2bDetailsModalOpen(true);
    setB2bStatusHistory([]);
    setB2bClientData(null);
    
    // Buscar dados do cliente B2B se houver tracking_code com prefixo B2B
    if (shipment.tracking_code?.startsWith('B2B-')) {
      try {
        const { data: b2bShipmentData } = await supabase
          .from('b2b_shipments')
          .select(`
            *,
            b2b_clients (*)
          `)
          .eq('tracking_code', shipment.tracking_code)
          .single();
        
        if (b2bShipmentData?.b2b_clients) {
          setB2bClientData(b2bShipmentData.b2b_clients);
        }
      } catch (error) {
        console.log('Erro ao buscar dados B2B:', error);
        setB2bClientData(null);
      }
    }

    // Buscar histórico de status com dados do motorista
    try {
      const { data: historyData, error: historyError } = await supabase
        .from('shipment_status_history')
        .select(`
          id,
          status,
          status_description,
          observacoes,
          created_at,
          motorista_id,
          motoristas (
            nome,
            telefone
          )
        `)
        .eq('shipment_id', shipment.id)
        .order('created_at', { ascending: true });
      
      if (!historyError && historyData) {
        setB2bStatusHistory(historyData);
      }
    } catch (error) {
      console.log('Erro ao buscar histórico de status:', error);
    }
  };

  const handleViewShipment = async (shipment: AdminShipment) => {
    const isB2BExpresso = shipment.tracking_code?.startsWith('B2B-') || shipment.client_name.includes('(Expresso)');
    
    // Se for B2B Expresso, abrir modal específico
    if (isB2BExpresso) {
      handleViewB2BShipment(shipment);
      return;
    }
    
    console.log('🔍 [ADMIN REMESSAS] Abrindo detalhes da remessa:', {
      id: shipment.id,
      tracking_code: shipment.tracking_code,
      pricing_table_name: shipment.pricing_table_name,
      pricing_table_id: shipment.pricing_table_id,
      full_shipment: shipment
    });
    
    // Debug específico para remessa ID2025Y077F3
    if (shipment.tracking_code === 'ID2025Y077F3') {
      console.log('🐛 [DEBUG AdminRemessas] ID2025Y077F3 document_type:', shipment.document_type);
    }
    
    // Se não tem pricing_table_name, buscar a tabela padrão
    let finalShipment = { ...shipment };
    if (!shipment.pricing_table_name) {
      try {
        const { data: defaultTable } = await supabase
          .from('pricing_tables')
          .select('name')
          .eq('is_active', true)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();
        
        if (defaultTable) {
          finalShipment.pricing_table_name = defaultTable.name;
          console.log('📋 [ADMIN REMESSAS] Tabela padrão encontrada:', defaultTable.name);
        }
      } catch (error) {
        console.error('❌ Erro ao buscar tabela padrão:', error);
      }
    }
    
    setSelectedShipmentDetails(finalShipment);
    setDetailsModalOpen(true);
    
    // Buscar dados do CTE se existir
    if (shipment.id) {
      console.log('Buscando CTE para shipment:', shipment.id);
      try {
        const { data: cte, error } = await supabase
          .from('cte_emissoes')
          .select('*')
          .eq('shipment_id', shipment.id)
          .single();
        
        if (error) {
          console.log('Erro ao buscar CTE:', error);
          setCteData(null);
        } else {
          console.log('CTE encontrado:', cte);
          setCteData(cte);
        }
      } catch (error) {
        console.log('Nenhum CTE encontrado para esta remessa');
        setCteData(null);
      }
    }
  };

  const handleViewOccurrences = (shipment: AdminShipment) => {
    setSelectedShipmentOccurrences(shipment);
    setOccurrencesModalOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount / 100);
  };

  const getQuoteValue = (shipment: AdminShipment) => {
    const paymentData = shipment.payment_data as any;
    const quoteData = shipment.quote_data as any;
    
    // 1. Tentar payment_data.pix_details.amount (PIX)
    if (paymentData?.pix_details?.amount) {
      return paymentData.pix_details.amount;
    }
    
    // 2. Tentar payment_data.amount (PIX novo formato - em reais)
    if (paymentData?.amount && paymentData?.method === 'pix') {
      return paymentData.amount;
    }
    
    // 3. Tentar payment_data.amount (Stripe/Cartão - em centavos)
    if (paymentData?.amount) {
      return paymentData.amount / 100;
    }
    
    // 4. Tentar quote_data.amount
    if (quoteData?.amount) {
      return quoteData.amount;
    }
    
    // 5. Tentar quote_data.deliveryDetails.totalPrice
    if (quoteData?.deliveryDetails?.totalPrice) {
      return quoteData.deliveryDetails.totalPrice;
    }
    
    // 6. Tentar quote_data.shippingQuote baseado na opção selecionada
    if (quoteData?.shippingQuote) {
      const price = shipment.selected_option === 'express' 
        ? quoteData.shippingQuote.expressPrice 
        : quoteData.shippingQuote.economicPrice;
      if (price) return price;
    }
    
    // 7. Tentar quote_data.quoteData.shippingQuote baseado na opção selecionada
    if (quoteData?.quoteData?.shippingQuote) {
      const price = shipment.selected_option === 'express' 
        ? quoteData.quoteData.shippingQuote.expressPrice 
        : quoteData.quoteData.shippingQuote.economicPrice;
      if (price) return price;
    }
    
    return 0;
  };

  const filteredShipments = shipments.filter(shipment => {
    const matchesSearch = (shipment.tracking_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          shipment.client_name.toLowerCase().includes(searchTerm.toLowerCase())) ?? false;
    const matchesStatus = statusFilter === "all" || shipment.status === statusFilter;
    
    // Filtro por período
    let matchesPeriod = true;
    if (dateFrom || dateTo) {
      const shipmentDate = new Date(shipment.created_at);
      const fromDate = dateFrom ? new Date(dateFrom.getFullYear(), dateFrom.getMonth(), dateFrom.getDate()) : null;
      const toDate = dateTo ? new Date(dateTo.getFullYear(), dateTo.getMonth(), dateTo.getDate(), 23, 59, 59) : null;
      
      if (fromDate && shipmentDate < fromDate) {
        matchesPeriod = false;
      }
      if (toDate && shipmentDate > toDate) {
        matchesPeriod = false;
      }
    }
    
    return matchesSearch && matchesStatus && matchesPeriod;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gerenciar Remessas</h1>
          <p className="text-muted-foreground">
            Visualize e gerencie todas as remessas do sistema
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-primary">
            {filteredShipments.length} remessas
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filtros</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Código ou cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="PENDING_LABEL">Aguardando Etiqueta</SelectItem>
                  <SelectItem value="PENDING_DOCUMENT">Aguardando Documento</SelectItem>
                  <SelectItem value="PAID">Pago</SelectItem>
                  <SelectItem value="COLETA_ACEITA">Coleta Aceita</SelectItem>
                  <SelectItem value="COLETA_FINALIZADA">Coleta Finalizada</SelectItem>
                  <SelectItem value="IN_TRANSIT">Em Trânsito</SelectItem>
                  <SelectItem value="ENTREGA_FINALIZADA">Entrega Finalizada</SelectItem>
                  <SelectItem value="DELIVERED">Entregue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Data Inicial</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Selecionar data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    disabled={(date) => date > new Date() || (dateTo && date > dateTo)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Data Final</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "dd/MM/yyyy") : "Selecionar data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    disabled={(date) => date > new Date() || (dateFrom && date < dateFrom)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setDateFrom(undefined);
                  setDateTo(undefined);
                }}
                className="w-full"
              >
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shipments Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5" />
            <span>Lista de Remessas</span>
          </CardTitle>
          <CardDescription>
            Todas as remessas registradas no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Carregando remessas...</p>
            </div>
          ) : filteredShipments.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Nenhuma remessa encontrada</p>
              <p className="text-sm text-muted-foreground">Tente ajustar os filtros</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredShipments.map((shipment) => {
                const isB2BExpresso = shipment.tracking_code?.startsWith('B2B-') || shipment.client_name.includes('(Expresso)');
                
                return (
                  <Card key={shipment.id} className={cn(
                    "border-border/50 hover:shadow-lg transition-all duration-300",
                    isB2BExpresso ? "hover:border-orange-500/20 bg-orange-50/30" : "hover:border-primary/20"
                  )}>
                    <CardContent className="p-0">
                      {/* Header com código e ações */}
                      <div className="flex items-center justify-between p-4 pb-2 border-b border-border/30">
                        <div className="flex items-center space-x-3">
                          <div className={cn(
                            "p-2 rounded-lg",
                            isB2BExpresso ? "bg-orange-500/10" : "bg-primary/10"
                          )}>
                            <Package className={cn(
                              "h-4 w-4",
                              isB2BExpresso ? "text-orange-500" : "text-primary"
                            )} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-base">
                                {shipment.tracking_code || `ID${shipment.id.slice(0, 8).toUpperCase()}`}
                              </h3>
                              {/* Badge B2B-1 ou B2B-2 */}
                              {isB2BExpresso && (
                                <Badge 
                                  variant="outline" 
                                  className={
                                    shipment.status === 'B2B_COLETA_FINALIZADA' || shipment.status === 'ENTREGUE'
                                      ? "bg-purple-100 text-purple-700 border-purple-300"
                                      : "bg-blue-100 text-blue-700 border-blue-300"
                                  }
                                >
                                  {shipment.status === 'B2B_COLETA_FINALIZADA' || shipment.status === 'ENTREGUE' 
                                    ? "B2B-2" 
                                    : "B2B-1"}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center text-xs text-muted-foreground mt-1">
                              <CalendarIcon className="w-3 h-3 mr-1" />
                              {format(new Date(shipment.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {/* Badge de status para B2B - mostra Entrega Finalizada verde quando ENTREGUE */}
                          {isB2BExpresso ? (
                            shipment.status === 'ENTREGUE' ? (
                              <Badge variant="success">Entrega Finalizada</Badge>
                            ) : (
                              <Badge className="bg-red-500 text-white hover:bg-red-600">Pagamento Confirmado</Badge>
                            )
                          ) : (
                            getStatusBadge(shipment.status)
                          )}
                          {/* Badge de CT-e Disponível */}
                          {shipment.cte_emission && shipment.cte_emission.status === 'aprovado' && (
                            <Badge variant="success" className="flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              CT-e Disponível
                            </Badge>
                          )}
                          {/* Badge de CT-e Reprovado */}
                          {shipment.cte_emission && shipment.cte_emission.status === 'reprovado' && (
                            <Badge variant="destructive" className="flex items-center gap-1">
                              <XCircle className="w-3 h-3" />
                              CT-e Reprovado
                            </Badge>
                          )}
                          {isB2BExpresso ? (
                            <div className="flex space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewShipment(shipment)}
                                className="h-8 w-8 p-0 hover:bg-orange-100"
                                title="Ver detalhes"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleViewOccurrences(shipment)}
                                className="h-8 w-8 p-0 hover:bg-orange-100"
                                title="Ver ocorrências do motorista"
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSendB2BWhatsAppWebhook(shipment)}
                                disabled={sendingB2BWhatsapp[shipment.id]}
                                className="h-8 w-8 p-0 text-green-600 hover:bg-green-100"
                                title="Enviar para WhatsApp"
                              >
                                {sendingB2BWhatsapp[shipment.id] ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <MessageCircle className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          ) : (
                            <div className="flex space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewShipment(shipment)}
                                className="h-8 w-8 p-0 hover:bg-primary/10"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleViewOccurrences(shipment)}
                                className="h-8 w-8 p-0 hover:bg-primary/10"
                                title="Ver ocorrências do motorista"
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                              {/* Botões XML e DACTE - apenas se CT-e foi emitido e aprovado */}
                              {shipment.cte_emission && shipment.cte_emission.status === 'aprovado' && (
                                <>
                                  {shipment.cte_emission.xml_url && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        window.open(shipment.cte_emission!.xml_url, '_blank');
                                      }}
                                      className="h-8 w-8 p-0 hover:bg-primary/10"
                                      title="Visualizar XML do CT-e"
                                    >
                                      <FileText className="h-4 w-4 text-blue-600" />
                                    </Button>
                                  )}
                                  {shipment.cte_emission.uuid_cte && (
                                     <Button
                                       variant="ghost"
                                       size="sm"
                                       onClick={() => {
                                         window.open(
                                           `https://webhook.grupoconfix.com/webhook/baixar-cte?uuid=${shipment.cte_emission!.uuid_cte}`,
                                           '_blank'
                                         );
                                       }}
                                       className="h-8 w-8 p-0 hover:bg-primary/10"
                                       title="Visualizar DACTE (PDF)"
                                     >
                                       <Receipt className="h-4 w-4 text-green-600" />
                                     </Button>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Conteúdo principal - Layout diferente para B2B Expresso */}
                      <div className="p-4">
                        {isB2BExpresso ? (
                          /* Layout simplificado para B2B Expresso */
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            {/* Cliente B2B */}
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cliente</span>
                              </div>
                              <div>
                                <p className="font-semibold text-sm">{shipment.client_name}</p>
                                <p className="text-xs text-muted-foreground mt-1">Anônimo</p>
                              </div>
                            </div>

                            {/* Região */}
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Abrangência</span>
                              </div>
                              <div>
                                <div className="text-sm font-medium">
                                  Goiânia e Região
                                </div>
                                {shipment.recipient_address?.name && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    <span className="font-medium">{shipment.recipient_address.name}</span>
                                  </div>
                                )}
                                {shipment.recipient_address?.cep && (
                                  <div className="text-xs text-muted-foreground">
                                    CEP: {shipment.recipient_address.cep}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Informações da Carga */}
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Carga</span>
                              </div>
                              <div>
                                {shipment.quote_data?.delivery_date && (
                                  <div className="flex items-center mb-2 px-2 py-1 bg-orange-100 border border-orange-200 rounded-md">
                                    <Clock className="w-4 h-4 mr-2 text-orange-600" />
                                    <div>
                                      <div className="text-[10px] text-orange-600 font-medium uppercase">Entrega</div>
                                      <div className="text-sm font-bold text-orange-700">
                                        {format(new Date(shipment.quote_data.delivery_date), 'dd/MM/yyyy', { locale: ptBR })}
                                      </div>
                                    </div>
                                  </div>
                                )}
                                {shipment.quote_data?.volume_count && (
                                  <div className="flex items-center text-xs text-muted-foreground mb-1">
                                    <Package className="w-3 h-3 mr-1" />
                                    {shipment.quote_data.volume_count} {shipment.quote_data.volume_count === 1 ? 'volume' : 'volumes'}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Motorista */}
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Motorista</span>
                              </div>
                              <div>
                                {shipment.motoristas ? (
                                  <div>
                                    <p className="font-semibold text-sm">{shipment.motoristas.nome}</p>
                                    <p className="text-xs text-muted-foreground">{shipment.motoristas.telefone}</p>
                                  </div>
                                ) : (
                                  <Badge variant="outline" className="text-xs">Aguardando aceite</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* Layout completo para remessas normais */
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            {/* Cliente */}
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cliente</span>
                              </div>
                              <div>
                                <p className="font-semibold text-sm">{shipment.client_name}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {shipment.user_id ? 'Cadastrado' : 'Anônimo'}
                                </p>
                              </div>
                            </div>

                            {/* Origem → Destino */}
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Rota</span>
                              </div>
                              <div>
                                <div className="flex items-center space-x-2 text-xs">
                                  <span className="font-medium">
                                    {shipment.sender_address?.city || 'Goiânia'} - {shipment.sender_address?.state || 'GO'}
                                  </span>
                                  <MapPin className="w-3 h-3 text-muted-foreground" />
                                  <span className="font-medium">
                                    {shipment.recipient_address?.city || 'N/A'} - {shipment.recipient_address?.state || 'N/A'}
                                  </span>
                                </div>
                                <div className="flex items-center text-xs text-muted-foreground mt-1">
                                  <span>{shipment.sender_address?.cep || 'N/A'} → {shipment.recipient_address?.cep || 'N/A'}</span>
                                </div>
                              </div>
                            </div>

                            {/* Motorista */}
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Motorista</span>
                              </div>
                              <div>
                                {shipment.motoristas ? (
                                  <div>
                                    <p className="font-semibold text-sm">{shipment.motoristas.nome}</p>
                                    <p className="text-xs text-muted-foreground">{shipment.motoristas.telefone}</p>
                                    <Badge variant="default" className="text-xs mt-1 bg-green-100 text-green-700">
                                      Aceita pelo motorista
                                    </Badge>
                                  </div>
                                ) : (
                                  <Badge variant="outline" className="text-xs">Aguardando aceite</Badge>
                                )}
                              </div>
                            </div>

                            {/* Valor e Informações */}
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Valor</span>
                              </div>
                              <div>
                                <p className="font-bold text-lg text-primary">
                                  R$ {getQuoteValue(shipment).toFixed(2).replace('.', ',')}
                                </p>
                                <div className="flex items-center text-xs text-muted-foreground mt-1">
                                  <Package className="w-3 h-3 mr-1" />
                                  {shipment.weight}kg • {shipment.format}
                                </div>
                                {shipment.pricing_table_name && (
                                  <div className="flex items-center text-xs mt-1">
                                    <FileText className="w-3 h-3 mr-1 text-primary" />
                                    <span className="font-semibold">Tabela:</span>
                                    <Badge variant="outline" className="ml-1 text-xs">
                                      {shipment.pricing_table_name}
                                    </Badge>
                                  </div>
                                )}
                                <div className="flex items-center gap-2 text-xs mt-1">
                                  {shipment.label_pdf_url ? (
                                    <>
                                      <Badge variant="default" className="text-xs bg-green-100 text-green-700">
                                        Etiqueta Emitida
                                      </Badge>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => window.open(shipment.label_pdf_url!, '_blank')}
                                        className="h-6 px-2 text-xs hover:bg-primary/10"
                                      >
                                        <Download className="w-3 h-3 mr-1" />
                                        PDF
                                      </Button>
                                    </>
                                  ) : (
                                    <Badge variant="outline" className="text-xs">
                                      Aguardando Etiqueta
                                    </Badge>
                                  )}
                                </div>
                                
                                {/* Status do Webhook e Botão Manual */}
                                <div className="flex items-center gap-2 text-xs mt-2">
                                  {getWebhookStatusBadge(shipment)}
                                  {['PAID', 'PAYMENT_CONFIRMED', 'LABEL_GENERATED', 'PAGO_AGUARDANDO_ETIQUETA'].includes(shipment.status) && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-6 px-2 text-xs hover:bg-primary/10"
                                      onClick={() => handleSendWebhook(shipment)}
                                      disabled={sendingWebhook[shipment.id]}
                                    >
                                      {sendingWebhook[shipment.id] ? (
                                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                      ) : (
                                        <Send className="w-3 h-3 mr-1" />
                                      )}
                                      Enviar Webhook
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalhes da Remessa */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              Detalhes da Remessa - {selectedShipmentDetails?.tracking_code || `ID${selectedShipmentDetails?.id.slice(0, 8).toUpperCase()}`}
            </DialogTitle>
          </DialogHeader>
          
          {selectedShipmentDetails && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Coluna 1: Informações Gerais */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Informações Gerais</CardTitle>
                  </CardHeader>
                   <CardContent className="space-y-3">
                     <div>
                       <label className="text-sm font-medium text-muted-foreground">Código de Rastreio</label>
                       <p className="text-sm font-mono">{selectedShipmentDetails.tracking_code || 'N/A'}</p>
                     </div>
                     <div>
                       <label className="text-sm font-medium text-muted-foreground">Status</label>
                       <div className="mt-1">{getStatusBadge(selectedShipmentDetails.status)}</div>
                     </div>
                     <div>
                       <label className="text-sm font-medium text-muted-foreground">Data de Criação</label>
                       <p className="text-sm">{format(new Date(selectedShipmentDetails.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>
                     </div>
                     <div>
                       <label className="text-sm font-medium text-muted-foreground">Valor Total</label>
                       <p className="text-lg font-bold text-primary">
                         R$ {getQuoteValue(selectedShipmentDetails).toFixed(2).replace('.', ',')}
                       </p>
                     </div>

                       {/* Tipo de Documento Fiscal */}
                       <div>
                         <label className="text-sm font-medium text-muted-foreground">Tipo de Documento Fiscal</label>
                         <div className="mt-1">
                           <Badge variant={selectedShipmentDetails.document_type === 'nota_fiscal_eletronica' ? 'default' : 'secondary'}>
                             {selectedShipmentDetails.document_type === 'nota_fiscal_eletronica' ? 'Nota Fiscal Eletrônica' : 'Declaração de Conteúdo'}
                           </Badge>
                         </div>
                       </div>

                       {/* Chave da NFe (apenas para NFe) */}
                       {selectedShipmentDetails.document_type === 'nota_fiscal_eletronica' && (
                         <div>
                           <label className="text-sm font-medium text-muted-foreground">Chave da Nota Fiscal</label>
                           <div className="mt-1 p-2 bg-gray-50 border border-gray-200 rounded-lg">
                             <p className="text-sm font-mono text-gray-800 break-all">
                               {selectedShipmentDetails.quote_data?.fiscalData?.nfeAccessKey || 
                                selectedShipmentDetails.quote_data?.nfeKey ||
                                selectedShipmentDetails.quote_data?.nfeChave ||
                                selectedShipmentDetails.quote_data?.documentData?.nfeKey ||
                                'Chave não encontrada'}
                             </p>
                           </div>
                         </div>
                       )}

                       {/* Descrição da Mercadoria (apenas para Declaração) */}
                       {selectedShipmentDetails.document_type === 'declaracao_conteudo' && selectedShipmentDetails.quote_data?.merchandiseDescription && (
                         <div>
                           <label className="text-sm font-medium text-muted-foreground">Descrição da Mercadoria</label>
                           <div className="mt-1 p-2 bg-gray-50 border border-gray-200 rounded-lg">
                             <p className="text-sm text-gray-800">
                               {selectedShipmentDetails.quote_data.merchandiseDescription}
                             </p>
                           </div>
                         </div>
                       )}

                      {/* Forma de Pagamento */}
                      {selectedShipmentDetails.payment_data && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Forma de Pagamento</label>
                          <div className="mt-1 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <CheckCircle className="w-4 h-4 text-green-600" />
                                <span className="font-medium text-green-800 capitalize">
                                  {selectedShipmentDetails.payment_data?.method === 'pix' ? 'PIX' : 
                                   selectedShipmentDetails.payment_data?.method === 'credit_card' ? 'Cartão de Crédito' : 
                                   selectedShipmentDetails.payment_data?.method || 'N/A'}
                                </span>
                              </div>
                              <Badge className="bg-green-100 text-green-700">
                                {(() => {
                                  // Prioridade: Valor da cotação aprovada
                                  let amount = 0;
                                  
                                  // 1. PRIORIDADE: Valor da cotação aprovada (mais confiável)
                                  if (selectedShipmentDetails.quote_data?.shippingQuote) {
                                    const price = selectedShipmentDetails.selected_option === 'express'
                                      ? (selectedShipmentDetails.quote_data.shippingQuote.expressPrice || selectedShipmentDetails.quote_data.quoteData?.shippingQuote?.expressPrice)
                                      : (selectedShipmentDetails.quote_data.shippingQuote.economicPrice || selectedShipmentDetails.quote_data.quoteData?.shippingQuote?.economicPrice);
                                    if (price) amount = price;
                                  }
                                  // 2. Fallback: payment_data.amount
                                  if (amount === 0 && selectedShipmentDetails.payment_data?.amount) {
                                    amount = selectedShipmentDetails.payment_data.amount;
                                  }
                                  
                                  return `R$ ${amount.toFixed(2).replace('.', ',')}`;
                                })()}
                              </Badge>
                            </div>
                            {selectedShipmentDetails.payment_data?.confirmed_at && (
                              <p className="text-xs text-green-600">
                                Confirmado em: {format(new Date(selectedShipmentDetails.payment_data.confirmed_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                              </p>
                            )}
                            {selectedShipmentDetails.payment_data?.payment_id && (
                              <p className="text-xs text-muted-foreground mt-1">
                                ID: {selectedShipmentDetails.payment_data.payment_id}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                     {/* Informações da Cotação Original */}
                     {selectedShipmentDetails.quote_data && (
                       <div>
                         <label className="text-sm font-medium text-muted-foreground">Dados da Cotação Original</label>
                         <div className="mt-1 p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                           <div className="grid grid-cols-2 gap-4 text-xs">
                             {selectedShipmentDetails.quote_data?.originalFormData && (
                               <>
                                 <div>
                                   <span className="font-medium text-blue-800">CEP Origem:</span>
                                   <p className="text-blue-600">{selectedShipmentDetails.quote_data.originalFormData.originCep || 'N/A'}</p>
                                 </div>
                                 <div>
                                   <span className="font-medium text-blue-800">CEP Destino:</span>
                                   <p className="text-blue-600">{selectedShipmentDetails.quote_data.originalFormData.destinyCep || 'N/A'}</p>
                                 </div>
                                 <div>
                                   <span className="font-medium text-blue-800">Valor Unitário:</span>
                                   <p className="text-blue-600">R$ {(selectedShipmentDetails.quote_data.originalFormData.unitValue || 0).toString().replace('.', ',')}</p>
                                 </div>
                                 <div>
                                   <span className="font-medium text-blue-800">Quantidade:</span>
                                   <p className="text-blue-600">{selectedShipmentDetails.quote_data.originalFormData.quantity || 'N/A'}</p>
                                 </div>
                               </>
                             )}
                             {selectedShipmentDetails.quote_data?.shippingQuote && (
                               <>
                                 <div>
                                   <span className="font-medium text-blue-800">Zona:</span>
                                   <p className="text-blue-600">{selectedShipmentDetails.quote_data.shippingQuote.zone || 'N/A'}</p>
                                 </div>
                                 <div>
                                   <span className="font-medium text-blue-800">Nome da Zona:</span>
                                   <p className="text-blue-600">{selectedShipmentDetails.quote_data.shippingQuote.zoneName || 'N/A'}</p>
                                 </div>
                                 <div>
                                   <span className="font-medium text-blue-800">Prazo Econômico:</span>
                                   <p className="text-blue-600">{selectedShipmentDetails.quote_data.shippingQuote.economicDays || 'N/A'} dias</p>
                                 </div>
                                 <div>
                                   <span className="font-medium text-blue-800">Prazo Expresso:</span>
                                   <p className="text-blue-600">{selectedShipmentDetails.quote_data.shippingQuote.expressDays || 'N/A'} dias</p>
                                 </div>
                               </>
                             )}
                           </div>
                           {selectedShipmentDetails.quote_data?.merchandiseDescription && (
                             <div>
                               <span className="font-medium text-blue-800 text-xs">Descrição da Mercadoria:</span>
                               <p className="text-blue-600 text-xs mt-1">{selectedShipmentDetails.quote_data.merchandiseDescription}</p>
                             </div>
                           )}
                         </div>
                       </div>
                     )}

                      <div className="bg-muted/50 p-3 rounded-lg">
                        <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Tabela de Preços Utilizada
                        </label>
                        {selectedShipmentDetails.pricing_table_name ? (
                          <div className="mt-2">
                            <Badge variant="secondary" className="text-sm">
                              {selectedShipmentDetails.pricing_table_name}
                            </Badge>
                            {selectedShipmentDetails.quote_data?.shippingQuote?.zone && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Zona: {selectedShipmentDetails.quote_data.shippingQuote.zone} - {selectedShipmentDetails.quote_data.shippingQuote.zoneName}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm mt-1 text-muted-foreground">Tabela padrão do sistema legado</p>
                        )}
                      </div>
                   </CardContent>
                </Card>

                {/* Cliente */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Cliente</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Nome</label>
                      <p className="text-sm">{selectedShipmentDetails.client_name}</p>
                    </div>
                    <div className="mt-2">
                      <label className="text-sm font-medium text-muted-foreground">Tipo</label>
                      <p className="text-sm">{selectedShipmentDetails.user_id ? 'Cliente Cadastrado' : 'Cliente Anônimo'}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Dimensões e Peso */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Dimensões e Peso - Dados do Formulário</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Peso</label>
                        <p className="text-sm">
                          {selectedShipmentDetails.quote_data?.originalFormData?.weight || 
                           selectedShipmentDetails.quote_data?.weight || 
                           selectedShipmentDetails.weight} kg
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Formato</label>
                        <p className="text-sm capitalize">
                          {selectedShipmentDetails.quote_data?.originalFormData?.format || 
                           selectedShipmentDetails.quote_data?.format || 
                           selectedShipmentDetails.format}
                        </p>
                      </div>
                    </div>
                    
                    {/* Valor da Nota (Valor Declarado) */}
                    {(() => {
                      const merchandiseValue = selectedShipmentDetails.quote_data?.originalFormData?.totalMerchandiseValue ||
                                           selectedShipmentDetails.quote_data?.totalMerchandiseValue || 
                                           selectedShipmentDetails.quote_data?.merchandiseDetails?.totalValue;
                      
                      if (merchandiseValue) {
                        return (
                          <div className="mt-2">
                            <label className="text-sm font-medium text-muted-foreground">Valor da Nota (Valor Declarado)</label>
                            <p className="text-lg font-bold text-primary">
                              R$ {parseFloat(merchandiseValue).toFixed(2).replace('.', ',')}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* Valor do Seguro (0,6% do valor declarado) */}
                    {(() => {
                      const merchandiseValue = selectedShipmentDetails.quote_data?.originalFormData?.totalMerchandiseValue ||
                                           selectedShipmentDetails.quote_data?.totalMerchandiseValue || 
                                           selectedShipmentDetails.quote_data?.merchandiseDetails?.totalValue;
                      
                      if (merchandiseValue) {
                        const insuranceValue = parseFloat(merchandiseValue) * 0.006; // 0,6%
                        return (
                          <div className="mt-2">
                            <label className="text-sm font-medium text-muted-foreground">Valor do Seguro (0,6%)</label>
                            <p className="text-lg font-bold text-primary">
                              R$ {insuranceValue.toFixed(2).replace('.', ',')}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* Volumes Individuais */}
                    {(() => {
                      const volumes = selectedShipmentDetails.quote_data?.merchandiseDetails?.volumes || 
                                      selectedShipmentDetails.quote_data?.technicalData?.volumes ||
                                      selectedShipmentDetails.quote_data?.originalFormData?.volumes ||
                                      selectedShipmentDetails.quote_data?.volumes || 
                                      selectedShipmentDetails.quote_data?.quoteData?.volumes;
                      if (Array.isArray(volumes) && volumes.length > 0) {
                        return (
                          <div className="mt-4">
                            <label className="text-sm font-medium text-primary mb-3 block">Volumes Individuais</label>
                            <div className="space-y-2">
                              {volumes.map((volume: any, index: number) => (
                                <div key={index} className="p-3 border border-primary/20 rounded-lg bg-primary/5">
                                  <div className="flex items-center mb-2">
                                    <Package className="w-4 h-4 mr-2 text-primary" />
                                    <span className="font-medium text-sm">Volume {index + 1}</span>
                                  </div>
                                  <div className="grid grid-cols-4 gap-2 text-xs">
                                    <div>
                                      <p className="text-muted-foreground">Peso</p>
                                      <p className="font-medium">{volume.weight}kg</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">Compr.</p>
                                      <p className="font-medium">{volume.length}cm</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">Largura</p>
                                      <p className="font-medium">{volume.width}cm</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground">Altura</p>
                                      <p className="font-medium">{volume.height}cm</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </CardContent>
                </Card>
              </div>

              {/* Coluna 2: Endereços */}
              <div className="space-y-4">
                {/* Remetente */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center">
                      <Badge className="bg-green-100 text-green-700 mr-2">Dados Originais do Formulário</Badge>
                      Remetente
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Nome</label>
                      <p className="text-sm">{selectedShipmentDetails.sender_address?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Endereço</label>
                      <p className="text-sm">
                        {selectedShipmentDetails.sender_address?.street || 'N/A'}, {selectedShipmentDetails.sender_address?.number || 'N/A'}
                        {selectedShipmentDetails.sender_address?.complement && `, ${selectedShipmentDetails.sender_address.complement}`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedShipmentDetails.sender_address?.neighborhood || 'N/A'} - {selectedShipmentDetails.sender_address?.city || 'N/A'}/{selectedShipmentDetails.sender_address?.state || 'N/A'}
                      </p>
                      <p className="text-sm text-muted-foreground">CEP: {selectedShipmentDetails.sender_address?.cep || 'N/A'}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Destinatário */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center">
                      <Badge className="bg-green-100 text-green-700 mr-2">Dados Originais do Formulário</Badge>
                      Destinatário
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Nome</label>
                      <p className="text-sm">{selectedShipmentDetails.recipient_address?.name || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Endereço</label>
                      <p className="text-sm">
                        {selectedShipmentDetails.recipient_address?.street || 'N/A'}, {selectedShipmentDetails.recipient_address?.number || 'N/A'}
                        {selectedShipmentDetails.recipient_address?.complement && `, ${selectedShipmentDetails.recipient_address.complement}`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {selectedShipmentDetails.recipient_address?.neighborhood || 'N/A'} - {selectedShipmentDetails.recipient_address?.city || 'N/A'}/{selectedShipmentDetails.recipient_address?.state || 'N/A'}
                      </p>
                      <p className="text-sm text-muted-foreground">CEP: {selectedShipmentDetails.recipient_address?.cep || 'N/A'}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Opções de Envio */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Opções de Envio</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Modalidade</label>
                      <p className="text-sm">{selectedShipmentDetails.selected_option === 'express' ? 'Expresso' : 'Econômico'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Coleta</label>
                      <p className="text-sm">{selectedShipmentDetails.pickup_option === 'pickup' ? 'Coleta Domiciliar' : 'Envio em Balcão'}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Motorista */}
                {selectedShipmentDetails.motoristas && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Motorista Responsável</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Nome</label>
                        <p className="text-sm">{selectedShipmentDetails.motoristas.nome}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Telefone</label>
                        <p className="text-sm">{selectedShipmentDetails.motoristas.telefone}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Email</label>
                        <p className="text-sm">{selectedShipmentDetails.motoristas.email}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Etiqueta e Documentos */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Documentos</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Etiqueta</label>
                      {selectedShipmentDetails.label_pdf_url ? (
                        <div className="mt-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(selectedShipmentDetails.label_pdf_url!, '_blank')}
                            className="h-8"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Baixar Etiqueta PDF
                          </Button>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Etiqueta não disponível</p>
                      )}
                    </div>
                    
                    {selectedShipmentDetails.cte_key && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Chave do CT-e</label>
                        <p className="text-sm font-mono text-xs break-all">{selectedShipmentDetails.cte_key}</p>
                      </div>
                    )}
                    
                    {cteData && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">CT-e</label>
                        <div className="mt-1 p-2 bg-muted rounded text-xs">
                          <p><strong>Número:</strong> {cteData.numero_cte}</p>
                          <p><strong>Status:</strong> {cteData.status}</p>
                          <p><strong>Série:</strong> {cteData.serie}</p>
                          <p><strong>Modelo:</strong> {cteData.modelo}</p>
                          {cteData.dacte_url && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(cteData.dacte_url, '_blank')}
                              className="h-6 mt-2"
                            >
                              <Download className="w-3 h-3 mr-1" />
                              DACTE
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Detalhes B2B Express */}
      <Dialog open={b2bDetailsModalOpen} onOpenChange={setB2bDetailsModalOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle>Detalhes do Pedido B2B Express</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[calc(85vh-100px)] px-6 py-4">
          {selectedB2BShipment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Código de Rastreio</p>
                  <p className="font-mono font-semibold">{selectedB2BShipment.tracking_code}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <div>{getStatusBadge(selectedB2BShipment.status)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Volumes</p>
                  <p className="font-semibold">{selectedB2BShipment.quote_data?.volume_count || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data de Entrega</p>
                  <p className="font-semibold">
                    {selectedB2BShipment.quote_data?.delivery_date 
                      ? format(new Date(selectedB2BShipment.quote_data.delivery_date), 'dd/MM/yyyy')
                      : '-'}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Criado em</p>
                <p className="font-semibold">
                  {format(new Date(selectedB2BShipment.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>

              {(() => {
                const obs = parseB2BObservations(selectedB2BShipment.quote_data?.observations || null);
                if (!obs) return null;
                
                return (
                  <>
                    <Separator />
                    <h4 className="font-semibold">Dados do Pagamento</h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Veículo</p>
                        <p className="font-semibold capitalize">{obs.vehicle_type || '-'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Valor Pago</p>
                        <p className="font-semibold text-green-600">
                          R$ {obs.amount_paid?.toFixed(2) || '0.00'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Peso Total</p>
                        <p className="font-semibold">{obs.total_weight?.toFixed(2) || '0'} kg</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Pesos por Volume</p>
                        <p className="font-semibold text-sm">
                          {obs.volume_weights?.map((w: number, i: number) => `${w}kg`).join(', ') || '-'}
                        </p>
                      </div>
                    </div>

                    {obs.volume_addresses && obs.volume_addresses.length > 0 && (
                      <>
                        <Separator />
                        <h4 className="font-semibold">Endereços de Entrega</h4>
                        {obs.volume_addresses.map((addr: any, idx: number) => (
                          <div key={idx} className="bg-muted/50 p-3 rounded-lg space-y-2">
                            <p className="font-semibold text-sm">Volume {idx + 1}</p>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <p className="text-muted-foreground">Destinatário</p>
                                <p className="font-medium">{addr.recipient_name || addr.recipientName || '-'}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Telefone</p>
                                <p className="font-medium">{addr.recipient_phone || addr.recipientPhone || '-'}</p>
                              </div>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Endereço</p>
                              <p className="font-medium">
                                {addr.street || '-'}, {addr.number || 'S/N'}
                                {addr.complement ? ` - ${addr.complement}` : ''}
                              </p>
                              <p className="font-medium">
                                {addr.neighborhood || '-'}, {addr.city || '-'} - {addr.state || '-'}
                              </p>
                              <p className="font-medium">CEP: {addr.cep || '-'}</p>
                            </div>
                            {addr.reference && (
                              <div>
                                <p className="text-muted-foreground">Referência</p>
                                <p className="font-medium">{addr.reference}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </>
                    )}
                  </>
                );
              })()}

              <Separator />
              <h4 className="font-semibold">Dados do Cliente</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Empresa</p>
                  <p className="font-semibold">{b2bClientData?.company_name || selectedB2BShipment.client_name.replace(' (Expresso)', '') || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">CNPJ</p>
                  <p className="font-semibold">{b2bClientData?.cnpj || '-'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-semibold text-sm">{b2bClientData?.email || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Telefone</p>
                  <p className="font-semibold">{b2bClientData?.phone || '-'}</p>
                </div>
              </div>

              {/* Histórico de Rastreio */}
              <Separator />
              <h4 className="font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Histórico de Rastreio
              </h4>
              {b2bStatusHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum histórico registrado.</p>
              ) : (
                <div className="space-y-2">
                  {b2bStatusHistory.map((entry, idx) => {
                    const isB2B1 = ['ACEITA', 'COLETA_ACEITA', 'B2B_COLETA_FINALIZADA'].includes(entry.status);
                    const isB2B2 = ['B2B_ENTREGA_ACEITA', 'ENTREGUE', 'ENTREGA_FINALIZADA'].includes(entry.status);
                    const phaseLabel = isB2B1 ? 'B2B-1' : isB2B2 ? 'B2B-2' : '';
                    
                    return (
                      <div key={entry.id} className="bg-muted/50 p-3 rounded-lg space-y-1 text-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {entry.status}
                            </Badge>
                            {phaseLabel && (
                              <Badge variant={isB2B1 ? 'secondary' : 'default'} className="text-xs">
                                {phaseLabel}
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(entry.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        {entry.status_description && (
                          <p className="text-muted-foreground">{entry.status_description}</p>
                        )}
                        {entry.motoristas && (
                          <div className="flex items-center gap-1 text-xs">
                            <Truck className="w-3 h-3" />
                            <span className="font-medium">{entry.motoristas.nome}</span>
                            <span className="text-muted-foreground">({entry.motoristas.telefone})</span>
                          </div>
                        )}
                        {entry.observacoes && (
                          <p className="text-xs text-muted-foreground italic">{entry.observacoes}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Modal de Ocorrências */}
      <ShipmentOccurrencesModal
        isOpen={occurrencesModalOpen}
        onClose={() => setOccurrencesModalOpen(false)}
        shipment={selectedShipmentOccurrences}
      />
    </div>
  );
};

export default AdminRemessas;