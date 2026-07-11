# Dílna — Zakázky (webová appka)

Evidence zakázek, práce na dílně/montáži, kalkulace, účtenky a export pro ABRA Flexi.
Postavené na Next.js + Supabase (databáze, přihlašování, úložiště na fotky). Žádný limit 20 MB — Supabase free tier dává 500 MB databáze a 1 GB na fotky.

## 1) Založ Supabase projekt (zdarma)

1. Jdi na [supabase.com](https://supabase.com) → **Start your project** → přihlas se (stačí GitHub účet) → **New project**
2. Zvol si název a heslo k databázi (heslo si ulož, ale k appce ho nepotřebuješ)
3. Počkej ~2 minuty, než se projekt vytvoří

## 2) Vytvoř databázové tabulky

1. V levém menu klikni na **SQL Editor** → **New query**
2. Otevři soubor `supabase/schema.sql` z tohoto projektu, zkopíruj celý obsah, vlož ho do editoru a klikni **Run**
3. Pak jdi do **Storage** (levé menu) → **New bucket** → název `uctenky` → zaškrtni **Private** → **Create bucket**
4. Vrať se do **SQL Editor**, spusť ještě jednou dolní část skriptu (od `insert into storage.buckets`) — pokud jsi bucket ve SQL už vytvořil/a, tenhle krok přeskoč

## 3) Zapni přihlašování e-mailem

1. V levém menu **Authentication** → **Providers** → ujisti se, že **Email** je zapnutý (je to výchozí stav)
2. Pokud nechcete čekat na potvrzovací e-maily při zakládání účtů: **Authentication → Providers → Email** → vypni **Confirm email**
3. Až appku rozjedete a všech 5 lidí si založí účet, doporučuju v **Authentication → Providers** vypnout **Allow new users to sign up** (nebo v nastavení "Sign up" restriction), ať se dovnitř nemůže zaregistrovat někdo cizí

## 4) Zjisti přístupové údaje

1. **Project Settings** (ozubené kolo dole vlevo) → **API**
2. Zkopíruj **Project URL** a **anon public** klíč — budeš je potřebovat za chvíli

## 5) Appka lokálně (na vyzkoušení)

Potřebuješ nainstalovaný [Node.js](https://nodejs.org) (verze 18+).

```bash
cd zamecnictvi-app
npm install
cp .env.local.example .env.local
```

Otevři `.env.local` a vlož tam URL a anon klíč ze Supabase:

```
NEXT_PUBLIC_SUPABASE_URL=https://tvuj-projekt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tvuj-anon-key
```

Pak spusť:

```bash
npm run dev
```

Appka poběží na [http://localhost:3000](http://localhost:3000) — otevři, klikni na "Nemáš účet? Vytvoř si ho" a založ si první přihlašovací účet.

## 6) Nasazení na Vercel (aby to fungovalo na telefonech odkudkoli)

1. Appku nahraj na GitHub (nejjednodušší přes [GitHub Desktop](https://desktop.github.com) nebo `git init && git add . && git commit -m "init"` a push do nového repozitáře)
2. Jdi na [vercel.com](https://vercel.com) → přihlas se přes GitHub → **Add New… → Project** → vyber repozitář s appkou
3. Ve **Environment Variables** přidej stejné dvě proměnné jako v `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Klikni **Deploy** — za chvíli dostaneš veřejnou adresu (např. `zamecnictvi-app.vercel.app`)
5. Tuhle adresu si ulož na plochu telefonu (Safari/Chrome → Sdílet → Přidat na plochu)

## 7) Založení účtů pro tým

Nejjednodušší je nechat každého kolegu, ať si na přihlašovací stránce klikne na "Vytvoř si účet" a zaregistruje se sám (e-mail + heslo). Jakmile je všech 5 lidí uvnitř, doporučuju v Supabase vypnout veřejné registrace (krok 3 výše), ať se appka nezaplní cizími účty.

Alternativně můžeš účty založit ručně: Supabase Dashboard → **Authentication → Users → Add user**.

## Katalog materiálů (dodavatelé, CSV import)

V hlavičce appky přibyla ikona vrstev — otevře **katalog materiálů**, kde:

- Vidíš všechny materiály, které se kdy použily v kalkulaci (s dodavatelem, cenou/jednotku, váhou a plochou na jednotku)
- Můžeš přidat/upravit/smazat položku ručně
- Můžeš **importovat CSV** — formát: `dodavatel;nazev;cena;jednotka;vaha;plocha` (oddělovač `;` nebo `,`)

Přiložil jsem `supabase/seed_materialy_mzhutni.csv` se ~20 reálnými položkami (I-profily a plochá ocel) staženými z ceníku **MZ Hutní materiály** (mzhutni.cz) jako ukázku — stačí ho v appce naimportovat tlačítkem "Import CSV" v katalogu materiálů.

**Důležité:** Jejich e-shop má přes 80 stránek jen v jedné kategorii a ceny oceli se běžně mění, takže jsem stáhnul jen reprezentativní vzorek jako výchozí data — appka se automaticky nesynchronizuje s jejich ceníkem. Když budeš chtít doplnit další položky, nejrychlejší cesta je zkopírovat si ceník z e-shopu (nebo z jiného dodavatele) do tabulky/CSV ve stejném formátu a naimportovat.

## Poptávka materiálu

V detailu zakázky (pokud kalkulace obsahuje materiál) přibylo tlačítko **Poptávka materiálu** — vygeneruje čistý dokument pro dodavatele, seskupený podle dodavatele, jen s názvem a množstvím (bez ceny a váhy). Jde ho vytisknout nebo zkopírovat jako text (na vložení do e-mailu/SMS/WhatsApp dodavateli). Vedle tlačítka je i **"Označit jako objednané u dodavatele"** — jednoduché sledování, jestli už byl materiál k zakázce poptán.

## Živé sdílení dat mezi zařízeními

Appka teď používá Supabase Realtime — když jeden kolega něco změní (novou zakázku, změnu stavu, zápis práce...), ostatní to uvidí **okamžitě**, bez nutnosti obnovit stránku. Zapíná se to automaticky přes `schema.sql`; pokud appku máš nasazenou už z dřívějška, stačí spustit v SQL Editoru jen tuhle část skriptu znovu:

```sql
do $$
begin
  if not exists (
    select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table orders;
  end if;
end $$;
```

## Zálohování

Ikona databáze v hlavičce → **Zálohování**. Tlačítkem "Stáhnout zálohu" appka vyexportuje všechny zakázky, nastavení a katalog materiálů do jednoho JSON souboru — ulož si ho mimo appku (Google Drive, e-mail). V nouzi jde zálohu zpátky nahrát a obnovit. Fotky (účtenky, podpisy, dokumentace) v záloze nejsou — ty leží v Supabase Storage a mají vlastní infrastrukturní odolnost, nejde o riziko "omylem smažu tabulku".

Free tier Supabase nemá automatické denní zálohy (ty jsou až v Pro plánu, 25 $/měsíc) — tahle appková záloha je rozumná náhrada zdarma. Doporučuju stáhnout jednou za čas, hlavně před větší úpravou dat.

## Fotodokumentace průběhu práce

V detailu zakázky přibyla sekce **Fotky z průběhu práce** — nezávisle na účtenkách. Fotka se označí jako Před / Po / Ostatní, appka ji zmenší a nahraje do vlastního úložiště. Potřebuješ založit ještě jeden bucket v Supabase Storage: **Storage → New bucket → název `fotky` → Private** (schema.sql založí i příslušná přístupová pravidla).

## Offline náhled

Appka teď funguje jako jednoduchá PWA — po prvním otevření (online) si prohlížeč uloží potřebné soubory, takže appku jde otevřít i bez signálu (typicky v dílně na místě se slabým pokrytím). Zobrazí se poslední známá data s hláškou "Jsi offline" nahoře. Je to **náhled** — nové úpravy se uloží, až se připojení obnoví; appka je potichu neztratí, jen ukáže chybovou hlášku, pokud se pokusíte něco změnit bez signálu.

Omezení: appku je potřeba **poprvé otevřít s připojením** (offline first-visit nefunguje — prohlížeč nemá co cachovat). Pokud appku dlouho nepoužijete a mezitím vyjde nová verze, může být potřeba ji jednou otevřít online, ať se cache aktualizuje.

## Nástěnka (Kanban)

V záložce Zakázky přibyl přepínač **Seznam / Nástěnka** — zakázky jako karty ve sloupcích podle stavu. Na počítači jde karta přetáhnout myší do jiného sloupce. Protože appku používáte hlavně na mobilu, kde přetahování prstem nefunguje spolehlivě, má každá karta i šipky **‹ ›** pro rychlý posun o sloupec vedle — funguje všude bez omezení.

## Předávací protokol a podpis zákazníka

V detailu zakázky přibylo tlačítko **Předávací protokol**. Appka předvyplní standardizovaný text (zhotovitel, objednatel, předmět díla z popisu zakázky, prohlášení o předání/výhradách) a nabídne dvě cesty k podpisu:

- **Na místě** — zákazník podepíše prstem přímo na tabletu/mobilu pracovníka
- **Na dálku** — pracovník zkopíruje odkaz a pošle ho zákazníkovi (e-mailem, SMS...). Zákazník odkaz otevře **bez přihlašování**, uvidí celý obsah protokolu a až pak podepíše

Podepsaný protokol jde i vytisknout / uložit jako PDF (tlačítko Tisk → v dialogu tiskárny zvol "Uložit jako PDF").

### Co je potřeba navíc nastavit

1. **Firemní údaje** — v appce otevři Nastavení a vyplň název firmy, adresu, IČO/DIČ (objeví se na protokolu jako "Zhotovitel")
2. **Nový úložný bucket** — v Supabase Dashboard → Storage → New bucket → název přesně `protokoly` → **Private** → Create (stejně jako dřív `uctenky`)
3. **Service role klíč** (nutný pro veřejnou stránku podpisu bez přihlášení):
   - Supabase Dashboard → Project Settings → API → zkopíruj klíč **service_role** (ne anon!)
   - Přidej ho do `.env.local` jako `SUPABASE_SERVICE_ROLE_KEY=...`
   - Na Vercelu: Project → Settings → Environment Variables → přidej stejnou proměnnou
   - **Tento klíč obchází veškeré zabezpečení databáze — nikdy ho nedávej do kódu, do `NEXT_PUBLIC_*` proměnné, ani ho nikde nezveřejňuj.** V appce se používá výhradně na serveru (v `app/api/protokol/[id]/route.js`), nikdy v prohlížeči.
4. Spusť znovu `supabase/schema.sql` (přidává sloupec `protokol`, `zakaznikIdentifikace` a firemní údaje — je bezpečné spustit i podruhé)

## Co appka umí

- Zakázky s fondem pracovní (plán dílna/montáž) a stavy (Nabídnuto → Rozpracováno → Hotovo → Fakturováno, + Neúspěšná nabídka)
- Zápis odpracovaných hodin (dílna/montáž) přímo ke konkrétní zakázce
- Focení účtenek mobilem — nahrávají se do Supabase Storage (ne do appky samotné)
- Kalkulace zakázky: materiál (s historií a našeptávačem), práce, kooperace (zinkování/lakování), přirážka, DPH, plánovaná marže
- Tisk cenové nabídky pro zákazníka
- Export fakturovaných zakázek do CSV pro ABRA Flexi
- Sdílená data pro celý tým, každý se přihlašuje pod svým účtem

## Údržba a náklady

- Supabase free tier: 500 MB databáze, 1 GB úložiště na fotky — při 5 lidech vydrží dlouho
- Pokud po 7 dnech neaktivity celý tým appku neotevře, Supabase projekt na free tieru "usne" — stačí ho v Dashboardu znovu probudit, data zůstávají
- Když budete chtít víc prostoru nebo zálohy: Supabase Pro (25 $/měsíc) — v Dashboardu → **Settings → Billing**
