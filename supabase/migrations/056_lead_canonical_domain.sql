-- L'unicità dei lead era su `website_url`, cioè sulla stringa esatta. La
-- stessa struttura trovata come "https://treterre.it/", "https://www.treterre.it"
-- o "https://treterre.it/it/contatti" entrava quindi più volte, e le
-- protezioni sullo stato (già contattato, do not contact) non scattavano
-- perché interrogavano una riga diversa da quella storica.
--
-- `canonical_domain` tiene il solo nome host senza "www.": una struttura ha un
-- sito, e la pagina su cui è atterrato il crawler non la identifica. Per gli
-- host multi-tenant (wixsite.com e simili) il codice applicativo aggiunge il
-- primo segmento di percorso, perché lì domini uguali sono aziende diverse;
-- il backfill qui sotto non ne ha bisogno, nessuna riga attuale è su quegli host.

ALTER TABLE lead_accounts ADD COLUMN IF NOT EXISTS canonical_domain TEXT;

UPDATE lead_accounts
SET canonical_domain = lower(
  split_part(regexp_replace(website_url, '^https?://(www\.)?', '', 'i'), '/', 1)
)
WHERE canonical_domain IS NULL
  AND website_url IS NOT NULL;

-- Verificato prima della migrazione che i 15 lead esistenti non producono
-- collisioni; l'indice fallirebbe rumorosamente se ne comparissero, il che è
-- preferibile a fondere due aziende in silenzio.
CREATE UNIQUE INDEX IF NOT EXISTS lead_accounts_canonical_domain_key
  ON lead_accounts (canonical_domain)
  WHERE canonical_domain IS NOT NULL;

COMMENT ON COLUMN lead_accounts.canonical_domain IS
  'Nome host normalizzato (senza www, minuscolo) usato per riconoscere lo stesso lead trovato con URL diversi. Popolato da leadCanonicalDomain() in src/lib/lead-upsert.ts.';
