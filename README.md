# RE:PLAY — 한국어 대화 훈련 시뮬레이터

AI 캐릭터와 실전 대화를 연습하고 즉각적인 피드백을 받는 트레이닝 앱입니다.

**Stack:** Next.js 16 · Supabase · Anthropic Claude · ElevenLabs TTS · Ready Player Me (Three.js)

---

## Run in GitHub Codespaces (fastest)

### Step 1 — Add your secrets

Go to your GitHub repo → **Settings → Secrets and variables → Codespaces → New repository secret**

Add these 6 secrets:

| Secret name | Where to get it |
|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |
| `SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → service_role key |
| `NEXT_PUBLIC_SUPABASE_URL` | Same as `SUPABASE_URL` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon/public key |
| `ELEVENLABS_API_KEY` | elevenlabs.io → Profile → API Keys |

### Step 2 — Set up the database

1. Open your Supabase project → **SQL Editor**
2. Paste the contents of `supabase/schema.sql` and run it
3. This creates all tables and seeds the 3 starter scenarios

### Step 3 — Open in Codespaces

Click **Code → Codespaces → Create codespace on main**

The container will:
- Install dependencies
- Auto-write `.env.local` from your secrets
- Print a message telling you if any secrets are missing

### Step 4 — Run the app

```bash
npm run dev
```

The browser opens automatically at port 3000. Log in with any email — a magic link is sent via Supabase.

---

## Set up 3D avatars (optional)

The app works with SVG avatars by default. To enable the Ready Player Me 3D characters:

1. Go to [readyplayer.me/avatar](https://readyplayer.me/avatar) — free, no account required
2. Create an avatar, then copy its share URL: `https://models.readyplayer.me/<UUID>.glb`
3. In Supabase → Table Editor → `scenarios`, update `persona_config` and set `"avatar_id": "<UUID>"`

No RPM API key needed — avatars load from their public CDN.

---

## Change TTS voices (optional)

Each scenario has a default ElevenLabs voice ID in `persona_config.tts_voice_id`.
Browse voices at [elevenlabs.io/voice-library](https://elevenlabs.io/voice-library) and copy the Voice ID.
Update it in Supabase → `scenarios → persona_config → tts_voice_id`.

All voices work in Korean via the `eleven_multilingual_v2` model.

---

## Local development

```bash
cp .env.local.example .env.local
# fill in .env.local with your keys

npm install
npm run dev
```
