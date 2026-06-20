import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	console.log('AI Footprint is now active!');

	// This fires every time text changes in the editor
	const textChangeListener = vscode.workspace.onDidChangeTextDocument((event) => {

		// Loop through every change in this event
		// (there can be multiple, e.g. multi-cursor editing)
		for (const change of event.contentChanges) {

			const textAdded = change.text;
			const linesAdded = textAdded.split('\n').length - 1;
			const timestamp = Date.now();

			// Log every change so we can see what's happening
			console.log('--- Change Detected ---');
			console.log('Lines added:', linesAdded);
			console.log('Characters added:', textAdded.length);
			console.log('Timestamp:', timestamp);

			// PASTE DETECTION
			// A paste = lots of lines appearing in a single change event
			const PASTE_THRESHOLD = 5; // we'll make this configurable later

			if (linesAdded >= PASTE_THRESHOLD) {
				console.log('🚨 PASTE DETECTED');
				vscode.window.showWarningMessage(
					`AI Footprint: Large paste detected (${linesAdded} lines). Make sure you understand this code!`
				);
			}
		}
	});

	// Always push listeners to subscriptions for cleanup
	context.subscriptions.push(textChangeListener);
}

export function deactivate() {}