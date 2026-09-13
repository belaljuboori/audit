import * as https from 'https';
import { execSync } from 'child_process';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

/**
 * A minimal local HTTPS server used to exercise the real TCP/TLS/HTTP steps
 * of TestConnectionService against something genuinely listening, rather
 * than mocking the network layer. Certificate is self-signed and generated
 * once via the system `openssl` binary (available in this environment).
 */
export function startLocalTlsServer(): Promise<{ port: number; close: () => Promise<void> }> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'soc-test-tls-'));
  const keyPath = path.join(dir, 'key.pem');
  const certPath = path.join(dir, 'cert.pem');
  execSync(
    `openssl req -x509 -newkey rsa:2048 -nodes -keyout "${keyPath}" -out "${certPath}" -days 1 -subj "/CN=127.0.0.1"`,
    { stdio: 'ignore' },
  );

  const server = https.createServer(
    { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) },
    (req, res) => {
      res.writeHead(200);
      res.end('ok');
    },
  );

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      resolve({
        port,
        close: () =>
          new Promise<void>((res) => {
            server.close(() => res());
            fs.rmSync(dir, { recursive: true, force: true });
          }),
      });
    });
  });
}
