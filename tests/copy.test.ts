import { describe, it, test, expect } from 'bun:test'
import { Exception } from '@/exception'

// ================================================================================
//  Static Cast and Copy Methods
// ================================================================================

describe('Static Cast and Copy Methods', () => {
  it('1. should cast string to instance', () => {
    const { ApiError } = Exception.enum({ label: 'cast-1' })
    const err = ApiError.cast('timeout')
    expect(err).toBeInstanceOf(ApiError)
    expect(err.message).toBe('[cast-1] ApiError: timeout')
  })

  it('2. should cast native Error preserving cause', () => {
    const { ApiError } = Exception.enum({ label: 'cast-2' })
    const nativeErr = new Error('failed')
    const err = ApiError.cast(nativeErr)
    expect(err).toBeInstanceOf(ApiError)
    expect(err.message).toBe('[cast-2] ApiError: failed')
    expect(err.cause).toBe(nativeErr)
  })

  it('3. should cast error-like object', () => {
    const { ApiError } = Exception.enum({ label: 'cast-3' })
    const errorLike = { message: 'bad request', code: 400 }
    const err = ApiError.cast(errorLike)
    expect(err).toBeInstanceOf(ApiError)
    expect(err.message).toBe('[cast-3] ApiError: bad request')
  })

  it('4. should cast primitives', () => {
    const { ApiError } = Exception.enum({ label: 'cast-4' })
    const err1 = ApiError.cast(123)
    const err2 = ApiError.cast(true)
    expect(err1.message).toContain('123')
    expect(err2.message).toContain('true')
  })

  it('5. should return same instance if already correct type', () => {
    const { ApiError } = Exception.enum({ label: 'cast-5' })
    const original = new ApiError('test')
    const casted = ApiError.cast(original)
    expect(casted).toBe(original) // Same reference
  })

  it('6. should copy instance creating new reference', () => {
    const { ApiError } = Exception.enum({ label: 'copy-1' })
    const original = new ApiError('test message')
    const copy = ApiError.from(original)

    expect(copy).toBeInstanceOf(ApiError)
    expect(copy).not.toBe(original) // Different reference
    expect(copy.message).toBe(original.message)
    expect(copy.name).toBe(original.name)
  })

  it('7. should preserve stack trace when copying', () => {
    const { ApiError } = Exception.enum({ label: 'copy-2' })
    const original = new ApiError('with stack')
    const copy = ApiError.from(original)

    expect(copy.stack).toBeDefined()
    expect(copy.stack).toBe(original.stack)
  })

  it('8. should preserve cause when copying', () => {
    const { ApiError } = Exception.enum({ label: 'copy-3' })
    const rootCause = new Error('root cause')
    const original = new ApiError('wrapper', rootCause)
    const copy = ApiError.from(original)

    expect(copy.cause).toBe(rootCause)
  })
})
