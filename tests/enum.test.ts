import { describe, it, expect } from 'bun:test'
import { Exception } from '@/index'

// ================================================================================
//  Static Cast and Copy Methods
// ================================================================================

describe('Static Cast and Copy Methods', () => {
  it('1. should be able to destructure with numbers', () => {
    const { 404: NotFound } = Exception.enum({ label: 'enum-test-1' })
    const err = new NotFound()
    expect(err.name).toBe('404')
    expect(err.message).toBe('[enum-test-1] 404 (enum.test.ts)')
    expect(err.code).toBe(404)
  })

  it('2. not have issues with code on non-indexed items.', () => {
    const { NotFound } = Exception.enum({ label: 'enum-test-2' })
    const err = new NotFound()
    expect(err.name).toBe('NotFound')
    expect(err.message).toBe('[enum-test-2] NotFound (enum.test.ts)')
    expect(err.code).toBe(undefined)
  })

  it('3. can handle weird edge cases', () => {
    const { NaN } = Exception.enum({ label: 'enum-test-3' })
    const err = new NaN()
    expect(err.name).toBe('NaN')
    expect(err.message).toBe('[enum-test-3] NaN (enum.test.ts)')
    expect(err.code).toBe(undefined)
  })

  it('4. can use local scope', () => {
    const {
      404: NotFound,
      401: NotAuthorized,
      500: InternalError,
      scope,
    } = Exception.enum({ label: 'enum-test-4' })
    expect(scope).toBeDefined()
    expect(scope.label).toBe('enum-test-4')
    expect(scope.keys().join(', ')).toBe('404, 401, 500')
    const err = new NotFound()
    expect(scope.match(err)?.code).toBe(404)
    expect(scope.match(err)?.into(() => true)).toBe(true)
  })
})
