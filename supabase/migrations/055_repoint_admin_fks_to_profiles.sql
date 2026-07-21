-- Le colonne "chi ha fatto cosa" puntavano ad admin_users, tabella rimasta
-- vuota da quando l'autenticazione admin è passata a profiles. L'app scrive
-- l'id dell'utente Supabase (profiles.id), che in admin_users non esiste mai,
-- quindi ogni scrittura violava la foreign key.
--
-- Conseguenze osservate in produzione:
--   * upload foto: il file arrivava nello storage ma l'insert in media_library
--     falliva, la route rispondeva 500 e la foto non compariva da nessuna parte
--     (4 file orfani nel bucket "media", 0 righe in media_library);
--   * audit_logs vuota da sempre: logAdminAction ignorava l'esito dell'insert,
--     quindi la violazione veniva scartata in silenzio.
--
-- Nessuna delle quattro colonne conteneva valori (verificato prima della
-- migrazione), quindi ripuntare i vincoli non poteva orfanare dati esistenti.
-- ON DELETE SET NULL: l'eliminazione di un profilo non deve portarsi via
-- l'immagine, il post o la riga di audit a cui era associato.

ALTER TABLE media_library DROP CONSTRAINT IF EXISTS media_library_uploaded_by_fkey;
ALTER TABLE media_library
  ADD CONSTRAINT media_library_uploaded_by_fkey
  FOREIGN KEY (uploaded_by) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_admin_id_fkey;
ALTER TABLE audit_logs
  ADD CONSTRAINT audit_logs_admin_id_fkey
  FOREIGN KEY (admin_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE blog_posts DROP CONSTRAINT IF EXISTS blog_posts_author_id_fkey;
ALTER TABLE blog_posts
  ADD CONSTRAINT blog_posts_author_id_fkey
  FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE site_settings DROP CONSTRAINT IF EXISTS site_settings_updated_by_fkey;
ALTER TABLE site_settings
  ADD CONSTRAINT site_settings_updated_by_fkey
  FOREIGN KEY (updated_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- La migrazione 011 prevedeva già di eliminarla: nessuna policy la referenzia
-- e ora nemmeno più una foreign key.
DROP TABLE IF EXISTS admin_users CASCADE;
