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
  expect(linha?.text).toBe('✓ batedor · haiku-5-5 · 12.3k tok · 7 ferr · 9s')
  expect((await ui.find({ type: 'Text', text: /ferramentas:/ }))?.text).toBe(
    'ferramentas: 2 no principal · 0 em agentes (0%)',
  )
  await ui.unmount()
})

test('sem delegação, painel diz que tudo ficou no principal', async $ => {
  const ui = await $.ui.mount({ ...PAINEL, surface: 'desktop' })
  expect((await ui.find({ type: 'Text', text: /Nenhuma/ }))?.text).toBe(
    'Nenhuma ainda. Tudo no principal.',
  )
  await ui.unmount()
})
