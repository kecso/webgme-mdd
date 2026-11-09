import { defineConfig } from 'vite';
import path from 'path';
import fs from 'fs';

const repoRoot = path.resolve(__dirname, '..');

function catalogApiPlugin() {
  return {
    name: 'webgme-mdd-catalog-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next();

        const sendJson = (obj) => {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(obj));
        };

        if (req.url === '/api/catalog') {
          const catalog = JSON.parse(
            fs.readFileSync(path.join(repoRoot, 'scripts/diagram-catalog.json'), 'utf8')
          );
          return sendJson(catalog);
        }

        if (req.url === '/api/index') {
          const index = JSON.parse(
            fs.readFileSync(path.join(repoRoot, 'diagrams/index.json'), 'utf8')
          );
          return sendJson(index);
        }

        const metaMatch = req.url.match(/^\/api\/meta\/([a-z0-9-]+)$/);
        if (metaMatch) {
          const file = path.join(repoRoot, 'diagrams', metaMatch[1], 'metamodel/Language.json');
          if (!fs.existsSync(file)) {
            res.statusCode = 404;
            return res.end('Not found');
          }
          res.setHeader('Content-Type', 'application/json');
          return res.end(fs.readFileSync(file));
        }

        const sampleMatch = req.url.match(/^\/api\/sample\/([a-z0-9-]+)$/);
        if (sampleMatch) {
          const file = path.join(repoRoot, 'diagrams', sampleMatch[1], 'examples/sample.mmd');
          if (!fs.existsSync(file)) {
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
  plugins: [catalogApiPlugin()],
  server: {
    port: 3847,
    host: true
  }
});
