import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Delegacao, Totais } from '../types'

// Painel ao vivo do modo enxuto: quem está fazendo o trabalho (principal ou
// batedor/operario/revisor), em que modelo, e quanto contexto foi relido.
const PAINEL = 'lean-painel'
const TITULO = 'Tailor.ia Lean'
const LEAN = ['batedor', 'operario', 'revisor']

const zero: Totais = {
  turnos: 0,
  relido: 0,
  escrito: 0,
  saida: 0,
  ferramentasPrincipal: 0,
  ferramentasAgentes: 0,
}
const delegacoes = atom({ plugin: 'tailor-ia-lean', key: 'delegacoes' } as const, [] as Delegacao[], {
  shape: 'delegacoes-2',
})
const totais = atom({ plugin: 'tailor-ia-lean', key: 'totais' } as const, zero, { shape: 'totais-1' })

const k = (n = 0) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(n >= 100_000 ? 0 : 1)}k` : String(n)
const seg = (ms = 0) => (ms >= 60_000 ? `${Math.round(ms / 60_000)}min` : `${Math.round(ms / 1000)}s`)
const curto = (m?: string) => (m ? m.replace(/^claude-/, '').replace(/-\d{8}$/, '') : '?')
const tipoCurto = (t: string) => t.replace(/^tailor-ia-lean:/, '')
// O painel nunca pode travar uma ferramenta: falha de registro é ignorada.
const seguro = (p: Promise<unknown>) => p.catch(() => undefined)

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'lean-painel',
      description: 'Abre o painel ao vivo do Tailor.ia Lean (árvore de agentes por rodada, modelos, contexto relido)',
    })
    void $.ui.open({ id: PAINEL, title: TITULO })
    return next(e)
  })

  on('command.run', { command: 'lean-painel' }, async $ => {
    await $.ui.open({ id: PAINEL, title: TITULO })
    return { text: 'Painel do Tailor.ia Lean aberto.' }
  })

  on('tool.call', async ($, e, next) => {
    await seguro(update($, totais, t =>
      e.agentId
        ? { ...t, ferramentasAgentes: t.ferramentasAgentes + 1 }
        : { ...t, ferramentasPrincipal: t.ferramentasPrincipal + 1 },
    ))
    if (e.tool !== 'Agent') return next(e)
    // Rodada = turno do principal em que o agente nasceu; agentes da mesma rodada rodam em paralelo.
    const rodada = (await read($, totais).catch(() => zero)).turnos

    const d: Delegacao = {
      id: e.tool_use_id,
      tipo: e.subagent_type ?? 'general-purpose',
      descricao: e.description,
      modelo: e.model,
      status: 'rodando',
      inicio: Date.now(),
      rodada,
      pai: e.agentId,
    }
    await seguro(update($, delegacoes, l => [...l, d].slice(-50)))
    const r = await next(e)

    let fim: Partial<Delegacao>
    if (r.deny !== undefined || r.isError) fim = { status: 'erro' }
    else {
      const res = r.result as Partial<{
        resolvedModel: string
        totalTokens: number
        totalToolUseCount: number
        totalDurationMs: number
        agentId: string
      }>
      // Sem totalTokens = agente lançado em segundo plano; o fim chega depois.
      fim =
        res?.totalTokens === undefined
          ? { status: 'fundo', agentId: res?.agentId }
          : {
              status: 'feito',
              agentId: res.agentId,
              modelo: res.resolvedModel ?? d.modelo,
              tokens: res.totalTokens,
              ferramentas: res.totalToolUseCount,
              ms: res.totalDurationMs,
            }
    }
    await seguro(update($, delegacoes, l => l.map(x => (x.id === d.id ? { ...x, ...fim } : x))))
    return r
  })

  on('turn.complete', async ($, e, next) => {
    const u = e.usage
    if (e.agentId) {
      // Fim de agente lançado em segundo plano: o tool.call já voltou, o custo chega aqui.
      const tok = u ? u.input_tokens + u.cache_read_input_tokens + u.cache_creation_input_tokens + u.output_tokens : undefined
      await seguro(
        update($, delegacoes, l =>
          l.map(x =>
            x.agentId === e.agentId && x.status === 'fundo'
              ? { ...x, status: 'feito' as const, modelo: u?.model ?? x.modelo, tokens: tok }
              : x,
          ),
        ),
      )
    } else if (u) {
      await seguro(update($, totais, t => ({
        ...t,
        turnos: t.turnos + 1,
        relido: t.relido + u.input_tokens + u.cache_read_input_tokens,
        escrito: t.escrito + u.cache_creation_input_tokens,
        saida: t.saida + u.output_tokens,
        modelo: u.model,
      })))
    }
    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PAINEL }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const l = await read($, delegacoes)
    const t = await read($, totais)
    const total = t.ferramentasPrincipal + t.ferramentasAgentes
    const pct = total ? Math.round((t.ferramentasAgentes / total) * 100) : 0
    const rodando = l.filter(d => d.status === 'rodando' || d.status === 'fundo').length

    const porModelo = new Map<string, { n: number; tok: number }>()
    for (const d of l) {
      const m = curto(d.modelo)
      const v = porModelo.get(m) ?? { n: 0, tok: 0 }
      porModelo.set(m, { n: v.n + 1, tok: v.tok + (d.tokens ?? 0) })
    }

    // Árvore: principal → rodada (quando há paralelo) → agente → subagentes.
    type Linha = { txt: string; color?: string; dim?: boolean }
    const filhos = new Map<string, Delegacao[]>()
    for (const d of l) if (d.pai) filhos.set(d.pai, [...(filhos.get(d.pai) ?? []), d])
    const raizes = l.filter(d => !d.pai)
    const rodadas: Delegacao[][] = []
    for (const d of raizes) {
      const ult = rodadas[rodadas.length - 1]
      if (ult && ult[0]?.rodada !== undefined && ult[0].rodada === d.rodada) ult.push(d)
      else rodadas.push([d])
    }
    const icone = (d: Delegacao) =>
      d.status === 'rodando' ? '▶' : d.status === 'erro' ? '✕' : d.status === 'fundo' ? '…' : '✓'
    const rotulo = (d: Delegacao) => {
      const quanto =
        d.tokens !== undefined ? k(d.tokens) : d.inicio ? `há ${seg(Date.now() - d.inicio)}` : ''
      return `${icone(d)} ${tipoCurto(d.tipo)} · ${curto(d.modelo)}${quanto ? ` · ${quanto}` : ''} · ${d.descricao}`
    }
    const cor = (d: Delegacao): Linha => ({
      txt: '',
      color:
        d.status === 'erro' ? 'error' : d.status === 'rodando' || d.status === 'fundo' ? 'warning' : LEAN.includes(tipoCurto(d.tipo)) ? 'success' : undefined,
      dim: d.status === 'feito',
    })
    const linhas: Linha[] = []
    const agente = (d: Delegacao, pre: string, ultimo: boolean) => {
      linhas.push({ ...cor(d), txt: `${pre}${ultimo ? '└─ ' : '├─ '}${rotulo(d)}` })
      const fs = d.agentId ? filhos.get(d.agentId) ?? [] : []
      fs.forEach((f, i) => agente(f, pre + (ultimo ? '   ' : '│  '), i === fs.length - 1))
    }
    rodadas.forEach((g, gi) => {
      const ultG = gi === rodadas.length - 1
      if (g.length === 1) return agente(g[0]!, '', ultG)
      const ativos = g.filter(d => d.status === 'rodando' || d.status === 'fundo').length
      linhas.push({
        txt: `${ultG ? '└─ ' : '├─ '}⇉ ${g.length} em paralelo${ativos ? ` · ${ativos} rodando` : ''}`,
        color: ativos ? 'warning' : undefined,
        dim: !ativos,
      })
      g.forEach((d, i) => agente(d, ultG ? '   ' : '│  ', i === g.length - 1))
    })

    const sala = Math.max(4, (e.viewport?.rows ?? 30) - 8 - porModelo.size)
    const visiveis = linhas.slice(-sala)
    const caixa = { borderStyle: 'round', flexDirection: 'column', paddingX: 1 } as const

    return (
      <Box flexDirection="column" gap={1}>
        <Box {...caixa} borderColor={rodando ? 'warning' : undefined}>
          <Text bold>
            {curto(t.modelo)} · principal{rodando ? ` · ${rodando} rodando` : ''}
          </Text>
          <Text dimColor>
            {t.turnos} turnos · relido {k(t.relido)} · saída {k(t.saida)} · {pct}% das ferramentas em agentes
          </Text>
          {linhas.length === 0 && <Text dimColor>Nenhuma delegação ainda. Tudo no principal.</Text>}
          {linhas.length > visiveis.length && <Text dimColor>⋮ {linhas.length - visiveis.length} linhas acima</Text>}
          {visiveis.map(x => (
            <Text wrap="truncate-end" color={x.color} dimColor={x.dim}>
              {x.txt}
            </Text>
          ))}
        </Box>

        {porModelo.size > 0 && (
          <Box {...caixa}>
            <Text bold>Por modelo</Text>
            {[...porModelo.entries()]
              .sort((a, b) => b[1].tok - a[1].tok)
              .map(([m, v]) => (
                <Text>
                  {m} · {v.n} {v.n === 1 ? 'agente' : 'agentes'} · {k(v.tok)} tok
                </Text>
              ))}
          </Box>
        )}
      </Box>
    )
  })
}
