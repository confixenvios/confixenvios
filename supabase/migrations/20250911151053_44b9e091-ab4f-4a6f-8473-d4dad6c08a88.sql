-- Cadastrar tabela Magalog vinculada à filial Confiance
INSERT INTO pricing_tables (
  name, 
  company_branch_id, 
  source_type, 
  google_sheets_url, 
  is_active, 
  validation_status
) VALUES (
  'Magalog', 
  '89d00d3e-aacf-476a-90d0-6431262c7c72', 
  'google_sheets', 
  'https://docs.google.com/spreadsheets/d/1cAH3flP8wmCiDvngG0VUvDOTfBjrHEB7ZCRnwB6NHXk/edit?usp=sharing', 
  true, 
  'pending'
);