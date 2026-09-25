# Arquitetura

sequenceDiagram
    actor A as Auditor (Campo)
    participant RB as UI: Registra Bem
    participant DB as Supabase (PostgreSQL)
    participant RC as Chatbot: Racionaliza

    A->>RB: Clica em "Confirmar Património"
    RB->>DB: UPDATE assets SET status='CONFIRMED'
    
    alt Permissão Válida (RLS)
        DB-->>RB: Retorna Sucesso 200 OK
        RB-->>A: Atualiza UI e exibe Toast de sucesso
    else Permissão Inválida
        DB-->>RB: Retorna Erro 403 Forbidden
        RB-->>A: Exibe aviso de acesso negado
    end

    Note over DB, RC: Sincronização em Tempo Real
    
    RC->>DB: Faz query (Qual a condição do item X?)
    DB-->>RC: Retorna dados atualizados pelo Auditor