import type {
  AnswerSubmission,
  ChoiceLetter,
  DataSource,
  Drug,
  DrugSessionLength,
  ProgressSummary,
  QuestionPrompt,
  QuizSession,
  ReferenceEntry,
  ReviewItem,
  StudyModule,
  StudyUser,
  Topic,
} from '../../domain/types'
import type { StudyRepository } from '../../domain/repository'
import { createSupabaseBrowserClient } from './client'

type SupabaseError = { message: string }
type RpcResponse<T> = Promise<{ data: T | null; error: SupabaseError | null }>

type RpcClient = {
  rpc: <T>(fn: string, args?: Record<string, unknown>) => RpcResponse<T>
}

type SupabaseRepositoryOptions =
  | { rpc: RpcClient['rpc'] }
  | { supabaseUrl: string; supabaseAnonKey: string }

type SessionRow = {
  id: string
  user_id?: string
  kind: QuizSession['kind']
  requested_length: number
  actual_length: number
  shortened: boolean
  module_id?: string
  topic_id?: string
  drug_id?: string
  question_ids: string[]
  current_index: number
  cycle_id: string
  started_at: string
  completed_at?: string
}

type SolutionRow = {
  question_id: string
  correct_letter: ChoiceLetter
  explanation: string
}

type AnswerRow = {
  locked: true
  correct: boolean
  solution: SolutionRow
}

function rpcClient(options: SupabaseRepositoryOptions): RpcClient {
  if ('rpc' in options) {
    return { rpc: options.rpc }
  }

  const client = createSupabaseBrowserClient(options.supabaseUrl, options.supabaseAnonKey)
  return {
    rpc: async <T>(fn: string, args?: Record<string, unknown>) => {
      const { data, error } = await client.rpc(fn, args)
      return { data: data as T | null, error }
    },
  }
}

function unwrap<T>(fn: string, response: Awaited<RpcResponse<T>>): T {
  if (response.error) {
    throw new Error(`${fn}: ${response.error.message}`)
  }
  if (response.data === null) {
    throw new Error(`${fn}: respuesta vacia`)
  }

  return response.data
}

function unwrapNullable<T>(fn: string, response: Awaited<RpcResponse<T>>): T | null {
  if (response.error) {
    throw new Error(`${fn}: ${response.error.message}`)
  }

  return response.data
}

function mapSession(row: SessionRow): QuizSession {
  return {
    id: row.id,
    userId: row.user_id ?? '',
    kind: row.kind,
    requestedLength: row.requested_length,
    actualLength: row.actual_length,
    shortened: row.shortened,
    moduleId: row.module_id,
    topicId: row.topic_id,
    drugId: row.drug_id,
    questionIds: row.question_ids,
    currentIndex: row.current_index,
    cycleId: row.cycle_id,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  }
}

function mapSolution(row: SolutionRow) {
  return {
    questionId: row.question_id,
    correctLetter: row.correct_letter,
    explanation: row.explanation,
  }
}

export function createSupabaseRepository(options: SupabaseRepositoryOptions): StudyRepository {
  const client = rpcClient(options)

  async function call<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
    return unwrap(fn, await client.rpc<T>(fn, args))
  }

  async function callNullable<T>(fn: string, args?: Record<string, unknown>): Promise<T | null> {
    return unwrapNullable(fn, await client.rpc<T>(fn, args))
  }

  return {
    getDataSource: (): DataSource => 'supabase',

    async getCurrentUser(): Promise<StudyUser> {
      return call('get_current_profile')
    },

    async listModules(): Promise<StudyModule[]> {
      return call('list_modules')
    },

    async listTopics(moduleId: string): Promise<Topic[]> {
      return call('list_topics', { module_id: moduleId })
    },

    async listDrugs(): Promise<Drug[]> {
      return call('list_drugs')
    },

    async searchReferences(query: string): Promise<ReferenceEntry[]> {
      return call('search_references', { search_query: query })
    },

    async getReference(id: string): Promise<ReferenceEntry | null> {
      return callNullable('get_reference', { reference_id: id })
    },

    async startModuleSession(moduleId: string): Promise<QuizSession> {
      return mapSession(await call<SessionRow>('start_module_quiz', { module_id: moduleId }))
    },

    async startTopicSession(topicId: string): Promise<QuizSession> {
      return mapSession(await call<SessionRow>('start_topic_quiz', { topic_id: topicId }))
    },

    async startDrugSession(drugId: string, length: DrugSessionLength): Promise<QuizSession> {
      return mapSession(await call<SessionRow>('start_drug_quiz', { drug_id: drugId, requested_count: length }))
    },

    async startReviewSession(): Promise<QuizSession> {
      return mapSession(await call<SessionRow>('create_review_session', { requested_count: 20 }))
    },

    async resumeSession(): Promise<QuizSession | null> {
      const row = await callNullable<SessionRow>('resume_active_session')
      return row ? mapSession(row) : null
    },

    async getSessionQuestion(sessionId: string, index: number): Promise<QuestionPrompt> {
      return call('get_session_question', { session_id: sessionId, item_index: index })
    },

    async submitAnswer(sessionId: string, questionId: string, letter: ChoiceLetter): Promise<AnswerSubmission> {
      const row = await call<AnswerRow>('submit_answer', {
        session_id: sessionId,
        question_id: questionId,
        selected_option: letter,
      })

      return {
        locked: row.locked,
        correct: row.correct,
        solution: mapSolution(row.solution),
      }
    },

    async listReviewQueue(): Promise<ReviewItem[]> {
      return call('list_review_queue')
    },

    async getProgress(): Promise<ProgressSummary> {
      return call('get_progress_summary')
    },

    async startNewCycle(): Promise<{ id: string }> {
      return call('start_new_cycle')
    },
  }
}
