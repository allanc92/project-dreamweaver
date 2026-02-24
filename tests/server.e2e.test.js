import test, { describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

const TEST_PORT = 18787;
const BASE_URL = `http://localhost:${TEST_PORT}`;

function startServer() {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', ['server/index.js'], {
      env: {
        ...process.env,
        PORT: String(TEST_PORT),
        LLM_PROVIDER: 'local'
      },
      stdio: ['ignore', 'pipe', 'inherit']
    });

    let buffer = '';

    proc.stdout.on('data', (chunk) => {
      buffer += chunk.toString();
      if (buffer.includes('DreamWeaver API listening')) {
        resolve(proc);
      }
    });

    proc.on('error', reject);

    proc.on('exit', (code) => {
      if (code !== null && code !== 0) {
        reject(new Error(`Server exited early with code ${code}`));
      }
    });
  });
}

describe('DreamWeaver server E2E', () => {
  let serverProc;

  before(async () => {
    serverProc = await startServer();
  });

  after(() => {
    if (serverProc) {
      serverProc.kill('SIGTERM');
    }
  });

  test('GET /health returns 200 with { ok: true, provider: "local" }', async () => {
    const res = await fetch(`${BASE_URL}/health`);

    assert.equal(res.status, 200);

    const body = await res.json();
    assert.equal(body.ok, true);
    assert.equal(body.provider, 'local');
  });

  test('POST /v1/story/generate with full valid payload returns 200 with correct shape and word count', async () => {
    const payload = {
      hero: 'Milo the koala',
      setting: 'a moonlit beach',
      goal: 'return a glowing shell',
      mood: 'cozy',
      ageBand: '4-6'
    };

    const res = await fetch(`${BASE_URL}/v1/story/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    assert.equal(res.status, 200);

    const body = await res.json();

    assert.ok('request' in body, 'response must have "request"');
    assert.ok('provider' in body, 'response must have "provider"');
    assert.ok('storyMap' in body, 'response must have "storyMap"');
    assert.ok('storyText' in body, 'response must have "storyText"');
    assert.ok('wordCount' in body, 'response must have "wordCount"');

    assert.equal(body.provider, 'local');

    assert.equal(body.request.hero, payload.hero);
    assert.equal(body.request.setting, payload.setting);
    assert.equal(body.request.goal, payload.goal);
    assert.equal(body.request.mood, payload.mood);
    assert.equal(body.request.ageBand, payload.ageBand);

    assert.equal(Array.isArray(body.storyMap), true);
    assert.equal(body.storyMap.length, 5);
    for (const beat of body.storyMap) {
      assert.equal(typeof beat.title, 'string');
      assert.equal(typeof beat.summary, 'string');
    }

    assert.equal(typeof body.storyText, 'string');
    assert.ok(body.storyText.length > 0);

    assert.ok(body.wordCount >= 350, `wordCount ${body.wordCount} must be >= 350`);
    assert.ok(body.wordCount <= 650, `wordCount ${body.wordCount} must be <= 650`);
  });

  test('POST /v1/story/generate with empty body returns 200 using fallback defaults', async () => {
    const res = await fetch(`${BASE_URL}/v1/story/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}'
    });

    assert.equal(res.status, 200);

    const body = await res.json();

    // Server echoes the raw body values (empty strings), not the normalised fallbacks
    assert.equal(body.request.hero, '');
    assert.equal(body.request.setting, '');
    assert.equal(body.request.goal, '');
    assert.equal(body.request.mood, '');
    assert.equal(body.request.ageBand, '4-6');

    assert.equal(body.provider, 'local');
    assert.equal(Array.isArray(body.storyMap), true);
    assert.equal(body.storyMap.length, 5);

    // normalizeInputs applied FALLBACKS.hero internally
    assert.match(body.storyText, /Luna the little fox/);
    assert.ok(body.wordCount >= 350);
  });

  test('POST /v1/story/generate with invalid JSON returns 400', async () => {
    const res = await fetch(`${BASE_URL}/v1/story/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'this is not json{'
    });

    assert.equal(res.status, 400);

    const body = await res.json();
    assert.equal(body.error, 'Invalid JSON payload');
  });

  test('GET /unknown-route returns 404', async () => {
    const res = await fetch(`${BASE_URL}/unknown-route`);

    assert.equal(res.status, 404);

    const body = await res.json();
    assert.equal(body.error, 'Not found');
  });
});
