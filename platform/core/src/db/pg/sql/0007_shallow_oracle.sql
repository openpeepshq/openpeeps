-- post_seen rows are impression events; uniqueness blocked repeats (0006).
-- Unread still uses EXISTS / NOT EXISTS on any matching row.
DROP INDEX IF EXISTS "post_seen_from_to_unique";
