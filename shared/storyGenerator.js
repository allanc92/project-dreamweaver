const FALLBACKS = {
  hero: 'Luna the little fox',
  setting: 'the whispering meadow',
  goal: 'find the missing rainbow kite',
  mood: 'cozy'
};

const VALID_AGE_BANDS = new Set(['2-3', '4-6']);

function normalizeText(value, fallback) {
  if (!value || typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function normalizeInputs({ hero, setting, goal, mood, ageBand }) {
  return {
    hero: normalizeText(hero, FALLBACKS.hero),
    setting: normalizeText(setting, FALLBACKS.setting),
    goal: normalizeText(goal, FALLBACKS.goal),
    mood: normalizeText(mood, FALLBACKS.mood),
    ageBand: VALID_AGE_BANDS.has(ageBand) ? ageBand : '4-6'
  };
}

function buildPromptContext(safe) {
  return `Hero: ${safe.hero}\nSetting: ${safe.setting}\nGoal: ${safe.goal}\nMood: ${safe.mood}\nAge band: ${safe.ageBand}`;
}

function assertStoryMap(map) {
  if (!Array.isArray(map) || map.length !== 5) {
    throw new Error('Story map must contain exactly 5 beats.');
  }

  map.forEach((beat, index) => {
    if (typeof beat?.title !== 'string' || typeof beat?.summary !== 'string') {
      throw new Error(`Beat ${index + 1} is malformed.`);
    }
  });
}

function parseJsonFromModel(raw) {
  if (!raw || typeof raw !== 'string') {
    throw new Error('Model returned empty response.');
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('Model did not return valid JSON.');
  }
}

function buildDeterministicStoryMap(safe) {
  return [
    {
      beat: 1,
      title: 'Beginning',
      summary: `${safe.hero} wakes up in ${safe.setting}, feeling ${safe.mood} and ready for a new day.`
    },
    {
      beat: 2,
      title: 'Problem',
      summary: `A challenge appears: ${safe.goal}, and it seems tricky at first.`
    },
    {
      beat: 3,
      title: 'Try',
      summary: `${safe.hero} asks for help, explores carefully, and tries a first plan.`
    },
    {
      beat: 4,
      title: 'Turn',
      summary: `A kind friend shares a smart idea, and the mission starts to work.`
    },
    {
      beat: 5,
      title: 'Happy Wrap',
      summary: `${safe.hero} completes the mission, celebrates with friends, and ends the day calm and proud.`
    }
  ];
}

function buildDeterministicStoryText(safe, storyMap) {
  const pacing = safe.ageBand === '2-3'
    ? 'Short sentences and gentle repetition keep the story easy to follow.'
    : 'Simple dialogue and playful details keep the story expressive and clear.';

  const detailBlocks = [
    `${safe.hero} stretches, listens to the sounds around ${safe.setting}, and says, "Today feels ${safe.mood}, and I am ready." ${pacing}`,
    `Soon, everyone learns that the mission is to ${safe.goal}. ${safe.hero} takes a deep breath and promises to stay kind, brave, and careful.`,
    `${safe.hero} tries one idea, then another, and notices clues in colors, sounds, and tiny footprints. Each step teaches patience.`,
    `A helper arrives with encouragement: "You can do this one small step at a time." ${safe.hero} smiles, adjusts the plan, and keeps going.`,
    `At last, the mission succeeds. Friends cheer, share snacks, and talk about what they learned. The day ends warm, safe, and happy.`
  ];

  let story = storyMap
    .map((beat, i) => `${beat.title}: ${beat.summary} ${detailBlocks[i] || ''}`)
    .join('\n\n');

  const filler = `\n\n${safe.hero} remembers that teamwork, listening, and kindness make every adventure better. Back in ${safe.setting}, everyone repeats the best part of the day and giggles together.`;
  while (story.split(/\s+/).length < 420) story += filler;
  return story;
}

async function azureChatCompletion(messages, { json = false } = {}) {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-06-01';

  if (!endpoint || !apiKey || !deployment) {
    throw new Error('Azure OpenAI is not fully configured.');
  }

  const url = `${endpoint.replace(/\/$/, '')}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;
  const body = {
    messages,
    temperature: 0.7,
    ...(json ? { response_format: { type: 'json_object' } } : {})
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Azure OpenAI request failed (${response.status}): ${text}`);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (!content) throw new Error('Azure OpenAI returned empty content.');
  return content;
}

async function buildStoryMapWithAzure(safe) {
  const content = await azureChatCompletion([
    {
      role: 'system',
      content:
        'You generate story maps for children ages 2-6. Return only JSON with key "storyMap" as an array of exactly 5 beats. Each beat must include: beat (1-5), title, summary.'
    },
    {
      role: 'user',
      content: `Create a five-beat map. Keep tone warm and safe.\n${buildPromptContext(safe)}`
    }
  ], { json: true });

  const parsed = parseJsonFromModel(content);
  const storyMap = parsed.storyMap;
  assertStoryMap(storyMap);
  return storyMap;
}

async function buildStoryTextWithAzure(safe, storyMap) {
  const content = await azureChatCompletion([
    {
      role: 'system',
      content:
        'You write child-friendly stories for co-reading. Keep conflict gentle and safe. Return only JSON with key "storyText" containing around 450 words.'
    },
    {
      role: 'user',
      content: `Write a story from this map and context.\nContext:\n${buildPromptContext(safe)}\nStory map:\n${JSON.stringify(storyMap)}`
    }
  ], { json: true });

  const parsed = parseJsonFromModel(content);
  if (typeof parsed.storyText !== 'string' || parsed.storyText.split(/\s+/).length < 300) {
    throw new Error('Model returned invalid story text.');
  }
  return parsed.storyText;
}

function getProvider() {
  return process.env.LLM_PROVIDER || 'local';
}

export async function buildStory(inputs) {
  const safe = normalizeInputs(inputs || {});
  const provider = getProvider();

  let storyMap;
  let storyText;

  if (provider === 'azure') {
    storyMap = await buildStoryMapWithAzure(safe);
    storyText = await buildStoryTextWithAzure(safe, storyMap);
  } else {
    storyMap = buildDeterministicStoryMap(safe);
    storyText = buildDeterministicStoryText(safe, storyMap);
  }

  return {
    provider,
    storyMap,
    storyText,
    wordCount: storyText.split(/\s+/).length
  };
}

export function buildStoryMap(inputs) {
  const safe = normalizeInputs(inputs || {});
  return buildDeterministicStoryMap(safe);
}
