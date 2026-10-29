-- Checklist objednání materiálu u zakázky.
-- Spusť jednou v Supabase: SQL Editor -> New query -> vlož -> Run.
-- Jen PŘIDÁ nový sloupec k zakázkám, na existující data nesahá a nic nemaže.
alter table orders add column if not exists "materialChecklist" jsonb not null default '{}'::jsonb;
