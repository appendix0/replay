import { db } from '@/lib/db'
import { generateFeedbackReport } from '@/lib/feedback-agent'
import type { Message, Scenario } from '@/types'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    // Fetch session + scenario
    const { data: session, error: sessionError } = await db
      .from('sessions')
      .select('*, scenarios(*)')
      .eq('id', id)
      .single()

    if (sessionError || !session) {
      return new Response('Session not found', { status: 404 })
    }

    if (session.status !== 'active') {
      return new Response('Session already ended', { status: 400 })
    }

    // Fetch all messages
    const { data: messages, error: msgError } = await db
      .from('messages')
      .select('*')
      .eq('session_id', id)
      .order('turn_number', { ascending: true })

    if (msgError) throw msgError
    if (!messages || messages.length === 0) {
      return new Response('No messages in session', { status: 400 })
    }

    const scenario = session.scenarios as unknown as Scenario

    // Generate feedback report
    const feedback = await generateFeedbackReport(scenario, messages as Message[])

    // Persist feedback report. summary/safety_notice columns may not exist yet
    // in older deployments — retry without them if PostgREST reports schema-cache miss.
    const baseRow = {
      session_id: id,
      overall_score: feedback.overall_score,
      axis_scores: feedback.axis_scores,
      improvements: feedback.improvements,
      raw_analysis: feedback.raw_analysis,
    }
    const fullRow = {
      ...baseRow,
      summary: feedback.summary,
      safety_notice: feedback.safety_notice,
    }

    let { data: report, error: reportError } = await db
      .from('feedback_reports')
      .insert(fullRow)
      .select()
      .single()

    if (reportError?.code === 'PGRST204' || reportError?.code === '42703') {
      console.warn('[end-session] new columns missing, inserting legacy row')
      ;({ data: report, error: reportError } = await db
        .from('feedback_reports')
        .insert(baseRow)
        .select()
        .single())
      if (report) {
        // Surface in-memory values to the client so the UI still renders them
        report = { ...report, summary: feedback.summary, safety_notice: feedback.safety_notice }
      }
    }

    if (reportError) throw reportError

    // Update session status and token totals
    await db
      .from('sessions')
      .update({
        status: 'completed',
        ended_at: new Date().toISOString(),
        overall_score: feedback.overall_score,
        total_input_tokens: session.total_input_tokens + feedback.usage.input_tokens,
        total_output_tokens: session.total_output_tokens + feedback.usage.output_tokens,
      })
      .eq('id', id)

    return Response.json({ report })
  } catch (err) {
    console.error('[end-session] error:', err)
    const message = err instanceof Error ? err.message : 'Failed to end session'
    return new Response(message, { status: 500 })
  }
}
