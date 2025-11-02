export interface Scope<T, Keys extends string = string> {
  name: string
  data: Record<Keys, T>
  children: Scope<T>[]
  parent: Scope<T> | null
  readonly keys: Keys[]
  readonly size: number
  readonly path: string
  set<K extends string>(key: K, value: T): Scope<T, Keys | K>
  get<K extends Keys>(key: K): T
  get(key: string): T | undefined
  has<K extends string>(key: K): this is Scope<T, K | Keys>
  [Symbol.iterator](): IterableIterator<T>
  subscope(scopeName: string): Scope<T>
  find(scopeName: string): Scope<T> | undefined
  with(scopeName: string): Scope<T>
  tree(): IterableIterator<Scope<T>>
  print(): void
}

/**
 * A type-safe map like container which improved type safety and
 * support for children.
 */
export const createScope = <T, Keys extends string = never>(
  name: string
): Scope<T, Keys> => {
  const scope: Scope<T, Keys> = {
    name,
    data: {} as Record<Keys, T>,
    children: [],
    parent: null,

    get path() {
      if (!this.parent) return this.name
      return `${this.parent.path}/${this.name}`
    },

    print() {
      console.log([...this.tree()].map((item) => item.path))
    },

    subscope(scopeName: string) {
      const child = createScope<T>(scopeName)
      this.children.push(child)
      child.parent = this
      return child
    },

    with(scopePath: string): Scope<T> {
      const existing = this.find(scopePath)
      if (existing) return existing

      // Handle nested paths like 'api:v1:users'
      const parts = scopePath.split('/')
      let current: Scope<T> = this

      for (const part of parts) {
        const found = current.children.find((c) => c.name === part)
        if (found) {
          current = found
        } else {
          current = current.subscope(part)
        }
      }

      return current
    },

    find(scopePath: string): Scope<T> | undefined {
      for (const scope of this.tree()) {
        if (scope.path === scopePath) {
          return scope
        }
      }
      return undefined
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

    *tree(): IterableIterator<Scope<T>> {
      yield this
      for (const child of this.children) {
        yield* child.tree()
      }
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
