"""Verify migration 061 in a disposable local PostgreSQL cluster, never Supabase."""
import json
import os
from pathlib import Path
import subprocess
import tempfile

ROOT = Path.cwd()
checks = []
with tempfile.TemporaryDirectory(prefix='silkincom-security-', dir='/private/tmp') as temp:
    directory = Path(temp)
    data = directory / 'data'
    env = dict(os.environ, PGHOST=temp, PGPORT='55458', PGUSER='postgres', PGDATABASE='postgres')
    def run(args, **kwargs):
        return subprocess.run(args, env=env, text=True, capture_output=True, **kwargs)
    def sql(text, user='postgres'):
        return run(['psql', '-X', '-v', 'ON_ERROR_STOP=1', '-U', user, '-c', text])
    initialized = run(['initdb', '-D', str(data), '-A', 'trust', '-U', 'postgres', '--no-locale'])
    if initialized.returncode:
        raise RuntimeError(initialized.stderr)
    started = run(['pg_ctl', '-D', str(data), '-l', str(directory / 'server.log'), '-o', f"-F -k {temp} -h '' -p 55458", '-w', 'start'])
    if started.returncode:
        raise RuntimeError(started.stderr)
    try:
        bootstrap = sql("""
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;
CREATE ROLE api_test LOGIN NOSUPERUSER;
GRANT anon, authenticated, service_role TO api_test;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT current_setting('request.jwt.claim.role', true) $$;
GRANT USAGE ON SCHEMA auth TO PUBLIC;
CREATE TABLE public.profiles (id uuid PRIMARY KEY, role text NOT NULL DEFAULT 'customer', full_name text);
INSERT INTO public.profiles VALUES ('11111111-1111-4111-8111-111111111111', 'customer', 'Synthetic customer'), ('22222222-2222-4222-8222-222222222222', 'admin', 'Synthetic administrator');
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated, service_role;
CREATE TABLE public.newsletters (id int, email text);
GRANT ALL ON public.newsletters TO anon, authenticated;
""")
        if bootstrap.returncode: raise RuntimeError(bootstrap.stderr)
        migration = run(['psql', '-X', '-v', 'ON_ERROR_STOP=1', '-f', str(ROOT / 'supabase/migrations/061_profile_privilege_guard.sql')])
        if migration.returncode: raise RuntimeError(migration.stderr)
        customer = "SET ROLE authenticated; SELECT set_config('request.jwt.claim.role','authenticated',false); SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false); "
        admin = "SET ROLE authenticated; SELECT set_config('request.jwt.claim.role','authenticated',false); SELECT set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false); "
        service = "SET ROLE service_role; SELECT set_config('request.jwt.claim.role','service_role',false); "
        cases = [
            ('Customer can update ordinary profile fields', customer + "UPDATE public.profiles SET full_name='Changed safely' WHERE id='11111111-1111-4111-8111-111111111111'", True),
            ('Customer cannot promote their role', customer + "UPDATE public.profiles SET role='super_admin' WHERE id='11111111-1111-4111-8111-111111111111'", False),
            ('Customer cannot change profile identity', customer + "UPDATE public.profiles SET id='33333333-3333-4333-8333-333333333333' WHERE id='11111111-1111-4111-8111-111111111111'", False),
            ('Customer cannot insert a privileged profile', customer + "INSERT INTO public.profiles(id,role) VALUES('33333333-3333-4333-8333-333333333333','admin')", False),
            ('Administrator can change a role', admin + "UPDATE public.profiles SET role='editor' WHERE id='11111111-1111-4111-8111-111111111111'", True),
            ('Service role can manage profiles', service + "UPDATE public.profiles SET role='customer' WHERE id='11111111-1111-4111-8111-111111111111'", True),
            ('Authenticated client cannot write the legacy newsletter table', customer + "INSERT INTO public.newsletters VALUES(1,'synthetic@example.invalid')", False),
        ]
        for name, statement, expected in cases:
            result = sql(statement, 'api_test')
            passed = (result.returncode == 0) == expected
            checks.append({'name': name, 'pass': passed})
            if not passed: print(result.stderr)
    finally:
        run(['pg_ctl', '-D', str(data), '-m', 'immediate', '-w', 'stop'])

report = {'scope': 'Disposable local PostgreSQL only; synthetic identities; production not modified', 'checks': checks, 'passed': sum(c['pass'] for c in checks), 'failed': sum(not c['pass'] for c in checks)}
(ROOT / 'docs/aeo-2026-11-26/security-profile-guard.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
raise SystemExit(1 if report['failed'] else 0)
