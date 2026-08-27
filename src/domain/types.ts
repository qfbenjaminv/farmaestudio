export type ChoiceLetter = 'A' | 'B' | 'C' | 'D'
export type DataSource = 'demo' | 'supabase'
export type SessionKind = 'module' | 'topic' | 'drug' | 'review'
export type QuestionStatus = 'draft' | 'published'
export type UserRole = 'student' | 'admin'
export type DrugSessionLength = 5 | 10 | 15 | 20

export interface StudyUser {
  id: string
  role: UserRole
  displayName: string
}

export interface StudyModule {
  id: string
  code: string
  name: string
  description: string
  sortOrder: number
}

export interface Topic {
  id: string
  moduleId: string
  name: string
  sortOrder: number
}

export interface Drug {
  id: string
  genericName: string
  moduleIds: string[]
  topicIds: string[]
}

export interface ReferenceEntry {
  id: string
  title: string
  moduleId: string
  drugIds: string[]
  summary: string
  tags: string[]
}

export interface QuestionChoice {
  letter: ChoiceLetter
  text: string
}

export interface QuestionPrompt {
  id: string
  questionCode: string
  version: number
  stem: string
  choices: [QuestionChoice, QuestionChoice, QuestionChoice, QuestionChoice]
  moduleId: string
  topicId: string
  drugIds: string[]
  status: QuestionStatus
}

export interface QuestionSolution {
  questionId: string
  correctLetter: ChoiceLetter
  explanation: string
}

export interface QuizSession {
  id: string
  userId: string
  kind: SessionKind
  requestedLength: number
  actualLength: number
  shortened: boolean
  moduleId?: string
  topicId?: string
  drugId?: string
  questionIds: string[]
  currentIndex: number
  cycleId: string
  startedAt: string
  completedAt?: string
}

export interface ReviewItem {
  questionId: string
  questionCode: string
  addedAt: string
}

export interface ModuleProgress {
  moduleId: string
  answered: number
  correctFirstAttempt: number
  accuracy: number
  remainingInCycle: number
}

export interface ProgressSummary {
  timezone: 'America/Santiago'
  modules: ModuleProgress[]
  reviewQueueSize: number
}

export interface AnswerSubmission {
  locked: true
  correct: boolean
  solution: QuestionSolution
}

export const DRUG_SESSION_LENGTHS: readonly DrugSessionLength[] = [5, 10, 15, 20]
