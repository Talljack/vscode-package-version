// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as path from "path";
import {
  compareVersions,
  packageVersionColorMap,
  getLatestVersion,
  allHasCached,
  createDecorationType,
  readPackageJsonDependencies,
} from "./utils";
import type { PackageInfoType } from "./type";

let timer: NodeJS.Timeout;
const PACKAGE_KEY = "dep-package";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  const getAllDependenciesLatestVersion = async (
    allDependencies: Record<string, string>,
    uri: vscode.Uri
  ) => {
    const allPackageNames = Object.keys(allDependencies);
    context.workspaceState.update(
      `${uri.fsPath}-cachedAllPackageNames`,
      allPackageNames
    );
    const packageInfo: PackageInfoType = {};
    for (const [packageName, currentVersion] of Object.entries(
      allDependencies
    )) {
      console.log("packageName", packageName);
      // package storage
      let latestVersion = context.globalState.get<string>(
        `${PACKAGE_KEY}_${packageName}`
      );
      if (!latestVersion) {
        latestVersion = await getLatestVersion(packageName);
        context.globalState.update(
          `${PACKAGE_KEY}_${packageName}`,
          latestVersion
        );
      }
      // private npm
      if (!latestVersion) {
        continue;
      }
      const versionPatchType = compareVersions(
        currentVersion as string,
        `^${latestVersion}`
      );
      packageInfo[packageName] = {
        currentVersion,
        latestVersion,
        versionPatchType,
      };
      // const regex = new RegExp(
      //   `"${packageName}":\\s*"[^"](\\d+).(\\d+).(\\d+).*?"`,
      //   "g"
      // );
    }
    return packageInfo;
  };
  const createDecorationArray = async (
    document: vscode.TextDocument,
    packageInfo: PackageInfoType,
    uri: vscode.Uri
  ) => {
    const decorationsArray: vscode.DecorationOptions[] = [];
    for (const [packageName, packageInfoItem] of Object.entries(packageInfo)) {
      const { latestVersion, versionPatchType } = packageInfoItem;
      console.log("packageName", packageName);
      const regex = new RegExp(
        `"${packageName}":\\s*"[^"](\\d+).(\\d+).(\\d+).*?"`,
        "g"
      );
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
    return decorationsArray;
  };
  const updateDependencies = async (uri: vscode.Uri) => {
    const document = await vscode.workspace.openTextDocument(uri);
    // 1. 读取 allDependencies
    const allDependencies = readPackageJsonDependencies(uri);
    if (!allDependencies) {
      return;
    }
    // 2. 读取所有依赖的 latest version
    const packageInfo = await getAllDependenciesLatestVersion(
      allDependencies,
      uri
    );
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      // 3. 构造 decorationArray
      const decorationType = createDecorationType();
      const decorationsArray = await createDecorationArray(
        document,
        packageInfo,
        uri
      );

      editor.setDecorations(decorationType, decorationsArray!);
    }
  };
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(async (document) => {
      if (path.basename(document.uri.fsPath).includes("package.json")) {
        await updateDependencies(document.uri);
      }
    })
  );
  const packageJsonWatcher =
    vscode.workspace.createFileSystemWatcher("**/package.json");

  packageJsonWatcher.onDidChange(async (uri) => {
    console.log(`package.json changed: ${uri.fsPath}`);
    await updateDependencies(uri);
  });
  context.subscriptions.push(packageJsonWatcher);
}

// This method is called when your extension is deactivated
export function deactivate() {}
