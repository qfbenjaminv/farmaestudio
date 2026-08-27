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
} from './types'

export interface StudyRepository {
  getDataSource(): DataSource
  getCurrentUser(): Promise<StudyUser>
  listModules(): Promise<StudyModule[]>
  listTopics(moduleId: string): Promise<Topic[]>
  listDrugs(): Promise<Drug[]>
  searchReferences(query: string): Promise<ReferenceEntry[]>
  getReference(id: string): Promise<ReferenceEntry | null>
  startModuleSession(moduleId: string): Promise<QuizSession>
  startTopicSession(topicId: string): Promise<QuizSession>
  startDrugSession(drugId: string, length: DrugSessionLength): Promise<QuizSession>
  startReviewSession(): Promise<QuizSession>
  resumeSession(): Promise<QuizSession | null>
  getSessionQuestion(sessionId: string, index: number): Promise<QuestionPrompt>
  submitAnswer(sessionId: string, questionId: string, letter: ChoiceLetter): Promise<AnswerSubmission>
  listReviewQueue(): Promise<ReviewItem[]>
  getProgress(): Promise<ProgressSummary>
  startNewCycle(): Promise<{ id: string }>
}
