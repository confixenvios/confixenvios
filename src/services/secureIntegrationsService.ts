import { supabase } from '@/integrations/supabase/client';

export interface SecureIntegration {
  id: string;
  name: string;
  webhook_url: string;
  secret_status: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Service for securely managing integrations with encrypted secret storage
 */
export class SecureIntegrationsService {
  
  /**
   * Get all integrations with masked secret information
   */
  static async getSecureIntegrations(): Promise<SecureIntegration[]> {
    const { data, error } = await supabase.rpc('get_secure_integrations');
    
    if (error) {
      console.error('Error fetching secure integrations:', error);
      throw error;
    }
    
    return data || [];
  }

  /**
   * Create a new integration with encrypted secret storage
   */
  static async createIntegration(integrationData: {
    name: string;
    webhook_url: string;
    secret_key?: string;
    active?: boolean;
  }) {
    const { name, webhook_url, secret_key, active = true } = integrationData;
    
    // Insert the integration first
    const { data: integration, error: insertError } = await supabase
      .from('integrations')
      .insert([{
        name,
        webhook_url,
        active,
        // Don't insert the secret_key directly - we'll encrypt it separately
      }])
      .select()
      .single();

    if (insertError) throw insertError;

    // If there's a secret key, encrypt it using the secure function
    if (secret_key && integration) {
      const { error: encryptError } = await supabase.rpc('encrypt_integration_secret', {
        integration_id: integration.id,
        secret_value: secret_key
      });

      if (encryptError) {
        // Clean up the integration if encryption fails
        await supabase.from('integrations').delete().eq('id', integration.id);
        throw encryptError;
      }

      // Update the integration with the encrypted secret key reference
      await supabase
        .from('integrations')
        .update({ encrypted_secret_key: integration.id })
        .eq('id', integration.id);
    }

    return integration;
  }

  /**
   * Update an existing integration
   */
  static async updateIntegration(id: string, updates: {
    name?: string;
    webhook_url?: string;
    secret_key?: string;
    active?: boolean;
  }) {
    const { secret_key, ...basicUpdates } = updates;

    // Update basic fields
    const { error: updateError } = await supabase
      .from('integrations')
      .update(basicUpdates)
      .eq('id', id);

    if (updateError) throw updateError;

    // If secret key is being updated, encrypt it
    if (secret_key !== undefined) {
      if (secret_key) {
        // Encrypt the new secret
        const { error: encryptError } = await supabase.rpc('encrypt_integration_secret', {
          integration_id: id,
          secret_value: secret_key
        });

        if (encryptError) throw encryptError;

        // Update the integration with the encrypted secret key reference
        await supabase
          .from('integrations')
          .update({ encrypted_secret_key: id })
          .eq('id', id);
      } else {
        // Remove the secret key
        await supabase
          .from('integrations')
          .update({ 
            secret_key: null,
            encrypted_secret_key: null
          })
          .eq('id', id);
      }
    }
  }

  /**
   * Delete an integration
   */
  static async deleteIntegration(id: string) {
    const { error } = await supabase
      .from('integrations')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Get decrypted secret for webhook calls (admin only)
   */
  static async getDecryptedSecret(integrationId: string): Promise<string | null> {
    const { data, error } = await supabase.rpc('decrypt_integration_secret', {
      integration_id: integrationId,
      encrypted_value: integrationId // Using integration ID as the vault key
    });

    if (error) {
      console.error('Error decrypting secret:', error);
      return null;
    }

    return data;
  }

  /**
   * Test webhook with proper secret handling
   */
  static async testWebhook(integration: SecureIntegration, testPayload: any) {
    let authHeader = {};

    // Get the decrypted secret if available
    if (integration.secret_status === '***ENCRYPTED***') {
      const secretKey = await this.getDecryptedSecret(integration.id);
      if (secretKey) {
        authHeader = { 'Authorization': `Bearer ${secretKey}` };
      }
    }

    const response = await fetch(integration.webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader
      },
      body: JSON.stringify(testPayload)
    });

    return response;
  }
}