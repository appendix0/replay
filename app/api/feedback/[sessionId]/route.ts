import { db } from '@/lib/db'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { sessionId } = await params

    const { data: report, error } = await db
      .from('feedback_reports')
      .select('*')
      .eq('session_id', sessionId)
      .single()

    if (error || !report) {
      return new Response('Feedback report not found', { status: 404 })
    }

    return Response.json({ report })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch feedback'
    return new Response(message, { status: 500 })
  }
}
