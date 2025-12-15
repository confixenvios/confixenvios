-- Enable pgcrypto (required for crypt() and gen_salt()) used in CD user registration/auth
CREATE EXTENSION IF NOT EXISTS pgcrypto;