import { sanitizeErrorMessage } from './sanitize-error-message';

describe('sanitizeErrorMessage', () => {
  it('redacts an Authorization header embedded in an error message', () => {
    const input = 'Request failed: Authorization: Bearer abc123.def456 was rejected';
    expect(sanitizeErrorMessage(input)).not.toContain('abc123.def456');
    expect(sanitizeErrorMessage(input)).toContain('[REDACTED]');
  });

  it('redacts a token= query-string-style value', () => {
    const input = 'GET /api?token=supersecrettoken failed with 401';
    expect(sanitizeErrorMessage(input)).not.toContain('supersecrettoken');
  });

  it('redacts a password field in a JSON-ish error blob', () => {
    const input = '{"username":"admin","password":"hunter2hunter2"}';
    expect(sanitizeErrorMessage(input)).not.toContain('hunter2hunter2');
  });

  it('leaves ordinary error text untouched', () => {
    const input = 'connect ECONNREFUSED 10.0.0.5:443';
    expect(sanitizeErrorMessage(input)).toBe(input);
  });

  it('truncates to the given max length', () => {
    const input = 'x'.repeat(2000);
    expect(sanitizeErrorMessage(input, 100)).toHaveLength(100);
  });
});
