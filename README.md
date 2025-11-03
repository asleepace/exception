# Exception

Error handling which sucks less.

```bash
npm install @asleepace/exception
# or
bun i @asleepace/exception
```

### Goals

Exception handling is always treated as an after thought and not a first class citizen,
this project aims to modernize the APIs and provide much needed quality of life improvements such as:

1. Make exception handling easier & less verbose
2. Describe errors via explicit names vs. long messages
3. Allow passing multiple arguments as messages
4. Easier debugging and formatting

```ts
import { Exception } from '@asleepace/exception'

// example #1: create custom errors by destructuring
const { InvalidProperty, InvalidParameters, InvalidString } = Exception.enum()

// example #2: can also destructure like so:
const {
  404: NotFound,
  401: NotAuthorized,
  500: InternalServerError,
  scope,
} = Exception.enum({ label: 'http' })

function example(request: Request) {
  try {
    throw NotFound(request.url)
  } catch (e: unknown) {
    console.log(e instanceof Error) // true
    console.log(e instanceof NotFound) // true
    return NotFound.is(e)?.message ?? 'unknown error'
  }
}
```

## API

### 1. Enumeration

```ts
// you can destructure to any valid symbol name
const { Key1, Key2, Key3 } = Exception.enum()

// you can destructure to any valid symbol name
const {
  404: NotFound,
  401: NotAuthorized,
  500: InternalServerError,
  scope,
} = Exception.enum()

const error = new NotFound()

// scope is a special property which contains all definitions
const output = scope.match(error)?.into((exception): Response => {
  return Response.json(excp.toObject(), { status: excp.code ?? 500 })
})
```

### 2. Helpers

```ts
const { CustomError } = Exception.enum()

// static `.is(unknown): boolean` type-guard
if (CustomError.is(e)) {
  console.log(e.name === 'CustomError') // true!
}

// static method: `.cast(unknown): ExcpInstance` convert other data type to exception instance
const err: CustomError = CustomError.cast(new Error('normal error'))

// instance method: `.into<T>(transformFn): T` convert exception instance into other data type.
const out: string = new CustomError().into((err) => err.message)
```

### 3. Snippets

Below is a collection of cool snippets which demonstrate some nice use cases, check out the `./tests/` directory
as well for more examples.

```ts
const { CatcherInTheRye } = Exception.enum({ label: 'snippets' })

try {
  // this is why we are stuck with the unknown type in catch....
  throw 'old scool non-error'
} catch (e: unknown) {
  Exception.cast(e)
    .debug({ verbose: true }) // inspect
    .throw() // rethrow as Exception instance
}
```

The debug output will look someting like the following:

```js
{
  name: "CatcherInTheRye",
  message: "[snippets] CatcherInTheRye: old scool non-error (main.test.ts)",
  stackInfo: {
    filePath: "/Users/asleepace/dev/@asleepace/errors/tests/main.test.ts",
    fileName: "main.test.ts",
    lineNumbers: [ 49, 20 ],
  },
  timestamp: "11/3/25, 4:10:22 AM UTC",
}
```

As you can see the message also contains a more detailed view of what happened,
which can be customized via a template as well. (check source code)

More docs coming soon, but time for sleep...

## Contributing

https://github.com/asleepace/exception
