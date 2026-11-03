import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, test } from 'node:test';

const originalCwd = process.cwd();
const originalEnv = { ...process.env };
const root = mkdtempSync(join(tmpdir(), 'claude-pi-test-'));
const project = join(root, 'project');
mkdirSync(join(project, '.pi'), { recursive: true });
process.chdir(project);
process.env.HOME = root;
process.env.CLAUDE_CODE_EXECUTABLE = fileURLToPath(new URL('./transport.mjs', import.meta.url));
for (const key of Object.keys(process.env)) if (/ANTHROPIC|CLAUDE.*(KEY|TOKEN|AUTH)/.test(key)) delete process.env[key];
writeFileSync(join(project, 'AGENTS.md'), 'NEARER_FILE_MUST_NOT_REPLACE_EFFECTIVE_CONTEXT');
const entry = process.env.PI_TEST_AGENT_ENTRY ?? import.meta.resolve('@earendil-works/pi-coding-agent');
const { loadExtensions, loadExtensionFromFactory } = await import(new URL('./core/extensions/loader.js', entry));
const { wrapRegisteredTool } = await import(entry);
const piMajor = JSON.parse(readFileSync(new URL('../package.json', entry), 'utf8')).version.split('.')[0];
// Pi 1.x hands providers only a transcript: the prompt rides in system-message sections, tools in add/remove deltas.
const retired = { name: 'retired_tool', description: 'Removed before this request', parameters: { type: 'object' } };
const piContext = (systemPrompt, tools, messages) => piMajor === '0' ? { systemPrompt, tools, messages } : { messages: [
  { role: 'system', content: '', sections: { fixture: systemPrompt }, toolsAdded: [...tools, retired], timestamp: 0 },
  { role: 'system', content: '', toolsRemoved: [{ name: retired.name }], timestamp: 1 },
  ...messages,
] };
const extensionPath = resolve(originalCwd, process.env.PI_TEST_EXTENSION ?? 'index.ts');
const loaded = await loadExtensions([extensionPath], project);
assert.deepEqual(loaded.errors, []);
const { config: provider } = loaded.runtime.pendingProviderRegistrations.find((item) => item.name === 'claude-agent-sdk');
const model = { ...provider.models.find((model) => model.id.includes('opus-4-7')), provider: 'claude-agent-sdk', api: 'claude-agent-sdk' };
assert.ok(model.id);
after(() => { process.chdir(originalCwd); process.env = originalEnv; rmSync(root, { recursive: true, force: true }); });

// Representative managed-tool shapes: required text (intercom), nested arrays/enums
// (subagents), bounded integers (docparser), unions and records (web-access).
const parameters = {
  type: 'object', required: ['payload'], additionalProperties: false,
  $defs: { label: { type: 'string', minLength: 1 } },
  properties: {
    payload: { type: 'string', minLength: 1, maxLength: 500, pattern: '^.+$' },
    nested: { type: 'object', required: ['mode', 'values'], properties: {
      mode: { type: 'string', enum: ['strict', 'loose'] },
      values: { type: 'array', minItems: 1, maxItems: 10, items: { type: 'integer', minimum: 1, maximum: 8 } },
    } },
    selection: { anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }, { type: 'null' }] },
    fields: { type: 'object', patternProperties: { '^.*$': { type: 'string' } } },
    unconstrained: {},
    budget: { type: 'object', minProperties: 1, maxProperties: 2, additionalProperties: false, properties: { hard: { type: 'number', exclusiveMinimum: 0 } } },
    referenced: { $ref: '#/$defs/label' },
  },
};
const tools = [{ name: 'contract_tool', description: 'Distinct custom contract', parameters }];
const systemPrompt = ['PARENT_CONTEXT: preserve Pi and ~/.pi/agent verbatim', 'SUBAGENT_ROLE: inspect only /project/reference', 'PROJECT_INSTRUCTIONS: use custom_tool, not CustomTool', '<location>/unchanged/.pi/skills/task/SKILL.md</location>'].join('\n\n');
let sequence = 0;
async function run({ settings = {}, signal, scenario = 'normal', messages = [{ role: 'user', content: 'fixture request', timestamp: 1 }], model: runModel = model, options = {} } = {}) {
  writeFileSync(join(project, '.pi/settings.json'), JSON.stringify({ claudeAgentSdkProvider: settings }));
  const capture = join(root, `capture-${++sequence}.jsonl`);
  process.env.SDK_TEST_CAPTURE = capture;
  process.env.SDK_TEST_SCENARIO = scenario;
  const stream = provider.streamSimple(runModel, piContext(systemPrompt, tools, messages), { reasoning: 'high', ...options, signal });
  const events = [];
  for await (const event of stream) events.push(event);
  const records = readFileSync(capture, 'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(records.some((record) => record.fixtureError), false);
  return { events, records };
}
const initialization = (records) => records.find((record) => record.received?.request?.subtype === 'initialize').received.request;

test('effective Pi instructions reach SDK unchanged despite nearer AGENTS.md', async () => {
  const { records } = await run();
  assert.equal(initialization(records).appendSystemPrompt, systemPrompt);
});

test('legacy appendSystemPrompt=false cannot silently discard effective instructions', async () => {
  const { records } = await run({ settings: { appendSystemPrompt: false } });
  assert.deepEqual(initialization(records).systemPrompt, [systemPrompt]);
});

test('actual SDK MCP discovery preserves the complete custom-tool schema', async () => {
  const { records } = await run();
  const discovery = records.find((record) => record.discovery).discovery;
  assert.equal(discovery.subtype, 'success');
  const advertised = discovery.response.mcp_response.result.tools;
  assert.deepEqual(advertised.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })), tools.map(({ name, description, parameters }) => ({ name, description, inputSchema: parameters })));
});

test('streamed arguments reach Pi unchanged; SDK execution is denied; thinking and results survive', async () => {
  const executions = [];
  const extension = await loadExtensionFromFactory((pi) => pi.registerTool({
    ...tools[0], label: 'Contract tool',
    async execute(_id, args) { executions.push(args); return { content: [{ type: 'text', text: args.payload }] }; },
  }), project, { on() { return () => {}; }, emit() {} }, loaded.runtime);
  const piTool = wrapRegisteredTool(extension.tools.get('contract_tool'), { createToolContext() { return {}; }, createContext() { return {}; } });
  const { records, events } = await run({ messages: [
    { role: 'user', content: 'fixture request', timestamp: 1 },
    { role: 'toolResult', toolCallId: 'previous-call', toolName: 'contract_tool', content: [{ type: 'text', text: 'PRIOR_PI_TOOL_ERROR' }], isError: true, timestamp: 2 },
  ] });
  assert.equal(records.find((record) => record.permission).permission.response.behavior, 'deny');
  assert.equal(records.find((record) => record.deniedCall).deniedCall.response.mcp_response.result.isError, true);
  assert.equal(records.find((record) => record.unknownCall).unknownCall.response.mcp_response.error.code, -32602);
  const call = events.find((event) => event.type === 'toolcall_end').toolCall;
  assert.equal(call.name, 'contract_tool');
  const expectedArgs = { payload: 'Pi ~/.pi/skills original', nested: { mode: 'strict', values: [2, 4] } };
  assert.deepEqual(call.arguments, expectedArgs);
  assert.deepEqual(executions, []);
  const result = await piTool.execute(call.id, call.arguments);
  assert.deepEqual(executions, [expectedArgs]);
  assert.deepEqual(result.content, [{ type: 'text', text: expectedArgs.payload }]);
  const argv = records.find((record) => record.argv).argv;
  assert.equal(argv[argv.indexOf('--thinking') + 1], 'adaptive');
  assert.equal(argv[argv.indexOf('--effort') + 1], 'high');
  assert.equal(events.find((event) => event.type === 'thinking_end').content, 'fixture thought');
  assert.equal(events.find((event) => event.type === 'text_end').content, 'fixture text');
  assert.equal(events.at(-1).reason, 'toolUse');
  assert.match(JSON.stringify(records.find((record) => record.received?.type === 'user')), /PRIOR_PI_TOOL_ERROR/);
});

test('invalid MCP parameter contracts name the offending Pi tool instead of becoming permissive', async () => {
  const stream = provider.streamSimple(model, piContext(systemPrompt, [{ name: 'bad_contract', description: 'Invalid contract', parameters: { type: 'array' } }], []), {});
  const events = [];
  for await (const event of stream) events.push(event);
  assert.equal(events.at(-1).type, 'error');
  assert.match(events.at(-1).error.errorMessage, /Invalid MCP contract for Pi tool "bad_contract"/);
});

test('cancellation ends the provider stream as aborted', async () => {
  const controller = new AbortController();
  const timer = setInterval(() => {
    try {
      const capture = join(root, `capture-${sequence}.jsonl`);
      if (readFileSync(capture, 'utf8').includes('deniedCall')) controller.abort();
    } catch {}
  }, 20);
  try {
    const { events } = await run({ signal: controller.signal, scenario: 'cancel' });
    assert.equal(events.at(-1).type, 'error');
    assert.equal(events.at(-1).reason, 'aborted');
  } finally { clearInterval(timer); }
});

// Thinking flags and the child's output limit, as the SDK hands them to the Claude Code process.
const providerModel = (id, overrides = {}) => ({ ...provider.models.find((model) => model.id === id), provider: 'claude-agent-sdk', api: 'claude-agent-sdk', ...overrides });
const sonnet45 = providerModel('claude-sonnet-4-5');
function budget({ records }) {
  const { argv, maxOutputTokens } = records.find((record) => record.argv);
  const flag = (name) => argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined;
  const settings = { thinking: flag('--thinking'), effort: flag('--effort'), thinkingTokens: flag('--max-thinking-tokens'), outputTokens: maxOutputTokens };
  return Object.fromEntries(Object.entries(settings).filter(([, value]) => value !== undefined));
}

test('manual thinking derives the output limit and budget together, within the model limit', async () => {
  assert.equal(sonnet45.maxTokens, 64000);
  const cases = [
    // A 32,000-token model: capping 31,999 thinking to 15,616 but requesting 48,383 output was the original inconsistency.
    // Pi 1.x no longer lists Opus 4.1, so its id and limit ride on a listed manual model.
    [providerModel('claude-sonnet-4-5', { id: 'claude-opus-4-1', maxTokens: 32000 }), {}, { thinkingTokens: '16000', outputTokens: '32000' }],
    [sonnet45, {}, { thinkingTokens: '31999', outputTokens: '63999' }],
    [providerModel('claude-sonnet-4-5', { maxTokens: 8192 }), {}, { thinkingTokens: '4096', outputTokens: '8192' }],
    ...[undefined, Number.NaN, 0, -1, 'many'].map((maxTokens) => [providerModel('claude-sonnet-4-5', { maxTokens }), {}, { thinkingTokens: '16000', outputTokens: '32000' }]),
    [sonnet45, { thinkingBudgets: { high: 4000 } }, { thinkingTokens: '4000', outputTokens: '36000' }],
    // Pi's per-request maxTokens caps the whole output, as compaction requests do.
    [sonnet45, { maxTokens: 13107 }, { thinkingTokens: '6553', outputTokens: '13107' }],
    [sonnet45, { maxTokens: 1000 }, { thinking: 'disabled', outputTokens: '1000' }],
  ];
  for (const [caseModel, options, expected] of cases) {
    assert.deepEqual(budget(await run({ model: caseModel, options })), expected, `${caseModel.maxTokens} ${JSON.stringify(options)}`);
  }
});

test("the user's CLAUDE_CODE_MAX_OUTPUT_TOKENS is never raised and bounds manual thinking", async () => {
  try {
    process.env.CLAUDE_CODE_MAX_OUTPUT_TOKENS = '20000';
    assert.deepEqual(budget(await run({ model: sonnet45 })), { thinkingTokens: '10000', outputTokens: '20000' });
    assert.deepEqual(budget(await run({ model: sonnet45, options: { maxTokens: 13107 } })), { thinkingTokens: '6553', outputTokens: '13107' });
    process.env.CLAUDE_CODE_MAX_OUTPUT_TOKENS = '64000';
    assert.deepEqual(budget(await run({ model: sonnet45, options: { reasoning: 'low' } })), { thinkingTokens: '8192', outputTokens: '64000' });
    assert.deepEqual(budget(await run()), { thinking: 'adaptive', effort: 'high', outputTokens: '64000' });
  } finally {
    delete process.env.CLAUDE_CODE_MAX_OUTPUT_TOKENS;
  }
});

test('adaptive thinking and absent reasoning leave the output limit to Claude Code', async () => {
  assert.deepEqual(budget(await run()), { thinking: 'adaptive', effort: 'high' });
  assert.deepEqual(budget(await run({ options: { reasoning: undefined } })), {});
  assert.deepEqual(budget(await run({ model: sonnet45, options: { reasoning: undefined } })), {});
  // Claude Code runs newer models adaptively, so a manual budget's output limit would only shrink theirs.
  for (const id of ['claude-opus-5-5', 'claude-sonnet-5', 'claude-haiku-5-5', 'claude-fable-5-1', 'claude-opus-6']) {
    assert.deepEqual(budget(await run({ model: providerModel('claude-sonnet-4-5', { id, maxTokens: 128000 }) })), { thinking: 'adaptive', effort: 'high' }, id);
  }
});
