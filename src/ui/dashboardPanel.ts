import * as vscode from 'vscode';
import type { StatsService, SnapshotEvent } from '../services/statsService';

export class DashboardPanel implements vscode.Disposable {
	static current?: DashboardPanel;

	private readonly disposables: vscode.Disposable[] = [];

	private constructor(
		private readonly panel: vscode.WebviewPanel,
		private readonly stats: StatsService,
	) {
		this.panel.webview.html = this.shellHtml(panel.webview.cspSource);
		this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

		// Push initial snapshot + subscribe to future changes.
		this.push(this.stats.snapshot());
		this.disposables.push(this.stats.onChanged(s => this.push(s)));
	}

	static show(context: vscode.ExtensionContext, stats: StatsService): DashboardPanel {
		const column = vscode.window.activeTextEditor ? vscode.ViewColumn.Beside : vscode.ViewColumn.One;
		if (DashboardPanel.current) {
			DashboardPanel.current.panel.reveal(column);
			return DashboardPanel.current;
		}
		const panel = vscode.window.createWebviewPanel(
			'aiFootprintDashboard',
			'AI Footprint',
			column,
			{ enableScripts: true, retainContextWhenHidden: true },
		);
		DashboardPanel.current = new DashboardPanel(panel, stats);
		context.subscriptions.push(DashboardPanel.current);
		return DashboardPanel.current;
	}

	dispose(): void {
		DashboardPanel.current = undefined;
		this.panel.dispose();
		while (this.disposables.length) {this.disposables.pop()?.dispose();}
	}

	private push(snapshot: SnapshotEvent): void {
		// Honest "AI Reliance %" — fraction of lines added today that arrived
		// via paste. Falls back to 0 when there's no activity rather than
		// computing a colorful but meaningless `100 - score`.
		const { today, streak, last7 } = snapshot;
		const reliance = today.totalLinesAdded > 0
			? Math.min(100, Math.round((today.pastedLines / today.totalLinesAdded) * 100))
			: 0;

		void this.panel.webview.postMessage({
			type: 'update',
			today,
			streak,
			last7: last7.map(d => ({ date: d.date, score: d.score, pastes: d.pastes })),
			reliance,
		});
	}

	private shellHtml(cspSource: string): string {
		const csp = [
			"default-src 'none'",
			`style-src ${cspSource} 'unsafe-inline'`,
			`script-src ${cspSource} 'unsafe-inline'`,
		].join('; ');

		return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<title>AI Footprint</title>
<style>
	* { margin: 0; padding: 0; box-sizing: border-box; }
	body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: var(--vscode-editor-background, #1e1e1e); color: var(--vscode-editor-foreground, #d4d4d4); padding: 24px; }
	h1 { font-size: 18px; font-weight: 600; margin-bottom: 4px; }
	.subtitle { font-size: 12px; opacity: 0.6; margin-bottom: 24px; }
	.score-card { background: var(--vscode-editorWidget-background, #252526); border: 1px solid var(--vscode-editorWidget-border, #3c3c3c); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 20px; }
	.score-label { font-size: 12px; opacity: 0.7; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
	.score-value { font-size: 64px; font-weight: 700; line-height: 1; }
	.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
	.stat-card { background: var(--vscode-editorWidget-background, #252526); border: 1px solid var(--vscode-editorWidget-border, #3c3c3c); border-radius: 10px; padding: 16px; }
	.stat-value { font-size: 28px; font-weight: 700; margin-bottom: 4px; }
	.stat-label { font-size: 11px; opacity: 0.65; text-transform: uppercase; letter-spacing: 0.5px; }
	.message { background: var(--vscode-editorWidget-background, #252526); border: 1px solid var(--vscode-editorWidget-border, #3c3c3c); border-radius: 10px; padding: 16px; font-size: 13px; line-height: 1.6; margin-bottom: 20px; }
	.spark { display: flex; align-items: flex-end; gap: 4px; height: 48px; margin-top: 12px; }
	.spark div { flex: 1; background: var(--vscode-charts-blue, #4ec9b0); opacity: 0.85; border-radius: 2px 2px 0 0; min-height: 2px; }
	.footer { font-size: 11px; opacity: 0.4; text-align: center; }
</style>
</head>
<body>
	<h1>AI Footprint</h1>
	<p class="subtitle">Helping you stay in control of your code</p>
	<div class="score-card">
		<div class="score-label">Today's AI Score</div>
		<div class="score-value" id="score">—</div>
	</div>
	<div class="grid">
		<div class="stat-card"><div class="stat-value" id="pastes">0</div><div class="stat-label">Pastes Today</div></div>
		<div class="stat-card"><div class="stat-value" id="nudges">0</div><div class="stat-label">Nudges Today</div></div>
		<div class="stat-card"><div class="stat-value" id="streak">0</div><div class="stat-label">Clean-Day Streak</div></div>
		<div class="stat-card"><div class="stat-value" id="reliance">0%</div><div class="stat-label">AI Reliance Today</div></div>
	</div>
	<div class="message" id="message">Loading…<div class="spark" id="spark"></div></div>
	<div class="footer">AI Footprint — all data stays on this machine</div>
<script>
	const $ = id => document.getElementById(id);
	function colorFor(score) {
		if (score >= 80) return 'var(--vscode-testing-iconPassed, #4ec9b0)';
		if (score >= 50) return 'var(--vscode-charts-yellow, #dcdcaa)';
		return 'var(--vscode-errorForeground, #f44747)';
	}
	function messageFor(score) {
		if (score >= 80) return "You're writing most of your code yourself today. Good.";
		if (score >= 50) return "Some AI reliance detected. Make sure you understand what you've added.";
		return "Heavy AI usage today. Take time to review what's been added — understanding your codebase is non-negotiable.";
	}
	window.addEventListener('message', (e) => {
		const m = e.data;
		if (m.type !== 'update') return;
		const t = m.today;
		$('score').textContent = String(t.score);
		$('score').style.color = colorFor(t.score);
		$('pastes').textContent = String(t.pastes);
		$('nudges').textContent = String(t.nudges);
		$('streak').textContent = String(m.streak.current) + (m.streak.best ? ' (best ' + m.streak.best + ')' : '');
		$('reliance').textContent = m.reliance + '%';
		const max = Math.max(1, ...m.last7.map(d => d.score));
		$('spark').innerHTML = m.last7.map(d =>
			'<div title="' + d.date + ': score ' + d.score + ', ' + d.pastes + ' pastes" style="height:' + (d.score / max * 100) + '%"></div>'
		).join('');
		$('message').firstChild.nodeValue = messageFor(t.score);
	});
</script>
</body>
</html>`;
	}
}
