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

## Automatické čtení částky z účtenky

Když v "Vyfotit účtenku" vyfotíš nebo vybereš fotku, appka na pozadí pošle fotku na Claude API a **zkusí sama vyčíst celkovou částku** — políčko "Částka" se samo doplní, s poznámkou "Vyčteno automaticky z fotky — zkontroluj, prosím". Vždy jde ručně opravit nebo smazat, appka nic nevynucuje.

Potřebuješ navíc:
1. Založit si účet na **console.anthropic.com** (nebo použít stávající)
2. **API Keys → Create Key** → zkopírovat klíč
3. Přidat ho jako `ANTHROPIC_API_KEY` do `.env.local` (lokálně) a do Vercel Environment Variables (nasazení) — **stejné bezpečnostní pravidlo jako u service role klíče: jen na serveru, nikdy v `NEXT_PUBLIC_*` proměnné**

**Náklady:** appka používá nejlevnější aktuální model (Claude Haiku), jedno vyfocení účtenky stojí zlomek koruny (řádově desetiny haléře až pár haléřů na účtenku) — i při stovkách účtenek měsíčně jde o pár korun. Je to samostatné, pay-as-you-go placení přes Anthropic (ne přes Supabase), platí se jen za to, co appka skutečně použije. Pokud `ANTHROPIC_API_KEY` nenastavíš, appka funguje úplně normálně dál — jen se částka nedoplní sama a zadáš ji ručně jako doteď.

## Archiv zakázky jako PDF na Google Drive

**Appka teď generuje PDF automaticky** — jakmile zakázku přepneš na stav **Hotovo** nebo **Fakturováno** (v detailu zakázky, na nástěnce, kdekoliv), appka sama na pozadí sesbírá všechna podstatná data a uloží PDF na Drive, bez nutnosti na cokoliv klikat. Přepnutí na Fakturováno vygeneruje nové, aktuální PDF i podruhé (např. s doplněnými náklady). V detailu zakázky zůstává i ruční tlačítko **"Vygenerovat PDF a uložit na Drive"**, kdyby sis chtěl/a archiv vytvořit znovu mimo tyhle dva okamžiky.

Do PDF appka vloží: zákazníka, popis, kalkulaci po položkách, zápisy práce, náklady/zisk/marži (u vyfakturovaných i s porovnáním s plánem), stav protokolu, materiál a fotky účtenek i fotodokumentace.

### Vlastní složka pro každou zakázku

Všechny soubory jedné zakázky — účtenky, fotodokumentace, podpis z protokolu i PDF archiv — appka ukládá do **jedné společné podsložky pojmenované podle zakázky** (např. "Z-2026-0001 – Jan Novák"), uvnitř té hlavní sdílené složky, kterou jsi nastavil/a v `GOOGLE_DRIVE_FOLDER_ID`. Appka tuhle podsložku při prvním souboru dané zakázky sama založí, další soubory stejné zakázky se pak řadí do ní. Nic se tedy neztrácí porůznu v jedné velké složce — na Drive máš stejnou strukturu jako appka: zakázka → všechny její dokumenty.

### Důležité: české znaky v PDF

Knihovna, která PDF vytváří, **standardně neumí české háčky a čárky** — je to běžné technické omezení (vestavěné fonty v PDF pokrývají jen základní latinku). Appka na to reaguje takhle:

- **Bez dalšího nastavení appka funguje hned** — text v PDF bude čitelný, ale bez diakritiky (např. "Zakazka" místo "Zakázka")
- **Chceš-li plnou diakritiku**, stačí jeden krok navíc:
  1. Stáhni si font s podporou češtiny, např. [Noto Sans](https://fonts.google.com/noto/specimen/Noto+Sans) (zdarma, Google Fonts) — potřebuješ soubory `NotoSans-Regular.ttf` a `NotoSans-Bold.ttf`
  2. Vlož je do appky do složky `fonts/` (vytvoř ji v kořeni projektu, vedle `app/` a `components/`)
  3. Nahraj to na GitHub jako součást appky — Vercel to při dalším nasazení automaticky použije
  4. Appka font sama rozpozná a od té chvíle budou všechna nově vygenerovaná PDF s plnou diakritikou — nic dalšího se měnit nemusí

## Fotky a soubory na Google Drive místo Supabase Storage

Appka teď ukládá fotky (účtenky, fotodokumentace práce, podpisy z protokolů) na **Google Drive**, do jedné sdílené složky. V databázi zůstává jen odkaz + náhled, ne samotný soubor — šetří to místo v Supabase.

### Jak to založit

1. **Google Cloud Console** ([console.cloud.google.com](https://console.cloud.google.com)) → vytvoř nový projekt (nebo použij stávající)
2. V projektu zapni **Google Drive API**: menu → APIs & Services → Library → najdi "Google Drive API" → **Enable**
3. Založ **servisní účet** (Service Account): APIs & Services → Credentials → **Create Credentials → Service Account** → pojmenuj ho (např. "dilna-uploader") → Create and Continue → Done
4. U vytvořeného servisního účtu: záložka **Keys → Add Key → Create new key → JSON** → stáhne se soubor s klíčem
5. V tom JSON souboru najdeš:
   - `client_email` → to je `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `private_key` → to je `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (zkopíruj **celou hodnotu i s `\n` uvnitř**, přesně jak je v souboru)
6. Na svém **běžném Google Drive** (ne servisní účet) založ novou složku, např. "Dílna — fotky"
7. Tu složku **sdílej** s e-mailem servisního účtu (ten z bodu 5, končí na `...iam.gserviceaccount.com`) s právem **Editor**
8. Otevři tu složku v prohlížeči a z URL adresy zkopíruj ID složky — je to část za posledním `/`, např. `https://drive.google.com/drive/folders/`**`1a2B3c4D5e...`** → to je `GOOGLE_DRIVE_FOLDER_ID`
9. Všechny tři hodnoty (`GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`, `GOOGLE_DRIVE_FOLDER_ID`) přidej do `.env.local` (lokálně) a do Vercel Environment Variables (nasazení)

**Bezpečnost:** servisní účet má přístup **jen** k té jedné sdílené složce (a čemukoliv dalšímu, co mu výslovně nasdílíš) — ne k celému tvému Google Drive. Klíč (`GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`) je jen na serveru, nikdy v `NEXT_PUBLIC_*` proměnné ani v prohlížeči.

**Sdílení fotek:** appka po nahrání každou fotku nastaví na "kdokoliv s odkazem může zobrazit" (jinak by appka neuměla fotky zobrazovat bez opakovaného přihlašování každého člena týmu ke Google). Fotky nejsou nikde veřejně vypsané/indexované — najde je jen ten, kdo zná přesný odkaz z appky.

**Starší fotky:** appka pozná, jestli fotka byla nahraná před zapnutím Drive (starý formát, uložená v Supabase Storage) nebo po něm (nová, na Drive), a zobrazí ji správně v obou případech — nic se nerozbije, staré fotky nemusíš nikam přesouvat.

**Pokud tenhle krok vynecháš:** appka pořád funguje normálně — bez nastavených proměnných automaticky (a potichu) nahrává fotky do Supabase Storage jako předtím. Google Drive tak můžeš zapnout kdykoliv později, není to nutná podmínka k nasazení.

## Sledování nákladů, zisk a marže

U každé zakázky (dostupné od začátku, i u rozpracované) přibyla sekce **Sledování nákladů** — sleduje skutečné náklady vs. plán z kalkulace:

- Při prvním otevření appka **jednorázově zkopíruje** materiál a aktivní kooperace (zinkování/lakování) z kalkulace jako výchozí řádky nákladů — dál se upravují nezávisle na kalkulaci
- Libovolně přidáš další náklady — jen popis a částka bez DPH (doprava, kooperace navíc, cokoliv)
- **Práce se do nákladů počítá automaticky** — podle skutečně odpracovaných hodin (ze zápisů práce) a aktuální sazby v Nastavení, živě se to mění, jak přibývají zápisy
- Appka spočítá náklady celkem, zisk a marži (příjem = cena bez DPH z kalkulace)
- **Po vyfakturování zakázky** (stav Fakturováno) se navíc v hlavičce zakázky zobrazí tmavý souhrnný panel: skutečné náklady, zisk, marže — a porovnání s tím, co říkala plánovaná kalkulace, ať vidíš, jestli se zakázka vyplatila podle plánu

## Kalkulace s víc položkami (např. Brána + Branka)

Kalkulace zakázky teď může mít **víc položek najednou** — každá se svým materiálem, prací, kooperacemi, přirážkou i DPH. Appka je sečte do celkové ceny zakázky. Hodí se to přesně pro případy "udělej mi bránu a branku" v jedné zakázce.

- V kalkulaci klikneš **"Přidat položku"**, pojmenuješ ji (Brána, Branka, Zábradlí…) a vyplníš stejně jako dřív
- Tisková nabídka pro zákazníka i poptávka materiálu automaticky ukážou rozpad po položkách — a pokud dvě položky používají stejný materiál od stejného dodavatele, poptávka je sečte do jednoho řádku (s rozpisem, kolik šlo na kterou položku)
- Staré zakázky s kalkulací v původním formátu (jedna položka) appka automaticky převede — nic se nerozbije

**Plánovaný čas se teď propojuje automaticky:** když uložíš kalkulaci, appka sečte hodiny dílna/montáž ze všech položek a přepíše jimi plánovaný čas v hlavičce zakázky (pole, které se dřív vyplňovalo ručně při založení zakázky).

## Práce se nezapisuje u nabídnutých zakázek

Dokud je zakázka ve stavu **Nabídnuto** (zákazník ji ještě nepotvrdil), appka u ní nedovolí zapsat práci — v nabídce zakázek při "Zapsat práci" se prostě nenabídne. Účtenky u nabídnutých zakázek jít zapsat pořád můžou (např. nákup materiálu na zkoušku). Zakázky ve stavu Nabídnuto se také nezobrazují v sekci "Co se má dělat" na Přehledu — dokud není zakázka přijatá, není co plánovat.

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
