-- Usuarios del sitio interno (Analista y Administrador) en Supabase, usado como Postgres.
-- Esquema "interno": no se expone por la Data API de Supabase. RLS encendido y sin políticas:
-- solo entran los roles con grant explícito (el API usa el rol sbp_api).
-- La contraseña del rol sbp_api NO va aquí (R5): se fija aparte con
--   alter role sbp_api with password '...';
-- y se arma DATABASE_URL con el pooler de Supabase (ver server/README.md).
create schema if not exists interno;

create table if not exists interno.usuarios (
  id uuid primary key default gen_random_uuid(),
  usuario text not null unique check (usuario = lower(usuario) and length(usuario) between 2 and 60),
  nombre text not null default '',
  perfil text not null check (perfil in ('analista', 'admin')),
  clave_hash text not null,
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  ultimo_acceso timestamptz
);

alter table interno.usuarios enable row level security;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'sbp_api') then
    create role sbp_api with login noinherit;
  end if;
end $$;

grant usage on schema interno to sbp_api;
grant select on interno.usuarios to sbp_api;
grant update (ultimo_acceso) on interno.usuarios to sbp_api;
alter table interno.usuarios force row level security;
drop policy if exists sbp_api_lee on interno.usuarios;
create policy sbp_api_lee on interno.usuarios for select to sbp_api using (true);
drop policy if exists sbp_api_acceso on interno.usuarios;
create policy sbp_api_acceso on interno.usuarios for update to sbp_api using (true) with check (true);
