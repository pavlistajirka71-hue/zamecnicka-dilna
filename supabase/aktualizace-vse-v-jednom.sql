-- =====================================================================
-- VŠECHNY NOVÉ ÚPRAVY DATABÁZE V JEDNOM (poptávky, odhad ceny, checklist
-- materiálu, adresa dílny, adresář dodavatelů)
-- =====================================================================
-- Spusť v Supabase: SQL Editor -> New query -> vlož celý soubor -> Run.
-- Jen PŘIDÁVÁ tabulky a sloupce. Nic nemaže a nic nepřepisuje.
-- Jde spustit klidně opakovaně — co už existuje, se přeskočí.
-- Ověřeno na kopii databáze s daty: zakázky, nastavení i číslování zůstaly beze změny.

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

-- Odhad ceny poptávky (Kč bez DPH) — přidáno později; jen přidá sloupec, nic nemaže.
alter table poptavky add column if not exists "odhadCena" numeric;

-- Checklist objednání materiálu u zakázky
alter table orders add column if not exists "materialChecklist" jsonb not null default '{}'::jsonb;

-- Adresa dílny pro doručování materiálu
alter table nastaveni add column if not exists "adresaDilny" text;

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
