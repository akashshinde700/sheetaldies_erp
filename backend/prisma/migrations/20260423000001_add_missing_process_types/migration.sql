-- Add missing process types from physical job card form
INSERT IGNORE INTO process_types (code, name, description, hsn_sac_code, price_per_kg, min_charge, gst_rate, is_active, updated_by, created_at, updated_at) VALUES
('ANN',  'Annealing',       'Annealing process',        '998898', NULL, NULL, 18.00, 1, 1, NOW(), NOW()),
('BRZ',  'Brazing',         'Brazing process',          '998898', NULL, NULL, 18.00, 1, 1, NOW(), NOW()),
('PN',   'Plasma Nitriding','Plasma nitriding process', '998898', NULL, NULL, 18.00, 1, 1, NOW(), NOW()),
('SZ',   'Sub Zero',        'Sub zero treatment',       '998898', NULL, NULL, 18.00, 1, 1, NOW(), NOW()),
('SC',   'Soak Clean',      'Soak cleaning process',    '998898', NULL, NULL, 18.00, 1, 1, NOW(), NOW());
