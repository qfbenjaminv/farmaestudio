import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { createSupabaseRepository } from './SupabaseStudyRepository'

const here = dirname(fileURLToPath(import.meta.url))

describe('SupabaseStudyRepository', () => {
  it('maps quiz start and answer RPCs without requesting a service role key', async () => {
    const calls: Array<{ fn: string; args: Record<string, unknown> }> = []
    const repo = createSupabaseRepository({
      rpc: async <T,>(fn: string, args: Record<string, unknown> = {}) => {
        calls.push({ fn, args })
        if (fn === 'start_module_quiz') {
          return {
            data: {
              id: 'sess-1',
              kind: 'module',
              requested_length: 20,
              actual_length: 20,
              shortened: false,
              module_id: 'mod-01',
              question_ids: ['q1'],
              current_index: 0,
              cycle_id: 'cyc-1',
              started_at: '2026-08-27T00:00:00.000Z',
            } as T,
            error: null,
          }
        }
        if (fn === 'submit_answer') {
          return {
            data: {
              locked: true,
              correct: true,
              solution: { question_id: 'q1', correct_letter: 'B', explanation: 'ok' },
            } as T,
            error: null,
          }
        }
        return { data: null, error: { message: `unexpected ${fn}` } }
      },
    })

    const session = await repo.startModuleSession('mod-01')
    expect(session.requestedLength).toBe(20)
    const result = await repo.submitAnswer('sess-1', 'q1', 'B')
    expect(result.solution.correctLetter).toBe('B')
    expect(calls.map((call) => call.fn)).toEqual(['start_module_quiz', 'submit_answer'])
  })

  it('maps nullable resume responses without treating them as RPC failures', async () => {
    const repo = createSupabaseRepository({
      rpc: async <T,>() => ({ data: null as T | null, error: null }),
    })

    await expect(repo.resumeSession()).resolves.toBeNull()
  })

  it('does not embed a service-role secret in the adapter source', () => {
    const source = readFileSync(join(here, 'SupabaseStudyRepository.ts'), 'utf8')
    const client = readFileSync(join(here, 'client.ts'), 'utf8')
    expect(`${source}\n${client}`).not.toMatch(/SERVICE_ROLE|service.role|service_role/i)
  })
})
