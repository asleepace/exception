export type ExcpClass = typeof Exception
export type ExcpInstance = InstanceType<ExcpClass>

/**
 * Base exception class which all other errors inherit from.
 */
export class Exception extends Error {
  static readonly scope: string = 'global'

  /**
   * If the provided argument e is an instance of this class,
   * then the callback will be triggerd.
   */
  public static match<T>(
    e: unknown,
    callback?: (err: ExcpInstance) => T
  ): T | void {
    if (e instanceof Exception) return callback?.(e as any)
  }

  /**
   * Check if the provided object is an instance of this class.
   */
  public static is(obj: unknown): obj is ExcpInstance {
    return obj instanceof Exception
  }

  /**
   * Shorthand for creating a new instance and throwing.
   */
  public static throw(...args: any[]): never {
    throw new this(...args)
  }

  public code: number = 0
  public readonly scope: string = 'global'

  constructor(...args: any[]) {
    super(safeEncode(...args))
  }

  public debug(): this {
    console.log({
      name: this.name,
      message: this.message,
      code: this.code,
    })
    return this
  }
}

const MAX_ERROR_DEFS = 100
const DEFAULT_SCOPE = 'global'
const RANGE_SIZE = 1000

function safeEncode(...args: any[]): string {
  try {
    return args
      .map((item) => {
        if (!item) return item
        if (typeof item === 'object') return JSON.stringify(item)
        return item
      })
      .join(' ')
  } catch (e) {
    return args.join(' ')
  }
}

function getScopeBadge(scope: string): string {
  let sanitized = scope.replace('global', '')
  if (sanitized === ':') return ''
  if (sanitized.startsWith(':')) {
    sanitized = sanitized.slice(1)
  }
  return `[${sanitized}]`
}

/**
 * Exception namespace.
 */
export const err = {
  Exception,
  definitions: new Set<ExcpClass>(),
  getScopeKeys() {
    return new Set([...this.definitions].map((excp) => excp.scope))
  },
  entries() {
    const values = Array.from(this.definitions.values())
    return values.map((excp) => {
      return [excp.scope, excp] as const
    })
  },
  add(excp: ExcpClass) {
    this.definitions.add(excp)
  },
  enum<Keys extends string[] = string[]>(options: { scope?: string } = {}) {
    const scope = options.scope ?? 'global'
    return new Proxy([], {
      get: (target, name) => {
        if (typeof name === 'symbol') return target[name as any]
        if (name === 'length') return MAX_ERROR_DEFS

        const errorName = String(name)
        const errorCode = this.getScopeKeys().size + 1

        /**
         * Custom exception.
         */
        class ScopedException extends Exception {
          public readonly scopeName: string = scope
          // static helpers...
          static override match<T>(
            e: unknown,
            callback?: (err: ExcpInstance) => T
          ): T | void {
            if (e instanceof ScopedException) return callback?.(e as any)
          }

          static override is(
            obj: unknown
          ): obj is InstanceType<typeof ScopedException> {
            return obj instanceof ScopedException
          }

          static override throw(...args: any[]): never {
            throw new this(...args)
          }

          // instance properties ...

          override name: string = errorName
          override code: number = errorCode
          public override readonly scope: string = scope

          constructor(...args: any[]) {
            super(...args)
            let msg = this.name.trim()
            if (this.scope && this.scope !== 'global') {
              msg = `[${this.scope.replaceAll('global:', '')}] ${msg}`
            }
            if (this.message) {
              msg += `: ${this.message}`
            }

            this.message = msg + ` (code: ${this.code})`
          }
        }

        this.definitions.add(ScopedException)
        return ScopedException
      },
    }) as unknown as {
      [key: string]: ExcpClass
      [idx: number]: ExcpClass
    } & Record<Keys[number], ExcpClass>
  },
}
