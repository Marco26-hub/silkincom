-- ============================================================
-- SILKinCOM — Seed Data (Demo)
-- ============================================================

-- ========== MATERIALS ==========

INSERT INTO materials (name, code, description, origin, characteristics, benefits) VALUES
('Seta Naturale', 'SE', 'Seta pura 100% da Bombyx mori', 'Como, Italia',
 'Fibre sottilissime, riflette la luce in modo unico',
 'Ipoallergenica, traspirante, morbidezza incomparabile, fresca d''estate e calda d''inverno'),
('Cashmere Premium', 'CS', 'Cashmere di grado A, fibre fini selezionate', 'Asia centrale (Mongolia/Nepal)',
 'Micron 14-16, finezza massima, leggerezza',
 'Calore senza peso, comfort duraturo, naturale traspirante'),
('Lana Merino', 'WO', 'Lana da pecore Merino', 'Australia/Nuova Zelanda',
 'Elastica, traspirante, naturale',
 'Termoregolazione, resistente, eco-friendly'),
('Lino Belga', 'LI', 'Lino puro 100%', 'Belgio',
 'Fibre lunghe, trama regolare',
 'Fresco d''estate, antibatterico, drappeggio naturale'),
('Cotone Egiziano', 'CO', 'Cotone extra-long staple ELS', 'Egitto',
 'Lunghezza fibra 35mm+, morbidezza superiore',
 'Durabilità, comfort, versatilità');

-- ========== COLORS ==========

INSERT INTO colors (name, hex_code, display_order) VALUES
('Nero', '#000000', 1),
('Blu Navy', '#1F3A4A', 2),
('Bianco Avorio', '#FFFDF8', 3),
('Rosso Cremisi', '#A4243B', 4),
('Beige Cashmere', '#C9B79C', 5),
('Grigio Perla', '#D8D5CF', 6),
('Verde Salvia', '#708070', 7),
('Bordeaux', '#6B4244', 8),
('Oro Champagne', '#D4AF37', 9),
('Rosa Cipria', '#E8C5B5', 10);

-- ========== COLLECTIONS ==========

INSERT INTO collections (name, slug, description, display_order, is_active, seo_title, seo_description) VALUES
('Collezione Iconica', 'collezione-iconica',
 'Accessori senza tempo che definiscono lo stile SILKinCOM', 1, TRUE,
 'Collezione Iconica - Accessori senza tempo Made in Como',
 'Scopri la collezione iconica SILKinCOM: sciarpe e foulard senza tempo in seta e cashmere'),
('Primavera 2026', 'primavera-2026',
 'Nuova collezione con colori e materiali freschi per la stagione', 2, TRUE,
 'Collezione Primavera 2026 - SILKinCOM',
 'La nuova collezione primavera 2026: foulard leggeri, twilly colorati e sciarpe in seta'),
('Twilly', 'twilly',
 'Piccoli foulard versatili in seta pura — l''accessorio infinito', 3, TRUE,
 'Twilly in Seta - Foulard Versatili Made in Como',
 'Twilly in seta pura: piccoli foulard reversibili che si adattano a infiniti stili'),
('Bellagio', 'bellagio',
 'Ispirata alle sponde più eleganti del Lago di Como', 4, TRUE,
 'Collezione Bellagio - Sciarpe Premium SILKinCOM',
 'Collezione Bellagio: sciarpe premium ispirate alla bellezza del Lago di Como'),
('Cernobbio', 'cernobbio',
 'Eleganza discreta, perfetta per le occasioni più importanti', 5, TRUE,
 'Collezione Cernobbio - Foulard Eleganti',
 'Foulard e sciarpe eleganti della collezione Cernobbio'),
('Tremezzo', 'tremezzo',
 'Calore avvolgente in pura lana per le giornate fresche', 6, TRUE,
 'Collezione Tremezzo - Sciarpe in Lana',
 'Sciarpe in pura lana della collezione Tremezzo, comfort e stile'),
('Varenna', 'varenna',
 'Sciarpe statement in seta e cashmere, segno distintivo del lusso comasco', 7, TRUE,
 'Collezione Varenna - Sciarpe Luxury',
 'Sciarpe luxury Varenna in seta e cashmere, Made in Como'),
('Limited Edition', 'limited-edition',
 'Pezzi rari e numerati per veri intenditori', 8, TRUE,
 'Limited Edition - Pezzi Esclusivi SILKinCOM',
 'Edizioni limitate e numerate, accessori rari Made in Como');

-- ========== CATEGORIES ==========

INSERT INTO categories (name, slug, description, display_order, is_active) VALUES
('Sciarpe', 'sciarpe', 'Sciarpe in seta, cashmere e fibre naturali', 1, TRUE),
('Foulard', 'foulard', 'Foulard versatili e raffinati', 2, TRUE),
('Twilly', 'twilly', 'Piccoli foulard versatili', 3, TRUE),
('Cappellini', 'cappellini', 'Cappellini eleganti in fibre naturali', 4, TRUE),
('Camicie', 'camicie', 'Camicie in lino e cotone premium', 5, TRUE),
('T-shirt', 't-shirt', 'T-shirt in cotone egiziano', 6, TRUE);

-- ========== PRODUCTS ==========

INSERT INTO products (
  name, slug, sku, description_short, description_long,
  price, compare_at_price, status,
  is_featured, is_bestseller, is_limited_edition,
  composition, dimensions, care_instructions, origin,
  seo_title, seo_description
) VALUES
(
  'Varenna Blu', 'varenna-blu', 'VAR-BLU-001',
  'Sciarpa in seta pura 100% - 190x35 cm, blu navy elegante',
  'La sciarpa Varenna Blu è realizzata in pura seta naturale italiana, lavorata dai maestri artigiani di Como. Un blu navy intenso che richiama le acque profonde del Lago di Como, perfetto per accompagnare ogni occasione con eleganza discreta.',
  190.00, NULL, 'published',
  TRUE, TRUE, FALSE,
  '100% Seta Naturale', '190 x 35 cm',
  'Lavare a secco. Stirare a bassa temperatura su tessuto leggermente umido.',
  'Como, Italia',
  'Varenna Blu - Sciarpa in Seta Made in Como | SILKinCOM',
  'Elegante sciarpa Varenna in pura seta blu navy, accessorio luxury Made in Como. 190x35 cm, perfetta per ogni occasione.'
),
(
  'Twilly Rosso Cremisi', 'twilly-rosso-cremisi', 'TWI-ROS-001',
  'Piccolo foulard versatile in seta - infinite possibilità di stile',
  'Il Twilly Rosso Cremisi è un piccolo foulard in seta pura che si adatta a infiniti utilizzi: al collo, al polso, come fascia per capelli o come complemento decorativo. Una fiammata di colore Made in Como.',
  85.00, NULL, 'published',
  TRUE, TRUE, FALSE,
  '100% Seta', '90 x 5 cm',
  'Lavare a mano in acqua fredda con detergenti delicati.',
  'Como, Italia',
  'Twilly Rosso Cremisi - Foulard in Seta SILKinCOM',
  'Twilly in seta rossa cremisi, accessorio versatile per collo, polso e capelli. Made in Como.'
),
(
  'Bellagio Cashmere', 'bellagio-cashmere', 'BEL-CAS-001',
  'Sciarpa in puro cashmere premium - 200x40 cm, beige naturale',
  'Bellagio Cashmere è la sciarpa che incarna l''essenza del lusso italiano. Realizzata in puro cashmere di grado A, le sue fibre da 14-16 micron offrono una morbidezza incomparabile. Un caldo abbraccio per le giornate più fredde.',
  320.00, NULL, 'published',
  TRUE, FALSE, FALSE,
  '100% Cashmere', '200 x 40 cm',
  'Lavare a secco. Conservare in luogo asciutto.',
  'Filato in Italia',
  'Bellagio Cashmere - Sciarpa Luxury 100% Cashmere',
  'Sciarpa premium in puro cashmere Bellagio, calda e leggera. 200x40 cm, beige naturale Made in Italy.'
),
(
  'Cernobbio Lino', 'cernobbio-lino', 'CER-LIN-001',
  'Foulard leggero in lino belga - 160x60 cm, perfetto per la primavera',
  'Cernobbio Lino è il foulard ideale per la primavera e l''estate. Realizzato in puro lino belga di prima qualità, offre freschezza, traspirabilità e un drappeggio naturale che dona movimento ed eleganza.',
  125.00, 150.00, 'published',
  FALSE, FALSE, FALSE,
  '100% Lino', '160 x 60 cm',
  'Lavare a 30°. Stirare a temperatura media.',
  'Filato in Belgio, lavorato in Italia',
  'Cernobbio Lino - Foulard Estivo in Lino Belga',
  'Foulard leggero Cernobbio in puro lino belga, fresco e raffinato per primavera-estate.'
),
(
  'Tremezzo Cotone', 'tremezzo-cotone', 'TRE-COT-001',
  'Scialle in cotone egiziano ELS - 180x50 cm, morbido e versatile',
  'Tremezzo Cotone è uno scialle versatile in cotone egiziano extra-long staple. La lunghezza delle fibre garantisce morbidezza, durabilità e un comfort eccezionale per ogni occasione.',
  95.00, NULL, 'published',
  FALSE, TRUE, FALSE,
  '100% Cotone Egiziano ELS', '180 x 50 cm',
  'Lavare a 30°. Asciugare in piano.',
  'Cotone egiziano, lavorato in Italia',
  'Tremezzo Cotone - Scialle Versatile Made in Italy',
  'Scialle Tremezzo in cotone egiziano, comfort e stile per ogni stagione.'
),
(
  'Varenna Limited Gold', 'varenna-limited-gold', 'VAR-LIM-002',
  'Edizione limitata in seta con dettagli oro - solo 50 pezzi numerati',
  'Varenna Limited Gold è un''edizione esclusiva di sole 50 pezzi numerati. Seta pura italiana arricchita da dettagli in filo oro, pensata per veri collezionisti del lusso comasco.',
  450.00, NULL, 'published',
  TRUE, FALSE, TRUE,
  '95% Seta Naturale, 5% Filo metallico oro', '190 x 35 cm',
  'Esclusivamente lavaggio a secco professionale.',
  'Como, Italia',
  'Varenna Limited Gold - Edizione Limitata 50 Pezzi',
  'Edizione limitata Varenna Gold: 50 pezzi numerati in seta pura con dettagli oro Made in Como.'
);

-- ========== PRODUCT-COLLECTION RELATIONSHIPS ==========

INSERT INTO product_collections (product_id, collection_id, display_order)
SELECT p.id, c.id, 1
FROM products p, collections c
WHERE (p.sku = 'VAR-BLU-001' AND c.slug = 'varenna')
   OR (p.sku = 'VAR-BLU-001' AND c.slug = 'collezione-iconica')
   OR (p.sku = 'TWI-ROS-001' AND c.slug = 'twilly')
   OR (p.sku = 'TWI-ROS-001' AND c.slug = 'primavera-2026')
   OR (p.sku = 'BEL-CAS-001' AND c.slug = 'bellagio')
   OR (p.sku = 'CER-LIN-001' AND c.slug = 'cernobbio')
   OR (p.sku = 'CER-LIN-001' AND c.slug = 'primavera-2026')
   OR (p.sku = 'TRE-COT-001' AND c.slug = 'tremezzo')
   OR (p.sku = 'VAR-LIM-002' AND c.slug = 'limited-edition')
   OR (p.sku = 'VAR-LIM-002' AND c.slug = 'varenna');

-- ========== PRODUCT-MATERIAL RELATIONSHIPS ==========

INSERT INTO product_materials (product_id, material_id, percentage)
SELECT p.id, m.id, 100
FROM products p, materials m
WHERE (p.sku = 'VAR-BLU-001' AND m.code = 'SE')
   OR (p.sku = 'TWI-ROS-001' AND m.code = 'SE')
   OR (p.sku = 'BEL-CAS-001' AND m.code = 'CS')
   OR (p.sku = 'CER-LIN-001' AND m.code = 'LI')
   OR (p.sku = 'TRE-COT-001' AND m.code = 'CO');

-- VAR-LIM-002 ha mix: 95% seta + 5% metallico (qui semplificato a 95%)
INSERT INTO product_materials (product_id, material_id, percentage)
SELECT p.id, m.id, 95
FROM products p, materials m
WHERE p.sku = 'VAR-LIM-002' AND m.code = 'SE';

-- ========== PRODUCT-COLOR RELATIONSHIPS ==========

INSERT INTO product_colors (product_id, color_id, display_order)
SELECT p.id, c.id, 1
FROM products p, colors c
WHERE (p.sku = 'VAR-BLU-001' AND c.hex_code = '#1F3A4A')
   OR (p.sku = 'TWI-ROS-001' AND c.hex_code = '#A4243B')
   OR (p.sku = 'BEL-CAS-001' AND c.hex_code = '#C9B79C')
   OR (p.sku = 'CER-LIN-001' AND c.hex_code = '#FFFDF8')
   OR (p.sku = 'TRE-COT-001' AND c.hex_code = '#708070')
   OR (p.sku = 'VAR-LIM-002' AND c.hex_code = '#D4AF37');

-- ========== INVENTORY ==========

INSERT INTO inventory (product_id, quantity_total, quantity_available)
SELECT p.id, inv.qty, inv.qty
FROM products p
JOIN (VALUES
  ('VAR-BLU-001', 25),
  ('TWI-ROS-001', 40),
  ('BEL-CAS-001', 12),
  ('CER-LIN-001', 18),
  ('TRE-COT-001', 30),
  ('VAR-LIM-002', 50)
) AS inv(sku, qty) ON p.sku = inv.sku;

-- ========== SHIPMENT ZONES ==========

INSERT INTO shipment_zones (name, countries, base_cost, free_shipping_threshold, estimated_days) VALUES
('Italia', ARRAY['IT'], 10.00, 100.00, 3),
('Unione Europea', ARRAY['FR', 'DE', 'ES', 'AT', 'CH', 'BE', 'NL', 'PT', 'GR', 'IE', 'FI', 'SE', 'DK'], 18.00, 200.00, 5),
('UK & Svizzera', ARRAY['GB', 'CH'], 25.00, 250.00, 7),
('USA & Canada', ARRAY['US', 'CA'], 35.00, 300.00, 10),
('Resto del mondo', ARRAY['AU', 'JP', 'KR', 'SG', 'HK', 'AE'], 45.00, 400.00, 14);

-- ========== BLOG CATEGORIES ==========

INSERT INTO blog_categories (name, slug, description) VALUES
('Materiali', 'materiali', 'Articoli sui nostri materiali pregiati'),
('Stile', 'stile', 'Consigli di stile e abbinamenti'),
('Como Heritage', 'como-heritage', 'Storia e tradizione tessile comasca'),
('Cura del prodotto', 'cura-prodotto', 'Come prendersi cura dei tuoi accessori'),
('Guide regalo', 'guide-regalo', 'Idee regalo per ogni occasione'),
('Collezioni', 'collezioni', 'Storie dietro le nostre collezioni');

-- ========== COUPONS DEMO ==========

INSERT INTO coupons (code, discount_type, discount_value, valid_from, valid_until, max_uses, max_uses_per_customer, minimum_order_amount, is_active) VALUES
('WELCOME15', 'percentage', 15.00, NOW(), NOW() + INTERVAL '1 year', NULL, 1, 100.00, TRUE),
('FREESHIP', 'free_shipping', 0.00, NOW(), NOW() + INTERVAL '6 months', NULL, NULL, 50.00, TRUE),
('SPRING50', 'fixed_amount', 50.00, NOW(), NOW() + INTERVAL '3 months', 100, 1, 200.00, TRUE);

-- ========== SITE SETTINGS ==========

INSERT INTO site_settings (setting_key, setting_value, description) VALUES
('company_name', '"PLACEHOLDER — verificare con commercialista"'::jsonb, 'Ragione sociale azienda'),
('vat_number', '"PLACEHOLDER P.IVA"'::jsonb, 'Partita IVA'),
('legal_address', '"PLACEHOLDER sede legale"'::jsonb, 'Sede legale'),
('contact_email', '"info@silkincom.com"'::jsonb, 'Email contatto pubblico'),
('contact_phone', '"+39 XXX XXX XXXX"'::jsonb, 'Telefono'),
('free_shipping_threshold', '100'::jsonb, 'Soglia spedizione gratuita Italia'),
('instagram_handle', '"@silkincom.official"'::jsonb, 'Instagram handle'),
('ga4_id', '""'::jsonb, 'Google Analytics 4 ID'),
('gtm_id', '""'::jsonb, 'Google Tag Manager ID'),
('meta_pixel_id', '""'::jsonb, 'Meta Pixel ID');

-- ========== PAGES STATIC ==========

INSERT INTO pages (slug, title, content, meta_title, meta_description, is_published) VALUES
('la-nostra-storia', 'La nostra storia',
 'Dal 1987, SILKinCOM coltiva un rapporto privilegiato con i maestri artigiani di Como. Tre generazioni di esperienza si incontrano con una visione contemporanea: creare accessori che accompagnino il tempo, senza inseguire le mode.',
 'La nostra storia - SILKinCOM Made in Como',
 'La storia di SILKinCOM: tre generazioni di tradizione tessile comasca per accessori in seta e cashmere',
 TRUE),
('contact', 'Contatti',
 'Per qualsiasi richiesta, scrivici a info@silkincom.com oppure chiama il numero +39 XXX XXX XXXX',
 'Contatti - SILKinCOM',
 'Contattaci per informazioni sui nostri prodotti, collaborazioni o richieste speciali',
 TRUE),
('faq', 'Domande frequenti',
 '## Spedizioni\nQuanto costa la spedizione?\nLa spedizione in Italia è gratuita per ordini superiori a €100, altrimenti €10.\n\n## Resi\nCome posso fare un reso?\nHai 30 giorni dalla consegna per restituire un articolo.',
 'FAQ - Domande frequenti SILKinCOM',
 'Risposte alle domande più frequenti su spedizioni, resi, materiali e cura dei prodotti',
 TRUE);
