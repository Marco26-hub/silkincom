-- Prepared security hardening. Apply only with explicit production approval.
-- RLS ownership alone must not allow a customer to promote their own role.
BEGIN;

CREATE OR REPLACE FUNCTION public.guard_profile_privileges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  caller_role text;
  trusted boolean := false;
BEGIN
  trusted := coalesce(auth.role(), '') = 'service_role'
    OR (auth.uid() IS NULL AND session_user IN ('postgres', 'supabase_admin'));
  IF NOT trusted AND auth.uid() IS NOT NULL THEN
    SELECT p.role INTO caller_role FROM public.profiles AS p WHERE p.id = auth.uid();
    trusted := coalesce(caller_role IN ('admin', 'super_admin'), false);
  END IF;
  IF NOT trusted THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.role IS DISTINCT FROM 'customer' THEN
        RAISE EXCEPTION 'Client cannot assign a privileged profile role' USING ERRCODE = '42501';
      END IF;
    ELSIF NEW.role IS DISTINCT FROM OLD.role OR NEW.id IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'Client cannot change profile privileges or identity' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_profile_privileges() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS guard_profile_privileges ON public.profiles;
CREATE TRIGGER guard_profile_privileges
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_privileges();

-- The legacy newsletters table is not used by the current API. Its public
-- insert / any-authenticated-user update policies bypass server anti-bot.
DO $$
BEGIN
  IF to_regclass('public.newsletters') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON TABLE public.newsletters FROM anon, authenticated';
    EXECUTE 'GRANT ALL ON TABLE public.newsletters TO service_role';
    EXECUTE 'DROP POLICY IF EXISTS "Allow public insert" ON public.newsletters';
    EXECUTE 'DROP POLICY IF EXISTS "Allow auth update" ON public.newsletters';
  END IF;
END;
$$;

COMMIT;
