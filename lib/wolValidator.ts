const ALLOWED_HOSTNAME = 'wol.jw.org';
const MAX_URL_LENGTH = 500;

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateWOLUrl(raw: string): ValidationResult {
  const trimmed = raw.trim();

  if (!trimmed) return { valid: false, error: 'Please enter a URL.' };

  if (trimmed.length > MAX_URL_LENGTH) {
    return { valid: false, error: 'URL is too long.' };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: 'That does not look like a valid URL.' };
  }

  if (parsed.protocol !== 'https:') {
    return { valid: false, error: 'Only HTTPS URLs are accepted.' };
  }

  if (parsed.hostname !== ALLOWED_HOSTNAME) {
    return {
      valid: false,
      error: `Only URLs from ${ALLOWED_HOSTNAME} are accepted. This application is designed to work with the Watchtower ONLINE LIBRARY.`,
    };
  }

  // Reject anything that looks like a directory traversal or unusual path
  if (parsed.pathname.includes('..')) {
    return { valid: false, error: 'Invalid URL path.' };
  }

  return { valid: true };
}
