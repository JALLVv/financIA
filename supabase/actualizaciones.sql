-- ============================================================
-- Actualizaciones para bases de datos que ya ejecutaron
-- schema.sql. Ejecutar en el SQL Editor de Supabase.
-- (schema.sql ya incluye estos cambios para instalaciones nuevas)
-- ============================================================

-- 2026-07-04: foto adjunta en movimientos compartidos (facturas, recibos…)
alter table public.shared_transactions add column if not exists photo text;
