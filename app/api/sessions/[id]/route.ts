import { db } from '@/lib/db'

export async function GET(
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

    const { data: messages, error: msgError } = await db
      .from('messages')
      .select('*')
      .eq('session_id', id)
      .order('turn_number', { ascending: true })

    if (msgError) throw msgError

    return Response.json({ session, messages: messages ?? [] })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch session'
    return new Response(message, { status: 500 })
  }
}
