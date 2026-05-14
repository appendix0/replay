# RE:PLAY

**A Korean conversation simulator that helps people practice real-life social interactions and get coaching feedback after every line.**

```
한국어 대화 훈련 시뮬레이터 · Korean Social Communication Trainer
```

---

## Why RE:PLAY exists

For people who struggle with everyday social conversations — whether due to anxiety, neurodivergence, recovery from mental-health treatment, or simply lack of exposure — the gap between *knowing what to say* and *actually saying it* is hard to close on your own. Therapists call this **social skills training**, and in clinical settings it is usually delivered through scripted roleplay with another person. That is effective but expensive, embarrassing, and impossible to access on demand.

RE:PLAY rebuilds that loop with AI:

1. You pick a scenario — a confrontational coworker, a job interview, a difficult conversation with a parent.
2. You talk to the AI character by typing or speaking. They respond in Korean, in character, with realistic emotional tone.
3. After the conversation ends, a separate evaluation model reads the whole transcript and gives you a **100-point report** across five communication axes, with specific things to try next time.

It is a **practice tool**, not a diagnostic tool. The feedback model is explicitly instructed to avoid clinical labels and to focus on actionable behaviors.

---

## Who it is for

- People in recovery or rehabilitation who are rebuilding social confidence.
- Job seekers practicing interviews and difficult workplace conversations.
- Anyone who wants a private, judgment-free place to rehearse a hard conversation before the real one.
- Clinicians and coaches who want a structured supplementary tool for their clients.

---

## How a session works

```
   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
   │  1. Choose   │ ──▶ │  2. Talk     │ ──▶ │  3. Hear &   │ ──▶ │  4. Get      │
   │   scenario   │     │   to AI      │     │   see reply  │     │   report     │
   └──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
    3 presets             type or speak       Korean TTS +          5-axis score
    + custom              in Korean           lip-synced avatar     + improvements
```

**Behind the scenes, two AI models cooperate:**

- A **roleplay model** (Qwen 80B) plays the other person — fluent, in character, never breaking the scene.
- An **evaluation model** (DeepSeek V4 Pro) silently grades each user turn in real time, and produces a structured end-of-session report.

This separation matters: the character never knows it is being graded, so it stays natural; the evaluator never sees the persona's instructions, so its judgment stays neutral.

---

## The five-axis report

Every completed session generates a feedback report scoring the user 0–20 on each of these axes, with a short rationale and a concrete suggestion per axis.

| Axis | Korean | What it measures |
|---|---|---|
| **Communication** | 의사소통 명료성 | Is the message clear, ordered, and on-topic? |
| **Empathy** | 공감 및 정서 인식 | Did the user notice and respond to the other person's feelings? |
| **Assertion** | 자기주장 및 욕구 표현 | Did the user express needs, refusals, and boundaries appropriately? |
| **Regulation** | 자기조절 및 정서 조절 | Did the user stay engaged under tension without shutting down or escalating? |
| **Mutuality** | 상호성 및 사회적 적절성 | Was there back-and-forth, listening, turn-taking? |

A `safety_notice` field flags risk signals (self-harm cues, severe distress) and points the user toward professional resources — never replacing them.

---

## Project structure

```
replay/
│
├── app/                    Next.js 16 routes (App Router)
│   ├── page.tsx               Home — scenario picker + history
│   ├── session/[id]/          Active conversation page
│   ├── session/[id]/feedback  Post-session 5-axis report
│   ├── demo/feedback/         Custom-scenario quick demo
│   ├── liveavatar-test/       Avatar SDK sandbox
│   └── api/                   Server endpoints (see table below)
│
├── lib/                    Server logic
│   ├── nvidia.ts              NVIDIA NIM client + model IDs
│   ├── roleplay-agent.ts      Qwen — character dialog
│   ├── evaluation-agent.ts    DeepSeek — per-turn scoring
│   ├── feedback-agent.ts      DeepSeek — end-of-session report
│   ├── db.ts                  Supabase server client
│   └── supabase-browser.ts    Supabase browser client
│
├── supabase/
│   └── schema.sql          Tables + seed scenarios
│
├── types/
│   └── index.ts            Shared TypeScript types
│
└── .devcontainer/          GitHub Codespaces setup
```

### Service architecture

```
                ┌─────────────────────────────────────────────────┐
                │                  Browser (Next.js)              │
                │  scenario picker · chat UI · avatar · TTS       │
                └────────────────────────┬────────────────────────┘
                                         │
                              REST + Server Actions
                                         │
        ┌────────────────────────────────┼────────────────────────────────┐
        ▼                                ▼                                ▼
┌──────────────────┐         ┌──────────────────────┐         ┌──────────────────┐
│   NVIDIA NIM     │         │      Supabase        │         │   ElevenLabs +   │
│                  │         │  users · scenarios   │         │     HeyGen       │
│  Qwen  → dialog  │         │  sessions · messages │         │  TTS · avatar    │
│  DeepSeek → eval │         │  feedback_reports    │         │   streaming      │
└──────────────────┘         └──────────────────────┘         └──────────────────┘
```

### API endpoints

| Route | Method | Purpose |
|---|---|---|
| `/api/scenarios` | GET | List available scenarios |
| `/api/sessions` | GET / POST | List user sessions / start a new one |
| `/api/sessions/[id]` | GET | Fetch one session with messages |
| `/api/sessions/[id]/opening` | POST | Generate the persona's opening line |
| `/api/sessions/[id]/end` | POST | Close session and trigger the feedback report |
| `/api/messages` | POST | Submit a user turn → roleplay response + eval scores |
| `/api/feedback/[sessionId]` | GET | Fetch the saved feedback report |
| `/api/tts` | POST | ElevenLabs MP3 for direct playback |
| `/api/tts-pcm` | POST | ElevenLabs PCM 24kHz for LiveAvatar |
| `/api/liveavatar/start` | POST | Mint a LiveAvatar streaming token |
| `/api/debug` | GET | Health check for `NVIDIA_API_KEY` |

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router) + React 19 | Server actions + edge-ready routes in one project |
| Database & auth | Supabase | Postgres, RLS, magic-link auth out of the box |
| Roleplay LLM | NVIDIA NIM — `qwen/qwen3-next-80b-a3b-instruct` | Strongest Korean conversational fluency on the catalog |
| Evaluation LLM | NVIDIA NIM — `deepseek-ai/deepseek-v4-pro` | Best structured-analysis output for rubric scoring |
| TTS | ElevenLabs `eleven_multilingual_v2` | Natural Korean voices, per-scenario voice IDs |
| Avatar | HeyGen LiveAvatar Web SDK | Streaming lip-synced video driven by PCM audio |
| 3D fallback | Three.js + Ready Player Me | Static GLB heads when LiveAvatar is unavailable |

---

## Run in GitHub Codespaces

### 1. Add secrets to your repo

**Settings → Secrets and variables → Codespaces → New repository secret**

| Secret | Where to get it |
|---|---|
| `NVIDIA_API_KEY` | [build.nvidia.com](https://build.nvidia.com) → pick any model → **Get API Key** (starts with `nvapi-`) |
| `SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` key |
| `NEXT_PUBLIC_SUPABASE_URL` | Same as `SUPABASE_URL` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → `anon` key |
| `ELEVENLABS_API_KEY` | [elevenlabs.io](https://elevenlabs.io) → Profile → API Keys |
| `LIVEAVATAR_API_KEY` | HeyGen LiveAvatar console |

### 2. Initialize the database

In Supabase → **SQL Editor**, paste `supabase/schema.sql` and run it. This creates all tables and seeds the three starter scenarios.

### 3. Launch

**Code → Codespaces → Create codespace on main.** The container installs dependencies, writes `.env.local` from your secrets, prints any missing keys, and forwards port 3000.

```bash
npm run dev
```

---

## Run locally

```bash
cp .env.local.example .env.local
# fill in .env.local with the keys listed above

npm install
npm run dev
```

Open http://localhost:3000.

---

## Customizing

### Personas

Each `scenarios` row stores a `persona_config` JSONB:

```json
{
  "name": "김 부장",
  "personality": "권위적이고 성급한",
  "scenario": "회사 회의실, 프로젝트 발표 직후",
  "aggression": 0.7,
  "patience": 0.2,
  "volatility": 0.5,
  "language": "ko",
  "system_prompt": "당신은 ...",
  "tts_voice_id": "ELEVENLABS_VOICE_ID",
  "avatar_id": "OPTIONAL_RPM_OR_HEYGEN_ID"
}
```

Edits in Supabase Table Editor take effect on the next session start — no redeploy needed.

### Voices

Browse [elevenlabs.io/voice-library](https://elevenlabs.io/voice-library), copy a Voice ID, paste it into `persona_config.tts_voice_id`. All voices speak Korean via `eleven_multilingual_v2`.

### 3D avatars (Ready Player Me fallback)

1. Build an avatar at [readyplayer.me/avatar](https://readyplayer.me/avatar) — free, no account.
2. Copy the UUID from the GLB URL: `https://models.readyplayer.me/<UUID>.glb`.
3. Set `persona_config.avatar_id` to that UUID. The CDN serves the model — no key needed.

### Swapping models

Defaults live in `lib/nvidia.ts`:

```ts
export const ROLEPLAY_MODEL = 'qwen/qwen3-next-80b-a3b-instruct'
export const EVAL_MODEL     = 'deepseek-ai/deepseek-v4-pro'
```

Replace with any other NVIDIA NIM chat model ID.

---

## Scripts

```bash
npm run dev      # start Next dev server
npm run build    # production build
npm run start    # serve the production build
npm run lint     # eslint
```

---

## Disclaimer

RE:PLAY is a **practice and self-reflection tool**, not a medical or therapeutic service. The evaluation model is instructed to avoid diagnostic language and to surface a safety notice if a conversation suggests risk — but it cannot replace a clinician. If a session raises concerns about your well-being, please reach out to a qualified professional.
