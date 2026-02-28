-- compute_avg_stars.sql
-- Run this script against your database to backfill the `avgStars` column
-- on the `Mappool` table. It computes the average star rating of all maps
-- belonging to each pool via their PoolEntry rows.
--
-- Usage:
--   mysql -u <user> -p <database> < prisma/compute_avg_stars.sql
--
-- After initial backfill you can add a trigger (see bottom of file) so that
-- avgStars stays up-to-date automatically whenever pool entries change.

UPDATE Mappool p
SET p.avgStars = (
    SELECT COALESCE(AVG(m.stars), 0)
    FROM PoolEntry pe
    JOIN Map m ON m.id = pe.mapId
    WHERE pe.poolId = p.id
)
WHERE EXISTS (
    SELECT 1 FROM PoolEntry pe2 WHERE pe2.poolId = p.id
);

-- Set avgStars to 0 for pools that have no entries yet.
UPDATE Mappool p
SET p.avgStars = 0
WHERE NOT EXISTS (
    SELECT 1 FROM PoolEntry pe WHERE pe.poolId = p.id
);

-- ─────────────────────────────────────────────────────────────────────────────
--  Optional: triggers to keep avgStars current automatically.
--  Uncomment and run once if you want live recomputation.
-- ─────────────────────────────────────────────────────────────────────────────

-- DELIMITER $$

-- CREATE TRIGGER trg_pool_entry_insert
-- AFTER INSERT ON PoolEntry
-- FOR EACH ROW
-- BEGIN
--     UPDATE Mappool
--     SET avgStars = (
--         SELECT COALESCE(AVG(m.stars), 0)
--         FROM PoolEntry pe
--         JOIN Map m ON m.id = pe.mapId
--         WHERE pe.poolId = NEW.poolId
--     )
--     WHERE id = NEW.poolId;
-- END$$

-- CREATE TRIGGER trg_pool_entry_delete
-- AFTER DELETE ON PoolEntry
-- FOR EACH ROW
-- BEGIN
--     UPDATE Mappool
--     SET avgStars = (
--         SELECT COALESCE(AVG(m.stars), 0)
--         FROM PoolEntry pe
--         JOIN Map m ON m.id = pe.mapId
--         WHERE pe.poolId = OLD.poolId
--     )
--     WHERE id = OLD.poolId;
-- END$$

-- DELIMITER ;
