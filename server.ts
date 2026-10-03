import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { startDiscordBot, client, OWNER_ID } from './src/bot/botClient';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());

  // Health check endpoint for Render & UptimeRobot
  app.get('/health', (req, res) => {
    res.json({
      status: 'online',
      service: 'AegisCore Full-Stack Suite',
      botStatus: client.isReady() ? 'online' : 'initializing_or_no_token',
      botTag: client.user ? client.user.tag : null,
      ownerId: OWNER_ID,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  });

  // Bot status API for Web Dashboard
  app.get('/api/bot/status', (req, res) => {
    res.json({
      online: client.isReady(),
      tag: client.user?.tag || null,
      id: client.user?.id || null,
      guildsCount: client.guilds.cache.size,
      ownerId: OWNER_ID
    });
  });

  // Start Discord Bot process
  await startDiscordBot();

  // Mount Vite middleware in development or serve static build in production
  if (process.env.NODE_ENV !== 'production') {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa'
      });
      app.use(vite.middlewares);
      console.log('[AegisCore] Vite dev middleware mounted.');
    } catch (e) {
      console.warn('[AegisCore] Running without Vite middleware, serving static dist if present.');
      app.use(express.static(path.join(__dirname, 'dist')));
      app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'dist', 'index.html'));
      });
    }
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const server = http.createServer(app);
  server.listen(PORT, () => {
    console.log(`[Render Web Service] Server running on port ${PORT}`);
    console.log(`[Keep-Alive Health URL] http://localhost:${PORT}/health`);
  });
}

startServer().catch((err) => {
  console.error('Fatal startup error:', err);
});
