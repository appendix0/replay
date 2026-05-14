import { db } from '@/lib/db'
import { generateOpeningLine } from '@/lib/roleplay-agent'
import type { Message, Scenario } from '@/types'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    const { data: session, error: sessionError } = await db
      .from('sessions')
      .select('*, scenarios(*)')
      .eq('id', id)
      .single()

    if (sessionError || !session) {
      return new Response('Session not found', { status: 404 })
    }
    if (session.status !== 'active') {
      return new Response('Session is not active', { status: 400 })
    }

    // Idempotent: if any message already exists for this session, return turn 1.
    const { data: existing } = await db
      .from('messages')
      .select('*')
      .eq('session_id', id)
      .order('turn_number', { ascending: true })
      .limit(1)

    if (existing && existing.length > 0) {
      return Response.json({ assistant_message: existing[0] as Message, created: false })
    }

    const scenario = session.scenarios as unknown as Scenario
    const opening = await generateOpeningLine(scenario.persona_config)

    const { data: assistantMsg, error: insertError } = await db
      .from('messages')
      .insert({
        session_id: id,
        role: 'assistant',
        content: opening.response,
        turn_number: 1,
        input_tokens: opening.usage.input_tokens,
        output_tokens: opening.usage.output_tokens,
      })
      .select()
      .single()

    if (insertError) throw insertError

    await db
      .from('sessions')
      .update({
        total_input_tokens: session.total_input_tokens + opening.usage.input_tokens,
        total_output_tokens: session.total_output_tokens + opening.usage.output_tokens,
      })
      .eq('id', id)

    return Response.json({ assistant_message: assistantMsg as Message, created: true })
  } catch (err) {
    console.error('[opening] error:', err)
    const message = err instanceof Error ? err.message : 'Failed to generate opening'
    return new Response(message, { status: 500 })
  }
}
