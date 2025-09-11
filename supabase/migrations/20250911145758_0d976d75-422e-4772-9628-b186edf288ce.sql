-- Criar bucket para armazenar arquivos de tabelas de preços
INSERT INTO storage.buckets (id, name, public) 
VALUES ('pricing-tables', 'pricing-tables', false);

-- Políticas para o bucket pricing-tables
-- Admins podem fazer upload de arquivos
CREATE POLICY "Admins can upload pricing table files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'pricing-tables' AND has_role(auth.uid(), 'admin'::app_role));

-- Admins podem visualizar arquivos
CREATE POLICY "Admins can view pricing table files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'pricing-tables' AND has_role(auth.uid(), 'admin'::app_role));

-- Admins podem atualizar arquivos
CREATE POLICY "Admins can update pricing table files" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'pricing-tables' AND has_role(auth.uid(), 'admin'::app_role));

-- Admins podem deletar arquivos
CREATE POLICY "Admins can delete pricing table files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'pricing-tables' AND has_role(auth.uid(), 'admin'::app_role));