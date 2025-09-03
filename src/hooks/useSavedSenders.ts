import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface SavedSender {
  id: string;
  name: string;
  document: string;
  phone: string;
  email: string;
  cep: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  reference?: string;
  is_default: boolean;
}

interface AddressData {
  name: string;
  document: string;
  phone: string;
  email: string;
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  reference: string;
}

export const useSavedSenders = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [savedSenders, setSavedSenders] = useState<SavedSender[]>([]);
  const [loading, setLoading] = useState(false);

  // Carregar remetentes salvos
  const loadSavedSenders = async () => {
    if (!user) {
      setSavedSenders([]);
      return;
    }
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('saved_senders')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSavedSenders(data || []);
    } catch (error) {
      console.error('Erro ao carregar remetentes:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os remetentes salvos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Salvar remetente automaticamente quando aprovado
  const saveApprovedSender = async (senderData: AddressData, setAsDefault = true) => {
    if (!user) return false;

    try {
      // Verificar se já existe um remetente com os mesmos dados
      const existingSender = savedSenders.find(sender => 
        sender.document === senderData.document ||
        (sender.email === senderData.email && sender.name === senderData.name)
      );

      if (existingSender) {
        // Atualizar dados do remetente existente
        await updateSender(existingSender.id, senderData);
        return true;
      }

      // Se definir como padrão e não há remetentes salvos, ou forçar como padrão
      const shouldSetDefault = setAsDefault || savedSenders.length === 0;
      
      if (shouldSetDefault) {
        // Remover padrão de outros
        await supabase
          .from('saved_senders')
          .update({ is_default: false })
          .eq('user_id', user.id);
      }

      // Inserir novo remetente
      const { error } = await supabase
        .from('saved_senders')
        .insert({
          user_id: user.id,
          name: senderData.name,
          document: senderData.document,
          phone: senderData.phone,
          email: senderData.email,
          cep: senderData.cep,
          street: senderData.street,
          number: senderData.number,
          complement: senderData.complement || null,
          neighborhood: senderData.neighborhood,
          city: senderData.city,
          state: senderData.state,
          reference: senderData.reference || null,
          is_default: shouldSetDefault
        });

      if (error) throw error;

      toast({
        title: "Remetente salvo!",
        description: shouldSetDefault 
          ? "Dados salvos como padrão para futuras cotações" 
          : "Remetente adicionado aos seus salvos"
      });

      // Recarregar lista
      await loadSavedSenders();
      return true;
    } catch (error) {
      console.error('Erro ao salvar remetente aprovado:', error);
      return false;
    }
  };

  // Atualizar remetente existente
  const updateSender = async (senderId: string, senderData: AddressData) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('saved_senders')
        .update({
          name: senderData.name,
          document: senderData.document,
          phone: senderData.phone,
          email: senderData.email,
          cep: senderData.cep,
          street: senderData.street,
          number: senderData.number,
          complement: senderData.complement || null,
          neighborhood: senderData.neighborhood,
          city: senderData.city,
          state: senderData.state,
          reference: senderData.reference || null
        })
        .eq('id', senderId);

      if (error) throw error;

      toast({
        title: "Remetente atualizado!",
        description: "Dados atualizados com sucesso"
      });

      await loadSavedSenders();
      return true;
    } catch (error) {
      console.error('Erro ao atualizar remetente:', error);
      return false;
    }
  };

  // Obter remetente padrão
  const getDefaultSender = (): SavedSender | null => {
    return savedSenders.find(sender => sender.is_default) || null;
  };

  // Converter SavedSender para AddressData
  const convertToAddressData = (sender: SavedSender): AddressData => {
    return {
      name: sender.name,
      document: sender.document,
      phone: sender.phone,
      email: sender.email,
      cep: sender.cep,
      street: sender.street,
      number: sender.number,
      complement: sender.complement || "",
      neighborhood: sender.neighborhood,
      city: sender.city,
      state: sender.state,
      reference: sender.reference || ""
    };
  };

  // Definir remetente como padrão
  const setAsDefault = async (senderId: string) => {
    if (!user) return false;

    try {
      // Remover padrão de todos
      await supabase
        .from('saved_senders')
        .update({ is_default: false })
        .eq('user_id', user.id);

      // Definir novo padrão
      await supabase
        .from('saved_senders')
        .update({ is_default: true })
        .eq('id', senderId);

      toast({
        title: "Padrão atualizado!",
        description: "Este remetente será usado automaticamente"
      });

      await loadSavedSenders();
      return true;
    } catch (error) {
      console.error('Erro ao definir padrão:', error);
      return false;
    }
  };

  // Deletar remetente
  const deleteSender = async (senderId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('saved_senders')
        .delete()
        .eq('id', senderId);

      if (error) throw error;

      toast({
        title: "Remetente removido",
        description: "Remetente removido com sucesso"
      });

      await loadSavedSenders();
      return true;
    } catch (error) {
      console.error('Erro ao deletar remetente:', error);
      return false;
    }
  };

  useEffect(() => {
    loadSavedSenders();
  }, [user]);

  return {
    savedSenders,
    loading,
    loadSavedSenders,
    saveApprovedSender,
    updateSender,
    getDefaultSender,
    convertToAddressData,
    setAsDefault,
    deleteSender
  };
};