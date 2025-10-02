import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Package, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import InputMask from 'react-input-mask';

interface B2BClient {
  id: string;
  company_name: string;
}

const B2BNovaRemessa = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [client, setClient] = useState<B2BClient | null>(null);
  const [formData, setFormData] = useState({
    recipient_name: '',
    recipient_phone: '',
    recipient_cep: '',
    recipient_street: '',
    recipient_number: '',
    recipient_complement: '',
    recipient_neighborhood: '',
    recipient_city: '',
    recipient_state: '',
    delivery_type: 'proximo_dia',
    observations: '',
  });

  useEffect(() => {
    loadClient();
  }, []);

  const loadClient = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/b2b-expresso');
        return;
      }

      const { data: clientData, error } = await supabase
        .from('b2b_clients')
        .select('id, company_name')
        .eq('user_id', user.id)
        .single();

      if (error || !clientData) {
        toast.error('Cliente não encontrado');
        navigate('/b2b-expresso');
        return;
      }

      setClient(clientData);
    } catch (error) {
      console.error(error);
    }
  };

  const handleCepBlur = async () => {
    const cep = formData.recipient_cep.replace(/\D/g, '');
    if (cep.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();

      if (data.erro) {
        toast.error('CEP não encontrado');
        return;
      }

      setFormData(prev => ({
        ...prev,
        recipient_street: data.logradouro || '',
        recipient_neighborhood: data.bairro || '',
        recipient_city: data.localidade || '',
        recipient_state: data.uf || '',
      }));
    } catch (error) {
      toast.error('Erro ao buscar CEP');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from('b2b_shipments')
        .insert({
          b2b_client_id: client.id,
          ...formData,
        });

      if (error) throw error;

      toast.success('Remessa cadastrada com sucesso!');
      navigate('/b2b-expresso/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao cadastrar remessa');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <header className="bg-card border-b">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/b2b-expresso/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <Package className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Nova Remessa</CardTitle>
                <CardDescription>Cadastre uma nova remessa para entrega</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Dados do Destinatário */}
              <div className="space-y-4">
                <h3 className="font-semibold">Dados do Destinatário</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="recipient_name">Nome Completo *</Label>
                  <Input
                    id="recipient_name"
                    value={formData.recipient_name}
                    onChange={(e) => handleChange('recipient_name', e.target.value)}
                    required
                    placeholder="Nome do destinatário"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recipient_phone">Telefone/WhatsApp *</Label>
                  <InputMask
                    mask="(99) 99999-9999"
                    value={formData.recipient_phone}
                    onChange={(e) => handleChange('recipient_phone', e.target.value)}
                  >
                    {(inputProps: any) => (
                      <Input
                        {...inputProps}
                        id="recipient_phone"
                        required
                        placeholder="(00) 00000-0000"
                      />
                    )}
                  </InputMask>
                </div>
              </div>

              {/* Endereço de Entrega */}
              <div className="space-y-4">
                <h3 className="font-semibold">Endereço de Entrega</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="recipient_cep">CEP *</Label>
                  <InputMask
                    mask="99999-999"
                    value={formData.recipient_cep}
                    onChange={(e) => handleChange('recipient_cep', e.target.value)}
                    onBlur={handleCepBlur}
                  >
                    {(inputProps: any) => (
                      <Input
                        {...inputProps}
                        id="recipient_cep"
                        required
                        placeholder="00000-000"
                      />
                    )}
                  </InputMask>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="recipient_street">Rua *</Label>
                    <Input
                      id="recipient_street"
                      value={formData.recipient_street}
                      onChange={(e) => handleChange('recipient_street', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="recipient_number">Número *</Label>
                    <Input
                      id="recipient_number"
                      value={formData.recipient_number}
                      onChange={(e) => handleChange('recipient_number', e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recipient_complement">Complemento</Label>
                  <Input
                    id="recipient_complement"
                    value={formData.recipient_complement}
                    onChange={(e) => handleChange('recipient_complement', e.target.value)}
                    placeholder="Apto, bloco, etc."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="recipient_neighborhood">Bairro *</Label>
                  <Input
                    id="recipient_neighborhood"
                    value={formData.recipient_neighborhood}
                    onChange={(e) => handleChange('recipient_neighborhood', e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="recipient_city">Cidade *</Label>
                    <Input
                      id="recipient_city"
                      value={formData.recipient_city}
                      onChange={(e) => handleChange('recipient_city', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="recipient_state">UF *</Label>
                    <Input
                      id="recipient_state"
                      value={formData.recipient_state}
                      onChange={(e) => handleChange('recipient_state', e.target.value.toUpperCase())}
                      maxLength={2}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Tipo de Entrega */}
              <div className="space-y-4">
                <h3 className="font-semibold">Tipo de Entrega</h3>
                <RadioGroup
                  value={formData.delivery_type}
                  onValueChange={(value) => handleChange('delivery_type', value)}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="mesmo_dia" id="mesmo_dia" />
                    <Label htmlFor="mesmo_dia" className="font-normal cursor-pointer">
                      Mesmo Dia
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="proximo_dia" id="proximo_dia" />
                    <Label htmlFor="proximo_dia" className="font-normal cursor-pointer">
                      Próximo Dia
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Observações */}
              <div className="space-y-2">
                <Label htmlFor="observations">Observações</Label>
                <Textarea
                  id="observations"
                  value={formData.observations}
                  onChange={(e) => handleChange('observations', e.target.value)}
                  placeholder="Informações adicionais sobre a entrega"
                  rows={3}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cadastrando...
                  </>
                ) : (
                  <>
                    <Package className="mr-2 h-4 w-4" />
                    Cadastrar Remessa
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default B2BNovaRemessa;
