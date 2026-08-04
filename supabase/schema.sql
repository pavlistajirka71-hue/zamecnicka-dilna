-- Spusť tento skript v Supabase: Dashboard -> SQL Editor -> New query -> vlož a spusť (Run).

-- 1) Tabulka zakázek
create table if not exists orders (
  id text primary key,
  cislo text not null,
  zakaznik text not null,
  popis text,
  stav text not null default 'nova',
  cena numeric default 0,
  termin date,
  vytvoreno date default current_date,
  reseni text,
  poznamka text,
  "cisloFaktury" text,
  "planCasDilna" numeric,
  "planCasMontaz" numeric,
  prace jsonb not null default '[]'::jsonb,
  uctenky jsonb not null default '[]'::jsonb,
  kalkulace jsonb,
  "materialObjednano" boolean default false,
  "materialObjednanoDatum" date,
  "zakaznikIdentifikace" text,
  ico text,
  telefon text,
  email text,
  "nadrazenaZakazkaId" text,
  protokol jsonb,
  fotky jsonb not null default '[]'::jsonb,
  naklady jsonb not null default '[]'::jsonb,
  archivy jsonb not null default '[]'::jsonb,
  created_at timestamptz default now()
);
-- Pokud tabulka orders už existuje ze starší verze appky bez těchto sloupců:
alter table orders add column if not exists "materialObjednano" boolean default false;
alter table orders add column if not exists "materialObjednanoDatum" date;
alter table orders add column if not exists "zakaznikIdentifikace" text;
alter table orders add column if not exists ico text;
alter table orders add column if not exists telefon text;
alter table orders add column if not exists email text;
alter table orders add column if not exists "nadrazenaZakazkaId" text;
alter table orders add column if not exists protokol jsonb;
alter table orders add column if not exists fotky jsonb not null default '[]'::jsonb;
alter table orders add column if not exists naklady jsonb not null default '[]'::jsonb;
alter table orders add column if not exists archivy jsonb not null default '[]'::jsonb;

-- 2) Nastavení appky (jeden řádek, id vždy 1)
create table if not exists nastaveni (
  id int primary key default 1,
  "sazbaDilna" numeric default 550,
  "sazbaMontaz" numeric default 650,
  "cenaZinkovani" numeric default 23,
  "cenaLakovani" numeric default 900,
  "zaokrouhleniNa" numeric default 10,
  "firmaNazev" text,
  "firmaAdresa" text,
  "firmaIco" text,
  "firmaDic" text,
  pracovnici jsonb not null default '[]'::jsonb,
  "nabizetPracovniky" boolean not null default true
);
insert into nastaveni (id) values (1) on conflict (id) do nothing;
-- Pokud tabulka nastaveni už existuje ze starší verze appky bez těchto sloupců:
alter table nastaveni add column if not exists "firmaNazev" text;
alter table nastaveni add column if not exists "firmaAdresa" text;
alter table nastaveni add column if not exists pracovnici jsonb not null default '[]'::jsonb;
alter table nastaveni add column if not exists "nabizetPracovniky" boolean not null default true;
alter table nastaveni add column if not exists "firmaIco" text;
alter table nastaveni add column if not exists "firmaDic" text;

-- 3) Historie / katalog materiálů (pro našeptávač v kalkulaci a správu v appce)
create table if not exists material_history (
  nazev text primary key,
  dodavatel text,
  cena numeric,
  jednotka text,
  vaha numeric,
  plocha numeric
);
-- Pokud tabulka už existuje ze starší verze appky bez sloupce dodavatel:
alter table material_history add column if not exists dodavatel text;

-- ---- Zabezpečení řádků (RLS) ----
-- Data jsou sdílená pro celý přihlášený tým (ne oddělená po uživatelích).
alter table orders enable row level security;
alter table nastaveni enable row level security;
alter table material_history enable row level security;

-- 7) Role uživatelů — "sa" (správce) vs. "user" (běžný pracovník). Kdo nemá přiřazenou
-- roli vůbec, počítá se jako "user" (bezpečný výchozí stav — nic navíc mu nejde).
create table if not exists uzivatele_role (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user',
  created_at timestamptz default now()
);
alter table uzivatele_role enable row level security;
-- Kdokoliv přihlášený smí zjistit role (appka to potřebuje k zobrazení "kdo je uživatel") —
-- zápis do téhle tabulky appka řeší jen přes server (service role), ne přímo z prohlížeče.
drop policy if exists "authenticated read uzivatele_role" on uzivatele_role;
create policy "authenticated read uzivatele_role" on uzivatele_role
  for select using (auth.role() = 'authenticated');

-- Smazání zakázky smí jen "sa" — vynucené přímo v databázi, ne jen schované tlačítko v appce.
drop policy if exists "authenticated full access orders" on orders;
drop policy if exists "authenticated read orders" on orders;
create policy "authenticated read orders" on orders
  for select using (auth.role() = 'authenticated');
drop policy if exists "authenticated insert orders" on orders;
create policy "authenticated insert orders" on orders
  for insert with check (auth.role() = 'authenticated');
drop policy if exists "authenticated update orders" on orders;
create policy "authenticated update orders" on orders
  for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists "sa delete orders" on orders;
create policy "sa delete orders" on orders
  for delete using (exists (select 1 from uzivatele_role where user_id = auth.uid() and role = 'sa'));

-- Úpravu kalkulace smí jen "sa" — řeší se přes trigger, protože kalkulace je jen jeden
-- sloupec z mnoha na téže zakázce (RLS pravidla fungují na celý řádek, ne na sloupec).
create or replace function chranit_kalkulaci()
returns trigger
language plpgsql
security definer
as $$
declare
  uzivatelova_role text;
begin
  if NEW.kalkulace is distinct from OLD.kalkulace then
    select role into uzivatelova_role from uzivatele_role where user_id = auth.uid();
    if uzivatelova_role is distinct from 'sa' then
      raise exception 'Úpravu kalkulace smí jen správce (role sa).';
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists chranit_kalkulaci_trigger on orders;
create trigger chranit_kalkulaci_trigger
  before update on orders
  for each row execute function chranit_kalkulaci();

-- Živé sdílení změn mezi zařízeními (Realtime) — bezpečné i při opakovaném spuštění skriptu
do $$
begin
  if not exists (
    select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table orders;
  end if;
end $$;

drop policy if exists "authenticated full access nastaveni" on nastaveni;
create policy "authenticated full access nastaveni" on nastaveni
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "authenticated full access material_history" on material_history;
create policy "authenticated full access material_history" on material_history
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- ---- Úložiště na fotky účtenek ----
-- Vytvoř v Dashboard -> Storage tlačítkem "New bucket" bucket s názvem "uctenky", zaškrtni "Private".
-- Pak spusť tuhle část skriptu, ať k němu mají přístup přihlášení uživatelé:
insert into storage.buckets (id, name, public)
values ('uctenky', 'uctenky', false)
on conflict (id) do nothing;

drop policy if exists "authenticated read uctenky" on storage.objects;
create policy "authenticated read uctenky" on storage.objects
  for select using (bucket_id = 'uctenky' and auth.role() = 'authenticated');

drop policy if exists "authenticated upload uctenky" on storage.objects;
create policy "authenticated upload uctenky" on storage.objects
  for insert with check (bucket_id = 'uctenky' and auth.role() = 'authenticated');

drop policy if exists "authenticated delete uctenky" on storage.objects;
create policy "authenticated delete uctenky" on storage.objects
  for delete using (bucket_id = 'uctenky' and auth.role() = 'authenticated');

-- ---- Úložiště na podpisy z předávacích protokolů ----
-- Vytvoř v Dashboard -> Storage bucket s názvem "protokoly", zaškrtni "Private" (stejně jako u "uctenky").
insert into storage.buckets (id, name, public)
values ('protokoly', 'protokoly', false)
on conflict (id) do nothing;

drop policy if exists "authenticated read protokoly" on storage.objects;
create policy "authenticated read protokoly" on storage.objects
  for select using (bucket_id = 'protokoly' and auth.role() = 'authenticated');

drop policy if exists "authenticated upload protokoly" on storage.objects;
create policy "authenticated upload protokoly" on storage.objects
  for insert with check (bucket_id = 'protokoly' and auth.role() = 'authenticated');

-- Poznámka: veřejná stránka pro podpis zákazníkem (/protokol/[id]) nepoužívá tuhle RLS politiku —
-- běží přes server (service role klíč), který RLS obchází a ověřuje přístup vlastním tokenem.

-- ---- Úložiště na fotky z průběhu práce (před/po) ----
insert into storage.buckets (id, name, public)
values ('fotky', 'fotky', false)
on conflict (id) do nothing;

drop policy if exists "authenticated read fotky" on storage.objects;
create policy "authenticated read fotky" on storage.objects
  for select using (bucket_id = 'fotky' and auth.role() = 'authenticated');

drop policy if exists "authenticated upload fotky" on storage.objects;
create policy "authenticated upload fotky" on storage.objects
  for insert with check (bucket_id = 'fotky' and auth.role() = 'authenticated');

drop policy if exists "authenticated delete fotky" on storage.objects;
create policy "authenticated delete fotky" on storage.objects
  for delete using (bucket_id = 'fotky' and auth.role() = 'authenticated');

-- 6) Bezpečné (atomické) číslování zakázek — počítadlo na serveru, ať se dvěma lidem
-- založivším zakázku ve stejnou chvíli nikdy nepřidělí stejné číslo (běžné riziko,
-- pokud by se číslo počítalo jen v prohlížeči z toho, co appka zrovna vidí).
create table if not exists cislo_pocitadlo (
  rok int primary key,
  posledni_cislo int not null default 0
);
alter table cislo_pocitadlo enable row level security;
drop policy if exists "authenticated full access cislo_pocitadlo" on cislo_pocitadlo;
create policy "authenticated full access cislo_pocitadlo" on cislo_pocitadlo
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create or replace function ziskat_dalsi_cislo_zakazky(p_rok int)
returns int
language plpgsql
security definer
as $$
declare
  vysledek int;
begin
  insert into cislo_pocitadlo (rok, posledni_cislo)
  values (p_rok, 1)
  on conflict (rok) do update set posledni_cislo = cislo_pocitadlo.posledni_cislo + 1
  returning posledni_cislo into vysledek;
  return vysledek;
end;
$$;

-- 5) Katalog organizací (firemní zákazníci doplnění přes ARES podle IČO) — stejný princip
-- jako katalog materiálů: jednou vyhledané se uloží, příště se nabídne bez nutnosti volat ARES znovu.
create table if not exists organizace (
  ico text primary key,
  nazev text,
  adresa text,
  dic text,
  telefon text,
  email text,
  aktualizovano timestamptz default now()
);
alter table organizace add column if not exists telefon text;
alter table organizace add column if not exists email text;
alter table organizace enable row level security;
drop policy if exists "authenticated full access organizace" on organizace;
create policy "authenticated full access organizace" on organizace
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- 4) Přihlášení ke Google Drive (OAuth refresh token) — appka se k Drive přihlašuje jako
-- konkrétní lidský Google účet (ne servisní účet), aby mohla využívat jeho úložiště.
-- Schválně BEZ "authenticated" policy níže — tahle tabulka nesmí být čitelná/zapisovatelná
-- přímo z prohlížeče (anon klíčem), jen ze serveru přes service role klíč.
create table if not exists google_drive_auth (
  id int primary key default 1,
  refresh_token text,
  connected_email text,
  connected_at timestamptz
);
alter table google_drive_auth enable row level security;
-- Žádná "create policy ... for authenticated" tady záměrně není.

-- ---- Úložiště na PDF archivy zakázek (jen záložní řešení, pokud není nastavený Google Drive) ----
insert into storage.buckets (id, name, public)
values ('archivy', 'archivy', false)
on conflict (id) do nothing;

drop policy if exists "authenticated read archivy" on storage.objects;
create policy "authenticated read archivy" on storage.objects
  for select using (bucket_id = 'archivy' and auth.role() = 'authenticated');

drop policy if exists "authenticated upload archivy" on storage.objects;
create policy "authenticated upload archivy" on storage.objects
  for insert with check (bucket_id = 'archivy' and auth.role() = 'authenticated');

drop policy if exists "authenticated delete archivy" on storage.objects;
create policy "authenticated delete archivy" on storage.objects
  for delete using (bucket_id = 'archivy' and auth.role() = 'authenticated');
