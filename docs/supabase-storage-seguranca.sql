-- =====================================================================
-- Segurança do Supabase Storage (fotos, banners e logos)
-- =====================================================================
-- RODAR NO SQL EDITOR DO SUPABASE (não é uma migration do Prisma: policies de
-- storage.objects vivem fora do schema do app e uma falha aqui não deve
-- derrubar o deploy).
--
-- Problema: a policy sugerida no CLAUDE.md libera escrita para QUALQUER
-- usuário autenticado em QUALQUER pasta. Um lojista logado conseguiria, via API
-- do Storage, subir/sobrescrever/apagar arquivos da pasta de OUTRA loja
-- (a pasta é o lojaId — ver lib/supabase/storage.ts).
--
-- Correção: só grava/atualiza/apaga quem tem vínculo (UsuarioLoja) com a loja
-- dona da pasta. Leitura pública dos buckets continua (URLs do site).
--
-- Idempotente: pode rodar mais de uma vez.
-- =====================================================================

-- ---------- PASSO 0 (opcional, só para conferir antes) ----------
-- select policyname, cmd, roles, qual, with_check
--   from pg_policies where schemaname = 'storage' and tablename = 'objects';

-- ---------- PASSO 1: função de autorização ----------
-- SECURITY DEFINER: as tabelas do app têm RLS ligado e nenhum privilégio para
-- anon/authenticated (ver a migration habilita_rls_todas_tabelas), então a
-- checagem precisa rodar com o dono da função.
create or replace function public.usuario_tem_acesso_loja(p_loja_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public."UsuarioLoja" ul
    join public."Usuario" u on u.id = ul."usuarioId"
    where ul."lojaId" = p_loja_id
      and u."supabaseId" = auth.uid()::text
  );
$$;

revoke all on function public.usuario_tem_acesso_loja(text) from public, anon;
grant execute on function public.usuario_tem_acesso_loja(text) to authenticated;

-- ---------- PASSO 2: remove as policies antigas de storage.objects ----------
-- Policies são somadas com OR: uma policy antiga "authenticated pode tudo"
-- anularia as novas. O projeto só usa os 3 buckets abaixo (todos públicos para
-- leitura, que NÃO depende de policy).
do $$
declare
  p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
  loop
    execute format('drop policy %I on storage.objects', p.policyname);
  end loop;
end $$;

-- ---------- PASSO 3: policies novas (escrita só na pasta da própria loja) ----------
create policy "lojista envia na pasta da propria loja"
  on storage.objects for insert to authenticated
  with check (
    bucket_id in ('fotos-produtos', 'banners-loja', 'logos-loja')
    and public.usuario_tem_acesso_loja((storage.foldername(name))[1])
  );

create policy "lojista atualiza arquivos da propria loja"
  on storage.objects for update to authenticated
  using (
    bucket_id in ('fotos-produtos', 'banners-loja', 'logos-loja')
    and public.usuario_tem_acesso_loja((storage.foldername(name))[1])
  )
  with check (
    bucket_id in ('fotos-produtos', 'banners-loja', 'logos-loja')
    and public.usuario_tem_acesso_loja((storage.foldername(name))[1])
  );

create policy "lojista apaga arquivos da propria loja"
  on storage.objects for delete to authenticated
  using (
    bucket_id in ('fotos-produtos', 'banners-loja', 'logos-loja')
    and public.usuario_tem_acesso_loja((storage.foldername(name))[1])
  );

-- ---------- PASSO 4: limites no próprio bucket ----------
-- A validação de tipo/tamanho do site roda no navegador; quem chama a API do
-- Storage direto a contorna. O limite no bucket vale para todo mundo.
update storage.buckets
   set file_size_limit = 20971520, -- 20 MB (imagens e vídeos)
       allowed_mime_types = array[
         'image/jpeg', 'image/png', 'image/webp', 'image/gif',
         'video/mp4', 'video/webm'
       ]
 where id in ('fotos-produtos', 'banners-loja');

update storage.buckets
   set file_size_limit = 5242880, -- 5 MB (só imagens)
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
 where id = 'logos-loja';

-- ---------- PASSO 5: conferência ----------
-- Deve listar exatamente 3 policies, todas "to authenticated":
-- select policyname, cmd, roles from pg_policies
--  where schemaname = 'storage' and tablename = 'objects';
--
-- Testes manuais depois de rodar:
--  1) No painel, subir uma foto de produto e uma logo  -> deve funcionar.
--  2) Excluir/trocar a foto de um produto               -> deve funcionar.
--  3) As imagens da vitrine pública seguem carregando    -> deve funcionar.
