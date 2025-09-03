import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface SavedRecipient {
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

export const useSavedRecipients = () => {
  const { user } = useAuth();
  const [savedRecipients, setSavedRecipients] = useState<SavedRecipient[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load saved recipients for the current user
  const loadSavedRecipients = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('saved_recipients')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading saved recipients:', error);
        throw error;
      }

      setSavedRecipients(data || []);
    } catch (error) {
      console.error('Error in loadSavedRecipients:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Save a new recipient or update existing one
  const saveApprovedRecipient = async (recipientData: AddressData, setAsDefault: boolean = false) => {
    if (!user) throw new Error('Usuário não autenticado');

    try {
      // If setting as default, first remove default from all others
      if (setAsDefault) {
        await supabase
          .from('saved_recipients')
          .update({ is_default: false })
          .eq('user_id', user.id);
      }

      const recipientToSave = {
        user_id: user.id,
        name: recipientData.name,
        document: recipientData.document,
        phone: recipientData.phone,
        email: recipientData.email,
        cep: recipientData.cep,
        street: recipientData.street,
        number: recipientData.number,
        complement: recipientData.complement || null,
        neighborhood: recipientData.neighborhood,
        city: recipientData.city,
        state: recipientData.state,
        reference: recipientData.reference || null,
        is_default: setAsDefault
      };

      // Check if recipient already exists (by email or document)
      const { data: existingRecipient } = await supabase
        .from('saved_recipients')
        .select('id')
        .eq('user_id', user.id)
        .or(`email.eq.${recipientData.email},document.eq.${recipientData.document}`)
        .limit(1)
        .maybeSingle();

      if (existingRecipient) {
        // Update existing recipient
        const { error } = await supabase
          .from('saved_recipients')
          .update(recipientToSave)
          .eq('id', existingRecipient.id);

        if (error) throw error;
      } else {
        // Insert new recipient
        const { error } = await supabase
          .from('saved_recipients')
          .insert(recipientToSave);

        if (error) throw error;
      }

      // Reload recipients
      await loadSavedRecipients();
    } catch (error) {
      console.error('Error saving recipient:', error);
      throw error;
    }
  };

  // Update an existing recipient
  const updateRecipient = async (recipientId: string, recipientData: AddressData) => {
    if (!user) throw new Error('Usuário não autenticado');

    try {
      const { error } = await supabase
        .from('saved_recipients')
        .update({
          name: recipientData.name,
          document: recipientData.document,
          phone: recipientData.phone,
          email: recipientData.email,
          cep: recipientData.cep,
          street: recipientData.street,
          number: recipientData.number,
          complement: recipientData.complement || null,
          neighborhood: recipientData.neighborhood,
          city: recipientData.city,
          state: recipientData.state,
          reference: recipientData.reference || null
        })
        .eq('id', recipientId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Reload recipients
      await loadSavedRecipients();
    } catch (error) {
      console.error('Error updating recipient:', error);
      throw error;
    }
  };

  // Get the default recipient
  const getDefaultRecipient = (): SavedRecipient | null => {
    return savedRecipients.find(recipient => recipient.is_default) || null;
  };

  // Convert SavedRecipient to AddressData format
  const convertToAddressData = (recipient: SavedRecipient): AddressData => {
    return {
      name: recipient.name,
      document: recipient.document,
      phone: recipient.phone,
      email: recipient.email,
      cep: recipient.cep,
      street: recipient.street,
      number: recipient.number,
      complement: recipient.complement || '',
      neighborhood: recipient.neighborhood,
      city: recipient.city,
      state: recipient.state,
      reference: recipient.reference || ''
    };
  };

  // Set a recipient as default
  const setAsDefault = async (recipientId: string) => {
    if (!user) throw new Error('Usuário não autenticado');

    try {
      // First, remove default from all recipients
      await supabase
        .from('saved_recipients')
        .update({ is_default: false })
        .eq('user_id', user.id);

      // Set the selected recipient as default
      const { error } = await supabase
        .from('saved_recipients')
        .update({ is_default: true })
        .eq('id', recipientId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Reload recipients
      await loadSavedRecipients();
    } catch (error) {
      console.error('Error setting default recipient:', error);
      throw error;
    }
  };

  // Delete a recipient
  const deleteRecipient = async (recipientId: string) => {
    if (!user) throw new Error('Usuário não autenticado');

    try {
      const { error } = await supabase
        .from('saved_recipients')
        .delete()
        .eq('id', recipientId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Reload recipients
      await loadSavedRecipients();
    } catch (error) {
      console.error('Error deleting recipient:', error);
      throw error;
    }
  };

  // Load recipients when user changes
  useEffect(() => {
    if (user) {
      loadSavedRecipients();
    } else {
      setSavedRecipients([]);
    }
  }, [user]);

  return {
    savedRecipients,
    isLoading,
    loadSavedRecipients,
    saveApprovedRecipient,
    updateRecipient,
    getDefaultRecipient,
    convertToAddressData,
    setAsDefault,
    deleteRecipient
  };
};