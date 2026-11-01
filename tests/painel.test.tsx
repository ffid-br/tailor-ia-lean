import { expect, test } from 'claude-code/testing'

const PAINEL = {
  plugin: 'tailor-ia-lean',
  component: 'Pane',
  requestId: 'lean-painel',
  props: {
    title: 'Tailor.ia Lean',
    isFocused: false,
    bodyColumns: 60,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 30 },
    view: {},
  },
} as const

test('delegação ao batedor aparece com modelo e tokens', async ($, on) => {
  on('command.register', () => ({ value: { command: 'lean-painel' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('tool.call', (_, e) =>
    e.tool === 'Agent'
      ? {
          result: {
            resolvedModel: 'claude-haiku-5-5',
            totalTokens: 12_300,
            totalToolUseCount: 7,
            totalDurationMs: 9_000,
          },
        }
      : { result: {} },
  )

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await $.tool.call({ tool: 'Read', file_path: '/a' })
  await $.tool.call({
    tool: 'Agent',
    subagent_type: 'tailor-ia-lean:batedor',
    description: 'onde fica o login',
    prompt: 'onde fica o login',
  })

  const ui = await $.ui.mount({ ...PAINEL, surface: 'terminal' })
  const linha = await ui.find({ type: 'Text', text: /batedor/ })
  expect(linha?.text).toBe('└─ ✓ batedor · haiku-5-5 · 12.3k · onde fica o login')
  expect((await ui.find({ type: 'Text', text: /turnos/ }))?.text).toBe(
    '0 turnos · relido 0 · saída 0 · 0% das ferramentas em agentes',
  )
  await ui.unmount()
})

test('agente em segundo plano fecha no turn.complete dele', async ($, on) => {
  on('command.register', () => ({ value: { command: 'lean-painel' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('tool.call', () => ({ result: { status: 'async_launched', agentId: 'ag1' } }))
  on('turn.complete', (_, e) => ({ text: e.answer }))

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  await $.tool.call({
    tool: 'Agent',
    subagent_type: 'tailor-ia-lean:revisor',
    description: 'revisar diff',
    prompt: 'revisar diff',
  })
  const ui = await $.ui.mount({ ...PAINEL, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /revisor/ }))?.text).toMatch(/^└─ … revisor · \? · há \d+s · revisar diff$/)
  expect((await ui.find({ type: 'Text', text: /principal/ }))?.text).toMatch(/1 rodando$/)
  await ui.unmount()

  await $.turn.complete({
    answer: 'ok',
    durationMs: 1,
    isAborted: false,
    turnId: 't1',
    reason: 'answer',
    agentId: 'ag1',
    usage: { model: 'claude-sonnet-5-5', input_tokens: 1000, output_tokens: 500, cache_read_input_tokens: 3000, cache_creation_input_tokens: 500 },
  })
  const ui2 = await $.ui.mount({ ...PAINEL, surface: 'terminal' })
  expect((await ui2.find({ type: 'Text', text: /revisor/ }))?.text).toBe('└─ ✓ revisor · sonnet-5-5 · 5.0k · revisar diff')
  expect((await ui2.find({ type: 'Text', text: /agente.*tok/ }))?.text).toBe('sonnet-5-5 · 1 agente · 5.0k tok')
  await ui2.unmount()
})

test('sem delegação, painel diz que tudo ficou no principal', async $ => {
  const ui = await $.ui.mount({ ...PAINEL, surface: 'desktop' })
  expect((await ui.find({ type: 'Text', text: /Nenhuma/ }))?.text).toBe(
    'Nenhuma delegação ainda. Tudo no principal.',
  )
  await ui.unmount()
})

test('agentes da mesma rodada viram um nó em paralelo', async ($, on) => {
  on('command.register', () => ({ value: { command: 'lean-painel' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('tool.call', () => ({ result: { resolvedModel: 'claude-haiku-5-5', totalTokens: 1000, totalToolUseCount: 1, totalDurationMs: 1000 } }))

  await $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })
  for (const q of ['onde A', 'onde B']) {
    await $.tool.call({ tool: 'Agent', subagent_type: 'tailor-ia-lean:batedor', description: q, prompt: q })
  }
  const ui = await $.ui.mount({ ...PAINEL, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /paralelo/ }))?.text).toBe('└─ ⇉ 2 em paralelo')
  expect((await ui.find({ type: 'Text', text: /onde B/ }))?.text).toBe('   └─ ✓ batedor · haiku-5-5 · 1.0k · onde B')
  await ui.unmount()
})
