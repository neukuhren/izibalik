import Fastify from 'fastify';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { env } from './env.js';
import { registerRoutes } from './routes.js';
import { startBot } from './bot.js';
import { startRateRefresh } from './fazer.js';

async function main(): Promise<void> {
  const app = Fastify({ logger: { level: 'info' }, bodyLimit: 12 * 1024 * 1024 });

  const { default: multipart } = await import('@fastify/multipart');
  await app.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  });

  await registerRoutes(app);

  // Опциональная раздача собранного фронта (../app/dist) с SPA-fallback.
  if (env.serveDist) {
    const root = resolve(process.cwd(), env.serveDist);
    if (existsSync(root)) {
      const { default: fastifyStatic } = await import('@fastify/static');
      await app.register(fastifyStatic, { root, prefix: '/' });
      app.setNotFoundHandler((req, reply) => {
        if (req.raw.url && req.raw.url.startsWith('/api/')) {
          return reply.code(404).send({ ok: false, error: 'not found' });
        }
        return reply.sendFile('index.html');
      });
      app.log.info(`[static] раздаю фронт из ${root}`);
    } else {
      app.log.warn(`[static] SERVE_DIST=${root} не найден — раздача отключена`);
    }
  }

  startRateRefresh();
  await startBot();

  await app.listen({ port: env.port, host: env.host });
  app.log.info(`IZIBALIK backend на http://${env.host}:${env.port}`);
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
