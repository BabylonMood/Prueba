-- ============================================================================
-- Fix de seguridad: set_updated_at() es una función invocada por triggers.
-- Sin un search_path fijo, si un atacante crea objetos con el mismo nombre en
-- otros esquemas puede secuestrar la ejecución de la función (SECURITY DEFINER
-- / trigger hijacking). Fijamos search_path a 'pg_catalog'.
-- ============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path to 'pg_catalog'
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;