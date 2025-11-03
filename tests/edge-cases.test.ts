import { describe, it, test, expect } from 'bun:test'
import { Exception } from '@/exception'

// ================================================================================
//  Edge Cases
// ================================================================================

describe('Edge Cases', () => {
  it('1. should handle empty messages', () => {
    const { EmptyError } = Exception.enum({ label: 'edge-extra-1' })
    const e1 = new EmptyError('')
    const e2 = new EmptyError()

    expect(e1.message).toBe('[edge-extra-1] EmptyError')
    expect(e2.message).toBe('[edge-extra-1] EmptyError')
  })

  it('2. should handle null and undefined in cast', () => {
    const { NullError } = Exception.enum({ label: 'edge-extra-2' })

    const e1 = NullError.cast(null)
    const e2 = NullError.cast(undefined)

    expect(e1).toBeInstanceOf(NullError)
    expect(e2).toBeInstanceOf(NullError)
  })

  it('3. should handle circular references in objects', () => {
    const { CircularError } = Exception.enum({ label: 'edge-extra-3' })
    const circular: any = { name: 'test' }
    circular.self = circular

    const err = new CircularError('data:', circular)
    expect(err.message).toContain('CircularError')
  })

  it('4. should handle very long messages', () => {
    const { LongError } = Exception.enum({ label: 'edge-extra-4' })
    const longMsg = 'a'.repeat(10000)
    const err = new LongError(longMsg)

    expect(err.message).toContain(longMsg)
  })

  it('5. should handle special characters', () => {
    const { SpecialError } = Exception.enum({ label: 'edge-extra-5' })
    const special = 'Test: 日本語 emoji 🔥 newline\n tab\t'
    const err = new SpecialError(special)

    expect(err.message).toContain(special)
  })

  it('6. should handle chained causes', () => {
    const { ChainError } = Exception.enum({ label: 'edge-extra-6' })

    const root = new Error('root')
    const middle = new ChainError('middle', root)
    const top = new ChainError('top', middle)

    expect(top.cause).toBe(middle)
    expect((top.cause as any).cause).toBe(root)
  })

  it('7. should clone without stack', () => {
    const { NoStackError } = Exception.enum({ label: 'edge-extra-7' })
    const err = new NoStackError('test')
    err.stack = undefined

    const cloned = err.clone()
    expect(cloned.stack).toBeUndefined()
  })

  it('8. should cast between different exception types', () => {
    const { TypeA } = Exception.enum({ label: 'edge-extra-8a' })
    const { TypeB } = Exception.enum({ label: 'edge-extra-8b' })

    const a = new TypeA('original')
    const b = TypeB.cast(a)

    expect(b).toBeInstanceOf(TypeB)
    expect(b.message).toContain('TypeB')
    expect(b.message).toContain('original')
  })

  it('9. should handle numeric values', () => {
    const { NumError } = Exception.enum({ label: 'edge-extra-9' })

    const e1 = NumError.cast(404)
    const e2 = NumError.cast(0)
    const e3 = NumError.cast(-1)

    expect(e1.message).toContain('404')
    expect(e2.message).toContain('0')
    expect(e3.message).toContain('-1')
  })

  it('10. should handle boolean values', () => {
    const { BoolError } = Exception.enum({ label: 'edge-extra-10' })

    const e1 = BoolError.cast(true)
    const e2 = BoolError.cast(false)

    expect(e1.message).toContain('true')
    expect(e2.message).toContain('false')
  })

  it('11. should handle arrays', () => {
    const { ArrError } = Exception.enum({ label: 'edge-extra-11' })

    const arr = [1, 2, 3]
    const err = new ArrError('items:', arr)

    expect(err.message).toContain('[1,2,3]')
  })

  it('12. should preserve error name with numbers', () => {
    const { Error404, Error500 } = Exception.enum({ label: 'edge-extra-12' })

    const e1 = new Error404('not found')
    const e2 = new Error500('server error')

    expect(e1.name).toBe('Error404')
    expect(e2.name).toBe('Error500')
  })

  it('13. should handle toObject with no cause', () => {
    const { NoCauseError } = Exception.enum({ label: 'edge-extra-13' })
    const err = new NoCauseError('no cause')
    const obj = err.toObject()

    expect(obj.cause).toBeUndefined()
  })

  it('14. should handle from() with minimal data', () => {
    const { MinError } = Exception.enum({ label: 'edge-extra-14' })

    const minimal = {
      name: 'MinError',
      message: 'test',
      rawMessage: 'test',
      label: undefined,
      scopeIndex: 0,
      stack: undefined,
      cause: undefined,
      fileName: undefined,
    }

    const err = MinError.from(minimal)
    expect(err).toBeInstanceOf(MinError)
  })

  it('15. should handle error-like with extra properties', () => {
    const { ExtraError } = Exception.enum({ label: 'edge-extra-15' })

    const errorLike = {
      message: 'error occurred',
      code: 500,
      timestamp: Date.now(),
      extra: { foo: 'bar' },
    }

    const err = ExtraError.cast(errorLike)
    expect(err.message).toContain('error occurred')
  })

  it('16. should not throw on infinite extraction.', () => {
    const { Err, ...infinite } = Exception.enum({ label: 'edge-1' })
    expect(infinite).toBeObject()
  })

  it('17. should be able to display complex items', () => {
    const { Err } = Exception.enum({ label: 'edge-2' })
    expect(Err.new('example', { userId: 123 }).message).toEqual(
      '[edge-2] Err: example {"userId":123}'
    )
  })
})
