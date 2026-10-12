-- Fecha o acesso direto às tabelas pela API REST pública do Supabase.
--
-- O app acessa o banco SOMENTE via Prisma (conexão direta, role `postgres`,
-- que ignora RLS). Mesmo assim, tabelas no schema `public` ficam expostas
-- pelo PostgREST do Supabase a quem tiver a chave pública (anon), que está no
-- bundle JS do site. Sem RLS, essa chave lê (e potencialmente escreve) tudo.
--
-- Efeito: RLS ligado e SEM policies = anon/authenticated não leem nem
-- escrevem nada; Prisma (role postgres) segue funcionando normalmente.
-- Idempotente: pode rodar mais de uma vez.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
  END LOOP;
END $$;

-- Cinto e suspensório: sem privilégio de tabela para os papéis da API.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;

-- Tabelas criadas por migrations futuras já nascem sem acesso da API.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;
