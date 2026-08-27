import type { StudyRepository } from '../domain/repository'
import { createDemoRepository } from './demo/DemoStudyRepository'
import { createSupabaseRepository } from './supabase/SupabaseStudyRepository'

type RepositoryConfig = {
  supabaseUrl?: string
  supabaseAnonKey?: string
  storage?: Storage
}

export function createRepository(config: RepositoryConfig): StudyRepository {
  if (config.supabaseUrl && config.supabaseAnonKey) {
    return createSupabaseRepository({
      supabaseUrl: config.supabaseUrl,
      supabaseAnonKey: config.supabaseAnonKey,
    })
  }

  return createDemoRepository({ storage: config.storage })
}
