/**
 * Ralph Extension - Delegate issue work to a fresh-context agent
 *
 * Spawns a separate pi process that picks the highest-priority
 * ready-for-agent issue, implements it, and commits.
 *
 * Usage:
 *   /ralph          - Run with default ralph-prompt.md
 *   /ralph <extra>  - Append extra instructions to the prompt
 */

import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Key, matchesKey, Text } from "@earendil-works/pi-tui";

function getPiInvocation(args: string[]): { command: string; args: string[] } {
	const currentScript = process.argv[1];
	const isBunVirtualScript = currentScript?.startsWith("/$bunfs/root/");
	if (currentScript && !isBunVirtualScript && fs.existsSync(currentScript)) {
		return { command: process.execPath, args: [currentScript, ...args] };
	}
	const execName = path.basename(process.execPath).toLowerCase();
	const isGenericRuntime = /^(node|bun)(\.exe)?$/.test(execName);
	if (!isGenericRuntime) {
		return { command: process.execPath, args };
	}
	return { command: "pi", args };
}

interface RalphProgress {
	turns: number;
	lastToolCall?: string;
	lastText?: string;
	status: "running" | "done" | "error" | "aborted";
	exitCode?: number;
	log: string[];
}

export default function (pi: ExtensionAPI) {
	pi.registerCommand("ralph", {
		description: "Delegate next ready-for-agent issue to a fresh-context agent",
		handler: async (args, ctx) => {
			if (ctx.mode !== "tui") {
				ctx.ui.notify("ralph requires interactive mode", "error");
				return;
			}

			// Read the prompt file
			const promptPath = path.join(ctx.cwd, "ralph-prompt.md");
			if (!fs.existsSync(promptPath)) {
				ctx.ui.notify(`Missing ${promptPath}`, "error");
				return;
			}

			let prompt = fs.readFileSync(promptPath, "utf-8");

			// Append extra instructions if provided
			const extra = args.trim();
			if (extra) {
				prompt += `\n\nAdditional instructions: ${extra}`;
			}

			// Run in custom UI with live progress
			const result = await ctx.ui.custom<RalphProgress>((tui, theme, _kb, done) => {
				const progress: RalphProgress = { turns: 0, status: "running", log: [] };
				const MAX_LOG_LINES = 20;

				const text = new Text(formatProgress(progress, theme), 0, 0);

				const pushLog = (line: string) => {
					progress.log.push(line);
					if (progress.log.length > MAX_LOG_LINES) {
						progress.log.shift();
					}
					text.setText(formatProgress(progress, theme));
					tui.render();
				};

				// Abort handling via handleInput (the correct TUI component API)
				let proc: ReturnType<typeof spawn> | null = null;
				const kill = () => {
					if (proc && !proc.killed) {
						proc.kill("SIGTERM");
						setTimeout(() => {
							if (proc && !proc.killed) proc.kill("SIGKILL");
						}, 3000);
					}
				};

				text.handleInput = (data: string) => {
					if (matchesKey(data, Key.escape)) {
						progress.status = "aborted";
						kill();
						done(progress);
					}
				};

				// Timeout: kill if no output within 30s
				let activityTimer: ReturnType<typeof setTimeout> | null = null;
				const resetTimer = () => {
					if (activityTimer) clearTimeout(activityTimer);
					activityTimer = setTimeout(() => {
						progress.status = "error";
						progress.lastText = "Timed out (no output for 30s)";
						kill();
						done(progress);
					}, 30_000);
				};
				resetTimer();

				// Build pi command
				const piArgs = [
					"-p",
					"--no-session",
					"--mode",
					"json",
					"--thinking",
					"high",
					prompt,
				];

				const invocation = getPiInvocation(piArgs);
				proc = spawn(invocation.command, invocation.args, {
					cwd: ctx.cwd,
					shell: false,
					stdio: ["ignore", "pipe", "pipe"],
				});

				let buffer = "";

				const processLine = (line: string) => {
					if (!line.trim()) return;
					resetTimer();
					let event: any;
					try {
						event = JSON.parse(line);
					} catch {
						// Non-JSON stdout — surface it as a log line
						pushLog(line.trim());
						return;
					}

					if (event.type === "message_end" && event.message?.role === "assistant") {
						progress.turns++;
						// Extract last text content
						const content = event.message.content;
						if (Array.isArray(content)) {
							for (const part of content) {
								if (part.type === "text" && part.text) {
									progress.lastText = part.text.slice(0, 200);
								}
								if (part.type === "toolCall") {
									progress.lastToolCall = formatToolCallBrief(part);
								}
							}
						}
					}

					if (event.type === "tool_execution_start") {
						progress.lastToolCall = formatToolStartBrief(event);
					}

					text.setText(formatProgress(progress, theme));
					tui.render();
				};

				proc.stdout!.on("data", (data: Buffer) => {
					resetTimer();
					buffer += data.toString();
					const lines = buffer.split("\n");
					buffer = lines.pop() || "";
					for (const line of lines) processLine(line);
				});

				let stderrBuf = "";
				proc.stderr!.on("data", (data: Buffer) => {
					resetTimer();
					stderrBuf += data.toString();
					const lines = stderrBuf.split("\n");
					stderrBuf = lines.pop() || "";
					for (const line of lines) {
						if (line.trim()) pushLog(line.trim());
					}
				});

				proc.on("close", (code: number | null) => {
					if (activityTimer) clearTimeout(activityTimer);
					if (buffer.trim()) processLine(buffer);
					progress.exitCode = code ?? 0;
					progress.status = code === 0 ? "done" : "error";
					done(progress);
				});

				proc.on("error", (err: Error) => {
					progress.status = "error";
					progress.lastText = err.message;
					done(progress);
				});

				return text;
			});

			// Show result
			if (!result || result.status === "aborted") {
				ctx.ui.notify("Ralph aborted", "warning");
			} else if (result.status === "error") {
				ctx.ui.notify(
					`Ralph failed (exit ${result.exitCode}): ${result.lastText || "unknown error"}`,
					"error",
				);
			} else {
				ctx.ui.notify(
					`Ralph done ✓ (${result.turns} turns)`,
					"info",
				);
			}
		},
	});
}

function formatProgress(progress: RalphProgress, theme: any): string {
	const header = theme.fg("accent", theme.bold("🐕 Ralph")) + theme.fg("muted", " — working issue...");
	const status = theme.fg("dim", `Turns: ${progress.turns}`);

	let detail = "";
	if (progress.lastToolCall) {
		detail += "\n" + theme.fg("muted", "→ ") + theme.fg("toolOutput", progress.lastToolCall);
	}
	if (progress.lastText) {
		const preview = progress.lastText.split("\n")[0].slice(0, 80);
		detail += "\n" + theme.fg("dim", preview);
	}

	// Session log tail
	if (progress.log.length > 0) {
		detail += "\n" + theme.fg("muted", "─── log ───");
		for (const line of progress.log) {
			detail += "\n" + theme.fg("dim", line.slice(0, 100));
		}
	}

	const footer = "\n" + theme.fg("muted", "(Escape to abort)");

	return `${header}\n${status}${detail}${footer}`;
}

function formatToolCallBrief(part: any): string {
	const name = part.name || "unknown";
	const args = part.arguments || {};
	switch (name) {
		case "bash": {
			const cmd = (args.command || "").split("\n")[0].slice(0, 60);
			return `$ ${cmd}`;
		}
		case "read":
			return `read ${args.path || args.file_path || "..."}`;
		case "write":
			return `write ${args.path || args.file_path || "..."}`;
		case "edit":
			return `edit ${args.path || args.file_path || "..."}`;
		default:
			return `${name}(...)`;
	}
}

function formatToolStartBrief(event: any): string {
	const name = event.toolName || "unknown";
	const args = event.args || {};
	switch (name) {
		case "bash": {
			const cmd = (args.command || "").split("\n")[0].slice(0, 60);
			return `$ ${cmd}`;
		}
		case "read":
			return `read ${args.path || args.file_path || "..."}`;
		case "write":
			return `write ${args.path || args.file_path || "..."}`;
		case "edit":
			return `edit ${args.path || args.file_path || "..."}`;
		default:
			return `${name}(...)`;
	}
}
