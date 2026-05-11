# 📌 Fluxo de Desenvolvimento (Trunk‑Based Development)

Este projeto adota o modelo **Trunk‑Based Development (TBD)**, uma estratégia moderna e eficiente utilizada por empresas como Google, Meta e Netflix.  
O objetivo é manter o desenvolvimento rápido, seguro e com histórico limpo.

---

## 🚀 Visão Geral

- A branch principal é **`main`**  
- Todo novo trabalho é feito em **branches curtas**  
- Cada branch gera um **Pull Request** para a `main`  
- Após o merge, a branch é **apagada**  
- O histórico da `main` permanece **linear e limpo**

---

## 🧩 Convenção de Nomes de Branches

Use sempre o padrão:

```
feat/nome-da-feature
fix/descricao-do-bug
chore/tarefa-de-manutencao
refactor/parte-a-ser-refatorada
docs/atualizacao-de-documentacao
```

Exemplos:

```
feat/redis-refactor
fix/login-timeout
chore/update-dependencies
```

---

## 🔄 Fluxo de Trabalho

### 1. Atualize a branch principal
```bash
git checkout main
git pull origin main
```

### 2. Crie uma branch para sua tarefa
```bash
git checkout -b feat/nome-da-feature
```

### 3. Trabalhe normalmente
```bash
git add .
git commit -m "feat: implementa X"
git push -u origin feat/nome-da-feature
```

### 4. Abra um Pull Request no GitHub
- Base: `main`
- Compare: sua branch de feature

### 5. Faça o merge usando **Squash and Merge**
Isso garante um histórico limpo e fácil de entender.

### 6. Apague a branch após o merge
No GitHub: **Delete branch**

Localmente:
```bash
git checkout main
git pull origin main
git branch -d feat/nome-da-feature
```

---

## 🧠 Regras de Ouro

- Branches curtas (1–3 dias de trabalho)  
- Nunca trabalhar diretamente na `main`  
- Sempre atualizar a `main` antes de criar uma branch  
- PRs pequenos e fáceis de revisar  
- Usar **rebase** para atualizar sua branch com a `main`  
- Usar **Squash and Merge** para integrar na `main`  

---

## 🧱 Atualizando sua branch com a main (rebase recomendado)

```bash
git checkout feat/nome-da-feature
git fetch origin
git rebase origin/main
```

Se houver conflitos:

```bash
git status
git add <arquivo>
git rebase --continue
```

Depois:

```bash
git push --force-with-lease
```

---

# 📝 Padrão de Commits (Conventional Commits)

Este projeto utiliza o padrão **Conventional Commits** para manter um histórico claro e automatizável.

### Estrutura:
```
<tipo>(escopo opcional): descrição curta
```

### Tipos permitidos:
- **feat** — nova funcionalidade  
- **fix** — correção de bug  
- **docs** — documentação  
- **style** — formatação, sem mudança de lógica  
- **refactor** — refatoração sem mudança de comportamento  
- **test** — testes automatizados  
- **chore** — tarefas de manutenção  
- **perf** — melhorias de performance  
- **ci** — ajustes em pipelines  
- **build** — mudanças em dependências ou build system  

### Exemplos:
```
feat(auth): adiciona fluxo de redefinição de senha
fix(api): corrige erro 500 ao criar usuário
docs(readme): adiciona instruções de instalação
refactor(redis): simplifica criação do client
```

---

# 🔍 Regras para Pull Requests

### Todo PR deve:
- Ser pequeno e focado em **uma única tarefa**  
- Ter título claro e seguindo Conventional Commits  
- Conter descrição explicando:
  - O que foi feito  
  - Por que foi feito  
  - Como testar  
- Passar em todos os checks do CI  
- Ser revisado por pelo menos **1 pessoa** (ou você mesmo, se estiver solo)

### Não deve:
- Incluir mudanças não relacionadas  
- Incluir arquivos gerados (build, dist, logs, etc.)  
- Ser feito diretamente na `main`

---

# ☑️ Checklist de Revisão (Reviewer Checklist)

Antes de aprovar um PR, verifique:

- [ ] O código segue o padrão do projeto  
- [ ] O PR está pequeno e focado  
- [ ] Não há código morto ou comentado  
- [ ] Não há duplicação desnecessária  
- [ ] Testes foram adicionados ou atualizados  
- [ ] O PR não quebra funcionalidades existentes  
- [ ] O nome da branch e commits seguem o padrão  
- [ ] O merge será feito via **Squash and Merge**

---

# 🧭 Política de Versionamento (SemVer)

O projeto segue **Semantic Versioning (SemVer)**:

```
MAJOR.MINOR.PATCH
```

- **MAJOR** — mudanças incompatíveis  
- **MINOR** — novas funcionalidades compatíveis  
- **PATCH** — correções de bugs  

Exemplos:
- `1.0.0` — primeira versão estável  
- `1.1.0` — adiciona feature  
- `1.1.1` — corrige bug  

---

# ⚙️ Pipeline Sugerido (CI/CD)

### CI deve incluir:
- Lint  
- Testes unitários  
- Testes de integração (se houver)  
- Build  
- Verificação de segurança (dependabot, trivy, snyk, etc.)

### CD (opcional):
- Deploy automático na `main`  
- Deploy manual em ambientes de staging/produção  
