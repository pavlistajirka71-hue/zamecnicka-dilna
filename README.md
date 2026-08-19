# Dílna — Zakázky (webová aplikace)

Evidence zakázek, práce na dílně/montáži, kalkulace, účtenky a export pro ABRA Flexi.
Postavené na Next.js + Supabase (databáze, přihlašování, úložiště na fotky). Žádný limit 20 MB — Supabase free tier dává 500 MB databáze a 1 GB na fotky.

## 1) Založ Supabase projekt (zdarma)

1. Jdi na [supabase.com](https://supabase.com) → **Start your project** → přihlas se (stačí GitHub účet) → **New project**
2. Zvol si název a heslo k databázi (heslo si ulož, ale k aplikaci ho nepotřebuješ)
3. Počkej ~2 minuty, než se projekt vytvoří

## 2) Vytvoř databázové tabulky

1. V levém menu klikni na **SQL Editor** → **New query**
2. Otevři soubor `supabase/schema.sql` z tohoto projektu, zkopíruj celý obsah, vlož ho do editoru a klikni **Run**
3. Pak jdi do **Storage** (levé menu) → **New bucket** → název `uctenky` → zaškrtni **Private** → **Create bucket**
4. Vrať se do **SQL Editor**, spusť ještě jednou dolní část skriptu (od `insert into storage.buckets`) — pokud jsi bucket ve SQL už vytvořil/a, tenhle krok přeskoč

## 3) Zapni přihlašování e-mailem

1. V levém menu **Authentication** → **Providers** → ujisti se, že **Email** je zapnutý (je to výchozí stav)
2. Pokud nechcete čekat na potvrzovací e-maily při zakládání účtů: **Authentication → Providers → Email** → vypni **Confirm email**
3. Až aplikaci rozjedete a všech 5 lidí si založí účet, doporučuju v **Authentication → Providers** vypnout **Allow new users to sign up** (nebo v nastavení "Sign up" restriction), ať se dovnitř nemůže zaregistrovat někdo cizí

## 4) Zjisti přístupové údaje

1. **Project Settings** (ozubené kolo dole vlevo) → **API**
2. Zkopíruj **Project URL** a **anon public** klíč — budeš je potřebovat za chvíli

## 5) Aplikace lokálně (na vyzkoušení)

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

Aplikace poběží na [http://localhost:3000](http://localhost:3000) — otevři, klikni na "Nemáš účet? Vytvoř si ho" a založ si první přihlašovací účet.

## 6) Nasazení na Vercel (aby to fungovalo na telefonech odkudkoli)

1. Aplikaci nahraj na GitHub (nejjednodušší přes [GitHub Desktop](https://desktop.github.com) nebo `git init && git add . && git commit -m "init"` a push do nového repozitáře)
2. Jdi na [vercel.com](https://vercel.com) → přihlas se přes GitHub → **Add New… → Project** → vyber repozitář s aplikací
3. Ve **Environment Variables** přidej stejné dvě proměnné jako v `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Klikni **Deploy** — za chvíli dostaneš veřejnou adresu (např. `zamecnictvi-app.vercel.app`)
5. Tuhle adresu si ulož na plochu telefonu (Safari/Chrome → Sdílet → Přidat na plochu)

## 7) Založení účtů pro tým

Nejjednodušší je nechat každého kolegu, ať si na přihlašovací stránce klikne na "Vytvoř si účet" a zaregistruje se sám (e-mail + heslo). Jakmile je všech 5 lidí uvnitř, doporučuju v Supabase vypnout veřejné registrace (krok 3 výše), ať se aplikace nezaplní cizími účty.

Alternativně můžeš účty založit ručně: Supabase Dashboard → **Authentication → Users → Add user**.

## Katalog materiálů (dodavatelé, CSV import)

V hlavičce aplikace přibyla ikona vrstev — otevře **katalog materiálů**, kde:

- Vidíš všechny materiály, které se kdy použily v kalkulaci (s dodavatelem, cenou/jednotku, váhou a plochou na jednotku)
- Můžeš přidat/upravit/smazat položku ručně
- Můžeš **importovat CSV** — formát: `dodavatel;nazev;cena;jednotka;vaha;plocha` (oddělovač `;` nebo `,`)

Přiložil jsem `supabase/seed_materialy_mzhutni.csv` se ~20 reálnými položkami (I-profily a plochá ocel) staženými z ceníku **MZ Hutní materiály** (mzhutni.cz) jako ukázku — stačí ho v aplikaci naimportovat tlačítkem "Import CSV" v katalogu materiálů.

**Důležité:** Jejich e-shop má přes 80 stránek jen v jedné kategorii a ceny oceli se běžně mění, takže jsem stáhnul jen reprezentativní vzorek jako výchozí data — aplikace se automaticky nesynchronizuje s jejich ceníkem. Když budeš chtít doplnit další položky, nejrychlejší cesta je zkopírovat si ceník z e-shopu (nebo z jiného dodavatele) do tabulky/CSV ve stejném formátu a naimportovat.

## Archiv zakázky jako PDF na Google Drive

**Aplikace teď generuje PDF automaticky** — jakmile zakázku přepneš na stav **Hotovo** nebo **Fakturováno** (v detailu zakázky, na nástěnce, kdekoliv), aplikace sama na pozadí sesbírá všechna podstatná data a uloží PDF na Drive, bez nutnosti na cokoliv klikat. Přepnutí na Fakturováno vygeneruje nové, aktuální PDF i podruhé (např. s doplněnými náklady). V detailu zakázky zůstává i ruční tlačítko **"Vygenerovat PDF a uložit na Drive"**, kdyby sis chtěl/a archiv vytvořit znovu mimo tyhle dva okamžiky.

Do PDF aplikace vloží: zákazníka, popis, kalkulaci po položkách, zápisy práce, náklady/zisk/marži (u vyfakturovaných i s porovnáním s plánem), stav protokolu, materiál a fotky účtenek i fotodokumentace.

### Vlastní složka pro každou zakázku

Všechny soubory jedné zakázky — účtenky, fotodokumentace, podpis z protokolu i PDF archiv — aplikace ukládá do **jedné společné podsložky pojmenované podle zakázky** (např. "Z-2026-0001 – Jan Novák"), uvnitř té hlavní sdílené složky, kterou jsi nastavil/a v `GOOGLE_DRIVE_FOLDER_ID`. Aplikace tuhle podsložku při prvním souboru dané zakázky sama založí, další soubory stejné zakázky se pak řadí do ní. Nic se tedy neztrácí porůznu v jedné velké složce — na Drive máš stejnou strukturu jako aplikace: zakázka → všechny její dokumenty.

### České znaky v PDF

Aplikace má rovnou zabalený font s plnou podporou češtiny (IBM Plex Serif, licence SIL Open Font License — volně použitelná), takže háčky a čárky v PDF fungují bez jakéhokoliv dalšího nastavování. Aplikace navíc kvůli tomu záměrně nikdy nepoužívá vestavěné fonty PDF knihovny (ty na Vercelu při generování spolehlivě padaly — běžný technický problém této konkrétní knihovny na serverless nasazení, ne chyba aplikace).

**Přesun starších souborů:** pokud aplikace mezitím (výpadek nebo vypršelé přihlášení) uložila nějaké soubory záložně do Supabase Storage, v panelu Google Drive přibylo tlačítko **"Přesunout starší soubory na Drive"** — jedním kliknutím je všechny přesune a v zakázkách přepíše odkazy na nové místo.

**Odolnost proti výpadku:** aplikace teď při JAKÉMKOLIV selhání nahrávání na Drive (ne jen při úplně chybějícím nastavení) potichu přejde na Supabase Storage — nikdy nezůstaneš bez uložené fotky jen kvůli dočasnému výpadku Google. Když aplikace zjistí, že přihlášení vypršelo, sama si v aplikaci nastaví stav na "nepřipojeno", ať víš, že je potřeba se znovu přihlásit.

## Zapsat náklady/účtenky (nahrazuje starší "Vyfotit účtenku")

Tlačítko v hlavičce aplikace teď funguje jinak — místo focení účtenky k jedné zakázce aplikace rovnou zapisuje **náklad** do Sledování nákladů:

1. Zaškrtneš jednu nebo víc zakázek — nabízí se jen zakázky ve stavu **Rozpracováno**
2. Vyplníš **popis** a **cenu** (obojí povinné)
3. Volitelně přiložíš fotku účtenky
4. Aplikace náklad rovnou zapíše do Vyhodnocení dané zakázky — a když vybereš víc zakázek, částku **rozpočítá poměrově podle ceny každé zakázky** (aplikace ti to při zadávání i ukáže, ať vidíš, kolik připadne kam)

Fotka účtenky (pokud je přiložená) se zobrazí přímo u daného nákladu ve Vyhodnocení zakázky i v PDF archivu.

**Starší, dřív samostatně vyfocené účtenky** se dají jedním tlačítkem přesunout do stejného systému — **Nastavení → Přesunout staré účtenky do nákladů**. Je to bezpečné spustit i vícekrát, aplikace přesouvá jen to, co ještě nebylo přesunuté.

## Kalkulace jen pro roli Správce

Záložka "Kalkulace" se v detailu zakázky **vůbec nezobrazí** uživatelům s rolí "Uživatel" — ani k nahlédnutí, ne jen k úpravě. Vidí ji jen role "Správce (SA)".

## Pracovníci (brigádníci) a nabídka jmen při zápisu práce

V **Nastavení → Pracovníci** jde zadat jména lidí, kteří aplikaci sami nepoužívají (brigádníci bez vlastního přihlášení) — aplikace je pak nabídne při zápisu práce (pole "Kdo pracoval") jako rozklikávací nabídku, podobně jako běžný výběr v telefonu. Aplikace tam navíc nabídne i zaškrtnutí, **které konkrétní uživatele aplikace** má do stejné nabídky zahrnout (např. účetní/administrativu má smysl vynechat, pokud fyzicky nepracují na zakázkách). Pole se dá pořád vyplnit i jinak, než je v nabídce.

Aplikace defaultně navíc předvyplní jméno podle toho, kým jsi do aplikace přihlášený (beze změny oproti dřívějšku) — nabídka pracovníků je jen doplněk, který jde kdykoliv **vypnout** zaškrtávátkem "Nabízet jména při zápisu práce", pokud o ni nestojíš.

## Duplikace zakázky

V detailu zakázky je tlačítko **"Duplikovat"** — vytvoří novou zakázku se zákazníkem, popisem a celou kalkulací (materiál, hodiny práce), ale bez historie (stav, termín, poznámka, práce, náklady, fotky, protokol se nepřenáší — je to čistý start). Hodí se na opakovaně podobné zakázky.

## Import faktur přijatých z ABRA Flexi

V aplikaci ABRA Flexi si exportuj seznam faktur přijatých (**položkově**, ne jen hlavičky) do CSV nebo XLSX — aplikace umí přečíst oba formáty. V aplikaci **Nastavení → Importovat faktury z Flexi** ten soubor nahraj.

**Jak aplikace pozná, ke které zakázce faktura patří:** ve Flexi má faktura (nebo její položka) svoje vlastní pole **"Zakázka"** — aplikace ho hledá jako první. Aby aplikace věděla, o kterou zakázku aplikace jde, potřebuje ve Flexi nastavit **kód zakázky ve tvaru čísla aplikace**, např. `Z-2026-0008` (nebo přímo `Z-2026-0008 - Gloser`, aplikace si to číslo v textu sama najde). Bez týhle jednorázové úpravy ve Flexi aplikace nic nenajde — jen aplikaci potvrdí, že žádnou zakázku nespárovala, nic nespadne.

Protože aplikace zpracovává **každý řádek souboru samostatně** (ne celou fakturu najednou), faktura s položkami na víc zakázek se automaticky správně rozhodí — žádné ruční dělení není potřeba.

**Cena:** aplikace pozná cenu "za jednotku" (typicky sloupec "Cena za MJ") a sama ji vynásobí množstvím, ať do nákladů nezapíše jen cenu za 1 kus. Aplikace se snaží najít částku bez DPH — pokud si tím není jistá, v náhledu před importem to výrazně (oranžově) upozorní, ať to zkontroluješ ručně.

Aplikace před importem vždycky ukáže náhled — co se spárovalo a kam, a co se nepovedlo spárovat. U nespárovaných jde zakázku vybrat i ručně přímo v tomhle okně (aplikace nabídne rozklikávací seznam všech zakázek) — co nepřiřadíš, aplikace při importu zahodí.

**Aplikace hlídá i duplicity** — pokud zakázka už má náklad se stejným popisem a stejnou částkou (typicky proto, že se stejný soubor omylem naimportoval podruhé), aplikace to výrazně (oranžově) označí a takovou položku předem nezaškrtne — ty se pak vědomě rozhodneš, jestli ji přesto chceš importovat.

## Podzakázky

Velký projekt jde rozdělit na víc menších, samostatně sledovaných zakázek. V detailu zakázky přibyla záložka **"Podzakázky"** (jen u zakázek, které samy nejsou podzakázkou):

- Tlačítko **"Přidat podzakázku"** — aplikace předvyplní zákazníka po hlavní zakázce a přidělí poddíslo (`Z-2026-0008-1`, `-2`, ...)
- Podzakázka je jinak úplně normální zakázka — vlastní stav, kalkulace, práce, náklady, protokol, objeví se i v běžném seznamu zakázek (označená "↳ podzakázka"), kalendáři i výkazu práce
- Na hlavní zakázce aplikace ukáže **souhrn** přes všechny podzakázky (celková cena, odpracované hodiny, kolik je hotovo/rozpracováno)
- V detailu podzakázky je nahoře odkaz zpátky na hlavní zakázku

## Role — Správce (SA) a Uživatel

Aplikace rozlišuje dvě role:
- **Uživatel** — běžný přístup, nesmí mazat zakázky ani upravovat kalkulace (aplikace to vynucuje přímo v databázi — přes pravidla přístupu a přes kontrolní pravidlo při ukládání, ne jen schovaným tlačítkem)
- **Správce (SA)** — plný přístup, jen správce může přidávat uživatele a měnit role

Role se nastavuje a mění v aplikaci: **Nastavení → Spravovat uživatele**.

### Nutný jednorázový krok po nasazení téhle verze

Aplikace nemá jak sama poznat, kdo má být první správce — nikdo zatím nemá přiřazenou žádnou roli (bezpečný výchozí stav je "Uživatel", tedy nejnižší oprávnění). Spusť **jednou** v Supabase → SQL Editor (nahraď e-mail svým):

```sql
insert into uzivatele_role (user_id, role)
select id, 'sa' from auth.users where email = 'tvuj@email.cz'
on conflict (user_id) do update set role = 'sa';
```

Od té chvíle se dají další role nastavovat pohodlně přímo v aplikaci, bez SQL.

## Denní automatická kontrola aplikace

Aplikace má veřejnou kontrolní adresu **`/api/health`** (např. `https://tvoje-aplikace.vercel.app/api/health`), která ověří, že aplikace doopravdy funguje (databáze, případně Google Drive) — vrátí `{"ok": true, ...}`, nebo chybu, pokud něco nefunguje.

Aplikace sama o sobě e-maily neposílá (přidávat do aplikace vlastní odesílání pošty by znamenalo další externí službu a účet navíc). Doporučený a nejjednodušší způsob, jak z tohohle dostat denní kontrolu s upozorněním na e-mail:

1. Založ si zdarma účet na **uptimerobot.com** (nebo podobné službě, např. Better Stack)
2. **Add New Monitor** → typ **HTTP(s)** → vlož adresu `https://tvoje-aplikace.vercel.app/api/health`
3. Nastav interval kontroly (zdarma jde třeba jednou za pár minut, klidně to nastav jen jednou denně)
4. V nastavení upozornění (Alert Contacts) přidej svůj e-mail
5. Hotovo — pokud aplikace přestane odpovídat nebo `/api/health` vrátí chybu, přijde ti e-mail

### Hloubková kontrola — zachytí i "tiché" změny u třetích stran

`/api/health` výše ověří jen "aplikace běží a je vidět do databáze". Aplikace má ještě druhou, důkladnější adresu — **`/api/health/deep`** — která si navíc **skutečně vyzkouší**:
- vyhledání v ARES (a ověří, že odpověď má očekávaný tvar, ne jen že něco vrátila)
- vygenerování PDF s českou diakritikou

Tohle odchytí i situace, kdy třetí strana aplikaci formálně "neshodí", ale tiše si změní chování (přesně to, co se nám stalo s PDF knihovnou na Vercelu). Je to pomalejší kontrola, nemá smysl ji spouštět každých pár minut — doporučuju přidat jako **druhý, samostatný monitor**:

1. UptimeRobot → **Add New Monitor** → HTTP(s) → `https://tvoje-aplikace.vercel.app/api/health/deep`
2. Interval nastav na **jednou denně** (stačí, je to těžší kontrola)
3. Stejný e-mail na upozornění jako u prvního monitoru

## Fotky a soubory na Google Drive místo Supabase Storage

Aplikace umí ukládat fotky (účtenky, fotodokumentace práce, podpisy z protokolů) a PDF archivy na **Google Drive**, do jedné sdílené složky. V databázi zůstává jen odkaz + náhled, ne samotný soubor.

**Důležité:** aplikace se k Drive přihlašuje jako **konkrétní lidský Google účet** (přes standardní přihlašovací okno Google, jednou), ne jako "servisní účet". Servisní účty na běžném (ne firemním/Workspace) Google účtu nemají vlastní úložný prostor, takže by nahrávání souborů vždy selhalo — tenhle způsob funguje spolehlivě i na obyčejném @gmail.com účtu a využívá jeho 15 GB zdarma.

### Krok 1 — Google Cloud Console

1. **console.cloud.google.com** → vytvoř nový projekt (nebo použij stávající)
2. Zapni **Google Drive API**: menu → APIs & Services → Library → najdi "Google Drive API" → **Enable**
3. Nastav souhlasovou obrazovku: **APIs & Services → OAuth consent screen** → **External** → vyplň jen povinné (název aplikace, tvůj e-mail) → Save
   - Na kartě **Test users** přidej e-maily všech, kdo se budou k aplikaci přihlašovat ke Google (dokud aplikaci Google oficiálně neověří, funguje přihlášení jen pro tyhle přidané testovací uživatele)
   - **Poznámka:** dokud je aplikace v testovacím režimu, vydrží přihlášení ke Drive obvykle **cca 7 dní**, pak aplikace požádá o nové (jde to jedním kliknutím, viz níže) — to je normální chování neověřené aplikace u Googlu, ne chyba aplikace
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - Authorized redirect URIs → **Add URI** → vlož `https://TVOJE-ADRESA.vercel.app/api/google-auth/callback` (přesně tvoje doména aplikace, s `https://` na začátku)
   - **Create**
5. Zobrazí se **Client ID** a **Client secret** — obojí budeš potřebovat

### Krok 2 — Založ sdílenou složku

1. Na svém Google Drive založ novou složku, např. "Dílna — fotky"
2. Otevři ji a z URL adresy zkopíruj ID — část za posledním `/`, např. `https://drive.google.com/drive/folders/`**`1a2B3c4D5e...`**

### Krok 3 — Proměnné prostředí

Do `.env.local` (lokálně) a Vercel Environment Variables (nasazení) přidej tři proměnné:
- `GOOGLE_OAUTH_CLIENT_ID` — z kroku 1.5
- `GOOGLE_OAUTH_CLIENT_SECRET` — z kroku 1.5
- `GOOGLE_DRIVE_FOLDER_ID` — z kroku 2

Po přidání udělej **Redeploy**.

### Krok 4 — Připojení v aplikaci

1. V aplikaci klikni na ikonu mraku (☁️) v hlavičce
2. **Připojit Google Drive** → přesměruje tě na přihlašovací okno Google → přihlas se (musí to být e-mail přidaný jako Test user v kroku 1.3) → potvrď přístup
3. Aplikace tě vrátí zpátky a ukáže "Připojeno jako [tvůj e-mail]"

Od teď aplikace nahrává fotky i PDF na tenhle účet. Když přihlášení jednou za čas vyprší (viz poznámka výše), aplikace to pozná a v aplikaci stačí kliknout na **Připojit Google Drive** znovu — netřeba nic přenastavovat.

**Sdílení fotek:** aplikace po nahrání každou fotku/PDF nastaví na "kdokoliv s odkazem může zobrazit" (jinak by aplikace neuměla fotky zobrazovat bez opakovaného přihlašování každého člena týmu). Nejsou nikde veřejně vypsané/indexované — najde je jen ten, kdo zná přesný odkaz z aplikace.

**Starší fotky:** aplikace pozná, jestli fotka byla nahraná do Supabase Storage (starší formát) nebo na Drive, a zobrazí ji správně v obou případech.

**Pokud Google Drive nepřipojíš:** aplikace pořád funguje normálně — automaticky (a potichu) nahrává fotky do Supabase Storage. Připojit jde kdykoliv později, není to podmínka k nasazení.

## Sledování nákladů, zisk a marže

U každé zakázky (dostupné od začátku, i u rozpracované) přibyla sekce **Sledování nákladů** — sleduje skutečné náklady vs. plán z kalkulace:

- Při prvním otevření aplikace **jednorázově zkopíruje** materiál a aktivní kooperace (zinkování/lakování) z kalkulace jako výchozí řádky nákladů — dál se upravují nezávisle na kalkulaci
- Libovolně přidáš další náklady — jen popis a částka bez DPH (doprava, kooperace navíc, cokoliv)
- **Práce se do nákladů počítá automaticky** — podle skutečně odpracovaných hodin (ze zápisů práce) a aktuální sazby v Nastavení, živě se to mění, jak přibývají zápisy
- Aplikace spočítá náklady celkem, zisk a marži (příjem = cena bez DPH z kalkulace)
- **Po vyfakturování zakázky** (stav Fakturováno) se navíc v hlavičce zakázky zobrazí tmavý souhrnný panel: skutečné náklady, zisk, marže — a porovnání s tím, co říkala plánovaná kalkulace, ať vidíš, jestli se zakázka vyplatila podle plánu

## Kalkulace s víc položkami (např. Brána + Branka)

Kalkulace zakázky teď může mít **víc položek najednou** — každá se svým materiálem, prací, kooperacemi, přirážkou i DPH. Aplikace je sečte do celkové ceny zakázky. Hodí se to přesně pro případy "udělej mi bránu a branku" v jedné zakázce.

- V kalkulaci klikneš **"Přidat položku"**, pojmenuješ ji (Brána, Branka, Zábradlí…) a vyplníš stejně jako dřív
- Tisková nabídka pro zákazníka i poptávka materiálu automaticky ukážou rozpad po položkách — a pokud dvě položky používají stejný materiál od stejného dodavatele, poptávka je sečte do jednoho řádku (s rozpisem, kolik šlo na kterou položku)
- Staré zakázky s kalkulací v původním formátu (jedna položka) aplikace automaticky převede — nic se nerozbije

**Plánovaný čas se teď propojuje automaticky:** když uložíš kalkulaci, aplikace sečte hodiny dílna/montáž ze všech položek a přepíše jimi plánovaný čas v hlavičce zakázky (pole, které se dřív vyplňovalo ručně při založení zakázky).

## Práce se nezapisuje u nabídnutých zakázek

Dokud je zakázka ve stavu **Nabídnuto** (zákazník ji ještě nepotvrdil), aplikace u ní nedovolí zapsat práci — v nabídce zakázek při "Zapsat práci" se prostě nenabídne. Účtenky u nabídnutých zakázek jít zapsat pořád můžou (např. nákup materiálu na zkoušku). Zakázky ve stavu Nabídnuto se také nezobrazují v sekci "Co se má dělat" na Přehledu — dokud není zakázka přijatá, není co plánovat.

## Poptávka materiálu

V detailu zakázky (pokud kalkulace obsahuje materiál) přibylo tlačítko **Poptávka materiálu** — vygeneruje čistý dokument pro dodavatele, seskupený podle dodavatele, jen s názvem a množstvím (bez ceny a váhy). Jde ho vytisknout nebo zkopírovat jako text (na vložení do e-mailu/SMS/WhatsApp dodavateli). Vedle tlačítka je i **"Označit jako objednané u dodavatele"** — jednoduché sledování, jestli už byl materiál k zakázce poptán.

## Živé sdílení dat mezi zařízeními

Aplikace teď používá Supabase Realtime — když jeden kolega něco změní (novou zakázku, změnu stavu, zápis práce...), ostatní to uvidí **okamžitě**, bez nutnosti obnovit stránku. Zapíná se to automaticky přes `schema.sql`; pokud aplikaci máš nasazenou už z dřívějška, stačí spustit v SQL Editoru jen tuhle část skriptu znovu:

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

Ikona databáze v hlavičce → **Zálohování**. Tlačítkem "Stáhnout zálohu" aplikace vyexportuje všechny zakázky, nastavení a katalog materiálů do jednoho JSON souboru — ulož si ho mimo aplikaci (Google Drive, e-mail). V nouzi jde zálohu zpátky nahrát a obnovit. Fotky (účtenky, podpisy, dokumentace) v záloze nejsou — ty leží v Supabase Storage a mají vlastní infrastrukturní odolnost, nejde o riziko "omylem smažu tabulku".

Free tier Supabase nemá automatické denní zálohy (ty jsou až v Pro plánu, 25 $/měsíc) — tahle záloha z aplikace je rozumná náhrada zdarma. Doporučuju stáhnout jednou za čas, hlavně před větší úpravou dat.

## Fotodokumentace průběhu práce

V detailu zakázky přibyla sekce **Fotky z průběhu práce** — nezávisle na účtenkách. Fotka se označí jako Před / Po / Ostatní, aplikace ji zmenší a nahraje do vlastního úložiště. Potřebuješ založit ještě jeden bucket v Supabase Storage: **Storage → New bucket → název `fotky` → Private** (schema.sql založí i příslušná přístupová pravidla).

## Offline náhled

Aplikace teď funguje jako jednoduchá PWA — po prvním otevření (online) si prohlížeč uloží potřebné soubory, takže aplikaci jde otevřít i bez signálu (typicky v dílně na místě se slabým pokrytím). Zobrazí se poslední známá data s hláškou "Jsi offline" nahoře. Je to **náhled** — nové úpravy se uloží, až se připojení obnoví; aplikace je potichu neztratí, jen ukáže chybovou hlášku, pokud se pokusíte něco změnit bez signálu.

Omezení: aplikaci je potřeba **poprvé otevřít s připojením** (offline first-visit nefunguje — prohlížeč nemá co cachovat). Pokud aplikaci dlouho nepoužijete a mezitím vyjde nová verze, může být potřeba ji jednou otevřít online, ať se cache aktualizuje.

## Nástěnka (Kanban)

V záložce Zakázky přibyl přepínač **Seznam / Nástěnka** — zakázky jako karty ve sloupcích podle stavu. Na počítači jde karta přetáhnout myší do jiného sloupce. Protože aplikaci používáte hlavně na mobilu, kde přetahování prstem nefunguje spolehlivě, má každá karta i šipky **‹ ›** pro rychlý posun o sloupec vedle — funguje všude bez omezení.

## Předávací protokol a podpis zákazníka

V detailu zakázky přibylo tlačítko **Předávací protokol**. Aplikace předvyplní standardizovaný text (zhotovitel, objednatel, předmět díla z popisu zakázky, prohlášení o předání/výhradách) a nabídne dvě cesty k podpisu:

- **Na místě** — zákazník podepíše prstem přímo na tabletu/mobilu pracovníka
- **Na dálku** — pracovník zkopíruje odkaz a pošle ho zákazníkovi (e-mailem, SMS...). Zákazník odkaz otevře **bez přihlašování**, uvidí celý obsah protokolu a až pak podepíše

Podepsaný protokol jde i vytisknout / uložit jako PDF (tlačítko Tisk → v dialogu tiskárny zvol "Uložit jako PDF").

### Co je potřeba navíc nastavit

1. **Firemní údaje** — v aplikaci otevři Nastavení a vyplň název firmy, adresu, IČO/DIČ (objeví se na protokolu jako "Zhotovitel")
2. **Nový úložný bucket** — v Supabase Dashboard → Storage → New bucket → název přesně `protokoly` → **Private** → Create (stejně jako dřív `uctenky`)
3. **Service role klíč** (nutný pro veřejnou stránku podpisu bez přihlášení):
   - Supabase Dashboard → Project Settings → API → zkopíruj klíč **service_role** (ne anon!)
   - Přidej ho do `.env.local` jako `SUPABASE_SERVICE_ROLE_KEY=...`
   - Na Vercelu: Project → Settings → Environment Variables → přidej stejnou proměnnou
   - **Tento klíč obchází veškeré zabezpečení databáze — nikdy ho nedávej do kódu, do `NEXT_PUBLIC_*` proměnné, ani ho nikde nezveřejňuj.** V aplikaci se používá výhradně na serveru (v `app/api/protokol/[id]/route.js`), nikdy v prohlížeči.
4. Spusť znovu `supabase/schema.sql` (přidává sloupec `protokol`, `zakaznikIdentifikace` a firemní údaje — je bezpečné spustit i podruhé)

## Kalendář

Nová záložka vedle Přehledu a Zakázek — zakázky se zobrazí v měsíční mřížce podle termínu dokončení, barevně podle stavu. Zamítnuté nabídky (Neúspěšná nabídka) se v kalendáři schválně nezobrazují — jinak to funguje stejně jako jinde v aplikaci (zakázky bez vyplněného termínu logicky nemají kam se zařadit). Kliknutím na zakázku se otevře její detail.

## IČO, ARES a katalog organizací

Při zakládání/úpravě zakázky přibylo pole **IČO** a tlačítko **"Doplnit z ARES"** — aplikace zavolá veřejné rozhraní ARES (Ministerstvo financí ČR, zdarma, bez registrace) a rovnou přepíše jméno zákazníka i identifikaci (adresa, DIČ). Zároveň aplikace firmu uloží do **katalogu organizací** — příště při psaní jména nebo IČO aplikace nabídne našeptávač bez nutnosti volat ARES znovu.

Soukromé osoby (bez IČO) fungují úplně stejně jako doteď — pole IČO prostě zůstane prázdné.

## Uživatelé (Nastavení → Spravovat uživatele)

Aplikace teď umí zakládat přístupy pro kolegy přímo v aplikaci, bez nutnosti ručně zasahovat do Supabase. V Nastavení → **Spravovat uživatele** uvidíš seznam všech, kdo mají přístup, a formulář na přidání nového (e-mail + vygenerované heslo, které předáš kolegovi osobně).

**Veřejná registrace byla zrušena** — přihlašovací stránka aplikace teď má jen "Přihlásit se", tlačítko "Vytvoř si účet" zmizelo. **Důležité:** tohle samo o sobě úplně nezabrání registraci zvenčí (přes přímé volání Supabase mimo aplikaci) — ať je to jisté, jdi do **Supabase Dashboard → Authentication → Providers → Email** a vypni **"Allow new users to sign up"**. Tenhle krok aplikace udělat sama nemůže, je to nastavení projektu.

## Co aplikace umí

- Zakázky s fondem pracovní (plán dílna/montáž) a stavy (Nabídnuto → Rozpracováno → Hotovo → Fakturováno, + Neúspěšná nabídka)
- Zápis odpracovaných hodin (dílna/montáž) přímo ke konkrétní zakázce
- Focení účtenek mobilem — nahrávají se do Supabase Storage (ne do aplikace samotné)
- Kalkulace zakázky: materiál (s historií a našeptávačem), práce, kooperace (zinkování/lakování), přirážka, DPH, plánovaná marže
- Tisk cenové nabídky pro zákazníka
- Export fakturovaných zakázek do CSV pro ABRA Flexi
- Sdílená data pro celý tým, každý se přihlašuje pod svým účtem

## Údržba a náklady

- Supabase free tier: 500 MB databáze, 1 GB úložiště na fotky — při 5 lidech vydrží dlouho
- Pokud po 7 dnech neaktivity celý tým aplikaci neotevře, Supabase projekt na free tieru "usne" — stačí ho v Dashboardu znovu probudit, data zůstávají
- Když budete chtít víc prostoru nebo zálohy: Supabase Pro (25 $/měsíc) — v Dashboardu → **Settings → Billing**
