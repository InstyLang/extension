# Insty Language Server

The Insty VS Code extension talks to the real `insty-lsp` server built from this repository.

## Current capabilities

- Real diagnostics from the compiler lexer and parser
- Completion for keywords, types, builtins, visible symbols, imported modules, selective imports, and wildcard imports
- Hover for symbols
- Go to definition
- Find references
- Rename

## Client behavior

- Uses `insty.lspPath` when configured
- Otherwise prefers `insty-lsp` from `PATH`
- In this repo’s dev setup, automatically falls back to `../LSP/build/insty-lsp` when it exists
- Supports both TCP and stdio transport

## VS Code settings

```json
{
  "insty.lspPath": "insty-lsp",
  "insty.useTcp": true,
  "insty.tcpPort": 9257
}
```

## Build

```bash
cmake -S ../LSP -B ../LSP/build
cmake --build ../LSP/build --target insty-lsp
```

## Extension build

```bash
cd Extension
pnpm install
pnpm run compile
```
