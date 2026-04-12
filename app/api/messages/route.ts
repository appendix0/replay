import { db } from '@/lib/db'
import { generateRoleplayResponse } from '@/lib/roleplay-agent'
import { evaluateUserUtterance } from '@/lib/evaluation-agent'
import type { SendMessageRequest, SendMessageResponse, Scenario, Message } from '@/types'

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SendMessageRequest

    if (!body.session_id || !body.content?.trim()) {
      return new Response('session_id and content are required', { status: 400 })
    }

    // Fetch session + scenario
    const { data: session, error: sessionError } = await db
      .from('sessions')
      .select('*, scenarios(*)')
      .eq('id', body.session_id)
      .single()

    if (sessionError || !session) {
      return new Response('Session not found', { status: 404 })
    }

    if (session.status !== 'active') {
      return new Response('Session is not active', { status: 400 })
    }

    const scenario = session.scenarios as unknown as Scenario

    // Fetch conversation history for context
    const { data: history, error: historyError } = await db
      .from('messages')
      .select('role, content')
      .eq('session_id', body.session_id)
      .order('turn_number', { ascending: true })

    if (historyError) throw historyError

    const conversationHistory = (history ?? []) as Array<{ role: 'user' | 'assistant'; content: string }>
    const nextTurn = conversationHistory.length + 1

    // Build history including this new user message for roleplay context
    const historyWithNew = [
      ...conversationHistory,
      { role: 'user' as const, content: body.content },
    ]

    // =====================
    // PARALLEL PIPELINE
    // Roleplay agent + Evaluation agent run simultaneously
    // =====================
    const [roleplayResult, evalResult] = await Promise.all([
      generateRoleplayResponse(scenario.persona_config, historyWithNew),
      evaluateUserUtterance({
        scenario_title: scenario.title,
        scenario_description: scenario.description,
        conversation_history: conversationHistory,
        user_utterance: body.content,
      }),
    ])

    // Persist user message with evaluation scores
    const { data: userMsg, error: userMsgError } = await db
      .from('messages')
      .insert({
        session_id: body.session_id,
        role: 'user',
        content: body.content,
        turn_number: nextTurn,
        appropriateness_score: evalResult.scores.appropriateness,
        coherence_score: evalResult.scores.coherence,
        tone_score: evalResult.scores.tone,
        input_tokens: evalResult.usage.input_tokens,
        output_tokens: evalResult.usage.output_tokens,
      })
      .select()
      .single()

    if (userMsgError) throw userMsgError

    // Persist assistant message
    const { data: assistantMsg, error: assistantMsgError } = await db
      .from('messages')
      .insert({
        session_id: body.session_id,
        role: 'assistant',
        content: roleplayResult.response,
        turn_number: nextTurn + 1,
        input_tokens: roleplayResult.usage.input_tokens,
        output_tokens: roleplayResult.usage.output_tokens,
      })
      .select()
      .single()

    if (assistantMsgError) throw assistantMsgError

    // Update session token totals
    const totalNewInputTokens = roleplayResult.usage.input_tokens + evalResult.usage.input_tokens
    const totalNewOutputTokens = roleplayResult.usage.output_tokens + evalResult.usage.output_tokens

    await db
      .from('sessions')
      .update({
        total_input_tokens: session.total_input_tokens + totalNewInputTokens,
        total_output_tokens: session.total_output_tokens + totalNewOutputTokens,
      })
      .eq('id', body.session_id)

    return Response.json({
      user_message: userMsg as Message,
      assistant_message: assistantMsg as Message,
      evaluation: evalResult.scores,
      turn_number: nextTurn,
    } satisfies SendMessageResponse)
  } catch (err) {
    const message = err instanceof Error
      ? `${err.constructor.name}: ${err.message}`
      : JSON.stringify(err)
    return new Response(message, { status: 500 })
  }
}
