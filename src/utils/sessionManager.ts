// Secure session management for anonymous users
// Uses server-side validation to prevent session enumeration attacks

import { supabase } from '@/integrations/supabase/client';

export class SessionManager {
  private static readonly SESSION_KEY = 'confix_secure_session';
  private static readonly SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  /**
   * Get or create a secure session ID for anonymous users
   */
  static async getSessionId(): Promise<string> {
    const existingSession = localStorage.getItem(this.SESSION_KEY);
    
    if (existingSession) {
      try {
        const sessionData = JSON.parse(existingSession);
        const now = Date.now();
        
        // Check if session is still valid (within 24 hours)
        if (now - sessionData.created < this.SESSION_DURATION) {
          // Validate session with server
          const isValid = await this.validateSession(sessionData.token);
          if (isValid) {
            return sessionData.id;
          }
        }
      } catch (error) {
        console.error('Error parsing session data:', error);
      }
    }

    // Create new session if none exists or expired
    return await this.createNewSession();
  }

  /**
   * Validate session with server-side security
   */
  private static async validateSession(sessionToken: string): Promise<boolean> {
    try {
      // Use RPC to validate session without exposing internal logic
      const { data, error } = await supabase.rpc('validate_anonymous_session', {
        session_token: sessionToken
      });
      
      return !error && data !== null;
    } catch (error) {
      console.error('Session validation error:', error);
      return false;
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