import {
  AnswerLockedError,
  InvalidSessionLengthError,
  NoUnseenQuestionsError,
  SessionNotFoundError,
} from '../../domain/errors'
import type {
  AnswerSubmission,
  ChoiceLetter,
  DrugSessionLength,
  ProgressSummary,
  QuestionPrompt,
  QuizSession,
  ReviewItem,
} from '../../domain/types'
import type { StudyRepository } from '../../domain/repository'
import { DRUG_SESSION_LENGTHS } from '../../domain/types'
import { demoDrugs, demoModules, demoQuestions, demoReferences, demoTopics } from './seedData'

type DemoOptions = {
  storage?: Storage
  random?: () => number
}

type StoredAnswer = {
  sessionId: string
  questionId: string
  selectedLetter: ChoiceLetter
  correct: boolean
  isReview: boolean
}

type DemoState = {
  cycleId: string
  nextSessionNumber: number
  nextCycleNumber: number
  sessions: QuizSession[]
  answers: StoredAnswer[]
  seenByCycle: Record<string, string[]>
  reviewQueue: ReviewItem[]
}

const STORAGE_KEY = 'farmaestudio.demo-state.v1'

function initialState(): DemoState {
  return {
    cycleId: 'cycle-1',
    nextSessionNumber: 1,
    nextCycleNumber: 2,
    sessions: [],
    answers: [],
    seenByCycle: { 'cycle-1': [] },
    reviewQueue: [],
  }
}

function sessionId(state: DemoState): string {
  const id = `demo-session-${state.nextSessionNumber}`
  state.nextSessionNumber += 1
  return id
}

function nowIso(): string {
  return new Date().toISOString()
}

function cloneQuestion(question: QuestionPrompt): QuestionPrompt {
  return {
    ...question,
    choices: [...question.choices] as QuestionPrompt['choices'],
  }
}

function publicQuestion(questionId: string): QuestionPrompt {
  const question = demoQuestions.find((item) => item.id === questionId)
  if (!question) {
    throw new SessionNotFoundError()
  }

  return cloneQuestion({
    id: question.id,
    questionCode: question.questionCode,
    version: question.version,
    stem: question.stem,
    choices: question.choices,
    moduleId: question.moduleId,
    topicId: question.topicId,
    drugIds: question.drugIds,
    status: question.status,
  })
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const copy = [...items]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1))
    const value = copy[index]!
    copy[index] = copy[target]!
    copy[target] = value
  }
  return copy
}

function searchable(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('es')
}

export function createDemoRepository(options: DemoOptions = {}): StudyRepository {
  const storage = options.storage ?? window.localStorage
  const random = options.random ?? Math.random

  function readState(): DemoState {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) {
      return initialState()
    }

    return JSON.parse(raw) as DemoState
  }

  function writeState(state: DemoState): void {
    storage.setItem(STORAGE_KEY, JSON.stringify(state))
  }

  function getQuestion(id: string) {
    const question = demoQuestions.find((item) => item.id === id)
    if (!question) {
      throw new SessionNotFoundError()
    }
    return question
  }

  function activeNormalSession(state: DemoState): QuizSession | undefined {
    return state.sessions.find((session) => session.kind !== 'review' && !session.completedAt)
  }

  function createSession(kind: QuizSession['kind'], requestedLength: number, questionIds: string[], scope: Partial<QuizSession>): QuizSession {
    const state = readState()
    const existing = kind === 'review' ? undefined : activeNormalSession(state)
    if (existing) {
      return existing
    }

    if (questionIds.length === 0) {
      throw new NoUnseenQuestionsError()
    }

    const session: QuizSession = {
      id: sessionId(state),
      userId: 'demo-user',
      kind,
      requestedLength,
      actualLength: questionIds.length,
      shortened: questionIds.length < requestedLength,
      questionIds,
      currentIndex: 0,
      cycleId: state.cycleId,
      startedAt: nowIso(),
      ...scope,
    }

    state.sessions.push(session)
    writeState(state)
    return session
  }

  function unseenQuestions(predicate: (question: QuestionPrompt) => boolean): string[] {
    const state = readState()
    const seen = new Set(state.seenByCycle[state.cycleId] ?? [])
    return shuffle(
      demoQuestions
        .filter((question) => question.status === 'published')
        .filter(predicate)
        .filter((question) => !seen.has(question.id))
        .map((question) => question.id),
      random,
    )
  }

  function recordSeen(state: DemoState, questionId: string): void {
    const seen = new Set(state.seenByCycle[state.cycleId] ?? [])
    seen.add(questionId)
    state.seenByCycle[state.cycleId] = [...seen]
  }

  function queueMiss(state: DemoState, question: QuestionPrompt): void {
    const exists = state.reviewQueue.some((item) => item.questionId === question.id)
    if (!exists) {
      state.reviewQueue.unshift({
        questionId: question.id,
        questionCode: question.questionCode,
        addedAt: nowIso(),
      })
    }
  }

  function resolveMiss(state: DemoState, questionId: string): void {
    state.reviewQueue = state.reviewQueue.filter((item) => item.questionId !== questionId)
  }

  return {
    getDataSource: () => 'demo',

    async getCurrentUser() {
      return { id: 'demo-user', role: 'student', displayName: 'Estudiante demo' }
    },

    async listModules() {
      return [...demoModules].sort((a, b) => a.sortOrder - b.sortOrder)
    },

    async listTopics(moduleId: string) {
      return demoTopics.filter((topic) => topic.moduleId === moduleId).sort((a, b) => a.sortOrder - b.sortOrder)
    },

    async listDrugs() {
      return [...demoDrugs].sort((a, b) => a.genericName.localeCompare(b.genericName, 'es'))
    },

    async searchReferences(query: string) {
      const normalized = searchable(query.trim())
      if (!normalized) {
        return [...demoReferences]
      }

      return demoReferences.filter((entry) => {
        const haystack = searchable([entry.title, entry.summary, ...entry.tags].join(' '))
        return haystack.includes(normalized)
      })
    },

    async getReference(id: string) {
      return demoReferences.find((entry) => entry.id === id) ?? null
    },

    async startModuleSession(moduleId: string) {
      return createSession('module', 20, unseenQuestions((question) => question.moduleId === moduleId).slice(0, 20), {
        moduleId,
      })
    },

    async startTopicSession(topicId: string) {
      return createSession('topic', 20, unseenQuestions((question) => question.topicId === topicId).slice(0, 20), {
        topicId,
      })
    },

    async startDrugSession(drugId: string, length: DrugSessionLength) {
      if (!DRUG_SESSION_LENGTHS.includes(length)) {
        throw new InvalidSessionLengthError()
      }

      return createSession('drug', length, unseenQuestions((question) => question.drugIds.includes(drugId)).slice(0, length), {
        drugId,
      })
    },

    async startReviewSession() {
      const state = readState()
      const pending = state.reviewQueue.slice(0, 20).map((item) => item.questionId)
      return createSession('review', 20, pending, {})
    },

    async resumeSession() {
      const state = readState()
      return activeNormalSession(state) ?? null
    },

    async getSessionQuestion(sessionIdValue: string, index: number) {
      const state = readState()
      const session = state.sessions.find((item) => item.id === sessionIdValue)
      const questionId = session?.questionIds[index]
      if (!session || !questionId) {
        throw new SessionNotFoundError()
      }

      return publicQuestion(questionId)
    },

    async submitAnswer(sessionIdValue: string, questionId: string, letter: ChoiceLetter): Promise<AnswerSubmission> {
      const state = readState()
      const session = state.sessions.find((item) => item.id === sessionIdValue)
      if (!session || !session.questionIds.includes(questionId)) {
        throw new SessionNotFoundError()
      }

      const existing = state.answers.find((answer) => answer.sessionId === sessionIdValue && answer.questionId === questionId)
      if (existing) {
        throw new AnswerLockedError()
      }

      const question = getQuestion(questionId)
      const correct = question.solution.correctLetter === letter
      state.answers.push({
        sessionId: sessionIdValue,
        questionId,
        selectedLetter: letter,
        correct,
        isReview: session.kind === 'review',
      })

      if (session.kind === 'review') {
        if (correct) {
          resolveMiss(state, questionId)
        }
      } else {
        recordSeen(state, questionId)
        if (!correct) {
          queueMiss(state, question)
        }
      }

      session.currentIndex = Math.min(session.currentIndex + 1, session.actualLength)
      if (session.currentIndex >= session.actualLength) {
        session.completedAt = nowIso()
      }

      writeState(state)

      return {
        locked: true,
        correct,
        solution: { ...question.solution },
      }
    },

    async listReviewQueue() {
      return [...readState().reviewQueue]
    },

    async getProgress(): Promise<ProgressSummary> {
      const state = readState()
      const seen = new Set(state.seenByCycle[state.cycleId] ?? [])
      const firstAnswers = state.answers.filter((answer) => !answer.isReview)

      return {
        timezone: 'America/Santiago',
        reviewQueueSize: state.reviewQueue.length,
        modules: demoModules.map((module) => {
          const moduleQuestionIds = demoQuestions
            .filter((question) => question.status === 'published' && question.moduleId === module.id)
            .map((question) => question.id)
          const moduleAnswers = firstAnswers.filter((answer) => moduleQuestionIds.includes(answer.questionId))
          const correctFirstAttempt = moduleAnswers.filter((answer) => answer.correct).length

          return {
            moduleId: module.id,
            answered: moduleAnswers.length,
            correctFirstAttempt,
            accuracy: moduleAnswers.length === 0 ? 0 : correctFirstAttempt / moduleAnswers.length,
            remainingInCycle: moduleQuestionIds.filter((id) => !seen.has(id)).length,
          }
        }),
      }
    },

    async startNewCycle() {
      const state = readState()
      const seen = new Set(state.seenByCycle[state.cycleId] ?? [])
      const publishedIds = demoQuestions.filter((question) => question.status === 'published').map((question) => question.id)
      const completedPublishedBank = publishedIds.every((questionId) => seen.has(questionId))
      if (!completedPublishedBank || state.reviewQueue.length > 0) {
        throw new NoUnseenQuestionsError()
      }

      const id = `cycle-${state.nextCycleNumber}`
      state.nextCycleNumber += 1
      state.cycleId = id
      state.seenByCycle[id] = []
      writeState(state)

      return { id }
    },
  }
}
