#!/bin/bash
# Writes .env.local from Codespaces secrets.
# If a secret isn't set yet, the placeholder from .env.local.example is used instead.

get() {
  # $1 = var name, $2 = fallback
  local val="${!1}"
  echo "${val:-$2}"
}

cat > .env.local <<EOF
# Anthropic
ANTHROPIC_API_KEY=$(get ANTHROPIC_API_KEY "sk-ant-...")

# Supabase — server-only
SUPABASE_URL=$(get SUPABASE_URL "https://xxxx.supabase.co")
SUPABASE_SERVICE_ROLE_KEY=$(get SUPABASE_SERVICE_ROLE_KEY "eyJ...")

# Supabase — browser-safe
NEXT_PUBLIC_SUPABASE_URL=$(get NEXT_PUBLIC_SUPABASE_URL "https://xxxx.supabase.co")
NEXT_PUBLIC_SUPABASE_ANON_KEY=$(get NEXT_PUBLIC_SUPABASE_ANON_KEY "eyJ...")

# ElevenLabs TTS
ELEVENLABS_API_KEY=$(get ELEVENLABS_API_KEY "sk_...")
EOF

echo ""
echo "✅  .env.local written."

# Warn if any value still looks like a placeholder
if grep -qE "\.\.\." .env.local; then
  echo "⚠️   Some keys are still placeholders — edit .env.local or add Codespaces secrets."
else
  echo "🎉  All secrets loaded from Codespaces. Run: npm run dev"
fi
