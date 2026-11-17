-- =====================================================================
-- ODBĚRATELÉ — databáze zákazníků pro našeptávač (jména, adresy, kontakty)
-- =====================================================================
-- Spusť JEDNOU v Supabase: SQL Editor -> New query -> vlož celý soubor -> Run.
-- Jen PŘIDÁ novou tabulku. Na zakázky ani jiná data nesahá, nic nemaže.
-- Jde spustit i opakovaně.
create table if not exists odberatele (
  id text primary key,
  nazev text not null,
  ico text,
  "zakaznikIdentifikace" text,
  telefon text,
  email text,
  poznamka text,
  skryto boolean not null default false,
  "posledniPouziti" timestamptz default now(),
  created_at timestamptz default now()
);
alter table odberatele enable row level security;
drop policy if exists "authenticated all odberatele" on odberatele;
create policy "authenticated all odberatele" on odberatele
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
