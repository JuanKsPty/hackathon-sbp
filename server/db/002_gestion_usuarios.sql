-- Gestión de usuarios desde la app (lámina 6, Administrador: configurar perfiles y permisos).
-- El API (rol sbp_api) pasa de solo leer a poder crear usuarios y cambiar su nombre, perfil, estado y
-- contraseña (siempre como hash scrypt; la contraseña nunca llega a la base). No puede borrar usuarios:
-- la app los desactiva. Se aplica una vez, después de 001_usuarios.sql, en el SQL editor de Supabase.
grant insert (usuario, nombre, perfil, clave_hash) on interno.usuarios to sbp_api;
grant update (nombre, perfil, activo, clave_hash) on interno.usuarios to sbp_api;

drop policy if exists sbp_api_crea on interno.usuarios;
create policy sbp_api_crea on interno.usuarios for insert to sbp_api with check (true);
