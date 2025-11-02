import { describe, it, test, expect } from 'bun:test'
import { err } from '@/index'

// ================================================================================
//  Basic
// ================================================================================

describe('Basic', () => {
  it('1. should be able to define basic errors', () => {
    const { BasicError } = err.enum()
    const error = new BasicError('test message')
    expect(BasicError.key).toBe('global:BasicError')
    expect(error).toBeInstanceOf(BasicError)
    expect(error).toBeInstanceOf(err.Exception)
    expect(error.message).toBe('BasicError: test message')
  })

  it('2. should be able to define with scopes', () => {
    const { NormalError } = err.enum()
    const { ScopedError } = err.enum({ scope: 'test-scope' })
    const normal = new NormalError('global scope')
    const scoped = new ScopedError('custom scope')
    expect(normal.scope).toBe('global')
    expect(scoped.scope).toBe('test-scope')
  })

  it('3. should display name in message properly', () => {
    const { BasicError } = err.enum()
    const e1 = new BasicError('with message')
    const e2 = new BasicError() // without message
    expect(e1.message).toBe('BasicError: with message')
    expect(e2.message).toBe('BasicError') // should just be name
    const { ScopeError } = err.enum({
      scope: 'main-test',
    })
    const e3 = new ScopeError('with message')
    const e4 = new ScopeError()
    expect(e3.message).toBe('[main-test] ScopeError: with message')
    expect(e4.message).toBe('[main-test] ScopeError')
  })

  it('4. should be debuggable', () => {
    const { BasicError } = err.enum()
    const { ScopedError } = err.enum({ scope: 'basic-debug' })
    const e5 = new BasicError('debug me')
    expect(e5.debug()).toBe(e5)
    const e6 = new ScopedError('another one')
    expect(e6.debug({ verbose: true })).toBe(e6)
  })

  it('5. should index properly', () => {
    const { Order1, Order2, Order3 } = err.enum({ scope: 'order-test' })
    expect(Order1.new().scopeIndex).toBe(1)
    expect(Order2.new().scopeIndex).toBe(2)
    expect(Order3.new().scopeIndex).toBe(3)
  })
})

// ================================================================================
//  Static Methods
// ================================================================================

describe('Static Methods', () => {
  it('1. can call static throw method', () => {
    const { TestError } = err.enum()
    expect(() => TestError.throw('error!')).toThrow(TestError)
  })

  it('2. can use static is method as type-guard ', () => {
    const { TestError } = err.enum()
    const err1 = new TestError()
    const err2 = new Error()
    expect(TestError.is(err1)).toBe(true)
    expect(TestError.is(err2)).toBe(false)
    try {
      throw err1
    } catch (e) {
      if (TestError.is(e)) {
        expect(e.message).toBe('TestError')
      }
    }
  })

  it('3. can use static is method as type-guard ', () => {
    const { TestError } = err.enum({ scope: 'static-3' })
    const e = new TestError() as unknown
    expect(TestError.match(e)).toBe(true) // use as type guard
    expect(TestError.match(e, () => 123)).toBe(123) // use to return
    expect(TestError.match(null)).toBe(false)
    expect(TestError.match(null, () => true)).toBe(undefined)
  })
})

// ================================================================================
//  Edge Cases
// ================================================================================

describe('Edge Cases', () => {
  it('1. should not throw on infinite extraction.', () => {
    const { Err, ...infinite } = err.enum({ scope: 'edge-1' })
    expect(infinite).toBeObject()
  })

  it('2. handle weird scopes.', () => {
    const { Err } = err.enum({ scope: 'global:global:global' })
    expect(Err.key).toBe('global:Err')
  })
})
