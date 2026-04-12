-- RE:PLAY Database Schema
-- Run this in Supabase SQL editor

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- =====================
-- Table: users
-- =====================
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamptz not null default now(),
  session_count integer not null default 0,
  avg_score numeric(5, 2) not null default 0,
  credits integer not null default 3  -- free tier: 3 sessions
);

-- =====================
-- Table: scenarios
-- =====================
create table if not exists scenarios (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  difficulty text not null check (difficulty in ('beginner', 'intermediate', 'advanced')),
  persona_config jsonb not null,
  created_at timestamptz not null default now()
);

-- =====================
-- Table: sessions
-- =====================
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  scenario_id uuid not null references scenarios(id),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  overall_score numeric(5, 2),
  status text not null default 'active' check (status in ('active', 'completed', 'abandoned')),
  total_input_tokens integer not null default 0,
  total_output_tokens integer not null default 0
);

-- =====================
-- Table: messages
-- =====================
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  turn_number integer not null,
  -- Evaluation scores (null for assistant messages)
  appropriateness_score numeric(4, 2),
  coherence_score numeric(4, 2),
  tone_score numeric(4, 2),
  -- Token tracking
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz not null default now()
);

-- =====================
-- Table: feedback_reports
-- =====================
create table if not exists feedback_reports (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references sessions(id) on delete cascade,
  overall_score numeric(5, 2) not null,
  axis_scores jsonb not null,
  -- { appropriateness: { avg, examples }, coherence: {...}, tone: {...} }
  improvements jsonb not null,
  -- ["suggestion 1", "suggestion 2", "suggestion 3"]
  raw_analysis text,
  created_at timestamptz not null default now()
);

-- =====================
-- Indexes
-- =====================
create index if not exists messages_session_id_idx on messages(session_id);
create index if not exists messages_turn_number_idx on messages(session_id, turn_number);
create index if not exists sessions_user_id_idx on sessions(user_id);
create index if not exists sessions_status_idx on sessions(status);
create index if not exists feedback_reports_session_id_idx on feedback_reports(session_id);

-- =====================
-- Seed: Built-in Scenarios
-- =====================
--
-- avatar_id   → Ready Player Me avatar UUID (no API key required).
--               Create a free avatar at https://readyplayer.me/avatar
--               Copy the UUID from the share URL and paste it below.
--               Example URL: https://models.readyplayer.me/<UUID>.glb
--               Leave null to fall back to the built-in SVG avatar.
--
-- tts_voice_id → ElevenLabs voice ID from https://elevenlabs.io/voice-library
--               The IDs below are real public voices from ElevenLabs' default
--               library (eleven_multilingual_v2 supports Korean for all of them).
--               Replace with cloned/custom voice IDs if you want a better match.
--
insert into scenarios (title, description, difficulty, persona_config) values
(
  '거절 연습',
  '동료의 무리한 부탁을 정중하게 거절하는 연습입니다.',
  'beginner',
  '{
    "name": "박 대리",
    "personality": "친근하지만 부탁이 많은 동료",
    "scenario": "야근이 많은 시기에 자신의 업무를 대신 해달라고 부탁하는 상황",
    "aggression": 0.2,
    "volatility": 0.3,
    "patience": 0.7,
    "language": "ko",
    "system_prompt": "당신은 박 대리입니다. 친근하고 사교적인 성격이지만, 자신의 업무를 다른 사람에게 떠넘기려는 경향이 있습니다. 상대방이 거절하면 처음에는 조금 더 설득하려 하지만, 강하게 거절하면 이해하는 척 물러납니다. 자연스러운 한국어 직장 대화체를 사용하세요.",
    "avatar_id": null,
    "tts_voice_id": "pNInz6obpgDQGcFmaJgB"
  }'::jsonb
),
(
  '갈등 대응',
  '공격적인 상사에게 감정적으로 대응하지 않고 상황을 관리하는 연습입니다.',
  'intermediate',
  '{
    "name": "김 팀장",
    "personality": "엄격하고 성급한 팀장",
    "scenario": "바쁜 시기에 직원이 휴가를 요청하는 상황",
    "aggression": 0.7,
    "volatility": 0.5,
    "patience": 0.2,
    "language": "ko",
    "system_prompt": "당신은 김 팀장입니다. 엄격하고 결과 중심적인 성격으로, 팀원들에게 높은 기준을 요구합니다. 말투는 직설적이고 때로는 무뚝뚝합니다. 부하직원의 요청에 처음에는 부정적으로 반응하지만, 논리적이고 침착한 대응에는 조금씩 입장을 바꿀 수 있습니다. 자연스러운 한국어 직장 대화체를 사용하세요.",
    "avatar_id": null,
    "tts_voice_id": "VR6AewLTigWG4xSOukaG"
  }'::jsonb
),
(
  '연봉 협상',
  'HR 담당자와 연봉 협상을 성공적으로 이끄는 연습입니다.',
  'advanced',
  '{
    "name": "이 과장",
    "personality": "전략적이고 예산을 중시하는 HR 담당자",
    "scenario": "연봉 인상을 요청하는 면담 상황",
    "aggression": 0.3,
    "volatility": 0.2,
    "patience": 0.6,
    "language": "ko",
    "system_prompt": "당신은 이 과장, HR 팀의 베테랑 담당자입니다. 회사 예산과 내부 정책을 철저히 따르며, 협상에서 쉽게 양보하지 않습니다. 하지만 직원의 성과와 시장 가치에 대한 논리적인 근거를 제시하면 협상 여지가 있습니다. 정중하지만 단호한 말투를 사용하며, 자연스러운 한국어 직장 대화체를 사용하세요.",
    "avatar_id": null,
    "tts_voice_id": "21m00Tcm4TlvDq8ikWAM"
  }'::jsonb
)
on conflict do nothing;
