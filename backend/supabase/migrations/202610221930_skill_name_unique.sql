-- Skill names are unique, case-insensitively.
--
-- docs/data-model.md has always said Skill.name is unique, but neither the
-- baseline schema nor the ORM enforced it. This index makes the live importer
-- (and any future write path) fail instead of silently creating a second
-- "SQL" / "sql" row.
--
-- Preflight (must return no rows) before applying:
--
--   select lower(name), count(*)
--   from public.skills
--   group by 1
--   having count(*) > 1;
--
-- The index name and expression are mirrored in app/models.py so SQLite tests
-- and PostgreSQL behave the same way.

create unique index if not exists skills_name_key
    on public.skills (lower(name));
