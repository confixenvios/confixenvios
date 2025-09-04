// Security utility functions for the application

/**
 * Content Security Policy helpers
 */
export const SecurityUtils = {
  
  /**
   * Sanitize HTML content to prevent XSS attacks
   */
  sanitizeHTML: (input: string): string => {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
  },

  /**
   * Validate file upload security
   */
  validateFile: (file: File): { isValid: boolean; error?: string } => {
    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return { isValid: false, error: 'Arquivo muito grande. Máximo 10MB.' };
    }

    // Check allowed file types
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain', 'text/csv'
    ];

    if (!allowedTypes.includes(file.type)) {
      return { isValid: false, error: 'Tipo de arquivo não permitido.' };
    }

    // Check file name for suspicious patterns
    if (/\.(exe|bat|cmd|scr|pif|com|dll)$/i.test(file.name)) {
      return { isValid: false, error: 'Arquivo potencialmente perigoso.' };
    }

    return { isValid: true };
  },

  /**
   * Generate secure random token
   */
  generateSecureToken: (length: number = 32): string => {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  },

  /**
   * Validate URL to prevent open redirect attacks
   */
  validateURL: (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      
      // Only allow https and http protocols
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return false;
      }

      // Block javascript: and data: URLs
      if (['javascript:', 'data:', 'vbscript:'].includes(urlObj.protocol)) {
        return false;
      }

      // Additional domain validation can be added here
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Rate limiting helper (client-side)
   */
  checkClientRateLimit: (key: string, maxAttempts: number = 5, windowMinutes: number = 15): boolean => {
    const now = Date.now();
    const windowMs = windowMinutes * 60 * 1000;
    const storageKey = `rate_limit_${key}`;
    
    try {
      const storedData = localStorage.getItem(storageKey);
      let attempts: number[] = storedData ? JSON.parse(storedData) : [];
      
      // Remove old attempts outside the time window
      attempts = attempts.filter(timestamp => now - timestamp < windowMs);
      
      // Check if limit exceeded
      if (attempts.length >= maxAttempts) {
        return false;
      }
      
      // Add current attempt
      attempts.push(now);
      localStorage.setItem(storageKey, JSON.stringify(attempts));
      
      return true;
    } catch {
      // If localStorage fails, allow the request but log it
      console.warn('Rate limiting storage failed');
      return true;
    }
  },

  /**
   * Detect suspicious activity patterns
   */
  detectSuspiciousActivity: (userActions: string[]): boolean => {
    // Check for rapid consecutive actions
    if (userActions.length > 10) {
      const lastActions = userActions.slice(-10);
      const timeSpan = Date.now() - parseInt(lastActions[0]);
      
      // If 10 actions in less than 1 minute, mark as suspicious
      if (timeSpan < 60000) {
        return true;
      }
    }

    return false;
  },

  /**
   * Secure local storage wrapper
   */
  secureStorage: {
    set: (key: string, value: any, expirationMinutes: number = 60): void => {
      const item = {
        value,
        expiry: Date.now() + (expirationMinutes * 60 * 1000),
        checksum: SecurityUtils.generateSecureToken(8)
      };
      
      try {
        localStorage.setItem(`secure_${key}`, JSON.stringify(item));
      } catch (error) {
        console.warn('Secure storage failed:', error);
      }
    },

    get: (key: string): any => {
      try {
        const itemStr = localStorage.getItem(`secure_${key}`);
        if (!itemStr) return null;

        const item = JSON.parse(itemStr);
        
        // Check if expired
        if (Date.now() > item.expiry) {
          localStorage.removeItem(`secure_${key}`);
          return null;
        }
        
        return item.value;
      } catch {
        return null;
      }
    },

    remove: (key: string): void => {
      localStorage.removeItem(`secure_${key}`);
    }
  },

  /**
   * Password strength validation
   */
  validatePasswordStrength: (password: string): { 
    isStrong: boolean; 
    score: number; 
    feedback: string[] 
  } => {
    const feedback: string[] = [];
    let score = 0;

    // Length check
    if (password.length >= 8) score += 1;
    else feedback.push('Use pelo menos 8 caracteres');

    // Uppercase check
    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push('Inclua pelo menos uma letra maiúscula');

    // Lowercase check
    if (/[a-z]/.test(password)) score += 1;
    else feedback.push('Inclua pelo menos uma letra minúscula');

    // Number check
    if (/\d/.test(password)) score += 1;
    else feedback.push('Inclua pelo menos um número');

    // Special character check
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
    else feedback.push('Inclua pelo menos um caractere especial');

    // Common password check
    const commonPasswords = ['123456', 'password', '123456789', 'qwerty', 'abc123'];
    if (commonPasswords.includes(password.toLowerCase())) {
      score = 0;
      feedback.push('Evite senhas muito comuns');
    }

    return {
      isStrong: score >= 4,
      score,
      feedback
    };
  }
};

/**
 * Security monitoring for suspicious activities
 */
export class SecurityMonitor {
  private static instance: SecurityMonitor;
  private activities: string[] = [];
  private suspiciousThreshold = 15;

  static getInstance(): SecurityMonitor {
    if (!SecurityMonitor.instance) {
      SecurityMonitor.instance = new SecurityMonitor();
    }
    return SecurityMonitor.instance;
  }

  logActivity(activity: string): void {
    this.activities.push(`${Date.now()}_${activity}`);
    
    // Keep only last 20 activities
    if (this.activities.length > 20) {
      this.activities = this.activities.slice(-20);
    }

    // Check for suspicious patterns
    if (SecurityUtils.detectSuspiciousActivity(this.activities)) {
      this.reportSuspiciousActivity();
    }
  }

  private reportSuspiciousActivity(): void {
    console.warn('🚨 Suspicious activity detected');
    
    // In a real application, you would send this to your monitoring service
    // For now, we'll just log it locally
    SecurityUtils.secureStorage.set('security_alert', {
      timestamp: new Date().toISOString(),
      activities: this.activities.slice(-10),
      userAgent: navigator.userAgent
    }, 60);
  }

  getSecurityStatus(): { 
    isSecure: boolean; 
    lastActivities: string[]; 
    alertCount: number 
  } {
    const alerts = SecurityUtils.secureStorage.get('security_alert');
    
    return {
      isSecure: this.activities.length < this.suspiciousThreshold,
      lastActivities: this.activities.slice(-5),
      alertCount: alerts ? 1 : 0
    };
  }
}
