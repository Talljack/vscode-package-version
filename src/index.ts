// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import { parsePackageJson, getLatestVersion } from './utils';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
function activate(context: vscode.ExtensionContext) {
	console.log('start start activate');
	context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(async (document) => {
		console.log('00000', document.uri.fsPath);
			if (path.basename(document.uri.fsPath) === 'package.json') {
					const packageJson = parsePackageJson(document.uri);
					if (!packageJson) {return;}
					console.log('11111', packageJson);
					const editor = vscode.window.activeTextEditor;
					if (editor) {
							const decorationsArray: vscode.DecorationOptions[] = [];
							const decorationType = vscode.window.createTextEditorDecorationType({ after: { margin: '0 0 0 3em' } });

							const dependencies = packageJson.dependencies ?? {};
							const devDependencies = packageJson.devDependencies ?? {};
							const allDependencies = { ...dependencies, ...devDependencies };

							for (const [packageName, currentVersion] of Object.entries(allDependencies)) {
									console.log('2222', packageName);
									const latestVersion = await getLatestVersion(packageName);
									if (!editor || editor.document.uri.toString() !== document.uri.toString()) {
											// Editor might have been closed, stop processing further
											break;
									}
									console.log('3333', latestVersion);
									const regex = new RegExp(`"${packageName}":\\s*"[^"]+"`, 'g');
									const text = document.getText();
									let match;
									while ((match = regex.exec(text)) !== null) {
											const startPos = document.positionAt(match.index);
											const endPos = document.positionAt(match.index + match[0].length);
											const decoration = { range: new vscode.Range(startPos, endPos), hoverMessage: `Latest version: ${latestVersion}`, renderOptions: { after: { contentText: `Latest: ${latestVersion}`, color: 'lightgrey' } } };
											decorationsArray.push(decoration);
									}
							}

							if (editor && editor.document.uri.toString() === document.uri.toString()) {
                editor.setDecorations(decorationType, decorationsArray);
							}
					}
			}
	}));
}

// This method is called when your extension is deactivated
export function deactivate() {}

export { activate };
