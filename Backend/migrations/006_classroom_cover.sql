-- 006_classroom_cover.sql
-- Adds the cover column classrooms never had. Two queries already select
-- classrooms.cover_url and both failed with `column r.cover_url does not exist`:
--   admin.ts PRODUCT_COLS      -> GET /admin/products returned 500 (Products screen never loaded)
--   adminOps.ts learner detail -> the classroom block of a learner page failed
-- courses has had cover_url since 001_core.sql; classrooms was missed.
-- Safe to re-run: nullable column, no existing row touched.
alter table classrooms add column if not exists cover_url text;
