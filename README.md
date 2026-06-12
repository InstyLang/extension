# Insty Language Support

VS Code support for the Insty language, including TextMate syntax highlighting, snippets, and the Insty language server client.

## Features

- Syntax highlighting for `.ins` and `.ecc`
- Language server integration for diagnostics, completions, hover, go to definition, references, and rename
- Snippets for modules, imports, functions, classes, structs, enums, generic constraints, loops, casts, and allocation
- Comment toggling, bracket matching, auto-closing pairs, and folding markers

## Syntax coverage

The bundled grammar is aligned with the current compiler surface, including:

- Module and import syntax: `module`, `import`, selective imports, wildcard imports, `as`
- Declarations: `fun`, `struct`, `class`, `enum`, `constructor`, `destructor`, `operator`
- Control flow: `if`, `else`, `while`, `loop`, `when`, `return`, `break`, `skip`
- Compile-time conditionals: `#if`, `#else`
- Memory and conversion syntax: `cast<T>(value)`, `new`, `delete`
- Builtins such as `@syscall`, `@sizeof`, `@typeof`, `@alignof`, `@offsetof`, `@bitcast`, `@inttoptr`, `@ptrtoint`
- Primitive, pointer, generic, and slice types such as `i32`, `text`, `string`, `Foo<T>`, `Bar*`, `u8[]`
- String interpolation: `"value = $x"`, `"sum = ${a + b}"`

## Example

```insty
module main

import io
import math.{abs}

class Box<T: Copyable> {
    T value

    constructor(T item) {
        value = item
    }

    fun get() -> T {
        return value
    }
}

fun main() -> i32 {
    Box<i32> box = Box<i32>(42)
    io.println("value: $box.get()")
    return abs(-1)
}
```

## LSP setup

By default the extension looks for `insty-lsp` in your `PATH`. In this repository it will also automatically use `../LSP/build/insty-lsp` when present.

Settings:

```json
{
  "insty.lspPath": "insty-lsp",
  "insty.useTcp": true,
  "insty.tcpPort": 9257
}
```

## Development

```bash
pnpm install
pnpm run compile
```
