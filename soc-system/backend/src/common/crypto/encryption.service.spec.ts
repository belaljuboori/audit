import { EncryptionService } from './encryption.service';
import { AppConfigService } from '../../config/app-config.service';

function fakeConfig(key: string): AppConfigService {
  return { masterEncryptionKey: key } as unknown as AppConfigService;
}

describe('EncryptionService', () => {
  const validKey = 'a'.repeat(64); // 32 bytes hex

  it('rejects a master key that is not exactly 32 bytes', () => {
    expect(() => new EncryptionService(fakeConfig('deadbeef'))).toThrow(
      'MASTER_ENCRYPTION_KEY must decode to exactly 32 bytes',
    );
  });

  it('round-trips plaintext through encrypt/decrypt', () => {
    const service = new EncryptionService(fakeConfig(validKey));
    const plaintext = 'super-secret-api-token-value';

    const ciphertext = service.encrypt(plaintext);

    expect(ciphertext).not.toContain(plaintext);
    expect(service.decrypt(ciphertext)).toBe(plaintext);
  });

  it('produces different ciphertext for the same plaintext (random IV)', () => {
    const service = new EncryptionService(fakeConfig(validKey));
    const a = service.encrypt('same-value');
    const b = service.encrypt('same-value');

    expect(a).not.toBe(b);
    expect(service.decrypt(a)).toBe('same-value');
    expect(service.decrypt(b)).toBe('same-value');
  });

  it('fails to decrypt when ciphertext has been tampered with', () => {
    const service = new EncryptionService(fakeConfig(validKey));
    const ciphertext = service.encrypt('do-not-tamper');
    const tampered = Buffer.from(ciphertext, 'base64');
    tampered[tampered.length - 1] ^= 0xff;

    expect(() => service.decrypt(tampered.toString('base64'))).toThrow();
  });

  it('fails to decrypt with the wrong key', () => {
    const serviceA = new EncryptionService(fakeConfig(validKey));
    const serviceB = new EncryptionService(fakeConfig('b'.repeat(64)));
    const ciphertext = serviceA.encrypt('cross-key-test');

    expect(() => serviceB.decrypt(ciphertext)).toThrow();
  });
});
