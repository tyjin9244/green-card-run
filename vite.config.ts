import { defineConfig, loadEnv, type Plugin } from 'vite';

/** Serves api/character.ts during `npm run dev` (on Vercel it runs as a Function). */
function characterApi(): Plugin {
  return {
    name: 'character-api',
    configureServer(server) {
      server.middlewares.use('/api/character', async (req, res) => {
        const chunks: Buffer[] = [];
        for await (const c of req) chunks.push(c as Buffer);
        const { POST } = await server.ssrLoadModule('/api/character.ts');
        const r: Response = await POST(new Request('http://localhost/api/character', {
          method: req.method,
          headers: { 'content-type': 'application/json' },
          body: req.method === 'POST' ? Buffer.concat(chunks) : undefined
        }));
        res.statusCode = r.status;
        res.setHeader('content-type', 'application/json');
        res.end(await r.text());
      });
    }
  };
}

export default defineConfig(({ mode }) => {
  // Expose AI_GATEWAY_API_KEY / VERCEL_OIDC_TOKEN from .env.local to the dev API.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));
  return {
    base: './',
    plugins: [characterApi()],
    server: { host: true, port: 5173 },
    build: { chunkSizeWarningLimit: 2000 }
  };
});
