---
name: fechar
description: >-
  Fecha uma sessão de trabalho: guarda em docs/memoria/ o que a sessão aprendeu e não está
  no código, limpa registros duplicados ou vencidos, e indica se o próximo passo é /compact
  (mesma tarefa continua) ou /clear (assunto novo). Use em "fecha a sessão", "guarda e limpa",
  "salva o que aprendemos", "registra na memória", "limpa o contexto", "compacta", "/fechar",
  ou ao fim de qualquer sessão que descobriu algo que custou tempo achar.
---

# fechar — guardar, compactar, limpar

Contexto é caro e esquece. Memória em arquivo é barata e lembra. Esta skill move o que vale
do primeiro para o segundo, e devolve a sessão limpa.

## 1. Guardar

Pergunte-se: o que desta sessão o próximo dev (ou a próxima sessão) não descobriria lendo o
código? Candidatos:

- causa raiz que custou caro achar, e por que o sintoma enganava;
- hipótese que parecia certa e foi descartada, com o motivo;
- decisão tomada e alternativas rejeitadas;
- restrição externa que o código obedece sem explicar;
- armadilha que já pegou duas vezes.

Nada disso? Pule para o passo 3. Memória vazia é melhor que memória com ruído.

Onde: `docs/memoria/AAAA-MM-DD-slug.md` na raiz do repositório. Sem repositório git:
`~/.tailor-lean/memoria/<nome-da-pasta>/AAAA-MM-DD-slug.md`. O hook de sessão deste plugin
lê o índice dos dois lugares na próxima abertura.

Antes de criar: `grep -ril <termo> docs/memoria/`. Assunto já tem arquivo → atualize esse
arquivo. Dois arquivos sobre a mesma coisa é como memória apodrece.

Formato:

```markdown
# <conclusão em uma linha, recuperável sozinha no índice>

**Contexto:** 2–3 linhas.
**Causa / decisão:** direto.
**Por quê:** o que foi descartado e o motivo.
**Toca:** `caminho/arquivo.ts`
```

Título bom: `lentidão do checkout não é no tracking, é pool do pgbouncer`. Título ruim:
`notas sobre checkout`.

Não entra: narrativa da sessão, passo a passo que o código mostra, changelog, credencial,
dado de cliente, onde você parou (isso é rascunho, vai em `CLAUDE.local.md`).

## 2. Limpar a memória

Rode `"${CLAUDE_PLUGIN_ROOT}"/scripts/memoria-status` (ou liste `docs/memoria/` por data).
Para cada registro:

- **Mesmo assunto em dois arquivos**: funda no mais recente, apague o outro.
- **Conclusão que a sessão mudou**: edite o registro, não abra outro.
- **Virou código ou CLAUDE.md** (regra agora está onde a IA lê sempre): apague o registro.
- **Mais de 180 dias sem ser tocado e sem `Toca:` que ainda exista**: apague.

Apagar é `git rm`; passa pelo review do PR como qualquer mudança.

## 3. Compactar ou limpar o contexto

Decida e diga ao usuário, em uma linha, qual comando rodar:

- Mesma tarefa continua, contexto só está pesado → `/compact` com foco:
  `/compact manter: arquivos tocados, decisão sobre X, próximo passo Y`.
- Tarefa acabou, próximo assunto não tem relação → `/clear`. Tudo que importava já está em
  arquivo (passo 1) e em commit.

Nenhum dos dois pode ser executado pela IA; quem roda é o usuário. Entregue a frase pronta
para colar.

## 4. Commit

Memória nova ou limpa vai junto do commit da mudança que a originou. Sessão sem código:
commit próprio, só com a memória. É o caso mais valioso e o único jeito dele existir.
