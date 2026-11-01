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
      description: 'Abre o painel ao vivo do Tailor.ia Lean (delegações, modelos, contexto relido)',
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
    if (e.tool !== 'Agent' || e.agentId) return next(e)

    const d: Delegacao = {
      id: e.tool_use_id,
      tipo: e.subagent_type ?? 'general-purpose',
      descricao: e.description,
      modelo: e.model,
      status: 'rodando',
      inicio: Date.now(),
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
    const agora = l.filter(d => d.status === 'rodando' || d.status === 'fundo')
    const porModelo = new Map<string, { n: number; tok: number }>()
    for (const d of l) {
      const m = curto(d.modelo)
      const v = porModelo.get(m) ?? { n: 0, tok: 0 }
      porModelo.set(m, { n: v.n + 1, tok: v.tok + (d.tokens ?? 0) })
    }
    // Caixas fixas ocupam ~14 linhas; o resto vai para a lista de delegações.
    const sala = Math.max(3, (e.viewport?.rows ?? 30) - 14 - agora.length - porModelo.size)
    const caixa = { borderStyle: 'round', flexDirection: 'column', paddingX: 1 } as const

    return (
      <Box flexDirection="column" gap={1}>
        <Box {...caixa}>
          <Text bold>Principal · {curto(t.modelo)}</Text>
          <Text>
            {t.turnos} turnos · relido {k(t.relido)} · saída {k(t.saida)}
          </Text>
          <Text dimColor>
            ferramentas: {t.ferramentasPrincipal} no principal · {t.ferramentasAgentes} em agentes ({pct}%)
          </Text>
        </Box>

        {agora.length > 0 && (
          <Box {...caixa} borderColor="warning">
            <Text bold color="warning">
              Agora · {agora.length} {agora.length === 1 ? 'agente' : 'em paralelo'}
            </Text>
            {agora.map(d => (
              <Text wrap="truncate-end">
                {d.status === 'fundo' ? '…' : '▶'} {tipoCurto(d.tipo)} · {curto(d.modelo)}
                {d.inicio ? ` · há ${seg(Date.now() - d.inicio)}` : ''} · {d.descricao}
              </Text>
            ))}
          </Box>
        )}

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

        <Box {...caixa}>
          <Text bold>
            Delegações{l.length > 0 ? ` · ${l.length}` : ''}
            {l.length > sala ? ` (últimas ${sala})` : ''}
          </Text>
          {l.length === 0 && <Text dimColor>Nenhuma ainda. Tudo no principal.</Text>}
          {l.slice(-sala).map(d => (
            <Text
              wrap="truncate-end"
              color={d.status === 'erro' ? 'error' : LEAN.includes(tipoCurto(d.tipo)) ? 'success' : undefined}
              dimColor={d.status === 'feito'}
            >
              {d.status === 'rodando' ? '▶' : d.status === 'erro' ? '✕' : d.status === 'fundo' ? '…' : '✓'}{' '}
              {tipoCurto(d.tipo)} · {curto(d.modelo)}
              {d.tokens !== undefined ? ` · ${k(d.tokens)}` : ''} · {d.descricao}
            </Text>
          ))}
        </Box>
      </Box>
    )
  })
}
