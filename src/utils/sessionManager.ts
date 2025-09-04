// Secure session management for anonymous users
// Uses server-side validation to prevent session enumeration attacks

import { supabase } from '@/integrations/supabase/client';
import { SecurityUtils } from './securityUtils';

export class SessionManager {
  private static readonly SESSION_KEY = 'confix_secure_session';
  private static readonly SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  /**
   * Get or create a secure session ID for anonymous users
   */
  static async getSessionId(): Promise<string> {
    // Security: Check client-side rate limiting first
    if (!SecurityUtils.checkClientRateLimit('session_creation', 3, 10)) {
      throw new Error('Muitas tentativas de criação de sessão. Aguarde alguns minutos.');
    }

    const existingSession = SecurityUtils.secureStorage.get('confix_secure_session');
    
    if (existingSession) {
      try {
        const now = Date.now();
        
        // Check if session is still valid (within 24 hours)
        if (now - existingSession.created < this.SESSION_DURATION) {
          // Validate session with server
          const isValid = await this.validateSession(existingSession.token);
          if (isValid) {
            return existingSession.id;
          }
        }
      } catch (error) {
        console.error('Error parsing session data:', error);
        SecurityUtils.secureStorage.remove('confix_secure_session');
      }
    }

    // Create new session if none exists or expired
    return await this.createNewSession();
  }

  /**
   * Validate session with enhanced security monitoring
   */
  private static async validateSession(sessionToken: string): Promise<boolean> {
    try {
      // Get client IP for security monitoring
      const clientIP = await this.getClientIP();
      
      // Use enhanced RPC with security monitoring
      const { data, error } = await supabase.rpc('validate_session_with_security_monitoring', {
        session_token: sessionToken,
        client_ip: clientIP
      });
      
      return !error && data !== null;
    } catch (error) {
      console.error('Session validation error:', error);
      // Log security incident for failed validations
      this.logSecurityIncident('session_validation_failed', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
      return false;
    }
  }

  /**
   * Get client IP address for security monitoring
   */
  private static async getClientIP(): Promise<string> {
    try {
      // Try to get IP from various sources
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Log security incidents
   */
  private static async logSecurityIncident(incident: string, details: any): Promise<void> {
    try {
      await supabase.from('webhook_logs').insert({
        event_type: 'security_incident',
        shipment_id: 'session_manager',
        payload: {
          incident,
          details,
          user_agent: navigator.userAgent,
          timestamp: new Date().toISOString()
        },
        response_status: 400,
        response_body: { status: 'security_incident_logged' }
      });
    } catch (error) {
      console.error('Failed to log security incident:', error);
    }
  }

  /**
   * Create a new secure session using server-side generation
   */
  private static async createNewSession(): Promise<string> {
    try {
      // Generate client fingerprint for additional security
      const fingerprint = await this.generateClientFingerprint();
      
      // Create session on server
      const { data, error } = await supabase.rpc('create_anonymous_session', {
        client_fingerprint: fingerprint
      });
      
      if (error || !data || data.length === 0) {
        throw new Error('Failed to create secure session');
      }
      
      const sessionResult = data[0];
      const sessionData = {
        id: sessionResult.session_id,
        token: sessionResult.session_token,
        created: Date.now(),
        fingerprint
      };

      localStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionData));
      
      // Also store in secure storage
      SecurityUtils.secureStorage.set('confix_secure_session', sessionData, 24 * 60);
      return sessionResult.session_id;
    } catch (error) {
      console.error('Failed to create secure session:', error);
      // Fallback to local session for compatibility during migration
      return this.createFallbackSession();
    }
  }

  /**
   * Generate client fingerprint for session binding
   */
  private static async generateClientFingerprint(): Promise<string> {
    const components = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      navigator.platform
    ];
    
    const fingerprint = components.join('|');
    const encoder = new TextEncoder();
    const data = encoder.encode(fingerprint);
    const hash = await crypto.subtle.digest('SHA-256', data);
    
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Fallback session creation for migration compatibility
   */
  private static createFallbackSession(): string {
    const sessionId = this.generateSecureId();
    const sessionData = {
      id: sessionId,
      token: null, // Mark as fallback
      created: Date.now(),
      fingerprint: null
    };

    localStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionData));
    return sessionId;
  }

  /**
   * Generate a secure random ID
   */
  private static generateSecureId(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Get session token for API calls
   */
  static getSessionToken(): string | null {
    try {
      const existingSession = localStorage.getItem(this.SESSION_KEY);
      if (!existingSession) return null;

      const sessionData = JSON.parse(existingSession);
      return sessionData.token || null;
    } catch {
      return null;
    }
  }

  /**
   * Clear the current session (for logout or when user logs in)
   */
  static clearSession(): void {
    localStorage.removeItem(this.SESSION_KEY);
    SecurityUtils.secureStorage.remove('confix_secure_session');
  }

  /**
   * Clear session when user logs in to avoid conflicts
   */
  static clearOnLogin(): void {
    this.clearSession();
  }

  /**
   * Check if user has an active session
   */
  static async hasActiveSession(): Promise<boolean> {
    try {
      const existingSession = localStorage.getItem(this.SESSION_KEY);
      if (!existingSession) return false;

      const sessionData = JSON.parse(existingSession);
      const now = Date.now();
      
      // Check time validity first
      if ((now - sessionData.created) >= this.SESSION_DURATION) {
        this.clearSession();
        return false;
      }
      
      // If we have a token, validate with server
      if (sessionData.token) {
        return await this.validateSession(sessionData.token);
      }
      
      // Fallback session is valid for migration period
      return true;
    } catch {
      return false;
    }
  }
}