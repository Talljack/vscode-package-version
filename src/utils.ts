import * as vscode from 'vscode';
import * as fs from 'fs';
import * as https from 'https';
export function parsePackageJson(uri: vscode.Uri): any {
  if (fs.existsSync(uri.fsPath)) {
      const packageJsonContent = fs.readFileSync(uri.fsPath, 'utf8');
      return JSON.parse(packageJsonContent);
  }
  return null;
}

export function getLatestVersion(packageName: string): Promise<string> {
  return new Promise((resolve, reject) => {
      https.get(`https://registry.npmjs.org/${packageName}/latest`, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
              resolve(JSON.parse(data).version);
          });
      }).on('error', (err) => {
          reject(err);
      });
  });
}
