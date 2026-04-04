import { db } from '@/lib/db'
import type { CreateSessionRequest, CreateSessionResponse, Session, Scenario } from '@/types'

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateSessionRequest

    if (!body.scenario_id) {
      return new Response('scenario_id is required', { status: 400 })
    }

    // Verify scenario exists
    const { data: scenario, error: scenarioError } = await db
      .from('scenarios')
      .select('*')
      .eq('id', body.scenario_id)
      .single()

    if (scenarioError || !scenario) {
      return new Response('Scenario not found', { status: 404 })
    }

    // Create session
    const { data: session, error: sessionError } = await db
      .from('sessions')
      .insert({
        scenario_id: body.scenario_id,
        user_id: body.user_id ?? null,
        status: 'active',
      })
      .select()
      .single()

    if (sessionError || !session) throw sessionError

    return Response.json({
      session: session as Session,
      scenario: scenario as Scenario,
    } satisfies CreateSessionResponse)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create session'
    return new Response(message, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const user_id = searchParams.get('user_id')

    let query = db
      .from('sessions')
      .select('*, scenarios(title, difficulty)')
      .order('started_at', { ascending: false })
      .limit(20)

    if (user_id) {
      query = query.eq('user_id', user_id)
    }

    const { data, error } = await query
    if (error) throw error

    return Response.json({ sessions: data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch sessions'
    return new Response(message, { status: 500 })
  }
}
