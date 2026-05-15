-- Fix admin_users table RLS
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage admin_users" ON admin_users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Admins read admin_users" ON admin_users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Fix inventory RLS: NON pubblico (era USING TRUE)
DROP POLICY IF EXISTS "Anyone can view inventory" ON inventory;
DROP POLICY IF EXISTS "Public read inventory" ON inventory;

CREATE POLICY "Authenticated users see availability only" ON inventory
  FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'anon');
-- Nota: la query dovrà selezionare solo `quantity_available > 0` come boolean,
-- i numeri reali restano admin-only via service_role o RLS:

DROP POLICY IF EXISTS "Admins manage inventory" ON inventory;
CREATE POLICY "Admins manage inventory" ON inventory
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin', 'order_manager')
    )
  );
