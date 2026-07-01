// In-memory data layer — a drop-in for the Supabase client.
//
// RE:PLAY's demo flow needs no external database: auth is bypassed and history
// isn't the point. This exposes the exact slice of the supabase-js query builder
// the routes use (.from().select()/.insert()/.update(), .eq/.order/.limit/.single,
// plus the scenarios(...) embed), backed by process-local arrays. Data lives for
// the life of the server — swap this file back for a real Supabase client if you
// ever want durable storage.

import type { Scenario } from '@/types'

const uuid = () => globalThis.crypto.randomUUID()

// ── Seed scenarios (mirrors supabase/schema.sql) ─────────────────────────────
const SCENARIOS: Scenario[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    title: '거절 연습',
    description: '동료의 무리한 부탁을 정중하게 거절하는 연습입니다.',
    difficulty: 'beginner',
    created_at: '2026-01-01T00:00:01.000Z',
    persona_config: {
      name: '박 대리',
      personality: '친근하지만 부탁이 많은 동료',
      scenario: '야근이 많은 시기에 자신의 업무를 대신 해달라고 부탁하는 상황',
      aggression: 0.2,
      volatility: 0.3,
      patience: 0.7,
      language: 'ko',
      system_prompt:
        '당신은 박 대리입니다. 친근하고 사교적인 성격이지만, 자신의 업무를 다른 사람에게 떠넘기려는 경향이 있습니다. 상대방이 거절하면 처음에는 조금 더 설득하려 하지만, 강하게 거절하면 이해하는 척 물러납니다. 자연스러운 한국어 직장 대화체를 사용하세요.',
      tts_voice_id: 'bIHbv24MWmeRgasZH58o',
    },
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    title: '갈등 대응',
    description: '공격적인 상사에게 감정적으로 대응하지 않고 상황을 관리하는 연습입니다.',
    difficulty: 'intermediate',
    created_at: '2026-01-01T00:00:02.000Z',
    persona_config: {
      name: '김 팀장',
      personality: '엄격하고 성급한 팀장',
      scenario: '바쁜 시기에 직원이 휴가를 요청하는 상황',
      aggression: 0.7,
      volatility: 0.5,
      patience: 0.2,
      language: 'ko',
      system_prompt:
        '당신은 김 팀장입니다. 엄격하고 결과 중심적인 성격으로, 팀원들에게 높은 기준을 요구합니다. 말투는 직설적이고 때로는 무뚝뚝합니다. 부하직원의 요청에 처음에는 부정적으로 반응하지만, 논리적이고 침착한 대응에는 조금씩 입장을 바꿀 수 있습니다. 자연스러운 한국어 직장 대화체를 사용하세요.',
      tts_voice_id: 'nPczCjzI2devNBz1zQrb',
    },
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    title: '연봉 협상',
    description: 'HR 담당자와 연봉 협상을 성공적으로 이끄는 연습입니다.',
    difficulty: 'advanced',
    created_at: '2026-01-01T00:00:03.000Z',
    persona_config: {
      name: '이 과장',
      personality: '전략적이고 예산을 중시하는 HR 담당자',
      scenario: '연봉 인상을 요청하는 면담 상황',
      aggression: 0.3,
      volatility: 0.2,
      patience: 0.6,
      language: 'ko',
      system_prompt:
        '당신은 이 과장, HR 팀의 베테랑 담당자입니다. 회사 예산과 내부 정책을 철저히 따르며, 협상에서 쉽게 양보하지 않습니다. 하지만 직원의 성과와 시장 가치에 대한 논리적인 근거를 제시하면 협상 여지가 있습니다. 정중하지만 단호한 말투를 사용하며, 자연스러운 한국어 직장 대화체를 사용하세요.',
      tts_voice_id: 'cjVigY5qzO86Huf0OWal',
    },
  },
]

type Row = Record<string, unknown>

const store: Record<string, Row[]> = {
  scenarios: SCENARIOS as unknown as Row[],
  users: [],
  sessions: [],
  messages: [],
  feedback_reports: [],
}

// Column defaults applied on insert (mirrors the schema's DEFAULT clauses).
const defaults: Record<string, () => Row> = {
  sessions: () => ({
    id: uuid(),
    user_id: null,
    started_at: new Date().toISOString(),
    ended_at: null,
    overall_score: null,
    status: 'active',
    total_input_tokens: 0,
    total_output_tokens: 0,
  }),
  messages: () => ({
    id: uuid(),
    turn_number: 0,
    appropriateness_score: null,
    coherence_score: null,
    tone_score: null,
    input_tokens: null,
    output_tokens: null,
    created_at: new Date().toISOString(),
  }),
  feedback_reports: () => ({
    id: uuid(),
    summary: null,
    safety_notice: null,
    raw_analysis: null,
    created_at: new Date().toISOString(),
  }),
  users: () => ({ id: uuid(), created_at: new Date().toISOString() }),
  scenarios: () => ({ id: uuid(), created_at: new Date().toISOString() }),
}

interface Result {
  // Loosely typed on purpose — mirrors supabase-js, whose rows are `any` so
  // routes can read row properties without generic table typings.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
  error: { code?: string; message: string } | null
}

class Query implements PromiseLike<Result> {
  private filters: Array<[string, unknown]> = []
  private orderBy: { col: string; ascending: boolean } | null = null
  private limitN: number | null = null
  private op: 'select' | 'insert' | 'update' | 'upsert' = 'select'
  private columns = '*'
  private payload: Row | Row[] | null = null
  private returning = false
  private singleRow = false

  constructor(private table: string) {}

  select(cols = '*') {
    if (this.op === 'select') this.columns = cols
    else this.returning = true
    return this
  }
  insert(obj: Row | Row[]) {
    this.op = 'insert'
    this.payload = obj
    return this
  }
  update(obj: Row) {
    this.op = 'update'
    this.payload = obj
    return this
  }
  upsert(obj: Row | Row[], _options?: { onConflict?: string; ignoreDuplicates?: boolean }) {
    this.op = 'upsert'
    this.payload = obj
    return this
  }
  eq(col: string, val: unknown) {
    this.filters.push([col, val])
    return this
  }
  order(col: string, opts?: { ascending?: boolean }) {
    this.orderBy = { col, ascending: opts?.ascending ?? true }
    return this
  }
  limit(n: number) {
    this.limitN = n
    return this
  }
  single() {
    this.singleRow = true
    return this
  }

  then<R1 = Result, R2 = never>(
    onfulfilled?: ((value: Result) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ): Promise<R1 | R2> {
    return Promise.resolve(this.run()).then(onfulfilled, onrejected)
  }

  private matches(row: Row) {
    return this.filters.every(([c, v]) => row[c] === v)
  }

  // Expand a "scenarios(...)" embed the way PostgREST would for a FK.
  private embed(row: Row): Row {
    const m = this.columns.match(/scenarios\s*\(([^)]*)\)/)
    if (!m || !row.scenario_id) return row
    const scen = store.scenarios.find((s) => s.id === row.scenario_id) ?? null
    const fields = m[1].trim()
    let embedded: Row | null = scen
    if (scen && fields && fields !== '*') {
      embedded = {}
      for (const f of fields.split(',').map((s) => s.trim())) embedded[f] = scen[f]
    }
    return { ...row, scenarios: embedded }
  }

  private run(): Result {
    const table = store[this.table] ?? (store[this.table] = [])

    if (this.op === 'insert') {
      const rows = Array.isArray(this.payload) ? this.payload : [this.payload as Row]
      const inserted = rows.map((r) => ({ ...(defaults[this.table]?.() ?? { id: uuid() }), ...r }))
      table.push(...inserted)
      if (!this.returning) return { data: null, error: null }
      return { data: this.singleRow ? inserted[0] : inserted, error: null }
    }

    if (this.op === 'update') {
      const targets = table.filter((r) => this.matches(r))
      for (const r of targets) Object.assign(r, this.payload)
      if (!this.returning) return { data: null, error: null }
      return { data: this.singleRow ? (targets[0] ?? null) : targets, error: null }
    }

    if (this.op === 'upsert') {
      const rows = Array.isArray(this.payload) ? this.payload : [this.payload as Row]
      for (const r of rows) {
        const existing = table.find((x) => x.id === r.id)
        if (existing) Object.assign(existing, r)
        else table.push({ ...(defaults[this.table]?.() ?? {}), ...r })
      }
      return { data: null, error: null }
    }

    // select
    let rows = table.filter((r) => this.matches(r))
    if (this.orderBy) {
      const { col, ascending } = this.orderBy
      rows = [...rows].sort((a, b) => {
        const av = a[col] as never
        const bv = b[col] as never
        return (av > bv ? 1 : av < bv ? -1 : 0) * (ascending ? 1 : -1)
      })
    }
    if (this.limitN != null) rows = rows.slice(0, this.limitN)
    rows = rows.map((r) => this.embed(r))

    if (this.singleRow) {
      if (rows.length === 0) return { data: null, error: { code: 'PGRST116', message: 'No rows found' } }
      return { data: rows[0], error: null }
    }
    return { data: rows, error: null }
  }
}

export const db = {
  from(table: string) {
    return new Query(table)
  },
  // Present so routes that touch auth admin don't crash; unused in the bypass flow.
  auth: {
    admin: {
      async getUserById(
        _id: string,
      ): Promise<{ data: { user: { email?: string } | null }; error: null }> {
        return { data: { user: null }, error: null }
      },
    },
  },
}
