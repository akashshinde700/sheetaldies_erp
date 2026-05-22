-- Remove extra process types that were added by seed file
-- Keep only the 8 required processes: Hardening, Tempering, Stress Relieving, Annealing, Brazing, Plasma Nitriding, Sub Zero, Soak Clean

-- Mark extra processes as inactive (safer than delete in case of foreign key references)
UPDATE process_types SET is_active = false WHERE name IN ('Nitriding', 'Carburizing', 'Normalizing', 'Quenching');
