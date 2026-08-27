import { beforeEach, describe, expect, it } from 'vitest'
import { createDemoRepository } from './DemoStudyRepository'
import {
  AnswerLockedError,
  InvalidSessionLengthError,
  NoUnseenQuestionsError,
} from '../../domain/errors'

function memoryStorage(): Storage {
  const data = new Map<string, string>()
  return {
    get length() {
      return data.size
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => {
      data.delete(key)
    },
    setItem: (key, value) => {
      data.set(key, value)
    },
  }
}

describe('DemoStudyRepository', () => {
  let storage: Storage

  beforeEach(() => {
    storage = memoryStorage()
  })

  it('labels the data source as a demo and exposes eleven modules', async () => {
    const repo = createDemoRepository({ storage, random: () => 0 })
    expect(repo.getDataSource()).toBe('demo')
    const modules = await repo.listModules()
    expect(modules).toHaveLength(11)
    expect(modules[0]?.code).toMatch(/^M\d{2}$/)
  })

  it('never includes the correct letter on an active question prompt', async () => {
    const repo = createDemoRepository({ storage, random: () => 0 })
    const modules = await repo.listModules()
    const session = await repo.startModuleSession(modules[0]!.id)
    const prompt = await repo.getSessionQuestion(session.id, 0)
    expect(prompt.choices).toHaveLength(4)
    expect(prompt.choices.map((choice) => choice.letter)).toEqual(['A', 'B', 'C', 'D'])
    expect(prompt).not.toHaveProperty('correctLetter')
    expect(JSON.stringify(prompt)).not.toMatch(/correctLetter/)
  })

  it('starts a module session of 20 unseen questions', async () => {
    const repo = createDemoRepository({ storage, random: () => 0 })
    const modules = await repo.listModules()
    const session = await repo.startModuleSession(modules[0]!.id)
    expect(session.kind).toBe('module')
    expect(session.requestedLength).toBe(20)
    expect(session.actualLength).toBe(20)
    expect(session.shortened).toBe(false)
    expect(session.questionIds).toHaveLength(20)
  })

  it('shortens a drug session when fewer unseen questions remain', async () => {
    const repo = createDemoRepository({ storage, random: () => 0 })
    const drugs = await repo.listDrugs()
    const atropina = drugs.find((drug) => drug.genericName === 'Atropina')
    expect(atropina).toBeTruthy()
    const session = await repo.startDrugSession(atropina!.id, 10)
    expect(session.requestedLength).toBe(10)
    expect(session.actualLength).toBeLessThan(10)
    expect(session.shortened).toBe(true)
    expect(session.questionIds.length).toBe(session.actualLength)
  })

  it('rejects drug lengths other than 5, 10, 15 or 20', async () => {
    const repo = createDemoRepository({ storage, random: () => 0 })
    const drugs = await repo.listDrugs()
    await expect(repo.startDrugSession(drugs[0]!.id, 8 as 5)).rejects.toBeInstanceOf(InvalidSessionLengthError)
  })

  it('returns the solution only after the first submission and then locks the answer', async () => {
    const repo = createDemoRepository({ storage, random: () => 0 })
    const modules = await repo.listModules()
    const session = await repo.startModuleSession(modules[0]!.id)
    const prompt = await repo.getSessionQuestion(session.id, 0)
    const result = await repo.submitAnswer(session.id, prompt.id, 'A')
    expect(result.locked).toBe(true)
    expect(['A', 'B', 'C', 'D']).toContain(result.solution.correctLetter)
    expect(result.solution.questionId).toBe(prompt.id)
    await expect(repo.submitAnswer(session.id, prompt.id, 'B')).rejects.toBeInstanceOf(AnswerLockedError)
  })

  it('adds incorrect normal answers to review and resolves them after one correct review answer', async () => {
    const repo = createDemoRepository({ storage, random: () => 0 })
    const modules = await repo.listModules()
    const session = await repo.startModuleSession(modules[0]!.id)
    let missedId = ''
    let correctLetter: 'A' | 'B' | 'C' | 'D' = 'A'

    for (let index = 0; index < session.actualLength && !missedId; index += 1) {
      const prompt = await repo.getSessionQuestion(session.id, index)
      const result = await repo.submitAnswer(session.id, prompt.id, 'A')
      if (!result.correct) {
        missedId = prompt.id
        correctLetter = result.solution.correctLetter
      }
    }

    expect(missedId).not.toBe('')
    expect((await repo.listReviewQueue()).some((item) => item.questionId === missedId)).toBe(true)

    const reviewSession = await repo.startReviewSession()
    expect(reviewSession.kind).toBe('review')
    const reviewPrompt = await repo.getSessionQuestion(reviewSession.id, 0)
    expect(reviewPrompt.id).toBe(missedId)

    const wrongReview = await repo.submitAnswer(reviewSession.id, reviewPrompt.id, correctLetter === 'A' ? 'B' : 'A')
    expect(wrongReview.correct).toBe(false)
    await expect(repo.submitAnswer(reviewSession.id, reviewPrompt.id, correctLetter)).rejects.toBeInstanceOf(AnswerLockedError)
    expect((await repo.listReviewQueue()).some((item) => item.questionId === missedId)).toBe(true)

    const retry = await repo.startReviewSession()
    const retryPrompt = await repo.getSessionQuestion(retry.id, 0)
    expect(retryPrompt.id).toBe(missedId)
    const resolved = await repo.submitAnswer(retry.id, retryPrompt.id, correctLetter)
    expect(resolved.correct).toBe(true)
    expect((await repo.listReviewQueue()).some((item) => item.questionId === missedId)).toBe(false)
  })

  it('never repeats a question code in the same cycle and restores them after completing the full cycle', async () => {
    const repo = createDemoRepository({ storage, random: () => 0 })
    const modules = await repo.listModules()
    const first = await repo.startModuleSession(modules[0]!.id)
    const missed = new Map<string, 'A' | 'B' | 'C' | 'D'>()

    for (let index = 0; index < first.actualLength; index += 1) {
      const prompt = await repo.getSessionQuestion(first.id, index)
      const result = await repo.submitAnswer(first.id, prompt.id, 'A')
      if (!result.correct) {
        missed.set(prompt.id, result.solution.correctLetter)
      }
    }

    await expect(repo.startModuleSession(modules[0]!.id)).rejects.toBeInstanceOf(NoUnseenQuestionsError)

    const drugs = await repo.listDrugs()
    const atropina = drugs.find((drug) => drug.genericName === 'Atropina')!
    const drugSession = await repo.startDrugSession(atropina.id, 20)
    for (let index = 0; index < drugSession.actualLength; index += 1) {
      const prompt = await repo.getSessionQuestion(drugSession.id, index)
      const result = await repo.submitAnswer(drugSession.id, prompt.id, 'A')
      if (!result.correct) {
        missed.set(prompt.id, result.solution.correctLetter)
      }
    }

    for (const [questionId, correctLetter] of missed) {
      const review = await repo.startReviewSession()
      expect(review.questionIds).toContain(questionId)
      await repo.submitAnswer(review.id, questionId, correctLetter)
    }

    await repo.startNewCycle()
    const third = await repo.startModuleSession(modules[0]!.id)
    expect(third.questionIds).toHaveLength(20)
  })

  it('throws when no unseen questions remain in the cycle', async () => {
    const repo = createDemoRepository({ storage, random: () => 0 })
    const drugs = await repo.listDrugs()
    const atropina = drugs.find((drug) => drug.genericName === 'Atropina')!
    const first = await repo.startDrugSession(atropina.id, 20)
    for (let index = 0; index < first.actualLength; index += 1) {
      const prompt = await repo.getSessionQuestion(first.id, index)
      await repo.submitAnswer(first.id, prompt.id, 'A')
    }
    await expect(repo.startDrugSession(atropina.id, 5)).rejects.toBeInstanceOf(NoUnseenQuestionsError)
  })

  it('computes progress from first normal attempts in America/Santiago', async () => {
    const repo = createDemoRepository({ storage, random: () => 0 })
    const modules = await repo.listModules()
    const session = await repo.startModuleSession(modules[0]!.id)
    const prompt = await repo.getSessionQuestion(session.id, 0)
    const result = await repo.submitAnswer(session.id, prompt.id, 'A')
    const progress = await repo.getProgress()
    expect(progress.timezone).toBe('America/Santiago')
    const moduleProgress = progress.modules.find((row) => row.moduleId === modules[0]!.id)
    expect(moduleProgress?.answered).toBe(1)
    expect(moduleProgress?.correctFirstAttempt).toBe(result.correct ? 1 : 0)
    expect(moduleProgress?.remainingInCycle).toBeGreaterThan(0)
  })

  it('persists sessions across repository instances that share storage', async () => {
    const repo = createDemoRepository({ storage, random: () => 0 })
    const modules = await repo.listModules()
    const session = await repo.startModuleSession(modules[0]!.id)
    const restored = createDemoRepository({ storage, random: () => 0 })
    const resumed = await restored.resumeSession()
    expect(resumed?.id).toBe(session.id)
    expect(resumed?.questionIds).toEqual(session.questionIds)
  })

  it('keeps solutions out of searchable reference records', async () => {
    const repo = createDemoRepository({ storage, random: () => 0 })
    const results = await repo.searchReferences('demostración')
    expect(results.length).toBeGreaterThan(0)
    expect(JSON.stringify(results)).not.toMatch(/correctLetter/)
    expect(results[0]?.summary).toMatch(/ilustrativ/i)
  })
})
