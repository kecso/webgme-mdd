import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

function studioApiPlugin() {
  return {
    name: 'webgme-mdd-studio-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next();

        const sendJson = (obj) => {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(obj));
        };

        if (req.url === '/api/catalog') {
          return sendJson(
            JSON.parse(
              fs.readFileSync(path.join(repoRoot, 'scripts/diagram-catalog.json'), 'utf8')
            )
          );
        }

        if (req.url === '/api/registry') {
          return sendJson(
            JSON.parse(
              fs.readFileSync(
                path.join(repoRoot, 'router/src/common/DomainRegistry.json'),
                'utf8'
              )
            )
          );
        }

        if (req.url === '/api/stories') {
          return sendJson(
            JSON.parse(fs.readFileSync(path.join(repoRoot, 'docs/stories/stories.json'), 'utf8'))
          );
        }

        const sampleMatch = req.url.match(/^\/api\/sample\/([a-z0-9-]+)$/);
        if (sampleMatch) {
          const id = sampleMatch[1];
          const candidates = [
            path.join(repoRoot, 'diagrams', id, 'examples/sample.mmd'),
            path.join(repoRoot, 'diagrams', id, 'examples/sample.ears')
          ];
          const file = candidates.find((f) => fs.existsSync(f));
          if (!file) {
            res.statusCode = 404;
            return res.end('Not found');
          }
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          return res.end(fs.readFileSync(file));
        }

        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), studioApiPlugin()],
  server: {
    port: 3947,
    host: true
  }
});
