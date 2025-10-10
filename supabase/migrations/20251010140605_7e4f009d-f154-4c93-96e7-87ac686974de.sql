-- Adicionar campos de configuração avançada para o agente IA
ALTER TABLE public.ai_quote_config
ADD COLUMN IF NOT EXISTS model TEXT DEFAULT 'gpt-4o-mini',
ADD COLUMN IF NOT EXISTS temperature NUMERIC DEFAULT 0.3,
ADD COLUMN IF NOT EXISTS max_tokens INTEGER DEFAULT 500,
ADD COLUMN IF NOT EXISTS system_prompt TEXT DEFAULT 'Você é um especialista em logística que escolhe a melhor transportadora considerando preço, prazo e regras específicas.',
ADD COLUMN IF NOT EXISTS decision_criteria JSONB DEFAULT '{"fastest": {"weight": 0.7, "description": "Prioriza menor prazo"}, "cheapest": {"weight": 0.7, "description": "Prioriza menor preço"}, "balanced": {"weight": 0.5, "description": "Equilibra preço e prazo"}}'::jsonb,
ADD COLUMN IF NOT EXISTS consider_chemical_transport BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS prefer_no_dimension_restrictions BOOLEAN DEFAULT true;