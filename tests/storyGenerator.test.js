import test from 'node:test';
import assert from 'node:assert/strict';

import { buildStory, buildStoryMap } from '../shared/storyGenerator.js';

test('buildStoryMap returns 5 beats', () => {
  const map = buildStoryMap({
    hero: 'Nia',
    setting: 'the red forest',
    goal: 'find a lantern',
    mood: 'cozy'
  });

  assert.equal(map.length, 5);
  assert.equal(map[0].title, 'Beginning');
  assert.equal(map[4].title, 'Happy Wrap');
});

test('buildStory returns local provider story text in expected range', async () => {
  process.env.LLM_PROVIDER = 'local';

  const result = await buildStory({
    hero: 'Nia',
    setting: 'the red forest',
    goal: 'find a lantern',
    mood: 'cozy',
    ageBand: '4-6'
  });

  assert.equal(result.provider, 'local');
  assert.ok(result.wordCount >= 420);
  assert.ok(result.wordCount <= 650);
  assert.equal(result.storyMap.length, 5);
  assert.match(result.storyText, /Beginning:/);
});
