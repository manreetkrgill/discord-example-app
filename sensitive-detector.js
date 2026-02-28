// Patterns for detecting sensitive information
const SENSITIVE_PATTERNS = {
  // API Keys - common formats
  apiKeys: [
    /^(?:sk_live_|sk_test_)[a-zA-Z0-9]{20,}/, // Stripe
    /^aws_access_key_id\s*=\s*[A-Z0-9]{20}/, // AWS
    /ghp_[a-zA-Z0-9_]{36,}/, // GitHub Personal Token
    /gho_[a-zA-Z0-9_]{36,}/, // GitHub OAuth
    /ghu_[a-zA-Z0-9_]{36,}/, // GitHub User-to-Server
    /ghs_[a-zA-Z0-9_]{36,}/, // GitHub Server-to-Server
    /ghr_[a-zA-Z0-9_]{36,}/, // GitHub GitHub App Refresh Token
    /[a-zA-Z0-9_-]*api[_-]?key[a-zA-Z0-9_-]*\s*[:=]\s*[a-zA-Z0-9_\-\/\+]{20,}/i,
    /bearer\s+[a-zA-Z0-9_\-\.]+/i, // Bearer tokens
    /[a-zA-Z0-9]{32,}/i, // Generic long alphanumeric strings
  ],

  // Passwords - look for keywords followed by sensitive values
  passwords: [
    /(?:password|passwd|pwd|pass)\s*[:=]\s*[^\s]+/i,
    /(?:password|passwd|pwd|pass)\s+(?:is|:|=)?\s*[^\s]+/i,
    /my\s+password\s+(?:is|:)?\s*[^\s]+/i,
    /user?password\s*[:=]\s*[^\s]+/i,
  ],

  // Credit Cards - various formats
  creditCards: [
    /\b(?:\d{4}[\s-]?){3}\d{4}\b/, // 16 digits with optional separators
    /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12}|(?:2131|1800|35\d{3})\d{11})\b/, // Luhn-like formats
  ],

  // Emails
  emails: [
    /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\b/,
  ],

  // Social Security Numbers / Personal Numbers
  ssn: [
    /\b\d{3}-\d{2}-\d{4}\b/, // XXX-XX-XXXX format
    /\b\d{3}\s\d{2}\s\d{4}\b/, // XXX XX XXXX format
  ],

  // URLs with credentials (http://user:pass@host)
  credentialsInUrl: [
    /https?:\/\/[a-zA-Z0-9._-]+:[a-zA-Z0-9._-]+@/i,
  ],
};

export function detectSensitiveInfo(text) {
  if (!text || typeof text !== 'string') {
    return {
      detected: false,
      types: [],
      severity: 'low',
    };
  }

  const detectedTypes = [];

  // Check each pattern category
  for (const category in SENSITIVE_PATTERNS) {
    const patterns = SENSITIVE_PATTERNS[category];
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        detectedTypes.push(category);
        break; // Only add category once
      }
    }
  }

  return {
    detected: detectedTypes.length > 0,
    types: detectedTypes,
    severity: detectedTypes.length > 0 ? 'high' : 'low',
  };
}

// Mask sensitive data for logging (don't log actual values)
export function maskForLogs(text) {
  if (!text || typeof text !== 'string') {
    return text;
  }

  let masked = text;

  // Mask API keys
  masked = masked.replace(/sk_[a-zA-Z0-9_]{20,}/g, '[API_KEY_MASKED]');
  masked = masked.replace(/ghp_[a-zA-Z0-9_]{36,}/g, '[GITHUB_TOKEN_MASKED]');
  masked = masked.replace(/bearer\s+[a-zA-Z0-9_\-\.]+/gi, '[BEARER_TOKEN_MASKED]');

  // Mask passwords
  masked = masked.replace(
    /(?:password|passwd|pwd|pass)\s*[:=]\s*[^\s]+/gi,
    '[PASSWORD_MASKED]'
  );

  // Mask credit cards
  masked = masked.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[CARD_MASKED]');

  // Mask emails (show partial)
  masked = masked.replace(
    /([a-zA-Z0-9])[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]*@[a-zA-Z0-9.-]+/g,
    '$1***@***'
  );

  // Mask SSN
  masked = masked.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN_MASKED]');
  masked = masked.replace(/\b\d{3}\s\d{2}\s\d{4}\b/g, '[SSN_MASKED]');

  return masked;
}
