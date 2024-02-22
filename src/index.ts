// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as path from "path";
import { exec as execCallback } from "child_process";
import {
  parsePackageJson,
  compareVersions,
  packageVersionColorMap,
  getLatestVersion,
} from "./utils";

import { promisify } from "util";

// 将 exec 转换为返回 Promise 的版本
const exec = promisify(execCallback);

async function getPackageVersion(packageName: string): Promise<string> {
  try {
    const { stdout } = await exec(`npm view ${packageName} version`);
    return stdout.trim(); // 使用 trim() 来去除可能的换行符
  } catch (error) {
    // 错误处理
    console.error(`Error fetching package version: ${error}`);
    throw error; // 或者返回一个默认值/错误值
  }
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(async (document) => {
      if (path.basename(document.uri.fsPath).includes("package.json")) {
        const packageJson = parsePackageJson(document.uri);
        if (!packageJson) {
          return;
        }
        const editor = vscode.window.activeTextEditor;
        if (editor) {
          const decorationsArray: vscode.DecorationOptions[] = [];
          const decorationType = vscode.window.createTextEditorDecorationType({
            after: { margin: "0 0 0 3em" },
          });

          const dependencies = packageJson.dependencies ?? {};
          const devDependencies = packageJson.devDependencies ?? {};
          const allDependencies = { ...dependencies, ...devDependencies };

          for (const [packageName, currentVersion] of Object.entries(
            allDependencies
          )) {
            const latestVersion = await getLatestVersion(packageName);
            const versionPatchType = compareVersions(
              currentVersion as string,
              `^${latestVersion}`
            );
            const regex = new RegExp(`"${packageName}":\\s*"[^"]+"`, "g");
            const text = document.getText();
            let match;
            while ((match = regex.exec(text)) !== null) {
              const startPos = document.positionAt(match.index);
              const endPos = document.positionAt(match.index + match[0].length);
              const decoration = {
                range: new vscode.Range(startPos, endPos),
                hoverMessage: `Update available: ${latestVersion}`,
                renderOptions: {
                  after: {
                    contentText: `Update available: ${latestVersion}`,
                    color: packageVersionColorMap[versionPatchType],
                  },
                },
              };
              decorationsArray.push(decoration);
            }
          }
          editor.setDecorations(decorationType, decorationsArray);
        }
      }
    })
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
