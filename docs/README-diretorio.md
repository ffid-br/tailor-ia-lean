# Tailor.ia Lean — menos tokens, mais acerto

<img src=".claude-plugin/icon.png" alt="Tailor.ia" width="96" align="right">

Plugin de [Claude Code](https://claude.com/claude-code) para **gastar menos tokens** e
**raciocinar melhor**, em português. São quatro skills e três agentes, destilados de prática
real em repositórios de produção. Sem dependência, sem servidor, sem telemetria: só arquivos
de texto.

[Tailor.ia](https://tailor.ia.br) é uma marca da [FFID](https://www.ffid.com.br), empresa de
AI Agents para a jornada do cliente, da captação ao pós-venda.

## O que vem

| Item | Para que serve | Como chamar |
|---|---|---|
| Skill `lean` | As regras de economia de tokens e de qualidade de raciocínio, com o porquê de cada uma e exemplos antes/depois | `/lean` |
| Skill `orquestrar` | O modelo principal planeja e integra; agentes mais baratos localizam, implementam e revisam | `/orquestrar` |
| Skill `fluxo-dev` | Do ticket ao deploy: branch, mudança mínima, quality gates, PR, memória | `/fluxo-dev` |
| Skill `fechar` | Guarda em `docs/memoria/` o que a sessão aprendeu e diz se o próximo passo é `/compact` ou `/clear` | `/fechar` |
| Agente `batedor` | Localiza código e devolve uma tabela arquivo:linha. Não edita | Haiku |
| Agente `operario` | Implementa um passo já especificado, em até 3 arquivos, e roda os quality gates | Sonnet |
| Agente `revisor` | Revisa um diff e devolve só os defeitos, uma linha por achado | Sonnet |

## Como usar

1. No começo da sessão, rode `/lean`. Para não precisar lembrar, cole no `CLAUDE.md` do
   projeto: "Siga as regras da skill tailor-ia-lean:lean".
2. Tarefa que toca vários arquivos: `/orquestrar`. O modelo caro pensa, os agentes executam.
3. Tarefa que precisa chegar em produção: `/fluxo-dev`.
4. No fim da sessão: `/fechar`. O que custou tempo descobrir fica em `docs/memoria/`, em
   markdown versionado, para a próxima pessoa ou o próximo agente.

## Edição completa

Esta é a edição do diretório da Anthropic, só com skills e agentes. A edição completa
acrescenta três coisas:

- as regras entram sozinhas no início de cada sessão, sem precisar chamar `/lean`;
- os painéis `/lean-time` e `/lean-painel` mostram o time de agentes, os tokens e a máquina;
- uma trava recusa agente novo quando o computador está no limite de memória ou de CPU.

Ela instala pelo GitHub:

```
/plugin marketplace add ffid-br/tailor-ia-lean
/plugin install tailor-ia-lean@tailor-ia-lean
```

## Licença

MIT. Código e documentação em [github.com/ffid-br/tailor-ia-lean](https://github.com/ffid-br/tailor-ia-lean).
