---
name: lean
description: >-
  Guia completo do modo enxuto: como gastar menos tokens no Claude Code e como fazer a IA
  raciocinar melhor, com o porquê de cada regra e exemplos antes/depois. Use quando alguém
  perguntar "como economizar tokens", "por que o contexto encheu tão rápido", "como baratear
  a sessão", "o Claude está lento/caro", "o que é /compact", "como escrever um CLAUDE.md
  bom", "como fazer a IA errar menos", "como usar subagentes", ou pedir "/lean".
---

# lean — menos tokens, mais acerto

Duas alavancas. A primeira é o que entra no contexto; a segunda é o que a IA faz antes de
mexer no código. As duas se reforçam: contexto limpo raciocina melhor.

## 1. Onde os tokens vão

Em sessão típica, mais de 80% do custo é **leitura de contexto**, não a resposta. O que mais
pesa, em ordem:

1. `cat` de arquivo grande inteiro quando só 20 linhas importavam.
2. Saída crua de comando: log, `npm install`, teste verboso, JSON gigante.
3. Reler arquivo logo depois de editar "para conferir".
4. Resumo narrado do que a ferramenta acabou de mostrar.
5. Sessão longa que mudou de assunto três vezes sem `/compact`.

## 2. Regras de economia (e o porquê)

**Localize antes de ler.** `grep -n`, `find`, depois `sed -n 120,160p`. Ler 40 linhas
certas custa 1/50 de ler o arquivo.

**Filtre saída.** `| tail -20`, `| grep -E 'error|FAIL'`, `--quiet`. Se o comando falhou,
cite só a linha decisiva do erro, exata.

**Delegue varredura.** "Onde X é usado?", "mapeie este diretório", "quais arquivos tocam Y":
subagente Explore. Ele lê 30 arquivos no contexto dele e devolve 10 linhas no seu.

**Agrupe chamadas.** Leituras independentes vão no mesmo bloco de tool calls. Menos
rodadas, menos repetição de contexto.

**Não releia o que editou.** A ferramenta de edição já falha se o texto não casar.

**Resposta curta.** Código primeiro. Depois no máximo três linhas: o que foi pulado, quando
adicionar. Sem "Claro! Vou ajudar...", sem recapitular a pergunta, sem narrar "agora vou
rodar X".

**`/compact` em marco; `/clear` em troca de assunto.** Terminou a tarefa e vai começar outra
sem relação: contexto antigo é custo puro em cada mensagem seguinte.

**Modelo e esforço por tarefa.** Rename, formatação, commit: modelo menor ou esforço baixo.
Arquitetura, bug intermitente, migração: modelo maior. `/model` e `effortLevel` em
`settings.json`.

Antes/depois:

```
# antes (≈ 6k tokens)
cat src/services/billing.ts
# depois (≈ 300 tokens)
grep -n 'closePeriod' src/services/billing.ts
sed -n 210,245p src/services/billing.ts
```

## 3. Regras de qualidade de raciocínio (e o porquê)

**Entenda antes de encurtar.** Economia vale para a solução, nunca para a leitura do
problema. Leia `CLAUDE.md`, veja `docs/memoria/` se existir, trace o fluxo real de ponta a
ponta (quem chama, quem é chamado). Só então escolha a menor mudança no lugar certo. A menor
mudança no lugar errado é um segundo bug.

**Bug é causa raiz, não sintoma.** O ticket nomeia um sintoma. Antes de corrigir, liste os
callers da função. Um guard no ponto comum resolve todos; um guard no caminho do ticket deixa
os irmãos quebrados.

**Escada antes de escrever código.** Pare no primeiro degrau que segura:
precisa existir? → já existe no repo? → biblioteca padrão resolve? → recurso nativo da
plataforma (constraint no banco, CSS, `<input type="date">`)? → dependência já instalada? →
cabe em uma linha? → só então, o mínimo que funciona.

**Nada especulativo.** Interface com uma implementação, config para valor que nunca muda,
scaffolding "para depois": não. Depois cria o próprio scaffolding.

**Quality gates antes de "pronto".** Lint, typecheck, teste. Falhou: diga qual e mostre a
linha do erro. Nunca reporte sucesso que não viu.

**Marque o atalho consciente.** Cortou um canto com teto conhecido (lock global, varredura
O(n²), heurística ingênua)? Comentário de uma linha dizendo o teto e o caminho de upgrade.
Atalho sem marca vira dívida invisível.

**Registre o que não está no código.** Causa raiz que custou caro achar, hipótese
descartada e por quê, restrição externa que o código obedece sem explicar. Arquivo
`docs/memoria/AAAA-MM-DD-slug.md` no repositório, título que entrega a conclusão sozinho.
Commita junto da mudança. Quem der `git pull` recebe; a IA lê no início da próxima sessão.

## 4. CLAUDE.md que paga o próprio custo

Entra no contexto em toda mensagem, então cada linha precisa evitar mais tokens do que gasta.

Entra: stack em uma linha, comandos de lint/typecheck/test, regras que a IA erraria sem
aviso ("backend em outro repo", "não usar Prisma aqui", "cores só por token"), onde fica a
memória do projeto.

Não entra: tutorial da linguagem, árvore de diretórios completa, histórico de decisões
(isso vai em `docs/memoria/`), elogios ao projeto.

Teste: se remover a linha e a IA ainda acertaria, remova.

## 5. Complementos que fazem par com este plugin

- **caveman** (`JuliusBrussee/caveman`): comprime a prosa da resposta sem perder termo técnico.
- **ponytail** (`DietrichGebert/ponytail`): força a escada do item 3 em toda tarefa de código.

Os dois juntos com este plugin: menos tokens de saída, menos tokens de entrada, menos retrabalho.
