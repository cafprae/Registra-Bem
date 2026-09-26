# 🏛️ Arquitetura do Sistema — Registra Bem & Ecossistema

Este documento descreve a arquitetura técnica, modelo de dados, fluxos de integração e decisões de design do **Registra Bem** e sua integração com o ecossistema **Racionaliza**.

---

## 1. 🌐 Visão Macro da Arquitetura (Ecossistema)

O ecossistema divide-se em três pilares principais: **Operação em Campo** (Registra Bem), **Base Unificada de Dados e Segurança** (Supabase) e **Interface de Atendimento e Consulta** (Racionaliza).

```mermaid
graph TB
    subgraph FrontendApp ["Frontend (React 19 + Vite)"]
        UI["Registra Bem Web App (SPA)<br/>• Leitura de Código de Barras (Câmera)<br/>• Auditoria e Movimentações em Campo<br/>• Gestão e Relatórios ODS"]
    end

    subgraph BaaS ["Supabase (BaaS / Cloud)"]
        Auth["Supabase Auth<br/>(Domínio @ufc.br)"]
        DB[("PostgreSQL Database<br/>• tabela_inicial<br/>• profiles")]
        RLS["Row Level Security (RLS)<br/>• Regras por Setor e Cargo"]
        Triggers["Triggers & RPCs<br/>• handle_new_user()<br/>• admin_delete_user()"]
    end

    subgraph ChatbotApp ["Atendimento & IA"]
        RC["Chatbot Racionaliza<br/>• Consulta de Disponibilidade<br/>• Triagem de Doações e Transferências"]
        Servidores["Servidores / Alunos UFC"]
    end

    UI -->|"HTTPS / REST / Auth"| Auth
    UI -->|"Queries & Mutações"| RLS
    RLS --> DB
    Auth --> Triggers
    Triggers --> DB

    Servidores <-->|"Interação via Chatbot"| RC
    RC -->|"Leitura em Tempo Real"| DB
    RC -.->|"Solicitações de Transferência / Reserva"| DB
```

---

## 2. 🧩 Arquitetura do Frontend (React + Context API Desacoplada)

Para garantir alto desempenho e eliminar re-renderizações desnecessárias, a gestão de estado é organizada em **três contextos desacoplados e especializados**:

```mermaid
graph TD
    App["App.tsx"] --> UIProv["UIProvider<br/>(Modais, Bottom Sheet, Toast, Formulários temporários)"]
    UIProv --> FiltProv["FilterProvider<br/>(Query de busca, Filtro por status e condição física)"]
    FiltProv --> Gate["InventoryGate.tsx<br/>(Validação de Sessão e Setor Cadastrado)"]
    Gate --> InvProv["InventoryProvider<br/>(Dados patrimoniais, Mutações Supabase e ODS)"]

    InvProv --> Pages["Páginas & Layouts"]
    Pages --> InvPage["/inventory (Lista de Bens + Scanner Câmera)"]
    Pages --> DashPage["/dashboard (Métricas Gerenciais com useMemo)"]
    Pages --> RepPage["/reports (Relatórios e Exportação ODS)"]
    Pages --> AdminPage["/admin (Gestão de Usuários e Permissões)"]

    subgraph Hooks ["Hooks Especializados"]
        useUI["useUI()"]
        useFilters["useFilters() & useFilteredAssets()"]
        useInventory["useInventory()"]
    end

    InvPage -.-> useUI
    InvPage -.-> useFilters
    InvPage -.-> useInventory
    DashPage -.-> useUI
    DashPage -.-> useInventory
```

### Responsabilidade de Cada Camada:
1. **`UIContext`**: Estados visuais voláteis (`isDetailSheetOpen`, `selectedAsset`, `toast`, inputs temporários de modal). Mudanças de digitação em formulários não disparam re-render nas listas de patrimônio.
2. **`FilterContext`**: Termo de busca e pílulas de filtro (`search`, `statusFilter`, `conditionFilter`). O hook utilitário `useFilteredAssets(sectorAssets)` memoiza a lista filtrada.
3. **`InventoryContext`**: Regras de negócio persistidas, comunicação direta com o Supabase e sincronização da coleção de bens (`assets`).

---

## 3. 🔄 Fluxo de Confirmação e Auditoria em Tempo Real

O diagrama abaixo detalha o ciclo operacional em que um auditor de campo confirma a localização e condição de um bem, refletindo instantaneamente para o chatbot do sistema **Racionaliza**:

```mermaid
sequenceDiagram
    autonumber
    actor A as 👷 Agente de Campo (Auditor)
    participant RB as 📱 UI: Registra Bem
    participant RLS as 🛡️ Supabase (RLS Engine)
    participant DB as 🗄️ PostgreSQL (tabela_inicial)
    participant RC as 🤖 Chatbot: Racionaliza
    actor S as 👤 Servidor / Usuário

    A->>RB: Clica em "Confirmar Presença" ou lê Código de Barras
    RB->>RLS: UPDATE tabela_inicial SET situacao='Confirmado', condicao='Bom'
    
    alt Agente Autorizado (RLS Válido para o Setor)
        RLS->>DB: Executa UPDATE na linha do tombamento
        DB-->>RB: 200 OK (Dados atualizados)
        RB-->>A: Atualiza estado local e exibe Toast de Sucesso
    else Sem Permissão / Setor Incompatível
        RLS-->>RB: 403 Forbidden (Acesso negado)
        RB-->>A: Reverte estado (Rollback otimista) e exibe alerta de erro
    end

    Note over DB, RC: Sincronização em Tempo Real (PostgreSQL)

    S->>RC: "Existe cadeira de escritório em bom estado disponível?"
    RC->>DB: SELECT * FROM tabela_inicial WHERE condicao='Bom' AND situacao='Confirmado'
    DB-->>RC: Retorna patrimônios validados pelo Auditor
    RC-->>S: "Sim! Temos 3 unidades confirmadas no setor PRAE/CAF."
```

---

## 4. 🔀 Ciclo de Vida do Patrimônio & Transferência entre Setores

O fluxo de movimentação física de bens entre divisões da PRAE implementa conferência de dupla checagem:

```mermaid
stateDiagram-v2
    [*] --> Pendente: Importação Inicial / Item Novo

    Pendente --> Confirmado: Conferido no mesmo setor
    Pendente --> Movido: Transferido de setor ou local alterado

    state Movido {
        [*] --> AguardandoValidacao: Setor de destino notificado
        AguardandoValidacao --> RecebimentoConfirmado: Setor destino aceita item
        AguardandoValidacao --> TransferenciaRejeitada: Setor destino recusa item
    }

    RecebimentoConfirmado --> Confirmado: Bem incorporado ao novo setor
    TransferenciaRejeitada --> Pendente: Devolvido / Reaberto para auditoria
    Confirmado --> Pendente: Desfazer Lançamento (Rollback manual)
```

---

## 5. 🛡️ Arquitetura de Segurança & Permissões (RLS)

O sistema adota segurança rigorosa na camada de banco de dados através do **Row Level Security (RLS)** do PostgreSQL:

```mermaid
graph LR
    User["Usuário Autenticado (@ufc.br)"] --> JWT["JWT Token com auth.uid()"]
    JWT --> Profile["Tabela profiles (role, sector)"]

    subgraph RegrasRLS ["Políticas RLS no PostgreSQL"]
        P1["Admin: Acesso irrestrito (SELECT, INSERT, UPDATE, DELETE)"]
        P2["Editor / Agente / Gestor: Acesso restrito ao seu próprio setor"]
        P3["Viewer: Acesso somente leitura aguardando autorização"]
    end

    Profile --> RegrasRLS
    RegrasRLS --> TabelaInicial[("tabela_inicial (Bens Patrimoniais)")]
```

* **Fonte da Verdade:** O arquivo [`supabase/master.sql`](./supabase/master.sql) define toda a infraestrutura idempotente de RLS, triggers e a procedure `admin_delete_user` com garantia de integridade.