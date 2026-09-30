-- 006_classroom_cover.sql
--
-- Adds the cover image column that classrooms never had.
--
-- Why this is needed: two live queries already select classrooms.cover_url,
-- and both fail with `column r.cover_url does not exist`:
--
--   Backend/src/routes/admin.ts   PRODUCT_COLS (second branch: `from classrooms r`)
--                                 -> GET /admin/products returned 500, so the
--                                    admin Products screen could never load
--   Backend/src/routes/adminOps.ts (learner detail: join classrooms c)
--                                 -> the classroom block on a learner's page fails
--
-- `courses` has had cover_url since 001_core.sql (line 33); classrooms was simply
-- missed when the two tables were aligned. This closes the gap and also lets the
-- classroom cover image upload (the file input already present in the console)
-- actually store something.
--
-- Safe to run more than once, and safe on a live database: it only adds a
-- nullable column and touches no existing row.

alter table classrooms add column if not exists cover_url text;

-- If you would rather NOT add the column, the alternative is to stop selecting it.
-- In Backend/src/routes/admin.ts, inside PRODUCT_COLS, change the classroom branch:
--     r.cover_url                      ->   null::text as cover_url
-- and in Backend/src/routes/adminOps.ts line ~143:
--     c.cover_url                      ->   null::text as cover_url
-- Adding the column is the better fix: it keeps the two product types symmetrical.
