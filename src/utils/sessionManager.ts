// Session management for anonymous users
// This ensures anonymous users can only see their own addresses

export class SessionManager {
  private static readonly SESSION_KEY = 'confix_session_id';
  private static readonly SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  /**
   * Get or create a session ID for anonymous users
   */
  static getSessionId(): string {
    const existingSession = localStorage.getItem(this.SESSION_KEY);
    
    if (existingSession) {
      try {
        const sessionData = JSON.parse(existingSession);
        const now = Date.now();
        
        // Check if session is still valid (within 24 hours)
        if (now - sessionData.created < this.SESSION_DURATION) {
          return sessionData.id;
        }
      } catch (error) {
        console.error('Error parsing session data:', error);
      }
    }

    // Create new session if none exists or expired
    return this.createNewSession();
  }

  /**
   * Create a new session ID
   */
  private static createNewSession(): string {
    const sessionId = this.generateSecureId();
    const sessionData = {
      id: sessionId,
      created: Date.now()
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
  static hasActiveSession(): boolean {
    try {
      const existingSession = localStorage.getItem(this.SESSION_KEY);
      if (!existingSession) return false;

      const sessionData = JSON.parse(existingSession);
      const now = Date.now();
      
      return (now - sessionData.created) < this.SESSION_DURATION;
    } catch {
      return false;
    }
  }
}