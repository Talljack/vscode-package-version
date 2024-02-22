import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";
export function parsePackageJson(uri: vscode.Uri): any {
  console.log("uri", uri);
  let path = uri.fsPath;
  if (/\.git/.test(uri.fsPath)) {
    path = path.replace(/\.git/g, "");
  }
  if (fs.existsSync(path)) {
    const packageJsonContent = fs.readFileSync(path, "utf8");
    return JSON.parse(packageJsonContent);
  }
  return null;
}

export function getLatestVersion(packageName: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https
      .get(`https://registry.npmjs.org/${packageName}/latest`, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          resolve(JSON.parse(data).version);
        });
      })
      .on("error", (err) => {
        reject(err);
      });
  });
}

export function checkOpenFileName() {
  const activeEditor = vscode.window.activeTextEditor;
  if (activeEditor) {
    const document = activeEditor.document;
    const filePath = document.uri.fsPath; // 获取文件的完整路径
    const fileName = path.basename(filePath); // 从路径中提取文件名

    if (fileName === "package.json") {
      return true;
    } else {
      return false;
    }
  } else {
    return false;
  }
}

type VersionDifference = "major" | "minor" | "patch" | "none" | "invalid";

export function compareVersions(
  version1: string,
  version2: string
): VersionDifference {
  const semverRegex = /(\^|~)(\d+)\.(\d+)\.(\d+)$/;

  // 验证版本号格式
  if (!semverRegex.test(version1) || !semverRegex.test(version2)) {
    return "invalid";
  }

  const v1Parts = version1.match(semverRegex)!.slice(2).map(Number);
  const v2Parts = version2.match(semverRegex)!.slice(2).map(Number);
  // 比较 major、minor 和 patch 数字
  for (let i = 0; i < 4; i++) {
    if (v1Parts[i] !== v2Parts[i]) {
      return ["major", "minor", "patch"][i] as VersionDifference;
    }
  }

  // 版本号完全相同
  return "none";
}

export const packageVersionColorMap: Record<VersionDifference, string> = {
  major: "#d03050",
  minor: "#f0a020",
  patch: "#18a058",
  none: "#2080f0",
  invalid: "#999",
};
