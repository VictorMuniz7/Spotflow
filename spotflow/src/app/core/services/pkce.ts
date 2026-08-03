/** Authorization Code + PKCE helpers (RFC 7636), pure and dependency-free. */

export const base64Url = (bytes: Uint8Array): string => {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

export const randomString = (length: number): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return base64Url(bytes);
};

export const sha256Base64Url = async (value: string): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return base64Url(new Uint8Array(digest));
};
