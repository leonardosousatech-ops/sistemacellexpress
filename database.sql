-- Tabelas para o Sistema Cell Express

-- Habilitar a extensão UUID (opcional, mas bom ter, embora vamos usar IDs sequenciais pra facilitar a vida do usuário)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabela de Funcionários (Usaremos uma tabela simples por enquanto, para não complicar a auth com o chatbot)
CREATE TABLE IF NOT EXISTS public.funcionarios (
    id SERIAL PRIMARY KEY,
    nome TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    senha TEXT NOT NULL,
    cargo TEXT,
    papeis JSONB DEFAULT '[]'::jsonb,
    ativo BOOLEAN DEFAULT true,
    telefone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Tabela de Clientes
CREATE TABLE IF NOT EXISTS public.clientes (
    id SERIAL PRIMARY KEY,
    nome TEXT NOT NULL,
    telefone TEXT,
    email TEXT,
    cpf TEXT,
    endereco TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Tabela de Estoque
CREATE TABLE IF NOT EXISTS public.estoque (
    id SERIAL PRIMARY KEY,
    nome TEXT NOT NULL,
    categoria TEXT NOT NULL,
    quantidade INTEGER DEFAULT 0,
    preco_custo DECIMAL(10, 2),
    preco_venda DECIMAL(10, 2),
    estoque_minimo INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Tabela de Ordens de Serviço (OS)
CREATE TABLE IF NOT EXISTS public.ordens_servico (
    id SERIAL PRIMARY KEY,
    id_cliente INTEGER REFERENCES public.clientes(id) ON DELETE CASCADE,
    tipo_aparelho TEXT NOT NULL,
    modelo TEXT NOT NULL,
    condicao TEXT,
    problema TEXT NOT NULL,
    status TEXT DEFAULT 'na-fila',
    prioridade TEXT DEFAULT 'normal',
    id_tecnico INTEGER REFERENCES public.funcionarios(id) ON DELETE SET NULL,
    valor DECIMAL(10, 2),
    data_entrada TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    data_conclusao TIMESTAMP WITH TIME ZONE,
    garantia_ate DATE,
    pecas_usadas JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. Tabela Financeira
CREATE TABLE IF NOT EXISTS public.financeiro (
    id SERIAL PRIMARY KEY,
    tipo TEXT NOT NULL,
    categoria TEXT,
    valor DECIMAL(10, 2) NOT NULL,
    descricao TEXT,
    id_os INTEGER REFERENCES public.ordens_servico(id) ON DELETE SET NULL,
    data DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. Tabela de Atividades
CREATE TABLE IF NOT EXISTS public.atividades (
    id SERIAL PRIMARY KEY,
    id_usuario INTEGER REFERENCES public.funcionarios(id) ON DELETE SET NULL,
    acao TEXT NOT NULL,
    detalhes TEXT,
    modulo TEXT,
    data_hora TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Inserir alguns dados iniciais
INSERT INTO public.funcionarios (nome, email, senha, cargo, papeis, telefone) VALUES 
('Administrador', 'admin@cellexpress.com', '123456', 'Gerente', '["balcao", "laboratorio", "estoque", "financeiro", "garantias", "funcionarios"]', '(11) 99999-9999');

-- Como o banco precisa estar livre para o chatbot e a página ler e escrever os dados de atendimento:
-- Vamos desativar o Row Level Security (RLS) nessas tabelas INICIALMENTE. 
-- (Mais pra frente podemos ligar quando tivermos um sistema de autenticação forte)
ALTER TABLE public.funcionarios DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.estoque DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordens_servico DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.financeiro DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.atividades DISABLE ROW LEVEL SECURITY;
