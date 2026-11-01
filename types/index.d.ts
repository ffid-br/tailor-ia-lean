export type Delegacao = {
  id: string
  tipo: string
  descricao: string
  modelo?: string
  status: 'rodando' | 'feito' | 'erro' | 'fundo'
  tokens?: number
  ferramentas?: number
  ms?: number
}

export type Totais = {
  turnos: number
  relido: number
  escrito: number
  saida: number
  modelo?: string
  ferramentasPrincipal: number
  ferramentasAgentes: number
}

declare module 'claude-code' {
  interface PluginState {
    'tailor-ia-lean': {
      delegacoes: Shaped<Delegacao[]>
      totais: Shaped<Totais>
    }
  }
}
