interface Scope<T, Keys extends string = string> {
  data: Record<Keys, T>
  children: Scope<T>[]
  readonly keys: Keys[]
  readonly size: number
  set<K extends string>(key: K, value: T): Scope<T, Keys | K>
  get<K extends Keys>(key: K): T
  get(key: string): T | undefined
  has<K extends string>(key: K): this is Scope<T, K | Keys>
  [Symbol.iterator](): IterableIterator<T>
  subscope(): Scope<T>
}

const createScope = <T, Keys extends string = never>(): Scope<T, Keys> => {
  const scope: Scope<T, Keys> = {
    data: {} as Record<Keys, T>,
    children: [],

    subscope() {
      const child = createScope<T>()
      this.children.push(child)
      return child
    },

    get keys() {
      return Object.keys(this.data) as Keys[]
    },

    get size() {
      return Object.keys(this.data).length
    },

    has<K extends string>(key: K) {
      return key in this.data && this.data[key as unknown as Keys] !== undefined
    },

    get(key: string) {
      return this.data[key as Keys]
    },

    set<K extends string>(key: K, value: T): Scope<T, Keys | K> {
      this.data[key as unknown as Keys] = value
      return this as any as Scope<T, Keys | K>
    },

    *[Symbol.iterator](): IterableIterator<T> {
      yield* Object.values<T>(this.data)
      for (const child of this.children) {
        yield* child
      }
    },
  }

  return scope
}

// Usage
const globalScope = createScope<number>()

const s1 = globalScope.set('age', 123)
const s2 = s1.set('count', 456)

if (s2.has('age')) {
  const age: number = s2.data.age // ✅ Typed!
}

// Also works with type narrowing
if (s2.has('missing')) {
  const x = s2.data.missing // Only reachable if 'missing' exists
}

const childScope = s2.subscope()
childScope.set('nested', 789)

console.log(...s2) // 123, 456, 789
