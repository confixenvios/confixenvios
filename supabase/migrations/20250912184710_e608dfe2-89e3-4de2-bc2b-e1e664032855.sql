-- Criar buckets de storage se não existirem
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('shipment-photos', 'shipment-photos', true),
  ('shipment-audio', 'shipment-audio', true)
ON CONFLICT (id) DO NOTHING;

-- Criar função de teste para inserir ocorrências diretamente
CREATE OR REPLACE FUNCTION public.test_insert_occurrence(
  p_shipment_id UUID,
  p_motorista_id UUID,
  p_occurrence_type TEXT,
  p_file_url TEXT,
  p_description TEXT DEFAULT 'Teste de ocorrência'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  new_occurrence_id UUID;
BEGIN
  -- Log entrada da função
  RAISE NOTICE 'TEST_INSERT_OCCURRENCE: Iniciando com shipment_id=%, motorista_id=%, type=%, url=%', 
    p_shipment_id, p_motorista_id, p_occurrence_type, p_file_url;
    
  -- Inserir diretamente na tabela
  INSERT INTO public.shipment_occurrences (
    shipment_id,
    motorista_id, 
    occurrence_type,
    file_url,
    description
  ) VALUES (
    p_shipment_id,
    p_motorista_id,
    p_occurrence_type,
    p_file_url,
    p_description
  ) RETURNING id INTO new_occurrence_id;
  
  RAISE NOTICE 'TEST_INSERT_OCCURRENCE: Ocorrência inserida com ID=%', new_occurrence_id;
  
  result := json_build_object(
    'success', true,
    'occurrence_id', new_occurrence_id,
    'message', 'Ocorrência inserida com sucesso via função de teste'
  );
  
  RETURN result;
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'TEST_INSERT_OCCURRENCE: ERRO - %', SQLERRM;
  result := json_build_object(
    'success', false,
    'error', SQLERRM,
    'message', 'Erro ao inserir ocorrência via função de teste'
  );
  RETURN result;
END;
$$;