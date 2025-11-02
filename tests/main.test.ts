import { describe, it, test, expect } from 'bun:test'
import { err } from '@/index'

// ================================================================================
//  Basic
// ================================================================================

describe('Basic', () => {
  it('should be able to define basic errors', () => {
    const { BasicError } = err.enum()
    const error = new BasicError('test message')
    expect(error).toBeInstanceOf(BasicError)
    expect(error).toBeInstanceOf(err.Exception)
    expect(error.message).toBe('BasicError: test message (code: 1)')
    expect(error.code).toBe(1)
  })

  it('should be able to define with scopes', () => {
    const { NormalError } = err.enum()
    const { ScopedError } = err.enum({ scope: 'test-scope' })
    const normal = new NormalError('global scope')
    const scoped = new ScopedError('custom scope')
    expect(normal.scope).toBe('global')
    expect(normal.code).toBe(2) // NOTE: this is global btw
    expect(scoped.scope).toBe('test-scope')
    expect(scoped.code).toBe(2)
  })

  it('should display name in message properly', () => {
    const { BasicError } = err.enum()
    const e1 = new BasicError('with message')
    const e2 = new BasicError() // without message
    expect(e1.message).toBe('BasicError: with message (code: 2)')
    expect(e2.message).toBe('BasicError (code: 2)') // should just be name
    const { ScopeError } = err.enum({
      scope: 'main-test',
    })
    const e3 = new ScopeError('with message')
    const e4 = new ScopeError()
    expect(e3.message).toBe('[main-test] ScopeError: with message (code: 2)')
    expect(e4.message).toBe('[main-test] ScopeError (code: 2)')
  })
})

// ================================================================================
//  Static Methods
// ================================================================================

describe('Static Methods', () => {
  it('can call static throw method', () => {
    const { TestError } = err.enum()
    expect(() => TestError.throw('error!')).toThrow(TestError)
  })
  it('can use static is method as type-guard ', () => {
    const { TestError } = err.enum()
    const err1 = new TestError()
    const err2 = new Error()
    expect(TestError.is(err1)).toBe(true)
    expect(TestError.is(err2)).toBe(false)

    try {
      throw err1
    } catch (e) {
      if (TestError.is(e)) {
        expect(e.message).toBe('TestError (code: 2)')
      }
    }
  })
})
