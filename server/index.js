import http from 'node:http';
import { buildStory } from '../shared/storyGenerator.js';

const PORT = process.env.PORT || 8787;

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    return sendJson(res, 200, {
      ok: true,
      provider: process.env.LLM_PROVIDER || 'local'
    });
  }

  if (req.method === 'POST' && req.url === '/v1/story/generate') {
    try {
      const body = await parseBody(req);
      const result = await buildStory(body);

      if (result.wordCount < 350 || result.wordCount > 650) {
        return sendJson(res, 502, {
          error: 'Generated story length outside target range.',
          wordCount: result.wordCount
        });
      }

      return sendJson(res, 200, {
        request: {
          hero: body.hero || '',
          setting: body.setting || '',
          goal: body.goal || '',
          mood: body.mood || '',
          ageBand: body.ageBand || '4-6'
        },
        ...result
      });
    } catch (error) {
      return sendJson(res, 400, { error: error.message });
    }
  }

  return sendJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`DreamWeaver API listening on http://localhost:${PORT}`);
});
