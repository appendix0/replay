import { db } from '@/lib/db'
import type { Scenario } from '@/types'

export async function GET() {
  try {
    const { data, error } = await db
      .from('scenarios')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) throw error

    return Response.json({ scenarios: data as Scenario[] })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch scenarios'
    return new Response(message, { status: 500 })
  }
}
