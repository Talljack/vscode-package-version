// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import {
  compareVersions,
  packageVersionColorMap,
  getLatestVersion,
  createDecorationType,
  readPackageJsonDependencies,
} from "./utils";
import type { PackageInfoType } from "./type";

let timer: NodeJS.Timeout;
const PACKAGE_KEY = "dep-package";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  const decorationType = createDecorationType();
  const updateLatestPackageVersion = (uri: vscode.Uri) => {
    const allDependencies = readPackageJsonDependencies(uri);
    if (!allDependencies) {
      return;
    }
    getAllDependenciesLatestVersion(allDependencies, true);
  };
  const getAllDependenciesLatestVersion = async (
    allDependencies: Record<string, string>,
    update = false
  ) => {
    const packageInfo: PackageInfoType = {};
    for (const [packageName, currentVersion] of Object.entries(
      allDependencies
    )) {
      // package storage
      let latestVersion = context.globalState.get<string>(
        `${PACKAGE_KEY}_${packageName}`
      );
      if (!latestVersion || update) {
        latestVersion = await getLatestVersion(packageName);
        context.globalState.update(
          `${PACKAGE_KEY}_${packageName}`,
          latestVersion
        );
      }
      // private npm
      if (!latestVersion || update) {
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
    const packageInfo = await getAllDependenciesLatestVersion(allDependencies);
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      // 3. 构造 decorationArray
      const decorationsArray = await createDecorationArray(
        document,
        packageInfo,
        uri
      );
      editor.setDecorations(decorationType, []);
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
  // 自动定时器更新 package version
  timer = setInterval(async () => {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders) {
        console.log('No workspace folder found.');
        return;
    }

    const rootPath = folders[0].uri; // 获取第一个工作区的路径
    const packageJsonUri = vscode.Uri.joinPath(rootPath, 'package.json');
    if (!fs.existsSync(packageJsonUri.fsPath)) {
      return;
    }
    console.log('interval update latest package version');
    await updateLatestPackageVersion(packageJsonUri);
    // 每 10 分钟更新一次
  }, 1000 * 60 * 10);
  const packageJsonWatcher =
    vscode.workspace.createFileSystemWatcher("**/package.json");

  packageJsonWatcher.onDidChange(async (uri) => {
    await updateDependencies(uri);
  });
  context.subscriptions.push(packageJsonWatcher);
}

// This method is called when your extension is deactivated
export function deactivate() {}
