# DreamWeaver

DreamWeaver is a parent + child creative sandbox for generating personalized children's stories. Stories are generated with Azure OpenAI and read aloud directly on the phone via the mobile app.

## Project Structure

- `mobile/App.js` – React Native (Expo) UI: story form, story output, and Read Aloud playback.
- `mobile/package.json` – Mobile app dependencies (Expo 52, expo-av).
- `mobile/app.json` – Expo project configuration.
- `mobile/eas.json` – EAS Build configuration for Android APK and iOS builds.
- `server/index.js` – Node HTTP server: story generation and TTS endpoints.
- `shared/storyGenerator.js` – Story generation and TTS orchestration with Azure OpenAI.
- `tests/storyGenerator.test.js` – Unit tests for story map and story text generation.
- `tests/server.e2e.test.js` – End-to-end tests for the HTTP server.
- `Dockerfile` – Container image for cloud deployment.

## Azure AI Foundry Setup

Create two deployments in [Azure AI Foundry](https://ai.azure.com):

| Purpose | Model |
|---------|-------|
| Story generation | `gpt-4.1-mini` |
| Text-to-speech | `gpt-4o-mini-tts` |

### Environment variables

Copy `.env.example` to `.env` and fill in your values — `.env` is gitignored and should never be committed.

```bash
cp .env.example .env
# then edit .env with your real endpoint, key, and deployment names
```

For a quick local test you can also export inline:

```bash
export LLM_PROVIDER=azure
export AZURE_OPENAI_ENDPOINT="https://<resource>.openai.azure.com"
export AZURE_OPENAI_API_KEY="<key>"
export AZURE_OPENAI_DEPLOYMENT="<your-llm-deployment-name>"
export AZURE_OPENAI_TTS_DEPLOYMENT="<your-tts-deployment-name>"
export AZURE_OPENAI_API_VERSION="2025-01-01-preview"
```

## Run the server locally

```bash
npm run start:server
```

Server defaults to `http://localhost:8787`.

### Local fallback mode (no Azure)

Omit all `AZURE_*` env vars. The server uses a deterministic story generator (no TTS in this mode).

## Run the mobile app

### Tonight — Expo Go (fastest path, both iOS and Android)

1. Install **Expo Go** from the App Store or Google Play.
2. Set the API base URL to your server's LAN IP or cloud URL:
   ```bash
   export EXPO_PUBLIC_API_BASE_URL="http://<your-server-ip>:8787"
   ```
3. In the `mobile/` directory:
   ```bash
   npm install
   npx expo start
   ```
4. Scan the QR code with Expo Go on your phone.

> **Tip**: If your phone and laptop are on the same Wi-Fi, use `ifconfig` / `ipconfig` to find your laptop's LAN IP.

### Permanent install — Android APK (no store required)

Build a shareable `.apk` with [EAS Build](https://docs.expo.dev/build/introduction/):

```bash
cd mobile
npm install -g eas-cli
eas build --platform android --profile preview
```

EAS Build will upload to Expo's build service and return a download link you can share directly (email, Messages, etc.).

### iOS — TestFlight

Requires an Apple Developer account ($99/yr):

```bash
eas build --platform ios --profile production
eas submit --platform ios
```

## Cloud deployment (Docker)

Deploy the server to any Docker-compatible host (Azure Container Apps, Fly.io, etc.):

```bash
# Build the image
docker build -t dreamweaver .

# Run with env vars
docker run -p 8787:8787 --env-file .env dreamweaver
```

Once deployed, set `EXPO_PUBLIC_API_BASE_URL` to the public HTTPS URL of your container.

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
  "request": { "hero": "Milo the koala", "setting": "moonlit beach", "goal": "return a glowing shell", "mood": "silly", "ageBand": "4-6" },
  "provider": "azure",
  "storyMap": [{ "beat": 1, "title": "Beginning", "summary": "..." }],
  "storyText": "...",
  "wordCount": 451
}
```

### `POST /v1/story/speak`

Request body:

```json
{ "text": "<story text to synthesise>" }
```

Response body:

```json
{ "audioBase64": "<base64-encoded MP3>" }
```

Requires `AZURE_OPENAI_TTS_DEPLOYMENT` to be set. Returns 500 if TTS is not configured.

## Testing

```bash
npm test            # unit tests
npm run test:e2e    # end-to-end (spawns real server)
npm run test:all    # both
npm run check       # syntax validation
```

## Next Steps (Phase 2)

1. Add persistent session logs for quality review.
2. Add retry/fallback policy for malformed model responses.
3. Add Yoto publish integration once API approval is granted.
