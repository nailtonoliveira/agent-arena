#!/usr/bin/env node
/**
 * Antigravity CLI lifecycle hook adapter for AgentArena.
 * Reads Antigravity hook JSON from stdin, translates lifecycle & tool events
 * into AgentArena telemetry, posts to http://localhost:4848/api/event,
 * and returns the required JSON contract on stdout without ever blocking.
 */

import path from 'node:path';

const API_URL = process.env.AGENT_ARENA_API || 'http://localhost:4848/api/event';
const TIMEOUT_MS = Number(process.env.AGENT_ARENA_TIMEOUT_MS || 300);

const READ_TOOLS = new Set([
  'read_file',
  'view_file',
  'view_file_outline',
  'view_code_item',
  'grep_search',
  'find_by_name',
  'list_dir',
  'search_web',
  'read_url_content',
]);

const WRITE_TOOLS = new Set([
  'write_file',
  'edit_file',
  'write_to_file',
  'replace_file_content',
  'multi_replace_file_content',
]);

const EXEC_TOOLS = new Set([
  'run_command',
  'run_workflow',
  'invoke_subagent',
  'manage_task',
  'swarm',
]);

function truncate(value, max = 72) {
  if (!value) return '';
  const clean = String(value).replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function extractFileLabel(args = {}, fallback = 'file') {
  const candidate =
    args.Path ||
    args.TargetFile ||
    args.AbsolutePath ||
    args.SearchPath ||
    args.DirectoryPath ||
    args.Query ||
    args.query ||
    args.Url ||
    '';
  if (!candidate) return fallback;
  const text = String(candidate);
  if (text.includes('/')) {
    return truncate(path.basename(text) || text, 48);
  }
  return truncate(text, 48);
}

function estimateLines(args = {}) {
  const text =
    args.Content ||
    args.Replacement ||
    args.ReplacementContent ||
    args.CodeContent ||
    '';
  if (!text) return 12;
  const count = String(text).split('\n').length;
  return Math.max(4, Math.min(120, count));
}

function mapHookToArenaEvents(input) {
  const hookEvent = input.hookEventName || '';
  const events = [];

  if (hookEvent === 'SessionStart') {
    const workspace = Array.isArray(input.workspacePaths) && input.workspacePaths[0]
      ? path.basename(input.workspacePaths[0])
      : 'Antigravity Session';
    const title = truncate(input.lastUserInput || `Quest: ${workspace}`, 64);
    events.push({
      type: 'TASK_START',
      payload: { title, points: 100 },
    });
    return events;
  }

  if (hookEvent === 'PreInvocation') {
    const invocationNum = Number(input.invocationNum || 0);
    const initialNumSteps = Number(input.initialNumSteps || 0);

    if (invocationNum <= 1 && input.lastUserInput) {
      events.push({
        type: 'TASK_START',
        payload: {
          title: truncate(input.lastUserInput, 64),
          points: 100,
        },
      });
    } else if (invocationNum > 1 || initialNumSteps > 0) {
      const estimatedPercent = Math.min(
        95,
        Math.max(5, Math.round(initialNumSteps * 2.5 + invocationNum * 3))
      );
      events.push({
        type: 'CONTEXT_UPDATE',
        payload: { percent: estimatedPercent },
      });
    }
    return events;
  }

  if (hookEvent === 'PostToolUse') {
    const toolCall = input.toolCall || {};
    const toolName = String(toolCall.name || 'tool');
    const args = toolCall.args || {};

    if (input.error) {
      events.push({
        type: 'TOOL_FAIL',
        payload: {
          error: truncate(`${toolName}: ${input.error}`, 80),
        },
      });
      return events;
    }

    if (WRITE_TOOLS.has(toolName)) {
      events.push({
        type: 'TOOL_WRITE',
        payload: {
          file: extractFileLabel(args, toolName),
          lines: estimateLines(args),
        },
      });
    } else if (EXEC_TOOLS.has(toolName)) {
      const cmd =
        args.CommandLine ||
        args.Description ||
        args.Role ||
        args.toolSummary ||
        toolName;
      events.push({
        type: 'TOOL_EXEC',
        payload: {
          command: truncate(cmd, 64),
        },
      });
    } else if (READ_TOOLS.has(toolName)) {
      events.push({
        type: 'TOOL_READ',
        payload: {
          file: extractFileLabel(args, toolName),
        },
      });
    } else {
      events.push({
        type: 'TOOL_READ',
        payload: {
          file: truncate(toolName, 48),
        },
      });
    }
    return events;
  }

  if (hookEvent === 'Stop') {
    const reason = String(input.terminationReason || '');
    if (input.error || reason === 'ERROR') {
      events.push({
        type: 'TOOL_FAIL',
        payload: {
          error: truncate(input.error || `Stopped: ${reason}`, 80),
        },
      });
    } else if (reason === 'NO_TOOL_CALL' && input.fullyIdle !== false) {
      events.push({
        type: 'TASK_COMPLETE',
        payload: {
          summary: 'Antigravity CLI completed the task',
        },
      });
    }
    return events;
  }

  return events;
}

async function postEvent(event) {
  try {
    await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    // Never block or fail Antigravity CLI if AgentArena server is offline.
  }
}

function defaultHookResponse(hookEventName) {
  if (hookEventName === 'Stop') {
    return { decision: 'stop' };
  }
  return {};
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8').trim();
}

async function main() {
  let input = {};
  try {
    const raw = await readStdin();
    if (raw) {
      input = JSON.parse(raw);
    }
  } catch {
    process.stdout.write('{}\n');
    return;
  }

  const events = mapHookToArenaEvents(input);
  for (const event of events) {
    await postEvent(event);
  }

  process.stdout.write(`${JSON.stringify(defaultHookResponse(input.hookEventName))}\n`);
}

main().catch(() => {
  process.stdout.write('{}\n');
});
