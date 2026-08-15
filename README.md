# Insty Language Support

VS Code support for the Insty language, including TextMate syntax highlighting, snippets, and the Insty language server client.

## Features

- Syntax highlighting for `.ins`
- Semantic highlighting from the language server (parser-accurate colors for functions, parameters, variables, types, enums, enum variants, `switch` bindings, and `@builtins`), enabled by default for Insty files
- Language server integration for diagnostics, completions, hover, go to definition, references, and rename
- Snippets for modules, imports, functions, classes, structs, enums, sum types, `switch`, `for`-in, loops, casts, and allocation
- Comment toggling, bracket matching, auto-closing pairs, and folding markers

## Syntax coverage

The bundled grammar is aligned with the current compiler surface, including:

- Module and import syntax: `module`, `import`, `::` scopes, selective imports, wildcard imports, `as`
- Declarations: `fun`, `struct`, `class`, `enum`, `constructor`, `destructor`, `operator`, `section`
- Control flow: `if`, `else`, `while`, `for ... in`, `loop`, `when`, `switch`, `return`, `break`, `skip`
- Tagged unions (sum types) and `switch` arms with payload bindings (`=>`)
- Ranges and slices: `a..b`, `s[a..b]`, `u8[]`
- Compile-time conditionals: `#if`, `#else`
- Memory and conversion syntax: `cast<T>(value)`, `new`, `delete`, `unsafe`, `volatile`
- Builtins such as `@syscall`, `@sizeof`, `@alignof`, `@malloc`, `@realloc`, `@free`, `@memcpy`, `@panic`, `@print`
- Primitive, pointer, generic, and slice types such as `i32`, `text`, `Foo<T>`, `Bar*`, `u8[]`
- String interpolation: `"value = $x"`, `"sum = ${a + b}"`

## Example

```insty
module main

import std::io

enum Expr {
    Lit(i64),
    Add(Expr*, Expr*)
}

fun eval(Expr* e) -> i64 {
    Expr node
    unsafe { node = ~e }
    switch node {
        Lit(v)    => return v
        Add(l, r) => return eval(l) + eval(r)
    }
    return 0
}

fun main() -> i32 {
    i32 total = 0
    for i in 0..10 {
        total = total + i
    }
    io.println("sum = ${total}")
    return total
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




