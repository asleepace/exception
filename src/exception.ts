export type ExcpClass = typeof Exception
export type ExcpInstance = InstanceType<ExcpClass>

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

const globalDefinitions = new Map<string, Map<string, ExcpClass>>()

const getScopedDefinitions = (scope: string) => {
  if (!globalDefinitions.has(scope)) {
    globalDefinitions.set(scope, new Map())
  }
  return globalDefinitions.get(scope)!
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

function getAllFrames(stack: string) {
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

// ======================= define =======================

export function defineScopedExcption(options: {
  errorName: string
  labelName?: string | undefined
}): ExcpClass {
  const dummy = new Exception()

  /**
   * Use the call site as the scope location.
   */
  const stackFrames = getAllFrames(dummy.stack ?? '')
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

    static override throw(...args: any[]): never {
      throw new this(...args)
    }

    // instance properties ...

    public override name: string = options.errorName // NOTE: don't use label here
    public override scopeIndex = ScopedException.scopedIndex

    public override get label(): string | undefined {
      return options.labelName
    }

    constructor(...args: any[]) {
      super(...args)
      // format message like so:
      // TestError (code: 2)
      // TestError (code: 2): A message.
      const components: string[] = []

      if (this.label) {
        components.push(`[${this.label}] `)
      }

      components.push(this.name)

      this.message && components.push(`: ${this.message}`)
      // NOTE: Important to set the message here.
      this.message = components.join('')
    }
  }

  scope.set(options.errorName, ScopedException)
  return ScopedException
}

export type MatchClause<T> = {
  is(item: unknown): boolean
  from(item: unknown): T
}

/**
 * Base exception class which all other errors inherit from.
 */
export class Exception extends Error {
  static MAX_SCOPED_DEFS: number = 100

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

  static enum<Keys extends string[] = string[]>(
    options: { label?: string } = {}
  ) {
    return new Proxy([], {
      get: (target, errorName) => {
        /** Handle special properties here... */
        if (typeof errorName === 'symbol') return target[errorName as any]
        if (errorName === 'length') return Exception.MAX_SCOPED_DEFS
        /** Otherwise return a new error definition. */
        return defineScopedExcption({ errorName, labelName: options.label })
      },
    }) as unknown as { [K in Keys[number]]: ExcpClass }
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
   * Creates an identical copy of this instance.
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
