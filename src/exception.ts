export type ExcpClass = typeof Exception
export type ExcpInstance = InstanceType<ExcpClass>

export type ExcpTemplateNames = '$label' | '$error' | '$message' | '$file'

export type ExcpConf = {
  template: string[]
  maxScopedDefs: number
  encoding: 'json' | 'basic'
  delimiter: string
}

// ======================= globals =======================

let globalConfig: ExcpConf = {
  template: ['[$label] ', '$error', ': $message', ' ($file)'],
  maxScopedDefs: 100,
  encoding: 'json',
  delimiter: ' ',
}

const globalDefinitions = new Map<string, Map<string, ExcpClass>>()
const conf = globalConfig
const defs = globalDefinitions

// ======================= helpers =======================

function interpolateTemplate(
  vars: Record<ExcpTemplateNames, string | undefined>
): string {
  const items = Object.entries(vars)
  const blocks = [...conf.template]
    .map((block) => {
      const replace = items.find(([varKey]) => block.includes(varKey))
      if (!replace || !replace[1]) return undefined
      const [placeholder, value] = replace

      return block.replace(placeholder, value)
    })
    .filter((item) => item !== undefined)
    .join('')
  return blocks
}

const getScopedDefinitions = (scope: string) => {
  if (!defs.has(scope)) defs.set(scope, new Map())
  return globalDefinitions.get(scope)!
}

/** extract first error or exception instance if provided in args. */
const getPossibleCause = (...args: any[]): Error =>
  args.find((item) => item instanceof Error || item instanceof Exception)

/** parse useful information from the stack trace. */
const getStackInfo = (stack?: string) => {
  if (!stack) return undefined
  const lastOpenParenthesis = stack.lastIndexOf('(')
  const infoString = stack.slice(
    lastOpenParenthesis + 1,
    stack.lastIndexOf(')')
  )
  const lineNumIndex = infoString.indexOf(':') + 1
  const filePath = infoString.slice(0, lineNumIndex - 1)
  const lineNumbers = infoString.slice(lineNumIndex).split(':').map(Number)

  const fileName = filePath.slice(filePath.lastIndexOf('/') + 1)
  return {
    filePath,
    fileName,
    lineNumbers,
  }
}

/** helper for safely encode an array of possible objects to a string. */
function safeEncode(...args: any[]): string {
  try {
    if (conf.encoding === 'basic') return args.join(conf.delimiter)

    return args
      .map((item) => {
        if (!item) return item
        if (typeof item === 'object') return JSON.stringify(item)
        return item
      })
      .join(' ')
  } catch (e) {
    return args.join(conf.delimiter)
  }
}

const getRelativePath = (fullPath: string) => {
  const parts1 = String(import.meta.dirname)
    .split('/')
    .map((part) => part.trim())
  const parts2 = fullPath.split('/')

  // Find common prefix
  let i = 0
  while (i < parts1.length && i < parts2.length && parts1[i] === parts2[i]) {
    i++
  }

  // Return the unique part
  return parts2.slice(i).join('/')
}

function getStackFrames(stack: string) {
  return stack
    .split('\n')
    .filter(
      (line) =>
        line.includes('.ts:') ||
        line.includes('.js:') ||
        (line.includes('/') && line.includes('.') && line.includes(':'))
    )
    .map((line) => line.slice(line.indexOf('/')).trim().replace(')', ''))
    .map((line) => {
      const [filePath, lineNumber, column] = line.split(':')
      return {
        filePath,
        relativePath: getRelativePath(filePath),
        lineNumber,
        column,
      }
    })
}

// ======================= core logic =======================

export function defineScopedExcption(options: {
  errorName: string
  labelName?: string | undefined
}): ExcpClass {
  const dummy = new Exception()

  /**
   * Use the call site as the scope location.
   */
  const stackFrames = getStackFrames(dummy.stack ?? '')
  const lastStackFrame = stackFrames.pop()

  const scopeName = lastStackFrame?.relativePath ?? 'global'
  const labeledScopeName = options.labelName
    ? [options.labelName, scopeName].join(':')
    : scopeName

  const scope = getScopedDefinitions(labeledScopeName)

  if (scope.has(options.errorName)) {
    console.warn('error already exists in scope!')
    return scope.get(options.errorName)!
  }

  /**
   * ## Scoped Exception
   *
   * Custom error definition which extends the base `Exception` type or
   * the provided exception.
   */
  class ScopedException extends Exception {
    static scopedIndex: number = scope.size
    static override is(
      obj: unknown
    ): obj is InstanceType<typeof ScopedException> {
      return obj instanceof ScopedException
    }

    // instance properties ...

    public override name: string = options.errorName // NOTE: don't use label here
    public override scopeIndex = ScopedException.scopedIndex
    public override get label(): string | undefined {
      return options.labelName
    }
    protected originalMessage: string

    /** @note code is only automatically set when destructuring via index number. */
    public override code: number | undefined = undefined

    constructor(...args: any[]) {
      super(...args)
      const code = Number(this.name)
      this.code = isNaN(code) ? this.code : code
      this.originalMessage = this.message
      this.message = interpolateTemplate({
        $label: this.label,
        $message: this.message,
        $error: options.errorName,
        $file: this.fileName,
      })
    }
  }

  scope.set(options.errorName, ScopedException)
  return ScopedException
}

// ======================= base class =======================

/**
 * ## Exception
 *
 * Base exception class which extends the built-in `Error` object.
 *
 * ```ts
 * // quickly define errors
 * const {
 *  CustomError,
 *  AnotherOne,
 * } = Exception.enum()
 *
 * // each instance extends the built-in error types
 * const err = new CustomError()
 * console.log(err instanceof Error) // true
 * console.log(err instanceof Exception) // true
 *
 * // can be called with multiple arguments
 * throw new AnotherOne('uh oh!', 67, { userId: 123 })
 *
 * // includes several quality of like helpers
 * try {
 *  throw CustomError('example')
 * } catch (e: unknown) {
 *  if (CustomError.is(e)) {
 *    console.log(e.message) // type-safe!
 *  }
 * }
 * ```
 *
 */
export class Exception extends Error {
  static setGlobalConfig(config: Partial<ExcpConf>) {
    globalConfig = { ...globalConfig, ...config }
  }

  /**
   * Cast anything into an instance of this Exception type.
   */
  static cast(obj: unknown): ExcpInstance {
    // Already correct type - return as-is
    if (this.is(obj)) return obj as ExcpInstance

    // String
    if (typeof obj === 'string') {
      return new this(obj) as ExcpInstance
    }

    // Native Error or Exception - pass message and error separately
    if (obj instanceof Error) {
      const instance = new this(obj.message) as ExcpInstance
      // Manually set cause since constructor's getPossibleCause needs it in args
      Object.defineProperty(instance, 'cause', {
        value: obj,
        enumerable: false,
      })
      return instance
    }

    // Object with message property
    if (obj && typeof obj === 'object' && 'message' in obj) {
      return new this(String(obj.message)) as ExcpInstance
    }

    // Primitives or anything else
    return new this(obj) as ExcpInstance
  }

  /**
   * Create a new instance identical to the other instance.
   */
  static from(
    other: ExcpInstance | ReturnType<ExcpInstance['toObject']>
  ): ExcpInstance {
    const data = other instanceof Exception ? other.toObject() : other

    // Pass cause as second arg so getPossibleCause can find it
    const instance = data.cause
      ? new this(data.rawMessage, data.cause)
      : new this(data.rawMessage)

    // Preserve stack trace
    if (data.stack) {
      instance.stack = data.stack
    }

    return instance
  }

  /**
   * Define custom errors in an enumeration like style.
   */
  static enum<Keys extends string[] = string[]>(
    options: { label?: string } = {}
  ) {
    const localScope = new Map<Keys[number], ExcpClass>()

    let scope = {
      label: options.label,
      keys() {
        return Array.from(localScope.keys())
      },
      defs() {
        return Array.from(localScope.values())
      },
      match(e: unknown): ExcpInstance | undefined {
        const matched = this.defs().find((excp) => excp.is(e))
        if (matched) return matched.cast(e) as ExcpInstance
        return undefined
      },
      *[Symbol.iterator]() {
        yield* this.defs()
      },
    }

    return new Proxy([], {
      get: (target, errorName) => {
        /** Handle special properties here... */
        if (typeof errorName === 'symbol') return target[errorName as any]

        /** Return custom local scope property. */
        if (errorName === 'scope') return scope

        /** Since our proxy object is an array we should return the length. */
        if (errorName === 'length') return conf.maxScopedDefs
        /** Otherwise return a new error definition. */
        const def = defineScopedExcption({
          errorName,
          labelName: options.label,
        })

        localScope.set(errorName, def)
        return def
      },
    }) as unknown as { [K in Keys[number]]: ExcpClass } & {
      scope: typeof scope
    }
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
    throw this.new(...args)
  }

  /**
   * Shorthand for creating a new instance (does not throw).
   */
  public static new(...args: any[]): Exception {
    return new this(...args)
  }

  public override readonly name: string = 'Exception'
  public scopeIndex: number = 0
  public code: number | undefined = undefined
  public get label(): string | undefined {
    return undefined
  }
  public get fileName(): string | undefined {
    return getStackInfo(this.stack)?.fileName
  }

  protected get ctor() {
    return this.constructor as typeof Exception
  }

  constructor(...args: any[]) {
    super(safeEncode(...args), {
      cause: getPossibleCause(...args),
    })
  }

  /**
   * Transform an exception into a different data type.
   */
  public into<T>(transformFn: (excp: typeof this) => T): T {
    return transformFn(this)
  }

  /**
   * Helper for quickly inspecting error contents.
   */
  public debug({ verbose = false } = {}): this {
    const entries: Record<string, any> = {
      name: this.name,
      message: this.message,
    }
    const stackInfo = getStackInfo(this.stack)
    if (!verbose && stackInfo?.fileName) {
      entries['fileName'] = stackInfo.fileName
    }
    if (verbose) {
      entries['stackInfo'] = stackInfo ?? this.stack
      entries['timestamp'] = new Date().toLocaleString('en-US', {
        dateStyle: 'short',
        timeStyle: 'long',
      })
    }
    console.log(entries) // NOTE: keep this here!
    return this
  }

  /**
   * Creates an identical* copy of this instance.
   *
   * @note stack info might be slightly different.
   */
  public clone(): this {
    return this.ctor.from(this) as this
  }

  public toObject() {
    // Extract raw message (without label/name prefix)
    const rawMessage = this.message
      .replace(/^\[.*?\]\s+/, '') // Remove [label]
      .replace(/^[A-Za-z0-9_]+:\s*/, '') // Remove Name: (handles Error404, etc)
      .trim()

    return {
      name: this.name,
      message: this.message,
      rawMessage: rawMessage,
      label: this.label,
      scopeIndex: this.scopeIndex,
      stack: this.stack,
      cause: this.cause,
      fileName: this.fileName,
    }
  }
}
