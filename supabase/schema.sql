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
  "firmaDic" text
);
insert into nastaveni (id) values (1) on conflict (id) do nothing;
-- Pokud tabulka nastaveni už existuje ze starší verze appky bez těchto sloupců:
alter table nastaveni add column if not exists "firmaNazev" text;
alter table nastaveni add column if not exists "firmaAdresa" text;
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

drop policy if exists "authenticated full access orders" on orders;
create policy "authenticated full access orders" on orders
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

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
