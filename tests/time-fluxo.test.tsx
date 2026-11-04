import { expect, mock, test } from 'claude-code/testing'

const PANE = {
  plugin: 'tailor-ia-lean',
  component: 'Pane',
  requestId: 'lean-time',
  props: { title: 'Time de agentes', isFocused: false, bodyColumns: 120, placement: 'dock', scroll: { offset: 0, bodyRows: 40 }, view: {} },
} as const

const spawn = {
  tool_use_id: 'tu1', prompt: 'achar login', description: 'achar login', subagentType: 'tailor-ia-lean:batedor',
  provider: { plugin: 'engine', tier: 'core' }, parentModel: 'claude-opus-5-5', background: true, fork: false,
} as const
const turnDone = (agentId: string) => ({ answer: 'ok', durationMs: 1, isAborted: false, turnId: 't-' + agentId, reason: 'answer' as const, agentId })

test('colega termina no turn.complete dele e SendMessage retoma sem duplicar', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  on('command.register', () => ({ value: { command: 'lean-time' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('agent.spawn', () => ({ model: 'claude-haiku-5-5', agentId: 'ag1' }))
  on('turn.complete', (_, e) => ({ text: e.answer }))

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await $.agent.spawn(spawn)
  let ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /rodando/ }))?.text).toMatch(/rodando 1 · pico 1$/)
  await ui.unmount()

  await $.turn.complete(turnDone('ag1'))
  ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /rodando/ }))?.text).toMatch(/rodando 0 · pico 1$/)
  expect(await ui.find({ type: 'Text', text: /entregou/ })).toBeTruthy()
  await ui.unmount()

  await $.agent.spawn({ ...spawn, resume: { agentId: 'ag1' } })
  ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /rodando/ }))?.text).toMatch(/time 1 · rodando 1 · pico 1$/)
  expect(await ui.find({ type: 'Text', text: /retoma/ })).toBeTruthy()
  await ui.unmount()
})

test('líder ocupado e logado enquanto roda ferramenta, ocioso no fim do turno', async ($, on) => {
  mock.clock(on, { now: 1_000_000 })
  on('command.register', () => ({ value: { command: 'lean-time' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('tool.call', () => ({ result: { stdout: '' } }))
  on('turn.complete', (_, e) => ({ text: e.answer }))

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await $.tool.call({ tool: 'Bash', command: 'ls' })
  let ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: 'planeja + coordena' })).toBeTruthy()
  expect(await ui.find({ type: 'Text', text: /Bash/ })).toBeTruthy()
  await ui.unmount()

  await $.turn.complete({ answer: 'ok', durationMs: 1, isAborted: false, turnId: 't1', reason: 'answer' as const })
  ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: 'aguardando' })).toBeTruthy()
  await ui.unmount()
})
