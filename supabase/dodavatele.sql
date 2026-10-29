-- =====================================================================
-- DODAVATELÉ — adresář dodavatelů materiálu (e-mail, telefon, kontakt)
-- =====================================================================
-- Spusť JEDNOU v Supabase: SQL Editor -> New query -> vlož celý soubor -> Run.
-- Jen PŘIDÁ novou tabulku, na existující data nesahá a nic nemaže.
-- Jde spustit i opakovaně.
create table if not exists dodavatele (
  nazev text primary key,
  email text,
  telefon text,
  kontakt text,
  poznamka text,
  created_at timestamptz default now()
);
alter table dodavatele enable row level security;
drop policy if exists "authenticated all dodavatele" on dodavatele;
create policy "authenticated all dodavatele" on dodavatele
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
