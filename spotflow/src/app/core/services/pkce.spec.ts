import { randomString, sha256Base64Url } from './pkce';

const BASE64URL_PATTERN = /^[A-Za-z0-9\-_]+$/;

describe('pkce', () => {
  describe('randomString', () => {
    it('only uses base64url characters (no +, /, or = padding)', () => {
      const value = randomString(64);
      expect(value).toMatch(BASE64URL_PATTERN);
    });

    it('produces a different value on every call', () => {
      const first = randomString(64);
      const second = randomString(64);
      expect(first).not.toBe(second);
    });

    it('scales output length with the requested byte length', () => {
      const short = randomString(16);
      const long = randomString(64);
      expect(long.length).toBeGreaterThan(short.length);
    });
  });

  describe('sha256Base64Url', () => {
    it('is deterministic for the same input', async () => {
      const a = await sha256Base64Url('spotflow-verifier');
      const b = await sha256Base64Url('spotflow-verifier');
      expect(a).toBe(b);
    });

    it('produces a different digest for a different input', async () => {
      const a = await sha256Base64Url('spotflow-verifier-a');
      const b = await sha256Base64Url('spotflow-verifier-b');
      expect(a).not.toBe(b);
    });

    it('only uses base64url characters and the length of a 32-byte digest', async () => {
      const value = await sha256Base64Url('x'.repeat(10));
      expect(value).toMatch(BASE64URL_PATTERN);
      expect(value.length).toBe(43); // ceil(32 * 4 / 3) without padding
    });
  });
});
