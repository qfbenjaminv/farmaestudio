import { describe, expect, it } from 'vitest'
import { createRepository } from './createRepository'

describe('createRepository', () => {
  it('uses the demo repository when public Supabase variables are absent', () => {
    const repo = createRepository({
      supabaseUrl: '',
      supabaseAnonKey: '',
    })
    expect(repo.getDataSource()).toBe('demo')
  })

  it('uses the supabase repository when public variables exist', () => {
    const repo = createRepository({
      supabaseUrl: 'https://example.supabase.co',
      supabaseAnonKey: 'public-anon-key',
    })
    expect(repo.getDataSource()).toBe('supabase')
  })
})
