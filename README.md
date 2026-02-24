# DreamWeaver (Text MVP)

DreamWeaver is a parent + child creative sandbox for generating story maps and full stories quickly.

This branch ships a **mobile-first text-only slice**:
- React Native screen for Hero/Setting/Goal/Mood input (`mobile/App.js`)
- Single API endpoint for generation (`POST /v1/story/generate`)
- Pluggable provider support with Azure OpenAI (`LLM_PROVIDER=azure`) or local fallback (`LLM_PROVIDER=local`)

## Project Structure

- `mobile/App.js` – React Native UI for entering prompts and rendering story output.
- `server/index.js` – Node HTTP server with health and generation endpoints.
- `shared/storyGenerator.js` – story generation orchestration with provider selection.
- `tests/storyGenerator.test.js` – baseline tests for map and story length constraints.

## Run the API

```bash
npm run start:server
```

Server defaults to `http://localhost:8787`.

## Environment

### Local fallback mode (default)

No environment variables needed.

### Azure OpenAI mode

```bash
export LLM_PROVIDER=azure
export AZURE_OPENAI_ENDPOINT="https://<resource>.openai.azure.com"
export AZURE_OPENAI_API_KEY="<key>"
export AZURE_OPENAI_DEPLOYMENT="<deployment-name>"
export AZURE_OPENAI_API_VERSION="2024-06-01"
```

## Mobile API Base URL

`mobile/App.js` uses `EXPO_PUBLIC_API_BASE_URL` if set, otherwise defaults to `http://localhost:8787`.
For physical phone testing, use a LAN URL or tunnel.

## API Contract

### `POST /v1/story/generate`

Request body:

```json
{
  "hero": "Milo the koala",
  "setting": "moonlit beach",
  "goal": "return a glowing shell",
  "mood": "silly",
  "ageBand": "4-6"
}
```

Response body:

```json
{
  "request": {
    "hero": "Milo the koala",
    "setting": "moonlit beach",
    "goal": "return a glowing shell",
    "mood": "silly",
    "ageBand": "4-6"
  },
  "provider": "azure",
  "storyMap": [
    { "beat": 1, "title": "Beginning", "summary": "..." }
  ],
  "storyText": "...",
  "wordCount": 451
}
```

## Checks

```bash
npm run check
npm test
```

## Next Steps

1. Add persistent session logs for quality review.
2. Add retry/fallback policy for malformed model responses.
3. Add Yoto publish integration once API approval is granted.
