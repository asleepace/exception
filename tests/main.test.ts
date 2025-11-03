import { describe, it, expect } from 'bun:test'
import { Exception } from '@/index'

// ================================================================================
//  Basic
// ================================================================================

describe('Basic Usage', () => {
  it('1. should be able to define basic errors', () => {
    const { BasicError } = Exception.enum({ label: 'basic-1' })
    const error = new BasicError('test message')
    expect(error).toBeInstanceOf(BasicError)
    expect(error).toBeInstanceOf(Exception)
    expect(error.message).toBe(
      '[basic-1] BasicError: test message (main.test.ts)'
    )
  })

  it('2. should be able to define with scopes', () => {
    const { NormalError } = Exception.enum({ label: 'basic-2.1' })
    const { ScopedError } = Exception.enum({ label: 'basic-2.2' })
    const normal = new NormalError('global scope')
    const scoped = new ScopedError('custom scope')
    expect(normal.label).toBe('basic-2.1')
    expect(scoped.label).toBe('basic-2.2')
  })

  it('3. should display name in message properly', () => {
    const { BasicError } = Exception.enum({ label: 'basic-3.1' })
    const e1 = new BasicError('with message')
    const e2 = new BasicError() // without message
    expect(e1.message).toBe(
      '[basic-3.1] BasicError: with message (main.test.ts)'
    )
    expect(e2.message).toBe('[basic-3.1] BasicError (main.test.ts)') // should just be name
    const { ScopeError } = Exception.enum({
      label: 'basic-3.2',
    })
    const e3 = new ScopeError('with message')
    const e4 = new ScopeError()
    expect(e3.message).toBe(
      '[basic-3.2] ScopeError: with message (main.test.ts)'
    )
    expect(e4.message).toBe('[basic-3.2] ScopeError (main.test.ts)')
  })

  it('4. should be debuggable', () => {
    const { BasicError } = Exception.enum({ label: 'basic-4.1' })
    const { ScopedError } = Exception.enum({ label: 'basic-4.2' })
    const e5 = new BasicError('debug me')
    const e6 = new ScopedError('another one')
    expect(e5.debug()).toBe(e5)
    expect(e6.debug({ verbose: true })).toBe(e6)
  })

  it('5. should index properly', () => {
    const { Order1, Order2, Order3 } = Exception.enum({ label: 'basic-5' })
    expect(Order1.new().scopeIndex).toBe(0)
    expect(Order2.new().scopeIndex).toBe(1)
    expect(Order3.new().scopeIndex).toBe(2)
  })

  it('6. should reuse same class for duplicate access', () => {
    const errors1 = Exception.enum({ label: 'basic-6' })
    const errors2 = Exception.enum({ label: 'basic-6' })
    console.log(Object.is(errors1, errors2))
    expect(errors1.SameError).toBe(errors2.SameError) // Same class reference
  })
})

// ================================================================================
//  Static Methods
// ================================================================================

describe('Static Methods', () => {
  it('1. can call static throw method', () => {
    const { TestError } = Exception.enum({ label: 'static-1' })
    expect(() => TestError.throw('error!')).toThrow(TestError)
  })

  it('2. can use static is method as type-guard ', () => {
    const { TestError } = Exception.enum({ label: 'static-2' })
    const err1 = new TestError()
    const err2 = new Error()
    expect(TestError.is(err1)).toBe(true)
    expect(TestError.is(err2)).toBe(false)
    try {
      throw err1
    } catch (e) {
      if (TestError.is(e)) {
        expect(e.message).toBe('[static-2] TestError (main.test.ts)')
      }
    }
  })

  it('3. can use static is method as type-guard ', () => {
    const { TestError, NextError } = Exception.enum({ label: 'static-3' })
    const e1 = new TestError() as unknown
    const e2 = new NextError() as unknown
    expect(TestError.is(e1)).toBe(true) // use as type guard
    expect(TestError.is(null)).toBe(false)
    expect(TestError.is(undefined)).toBe(false)
    expect(TestError.is(e2)).toBe(false)
  })
})
