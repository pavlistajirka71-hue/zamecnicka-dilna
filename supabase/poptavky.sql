-- =====================================================================
-- POPTÁVKY ZÁKAZNÍKŮ — nová samostatná tabulka
-- =====================================================================
-- Spusť JEDNOU v Supabase: SQL Editor -> New query -> vlož celý tenhle soubor -> Run.
--
-- BEZPEČNÉ pro existující data:
--   * jen PŘIDÁVÁ novou tabulku "poptavky", počítadlo čísel a pravidla přístupu,
--   * nesahá na tabulky orders, nastaveni, material_history ani žádné jiné,
--   * nic nemaže; jde spustit i opakovaně (všechno je "if not exists").
-- =====================================================================

create table if not exists poptavky (
  id uuid primary key default gen_random_uuid(),
  cislo text not null,
  stav text not null default 'nova',
  zakaznik text not null,
  ico text,
  "zakaznikIdentifikace" text,
  telefon text,
  email text,
  zdroj text,
  text text,
  "pozadovanyTermin" date,
  fotky jsonb not null default '[]'::jsonb,
  poznamky jsonb not null default '[]'::jsonb,
  "zakazkaId" text,
  "zakazkaCislo" text,
  vytvoril text,
  vytvoreno date default current_date,
  created_at timestamptz default now()
);

-- Realtime posílá celé řádky i s velkými jsonb poli (stejně jako u orders).
alter table poptavky replica identity full;

alter table poptavky enable row level security;

-- Číst, zakládat a upravovat smí každý přihlášený (sdílený tým, stejně jako zakázky).
drop policy if exists "authenticated read poptavky" on poptavky;
create policy "authenticated read poptavky" on poptavky
  for select using (auth.role() = 'authenticated');

drop policy if exists "authenticated insert poptavky" on poptavky;
create policy "authenticated insert poptavky" on poptavky
  for insert with check (auth.role() = 'authenticated');

drop policy if exists "authenticated update poptavky" on poptavky;
create policy "authenticated update poptavky" on poptavky
  for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Smazat poptávku smí jen správce (sa) — vynucené přímo v databázi.
drop policy if exists "sa delete poptavky" on poptavky;
create policy "sa delete poptavky" on poptavky
  for delete using (exists (select 1 from uzivatele_role where user_id = auth.uid() and role = 'sa'));

-- Bezpečné číslování poptávek (P-2026-0001) — vlastní počítadlo, nezávislé na
-- číslování zakázek, takže čísla zakázek se tím nijak neposunou.
create table if not exists poptavky_pocitadlo (
  rok int primary key,
  posledni_cislo int not null default 0
);
alter table poptavky_pocitadlo enable row level security;
drop policy if exists "authenticated full access poptavky_pocitadlo" on poptavky_pocitadlo;
create policy "authenticated full access poptavky_pocitadlo" on poptavky_pocitadlo
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create or replace function ziskat_dalsi_cislo_poptavky(p_rok int)
returns int
language plpgsql
security definer
as $$
declare
  vysledek int;
begin
  insert into poptavky_pocitadlo (rok, posledni_cislo)
  values (p_rok, 1)
  on conflict (rok) do update set posledni_cislo = poptavky_pocitadlo.posledni_cislo + 1
  returning posledni_cislo into vysledek;
  return vysledek;
end;
$$;

-- Živé sdílení změn mezi zařízeními.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'poptavky'
  ) then
    alter publication supabase_realtime add table poptavky;
  end if;
end $$;

-- Fotky poptávek se ukládají stejně jako fotky zakázek: na Google Drive (podsložka
-- "P-2026-0001 – zákazník"), záložně do už existujícího bucketu "fotky".
-- Žádný nový bucket není potřeba.
