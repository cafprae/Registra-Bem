# 📦 Registra Bem

Sistema de Auditoria e Gestão de Patrimônio Físico da **Pró-Reitoria de Assistência Estudantil (PRAE)** — **Universidade Federal do Ceará (UFC)**.

O **Registra Bem** atua como o motor de dados e controle operacional de campo para o ecossistema integrado ao sistema **Racionaliza** (atendimento e chatbot via base compartilhada Supabase).

---

## 📖 Documentação de Transição e Handover

Para uma explicação detalhada da arquitetura, divisão dos contextos (`InventoryContext`, `UIContext`, `FilterContext`), funcionalidades, banco de dados Supabase, deploy na Vercel e dívida técnica pendente, consulte o documento:

👉 **[HANDOVER.md](./HANDOVER.md)**

---

## 🚀 Como Iniciar o Projeto

### Pré-requisitos
- Node.js (versão 18 ou superior)
- npm

### Passo a Passo

```bash
# 1. Acessar a pasta do frontend
cd frontend

# 2. Instalar as dependências
npm install

# 3. Configurar as variáveis de ambiente
cp .env.example .env
# Preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env

# 4. Executar em modo desenvolvimento
npm run dev

# 5. Executar os testes unitários
npm run test
```

---

## 🏛️ Banco de Dados (Supabase)

Toda a definição do schema, políticas de segurança Row Level Security (RLS), triggers e procedures está centralizada e documentada em:
- [supabase/README.md](./supabase/README.md)
- [supabase/master.sql](./supabase/master.sql)
