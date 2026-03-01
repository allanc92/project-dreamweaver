import http from 'node:http';
import { buildStory, buildSpeech } from '../shared/storyGenerator.js';

const PORT = process.env.PORT || 8787;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json', ...CORS_HEADERS });
  res.end(JSON.stringify(payload));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    let failed = false;
    req.on('data', (chunk) => {
      if (failed) return;
      raw += chunk;
      if (raw.length > 1_000_000) {
        failed = true;
        req.destroy();
        reject(new Error('Request body too large'));
      }
    });
    req.on('end', () => {
      if (failed) return;
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
  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    return res.end();
  }

  if (req.method === 'GET' && req.url === '/health') {
    return sendJson(res, 200, {
      ok: true,
      provider: process.env.LLM_PROVIDER || 'local'
    });
  }

  if (req.method === 'POST' && req.url === '/v1/story/generate') {
    let body;
    try {
      body = await parseBody(req);
    } catch (error) {
      return sendJson(res, 400, { error: error.message });
    }

    try {
      const result = await buildStory(body);

      if (result.wordCount < 350 || result.wordCount > 650) {
        return sendJson(res, 500, {
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
      return sendJson(res, 500, { error: error.message });
    }
  }

  if (req.method === 'POST' && req.url === '/v1/story/speak') {
    let body;
    try {
      body = await parseBody(req);
    } catch (error) {
      return sendJson(res, 400, { error: error.message });
    }

    if (!body.text || typeof body.text !== 'string' || !body.text.trim()) {
      return sendJson(res, 400, { error: 'text is required' });
    }

    try {
      const audioBase64 = await buildSpeech(body.text.trim());
      return sendJson(res, 200, { audioBase64 });
    } catch (error) {
      return sendJson(res, 500, { error: error.message });
    }
  }

  return sendJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`DreamWeaver API listening on http://localhost:${PORT}`);
});
