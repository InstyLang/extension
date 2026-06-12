import * as fs from "fs";
import * as net from "net";
import * as path from "path";
import { spawn } from "child_process";

import * as vscode from "vscode";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  StreamInfo,
  TransportKind,
} from "vscode-languageclient/node";

let client: LanguageClient | undefined;
let output: vscode.OutputChannel;

const LANGUAGE_ID = "insty";

/**
 * Resolve the language server executable. Resolution order matches the docs:
 *   1. The configured `insty.lspPath` (absolute, or relative to a workspace
 *      folder, or a bare command found on PATH).
 *   2. The repository dev build at `../LSP/build/insty-lsp`.
 *   3. The bare command `insty-lsp`, left for PATH lookup at spawn time.
 */
function resolveServerPath(): string {
  const configured = vscode.workspace
    .getConfiguration(LANGUAGE_ID)
    .get<string>("lspPath", "insty-lsp")
    .trim();

  if (configured && configured !== "insty-lsp") {
    if (path.isAbsolute(configured) && fs.existsSync(configured)) {
      return configured;
    }
    for (const folder of vscode.workspace.workspaceFolders ?? []) {
      const candidate = path.join(folder.uri.fsPath, configured);
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }
    // A bare configured command (e.g. "insty-lsp"): trust PATH lookup.
    return configured;
  }

  // Dev fallback: ../LSP/build/insty-lsp relative to each workspace folder.
  for (const folder of vscode.workspace.workspaceFolders ?? []) {
    const candidate = path.join(
      folder.uri.fsPath,
      "..",
      "LSP",
      "build",
      "insty-lsp",
    );
    if (fs.existsSync(candidate)) {
      return candidate;
    }
    const sibling = path.join(folder.uri.fsPath, "LSP", "build", "insty-lsp");
    if (fs.existsSync(sibling)) {
      return sibling;
    }
  }

  return configured || "insty-lsp";
}

/**
 * Build server options for the TCP transport. The C++ server *listens* on the
 * given port, so we spawn it with `--socket <port>` and then connect a client
 * socket once it is accepting.
 */
function tcpServerOptions(serverPath: string, port: number): ServerOptions {
  return () =>
    new Promise<StreamInfo>((resolve, reject) => {
      const proc = spawn(serverPath, ["--socket", String(port)], {
        stdio: ["ignore", "ignore", "pipe"],
      });

      proc.on("error", (err) => reject(err));
      proc.stderr?.on("data", (chunk: Buffer) =>
        output.append(chunk.toString()),
      );

      // Retry the connect until the server's listen() is ready.
      const deadline = Date.now() + 10_000;
      const tryConnect = () => {
        const socket = net.connect(port, "127.0.0.1");
        socket.once("connect", () => {
          resolve({ reader: socket, writer: socket });
        });
        socket.once("error", (err) => {
          socket.destroy();
          if (Date.now() > deadline) {
            proc.kill();
            reject(err);
            return;
          }
          setTimeout(tryConnect, 100);
        });
      };
      tryConnect();
    });
}

function stdioServerOptions(serverPath: string): ServerOptions {
  return {
    run: { command: serverPath, transport: TransportKind.stdio },
    debug: { command: serverPath, transport: TransportKind.stdio },
  };
}

export function activate(context: vscode.ExtensionContext): void {
  output = vscode.window.createOutputChannel("Insty Language Server");
  context.subscriptions.push(output);

  const start = () => {
    void startClient(context);
  };

  context.subscriptions.push(
    vscode.commands.registerCommand("insty.restartServer", async () => {
      await stopClient();
      start();
    }),
  );

  // Restart automatically when relevant settings change.
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (
        event.affectsConfiguration("insty.lspPath") ||
        event.affectsConfiguration("insty.useTcp") ||
        event.affectsConfiguration("insty.tcpPort")
      ) {
        void (async () => {
          await stopClient();
          start();
        })();
      }
    }),
  );

  start();
}

async function startClient(context: vscode.ExtensionContext): Promise<void> {
  const config = vscode.workspace.getConfiguration(LANGUAGE_ID);
  const useTcp = config.get<boolean>("useTcp", false);
  const port = config.get<number>("tcpPort", 9257);
  const serverPath = resolveServerPath();

  const isAbsolute = path.isAbsolute(serverPath);
  const exists = isAbsolute ? fs.existsSync(serverPath) : true; // PATH lookup deferred to spawn
  output.appendLine(
    `Starting insty-lsp (${useTcp ? `tcp:${port}` : "stdio"}) -> ${serverPath}` +
      (isAbsolute ? ` (exists: ${exists})` : " (resolved via PATH)"),
  );

  if (isAbsolute && !exists) {
    output.appendLine(
      `ERROR: language server not found at "${serverPath}". ` +
        `Set "insty.lspPath" to the insty-lsp executable.`,
    );
    void vscode.window.showErrorMessage(
      `Insty language server not found at "${serverPath}". ` +
        `Check the "insty.lspPath" setting.`,
    );
    return;
  }

  const serverOptions = useTcp
    ? tcpServerOptions(serverPath, port)
    : stdioServerOptions(serverPath);

  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      { scheme: "file", language: LANGUAGE_ID },
      { scheme: "untitled", language: LANGUAGE_ID },
    ],
    synchronize: {
      fileEvents: vscode.workspace.createFileSystemWatcher("**/*.ins"),
    },
    outputChannel: output,
  };

  client = new LanguageClient(
    LANGUAGE_ID,
    "Insty Language Server",
    serverOptions,
    clientOptions,
  );

  try {
    await client.start();
    context.subscriptions.push(client);
  } catch (err) {
    output.appendLine(`Failed to start language server: ${String(err)}`);
    void vscode.window.showErrorMessage(
      `Insty language server failed to start: ${String(err)}. ` +
        `Check the "insty.lspPath" setting.`,
    );
  }
}

async function stopClient(): Promise<void> {
  if (client) {
    await client.stop().catch(() => undefined);
    client = undefined;
  }
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  const stopping = client.stop();
  client = undefined;
  return stopping;
}
