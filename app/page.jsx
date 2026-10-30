"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  CalendarDays,
  Plus,
  Search,
  ChevronRight,
  Clock,
  Camera,
  Timer,
  ListChecks,
  Settings,
  LogOut,
  Layers,
  BarChart3,
  DatabaseBackup,
  Cloud,
  FileSpreadsheet,
  Inbox,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import {
  C,
  FONTS,
  STATUSES,
  UZAVRENE_STAVY,
  DEFAULT_NASTAVENI,
  DPH_SAZBA,
  computeKalkulaceCelkem,
  normalizovatKalkulaci,
  sazbyZNastaveni,
  upsertMaterialHistory,
  upsertOrganizaceHistory,
  planHodin,
  sumHodin,
  isOverdue,
  fmtDate,
  fmtMoney,
  todayISO,
  uid, fmtCislo, stavObjednaniMaterialu } from "@/lib/theme";
import { Button, TextInput, Select, Modal, StampBadge } from "@/components/ui";
import OrderForm from "@/components/OrderForm";
import OrderPicker from "@/components/OrderPicker";
import WorkLogFlow from "@/components/WorkLogFlow";
import ZapsatNakladFlow from "@/components/ZapsatNakladFlow";
import ImportFakturFlow from "@/components/ImportFakturFlow";
import KalkulaceForm from "@/components/KalkulaceForm";
import Kalendar from "@/components/Kalendar";
import VykazPrace from "@/components/VykazPrace";
import UkolyPanel from "@/components/UkolyPanel";
import UzivateleForm from "@/components/UzivateleForm";
import NastaveniForm from "@/components/NastaveniForm";
import QuoteView from "@/components/QuoteView";
import OrderDetail from "@/components/OrderDetail";
import MaterialyKatalog from "@/components/MaterialyKatalog";
import MaterialOrderView from "@/components/MaterialOrderView";
import PraceReport from "@/components/PraceReport";
import ProtokolView from "@/components/ProtokolView";
import ProtokolPrintView from "@/components/ProtokolPrintView";
import ZalohaPanel from "@/components/ZalohaPanel";
import GoogleDrivePanel from "@/components/GoogleDrivePanel";
import WorkPhotoFlow from "@/components/WorkPhotoFlow";
import NakladyForm from "@/components/NakladyForm";
import Nastenka from "@/components/Nastenka";
import PoptavkyPanel from "@/components/PoptavkyPanel";
import DodavateleKatalog from "@/components/DodavateleKatalog";
import PoptavkaForm from "@/components/PoptavkaForm";
import PoptavkaDetail from "@/components/PoptavkaDetail";
import { zakazkaZPoptavky } from "@/lib/poptavky";

export default function HomePage() {
  const router = useRouter();
  const [session, setSession] = useState(undefined); // undefined = still checking
  const [mojeRole, setMojeRole] = useState("user"); // bezpečný výchozí stav, dokud se role nezjistí
  const [loading, setLoading] = useState(true);

  const [orders, setOrders] = useState([]);
  const [nastaveni, setNastaveni] = useState(DEFAULT_NASTAVENI);
  const [materialHistory, setMaterialHistory] = useState([]);
  const [uzivatele, setUzivatele] = useState([]);
  const [organizace, setOrganizace] = useState([]);

  const [tab, setTab] = useState("ukoly");
  const [vykazInitialDen, setVykazInitialDen] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStav, setFilterStav] = useState("vse");
  const [filterMaterial, setFilterMaterial] = useState("vse"); // vse | neobjednany | objednany
  const [zakazkyView, setZakazkyView] = useState("seznam");

  const [showOrderForm, setShowOrderForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [nadrazenaZakazkaProNovou, setNadrazenaZakazkaProNovou] = useState(null);
  const [duplikatZakazky, setDuplikatZakazky] = useState(null);
  const [detailOrder, setDetailOrder] = useState(null);
  const [showWorkModal, setShowWorkModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showImportFaktur, setShowImportFaktur] = useState(false);
  const [showDetailPicker, setShowDetailPicker] = useState(false);
  const [showNastaveni, setShowNastaveni] = useState(false);
  const [showMaterialy, setShowMaterialy] = useState(false);
  const [katalogZalozka, setKatalogZalozka] = useState("materialy"); // materialy | dodavatele
  const [dodavatele, setDodavatele] = useState([]);
  const [dodavateleNacteni, setDodavateleNacteni] = useState(true);
  const [poptavkaOrder, setPoptavkaOrder] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [ukoly, setUkoly] = useState([]);
  // Poptávky ZÁKAZNÍKŮ (samostatná záložka) — neplést s poptavkaOrder výše,
  // což je poptávka materiálu u dodavatelů z detailu zakázky.
  const [poptavky, setPoptavky] = useState([]);
  const [poptavkyNacteny, setPoptavkyNacteny] = useState(true);
  const [detailPoptavkyId, setDetailPoptavkyId] = useState(null);
  const [poptavkaForm, setPoptavkaForm] = useState(null); // null = zavřeno, "nova" = nová, objekt = úprava
  const [poptavkaProZakazku, setPoptavkaProZakazku] = useState(null);
  const [protokolOrder, setProtokolOrder] = useState(null);
  const [protokolPrint, setProtokolPrint] = useState(null);
  const [showZaloha, setShowZaloha] = useState(false);
  const [showGoogleDrive, setShowGoogleDrive] = useState(false);
  const [fotkaOrder, setFotkaOrder] = useState(null);
  const [nakladyOrder, setNakladyOrder] = useState(null);
  const [nakladyNeulozeno, setNakladyNeulozeno] = useState(false);
  const [generatingPdfId, setGeneratingPdfId] = useState(null);
  const [kalkulaceOrder, setKalkulaceOrder] = useState(null);
  const [quoteData, setQuoteData] = useState(null);
  const [globalError, setGlobalError] = useState("");
  const [globalMessage, setGlobalMessage] = useState("");
  const [isOffline, setIsOffline] = useState(false);
  const [offlineData, setOfflineData] = useState(false);

  // Zpracování návratu z Google přihlašovací obrazovky (viz app/api/google-auth/callback).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const google = params.get("google");
    if (google === "connected") {
      setGlobalMessage("Google Drive úspěšně připojen.");
      window.history.replaceState({}, "", window.location.pathname);
    } else if (google === "error") {
      setGlobalError("Připojení ke Google Drive se nepovedlo. Zkus to znovu přes ikonu mraku v hlavičce.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    setIsOffline(typeof navigator !== "undefined" && !navigator.onLine);
    const goOnline = () => {
      setIsOffline(false);
      if (session) loadAllData().catch(() => {});
    };
    const goOffline = () => setIsOffline(true);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  const CACHE_KEY = "dilna-data-cache-v1";

  const saveOfflineCache = (o, n, mh) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ orders: o, nastaveni: n, materialHistory: mh, savedAt: Date.now() }));
    } catch (e) {
      // Storage full or unavailable (private browsing) — offline preview just won't work this time.
    }
  };

  const loadOfflineCache = () => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return false;
      const cached = JSON.parse(raw);
      setOrders(cached.orders || []);
      if (cached.nastaveni) setNastaveni({ ...DEFAULT_NASTAVENI, ...cached.nastaveni });
      setMaterialHistory(cached.materialHistory || []);
      setOfflineData(true);
      return true;
    } catch (e) {
      return false;
    }
  };

  // ---- auth guard ----
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) router.replace("/login");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession((prev) => {
        // Ignore token-refresh events for the same user so we don't refetch all data every hour.
        if (prev && s && prev.user?.id === s.user?.id) return prev;
        return s;
      });
      if (!s) router.replace("/login");
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  // ---- initial data load ----
  const loadAllData = async () => {
    const [ordersRes, nastaveniRes, historyRes, organizaceRes, ukolyRes] = await Promise.all([
      supabase.from("orders").select("*").order("vytvoreno", { ascending: false }),
      supabase.from("nastaveni").select("*").eq("id", 1).maybeSingle(),
      supabase.from("material_history").select("*"),
      supabase.from("organizace").select("*"),
      supabase.from("ukoly").select("*").order("created_at", { ascending: false }),
    ]);
    const noveOrders = ordersRes.data || [];
    setOrders(noveOrders);
    if (nastaveniRes.data) setNastaveni({ ...DEFAULT_NASTAVENI, ...nastaveniRes.data });
    setMaterialHistory(historyRes.data || []);
    setOrganizace(organizaceRes.data || []);
    setUkoly(ukolyRes.data || []);
    setOfflineData(false);
    // Poptávky se načítají zvlášť: kdyby tabulka ještě neexistovala (nespuštěný
    // supabase/poptavky.sql), zbytek aplikace tím nesmí být nijak dotčený.
    // Adresář dodavatelů — taky zvlášť (bez spuštěného supabase/dodavatele.sql zbytek běží dál)
    const dodavateleRes = await supabase.from("dodavatele").select("*");
    if (dodavateleRes.error) {
      setDodavateleNacteni(false);
    } else {
      setDodavatele(dodavateleRes.data || []);
      setDodavateleNacteni(true);
    }
    const poptavkyRes = await supabase.from("poptavky").select("*").order("created_at", { ascending: false });
    if (poptavkyRes.error) {
      console.error("Načtení poptávek se nepovedlo:", poptavkyRes.error);
      setPoptavkyNacteny(false);
    } else {
      setPoptavky(poptavkyRes.data || []);
      setPoptavkyNacteny(true);
    }
    // Aplikace aktualizuje i případně otevřené detaily zakázek (kdyby aplikace byla
    // otevřená zrovna ve chvíli, kdy se aplikace celá znovu načetla, třeba po
    // obnově ze zálohy) — jinak by aplikace mohla zůstat "zastaralá" a při
    // dalším uložení by přepsala právě obnovená data zpátky tou starou verzí
    // (stejná chyba, co jsme opravili jinde).
    const najitAktualni = (cur) => (cur ? noveOrders.find((o) => o.id === cur.id) || null : cur);
    setDetailOrder(najitAktualni);
    setKalkulaceOrder(najitAktualni);
    setProtokolOrder(najitAktualni);
    setFotkaOrder(najitAktualni);
    setNakladyOrder(najitAktualni);
  };

  useEffect(() => {
    if (!session) return;
    (async () => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        loadOfflineCache();
        setLoading(false);
        return;
      }
      try {
        await loadAllData();
      } catch (e) {
        // Network failed even though navigator.onLine said we're online (flaky connection) — fall back to cache.
        loadOfflineCache();
      }
      setLoading(false);
    })();

    // Vlastní role aplikace zjišťuje samostatně od hlavních dat, ať jedno pomalé/chybějící
    // API nezablokuje druhé.
    (async () => {
      try {
        const token = session.access_token;
        const res = await fetch("/api/users/me", { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (res.ok && data.role) setMojeRole(data.role);
      } catch (e) {
        // ponechá se bezpečný výchozí stav "user"
      }
    })();

    // Seznam přihlašovacích e-mailů — aplikace je nabídne při zápisu práce spolu s
    // ručně zadanými brigádníky. Taky se zjišťuje samostatně, ať to nezablokuje nic jiného.
    (async () => {
      try {
        const token = session.access_token;
        const res = await fetch("/api/users/list", { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (res.ok && data.uzivatele) setUzivatele(data.uzivatele.filter((u) => u.email));
      } catch (e) {
        // ponechá se prázdný seznam — aplikace pořád nabídne aspoň ručně zadané pracovníky
      }
    })();
  }, [session?.user?.id]);

  // Keep the offline snapshot fresh on every change (including live updates from teammates),
  // so opening the app without a connection shows the most recent data we've actually seen.
  useEffect(() => {
    if (!loading && !offlineData) saveOfflineCache(orders, nastaveni, materialHistory);
  }, [orders, nastaveni, materialHistory, loading, offlineData]);

  // ---- live updates from teammates ----
  useEffect(() => {
    if (!session?.user?.id) return;
    const channel = supabase
      .channel("orders-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, (payload) => {
        // Aplikace SLUČUJE (ne přepisuje) — pojistka pro případ, že by aplikace
        // "payload.new" aplikace Realtime kanálu neobsahovala úplně všechna pole
        // (typicky velká jsonb pole aplikace TOAST, viz "replica identity full" v
        // schema.sql). Sloučení aplikace zajistí, že chybějící pole v aplikaci nikdy
        // nepřepíší aplikaci existující hodnotu aplikace na aplikaci/prázdno.
        const slouzit = (stara) => (stara ? { ...stara, ...payload.new } : payload.new);
        setOrders((prev) => {
          if (payload.eventType === "DELETE") {
            return prev.filter((o) => o.id !== payload.old.id);
          }
          const row = payload.new;
          const existujici = prev.find((o) => o.id === row.id);
          const sloucena = slouzit(existujici);
          return existujici ? prev.map((o) => (o.id === row.id ? sloucena : o)) : [sloucena, ...prev];
        });
        // Keep any open detail/kalkulace/protokol modal in sync if it's the row that changed
        // (e.g. a customer signing remotely via the public link while a teammate has it open).
        setDetailOrder((cur) => (cur && payload.new && cur.id === payload.new.id ? slouzit(cur) : cur));
        setKalkulaceOrder((cur) => (cur && payload.new && cur.id === payload.new.id ? slouzit(cur) : cur));
        setProtokolOrder((cur) => (cur && payload.new && cur.id === payload.new.id ? slouzit(cur) : cur));
        setNakladyOrder((cur) => (cur && payload.new && cur.id === payload.new.id ? slouzit(cur) : cur));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  // Živý kanál pro úkoly — malé, jednoduché řádky bez velkých jsonb polí, takže
  // sem oproti zakázkám výše nehrozí stejná past s neúplnými daty.
  useEffect(() => {
    if (!session?.user?.id) return;
    const channel = supabase
      .channel("ukoly-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "ukoly" }, (payload) => {
        setUkoly((prev) => {
          if (payload.eventType === "DELETE") return prev.filter((u) => u.id !== payload.old.id);
          const existuje = prev.some((u) => u.id === payload.new.id);
          return existuje ? prev.map((u) => (u.id === payload.new.id ? payload.new : u)) : [payload.new, ...prev];
        });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  // Návrat do aplikace (odemčený telefon, přepnutí z jiné aplikace/záložky): živé
  // změny, které přišly, zatímco byla aplikace v pozadí, se nemusely doručit. Po
  // více než 30 s v pozadí se proto data načtou znovu.
  useEffect(() => {
    if (!session?.user?.id) return;
    let skrytoOd = null;
    const priZmene = async () => {
      if (document.visibilityState === "hidden") {
        skrytoOd = Date.now();
        return;
      }
      if (skrytoOd && Date.now() - skrytoOd > 30000) {
        try {
          await loadAllData(); // obnoví i otevřené detaily (viz konec loadAllData)
        } catch (e) {
          // offline — zůstanou data z cache, obnoví se po připojení
        }
      }
      skrytoOd = null;
    };
    document.addEventListener("visibilitychange", priZmene);
    return () => document.removeEventListener("visibilitychange", priZmene);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  // Živý kanál pro poptávky — stejný princip slučování jako u zakázek.
  useEffect(() => {
    if (!session?.user?.id) return;
    const channel = supabase
      .channel("poptavky-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "poptavky" }, (payload) => {
        setPoptavky((prev) => {
          if (payload.eventType === "DELETE") return prev.filter((x) => x.id !== payload.old.id);
          const existujici = prev.find((x) => x.id === payload.new.id);
          return existujici ? prev.map((x) => (x.id === payload.new.id ? { ...x, ...payload.new } : x)) : [payload.new, ...prev];
        });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  // Automatické odhlášení po 1 hodině nečinnosti (aplikace samotná, nezávisle na
  // Supabase — aplikace udrží přihlášení donekonečna sama od sebe, tohle je vlastní
  // bezpečnostní pojistka aplikace, např. pro sdílený tablet v dílně).
  useEffect(() => {
    if (!session) return;
    const LIMIT_NECINNOSTI_MS = 60 * 60 * 1000; // 1 hodina
    const lastActivity = { current: Date.now() };
    const oznamitAktivitu = () => {
      lastActivity.current = Date.now();
    };
    const udalosti = ["mousedown", "keydown", "touchstart", "scroll", "wheel"];
    udalosti.forEach((u) => window.addEventListener(u, oznamitAktivitu, { passive: true }));

    const interval = setInterval(() => {
      if (Date.now() - lastActivity.current > LIMIT_NECINNOSTI_MS) {
        signOut();
      }
    }, 60 * 1000); // kontrola jednou za minutu stačí, nemusí to být přesné na sekundu

    return () => {
      udalosti.forEach((u) => window.removeEventListener(u, oznamitAktivitu));
      clearInterval(interval);
    };
  }, [session?.user?.id]);

  // ---- persistence helpers ----
  const saveOrganizace = async (org) => {
    const nextHistory = upsertOrganizaceHistory(organizace, org);
    setOrganizace(nextHistory);
    const { error } = await supabase
      .from("organizace")
      .upsert({ ico: org.ico, nazev: org.nazev, adresa: org.adresa, dic: org.dic, telefon: org.telefon, email: org.email });
    if (error) console.error("Uložení organizace se nepovedlo:", error);
  };

  const createUkol = async (novyUkol) => {
    const zaznam = { ...novyUkol, zadalKdo: session?.user?.email || "?" };
    const { data, error } = await supabase.from("ukoly").insert(zaznam).select().single();
    if (error) {
      console.error(error);
      setGlobalError("Úkol se nepovedlo zadat. Zkontroluj připojení a zkus to znovu.");
      throw error;
    }
    setUkoly((prev) => [data, ...prev]);
  };

  const toggleUkolHotovo = async (ukol) => {
    const patch = { hotovo: !ukol.hotovo, hotovoKdy: !ukol.hotovo ? new Date().toISOString() : null };
    setUkoly((prev) => prev.map((u) => (u.id === ukol.id ? { ...u, ...patch } : u)));
    const { error } = await supabase.from("ukoly").update(patch).eq("id", ukol.id);
    if (error) {
      console.error(error);
      setUkoly((prev) => prev.map((u) => (u.id === ukol.id ? ukol : u)));
      setGlobalError("Změnu se nepovedlo uložit. Zkontroluj připojení a zkus to znovu.");
    }
  };

  const deleteUkol = async (ukol) => {
    if (!window.confirm("Opravdu smazat tenhle úkol?")) return;
    setUkoly((prev) => prev.filter((u) => u.id !== ukol.id));
    const { error } = await supabase.from("ukoly").delete().eq("id", ukol.id);
    if (error) {
      console.error(error);
      setUkoly((prev) => [...prev, ukol]);
      setGlobalError("Smazání se nepovedlo. Zkontroluj připojení a zkus to znovu.");
    }
  };

  // ---- Poptávky zákazníků ----
  // Do databáze se vždy posílají jen konkrétní změněná pole (nikdy celý řádek),
  // fotky a poznámky se přidávají k aktuálnímu stavu načtenému přímo z databáze —
  // dva lidé, kteří současně přidají fotku, si tak navzájem nic nepřepíšou.
  const POLE_UPRAVY_POPTAVKY = ["zakaznik", "telefon", "email", "ico", "zakaznikIdentifikace", "zdroj", "text", "pozadovanyTermin", "odhadCena"];

  const upravitPoptavku = async (p, patch) => {
    const puvodni = poptavky.find((x) => x.id === p.id);
    setPoptavky((prev) => prev.map((x) => (x.id === p.id ? { ...x, ...patch } : x)));
    let { data, error } = await supabase.from("poptavky").update(patch).eq("id", p.id).select().single();
    // Bez spuštěného SQL se sloupcem odhadCena se poptávka uloží bez odhadu
    if (error && /odhadCena/.test(error.message || "") && "odhadCena" in patch) {
      const { odhadCena, ...bezOdhadu } = patch; // eslint-disable-line no-unused-vars
      ({ data, error } = await supabase.from("poptavky").update(bezOdhadu).eq("id", p.id).select().single());
      if (!error) setGlobalError("Poptávka je uložená, jen odhad ceny ne — v Supabase je potřeba spustit řádek SQL se sloupcem odhadCena.");
    }
    if (error) {
      console.error(error);
      if (puvodni) setPoptavky((prev) => prev.map((x) => (x.id === p.id ? puvodni : x)));
      setGlobalError("Uložení poptávky se nepovedlo. Zkontroluj připojení a zkus to znovu.");
      throw error;
    }
    setPoptavky((prev) => prev.map((x) => (x.id === data.id ? data : x)));
    return data;
  };

  const ulozitPoptavku = async (zaznam) => {
    if (zaznam.id) {
      const patch = {};
      POLE_UPRAVY_POPTAVKY.forEach((k) => {
        patch[k] = zaznam[k] === "" && (k === "pozadovanyTermin" || k === "odhadCena") ? null : zaznam[k] ?? null;
      });
      // odhad nevyplněný ani předtím → neposílat (funguje i bez sloupce odhadCena v databázi)
      const puvodniPoptavka = poptavky.find((x) => x.id === zaznam.id);
      if (patch.odhadCena === null && !(puvodniPoptavka && puvodniPoptavka.odhadCena)) delete patch.odhadCena;
      await upravitPoptavku(zaznam, patch);
      setPoptavkaForm(null);
      return;
    }
    const { data, error } = await supabase
      .from("poptavky")
      .insert({ ...zaznam, vytvoril: session?.user?.email || null })
      .select()
      .single()
      .then(async (vysledek) => {
        // Bez spuštěného SQL se sloupcem odhadCena se poptávka uloží bez odhadu
        if (vysledek.error && /odhadCena/.test(vysledek.error.message || "") && "odhadCena" in zaznam) {
          const { odhadCena, ...bezOdhadu } = zaznam; // eslint-disable-line no-unused-vars
          const znovu = await supabase.from("poptavky").insert({ ...bezOdhadu, vytvoril: session?.user?.email || null }).select().single();
          if (!znovu.error) setGlobalError("Poptávka je uložená, jen odhad ceny ne — v Supabase je potřeba spustit řádek SQL se sloupcem odhadCena.");
          return znovu;
        }
        return vysledek;
      });
    if (error) {
      console.error(error);
      setGlobalError("Poptávku se nepovedlo uložit. Zkontroluj připojení a zkus to znovu.");
      throw error;
    }
    setPoptavky((prev) => (prev.some((x) => x.id === data.id) ? prev : [data, ...prev]));
    setPoptavkaForm(null);
    setDetailPoptavkyId(data.id);
  };

  const nacistAktualniPoptavku = async (id) => {
    const { data, error } = await supabase.from("poptavky").select("fotky, poznamky").eq("id", id).single();
    if (error) throw error;
    return data;
  };

  const pridatFotkyKPoptavce = async (p, noveFotky) => {
    const aktualni = await nacistAktualniPoptavku(p.id);
    return upravitPoptavku(p, { fotky: [...(aktualni.fotky || []), ...noveFotky] });
  };

  const odebratFotkuZPoptavky = async (p, fotkaId) => {
    const aktualni = await nacistAktualniPoptavku(p.id);
    return upravitPoptavku(p, { fotky: (aktualni.fotky || []).filter((f) => f.id !== fotkaId) });
  };

  const pridatPoznamkuKPoptavce = async (p, text) => {
    const aktualni = await nacistAktualniPoptavku(p.id);
    const poznamka = { id: uid(), datum: todayISO(), autor: session?.user?.email || "", text };
    return upravitPoptavku(p, { poznamky: [poznamka, ...(aktualni.poznamky || [])] });
  };

  const zmenitStavPoptavky = (p, stav) => upravitPoptavku(p, { stav });

  const smazatPoptavku = async (p) => {
    const { error } = await supabase.from("poptavky").delete().eq("id", p.id);
    if (error) {
      console.error(error);
      setGlobalError("Smazání poptávky se nepovedlo (smazat smí jen správce).");
      return;
    }
    setPoptavky((prev) => prev.filter((x) => x.id !== p.id));
    setDetailPoptavkyId(null);
  };

  const vytvoritZakazkuZPoptavky = (p) => {
    setDetailPoptavkyId(null);
    setEditingOrder(null);
    setNadrazenaZakazkaProNovou(null);
    setDuplikatZakazky(null);
    setPoptavkaProZakazku(p);
    setShowOrderForm(true);
  };

  // Uloží zakázku přes běžné saveOrder (otevře se její detail) a pak poptávku
  // označí jako "Nabídka vytvořena" s odkazem na novou zakázku.
  const ulozitZakazkuZPoptavky = async (order) => {
    const p = poptavkaProZakazku;
    const data = await saveOrder(order);
    setPoptavkaProZakazku(null);
    if (p) {
      try {
        await upravitPoptavku(p, { stav: "nabidka", zakazkaId: data.id, zakazkaCislo: data.cislo });
      } catch (e) {
        setGlobalError(`Zakázka ${data.cislo} se založila, ale poptávku ${p.cislo} se nepodařilo propojit. Označ ji ručně.`);
      }
    }
    return data;
  };

  const otevritZakazkuZPoptavky = (p) => {
    const o = orders.find((x) => x.id === p.zakazkaId);
    if (!o) {
      setGlobalError(`Zakázka ${p.zakazkaCislo || ""} už v aplikaci není (mohla být smazána).`);
      return;
    }
    setDetailPoptavkyId(null);
    setDetailOrder(o);
  };

  const detailPoptavky = detailPoptavkyId ? poptavky.find((x) => x.id === detailPoptavkyId) || null : null;
  const pocetNovychPoptavek = poptavky.filter((x) => x.stav === "nova").length;

  // Aplikace POUZE mění stav zakázky — na rozdíl od saveOrder tahle funkce do
  // databáze pošle JEN pole "stav", nikdy celý objekt zakázky. I kdyby detail
  // zakázky (detailOrder) byl v prohlížeči sebeméně zastaralý, tahle funkce ho
  // NEMŮŽE přepsat, protože pole naklady/prace/kalkulace do zápisu vůbec
  // nepatří. Aplikace "Rychlá změna stavu" volá výhradně tuhle funkci, ne saveOrder.
  const zmenitStavZakazky = async (order, novyStav) => {
    const predchoziZakazka = orders.find((o) => o.id === order.id);
    if (predchoziZakazka) {
      const optimisticky = { ...predchoziZakazka, stav: novyStav };
      setOrders((prev) => prev.map((o) => (o.id === order.id ? optimisticky : o)));
      setDetailOrder((prev) => (prev && prev.id === order.id ? optimisticky : prev));
    }
    const { data, error } = await supabase.from("orders").update({ stav: novyStav }).eq("id", order.id).select().single();
    if (error) {
      console.error(error);
      setGlobalError("Změnu stavu se nepovedlo uložit. Zkontroluj připojení a zkus to znovu.");
      if (predchoziZakazka) {
        setOrders((prev) => prev.map((o) => (o.id === predchoziZakazka.id ? predchoziZakazka : o)));
        setDetailOrder((prev) => (prev && prev.id === predchoziZakazka.id ? predchoziZakazka : prev));
      }
      throw error;
    }
    setOrders((prev) => prev.map((o) => (o.id === data.id ? data : o)));
    setDetailOrder((prev) => (prev && prev.id === data.id ? data : prev));
    const CIL_STAVY_PRO_PDF = ["hotovo", "fakturovano"];
    if (CIL_STAVY_PRO_PDF.includes(data.stav) && predchoziZakazka?.stav !== data.stav) {
      generatePdf(data).catch(() => {});
    }
    return data;
  };

  // Obecná aplikace pro jakoukoliv DROBNOU úpravu pole zakázky (aplikace jen pár
  // konkrétních polí, ne celý objekt) — aplikace to používá aplikace "Materiál
  // objednán/neobjednán" a jakékoliv podobné rychlé přepínače aplikace. Aplikace
  // STEJNÝ princip jako aplikace zmenitStavZakazky výše: aplikace nikdy nepošle pole
  // naklady/prace/kalkulace, takže je aplikace fyzicky nemůže přepsat.
  const aktualizovatDilciPole = async (order, patch) => {
    const predchoziZakazka = orders.find((o) => o.id === order.id);
    if (predchoziZakazka) {
      const optimisticky = { ...predchoziZakazka, ...patch };
      setOrders((prev) => prev.map((o) => (o.id === order.id ? optimisticky : o)));
      setDetailOrder((prev) => (prev && prev.id === order.id ? optimisticky : prev));
    }
    const { data, error } = await supabase.from("orders").update(patch).eq("id", order.id).select().single();
    if (error) {
      console.error(error);
      setGlobalError("Uložení se nepovedlo. Zkontroluj připojení a zkus to znovu.");
      if (predchoziZakazka) {
        setOrders((prev) => prev.map((o) => (o.id === predchoziZakazka.id ? predchoziZakazka : o)));
        setDetailOrder((prev) => (prev && prev.id === predchoziZakazka.id ? predchoziZakazka : prev));
      }
      throw error;
    }
    setOrders((prev) => prev.map((o) => (o.id === data.id ? data : o)));
    setDetailOrder((prev) => (prev && prev.id === data.id ? data : prev));
    return data;
  };

  const saveOrder = async (order) => {
    // Číselné a datumové sloupce v databázi odmítnou prázdný textový řetězec "" —
    // musí být buď vyplněná hodnota, nebo null (nevyplněno).
    const NUMERICKA_POLE = ["cena", "planCasDilna", "planCasMontaz"];
    const DATUMOVA_POLE = ["termin", "terminZahajeni"];
    const cistaZakazka = { ...order };
    [...NUMERICKA_POLE, ...DATUMOVA_POLE].forEach((klic) => {
      if (cistaZakazka[klic] === "") cistaZakazka[klic] = null;
    });

    const predchoziZakazka = orders.find((o) => o.id === order.id);

    // Aplikace rovnou (bez čekání na server) ukáže novou hodnotu — hlavně u rychlé změny
    // stavu to na mobilu s pomalejším připojením jinak působilo, že aplikace "vázne".
    // Zápis na server běží na pozadí; kdyby se nepovedl, aplikace se vrátí na předchozí
    // stav a ukáže chybu. (U úplně nové zakázky se optimisticky nic nedělá — není
    // co lokálně sloučit, dokud aplikace nedostane skutečné id z databáze.)
    if (predchoziZakazka) {
      const optimisticky = { ...predchoziZakazka, ...cistaZakazka };
      setOrders((prev) => prev.map((o) => (o.id === optimisticky.id ? optimisticky : o)));
      setDetailOrder((prev) => (prev && prev.id === optimisticky.id ? optimisticky : prev));
    }

    // U EXISTUJÍCÍ zakázky se posílají jen pole z formuláře zakázky. Dřív se ukládala
    // celá zakázka i se seznamy práce, nákladů, fotek a kalkulací tak, jak byly ve chvíli
    // otevření formuláře — co mezitím zapsal kolega (třeba hodiny z telefonu), se tím
    // přepsalo a ztratilo. Nová zakázka (z formuláře, duplikace, poptávky) se zakládá celá.
    const POLE_FORMULARE_ZAKAZKY = [
      "cislo", "stav", "zakaznik", "ico", "zakaznikIdentifikace", "telefon", "email", "popis",
      "cena", "termin", "terminZahajeni", "planCasDilna", "planCasMontaz", "poznamka", "cisloFaktury",
    ];
    let dotaz;
    if (predchoziZakazka) {
      const zmeny = {};
      POLE_FORMULARE_ZAKAZKY.forEach((k) => {
        if (k in cistaZakazka) zmeny[k] = cistaZakazka[k];
      });
      dotaz = supabase.from("orders").update(zmeny).eq("id", order.id).select().single();
    } else {
      dotaz = supabase.from("orders").upsert(cistaZakazka).select().single();
    }
    const { data, error } = await dotaz;
    if (error) {
      console.error(error);
      setGlobalError("Uložení zakázky se nepovedlo. Zkontroluj připojení a zkus to znovu.");
      if (predchoziZakazka) {
        setOrders((prev) => prev.map((o) => (o.id === predchoziZakazka.id ? predchoziZakazka : o)));
        setDetailOrder((prev) => (prev && prev.id === predchoziZakazka.id ? predchoziZakazka : prev));
      }
      throw error;
    }
    setOrders((prev) => {
      const exists = prev.some((o) => o.id === data.id);
      return exists ? prev.map((o) => (o.id === data.id ? data : o)) : [data, ...prev];
    });
    setShowOrderForm(false);
    setEditingOrder(null);
    setDetailOrder(data);

    // Automatický archiv PDF: jakmile zakázka nově přejde do stavu Hotovo nebo
    // Fakturováno, aplikace sama vygeneruje a uloží PDF na Drive — netřeba na nic klikat.
    const CIL_STAVY_PRO_PDF = ["hotovo", "fakturovano"];
    if (CIL_STAVY_PRO_PDF.includes(data.stav) && predchoziZakazka?.stav !== data.stav) {
      generatePdf(data).catch(() => {});
    }

    return data;
  };

  // "Tichá" verze založení zakázky — na rozdíl od saveOrder NEotvírá detail
  // zakázky ani nezavírá jiné formuláře. Používá se, když aplikace zakázku zakládá
  // jako vedlejší krok uprostřed jiného úkonu (např. rychlé založení při zápisu
  // práce) — aplikace tam nechce najednou přeskočit na detail nové zakázky.
  const createOrderQuick = async (order) => {
    const NUMERICKA_POLE = ["cena", "planCasDilna", "planCasMontaz"];
    const DATUMOVA_POLE = ["termin", "terminZahajeni"];
    const cistaZakazka = { ...order };
    [...NUMERICKA_POLE, ...DATUMOVA_POLE].forEach((klic) => {
      if (cistaZakazka[klic] === "") cistaZakazka[klic] = null;
    });
    const { data, error } = await supabase.from("orders").insert(cistaZakazka).select().single();
    if (error) {
      console.error(error);
      throw error;
    }
    setOrders((prev) => [data, ...prev]);
    return data;
  };

  // ---- Adresář dodavatelů ----
  const ulozitDodavatele = async (d, puvodniNazev) => {
    const zaznam = { nazev: d.nazev, email: d.email || null, telefon: d.telefon || null, kontakt: d.kontakt || null, poznamka: d.poznamka || null };
    const { data, error } = await supabase.from("dodavatele").upsert(zaznam).select().single();
    if (error) {
      console.error(error);
      throw new Error("Dodavatele se nepovedlo uložit. Zkontroluj připojení a zkus to znovu.");
    }
    // Přejmenování: starý záznam se odebere až po úspěšném uložení nového
    if (puvodniNazev && puvodniNazev !== d.nazev) {
      await supabase.from("dodavatele").delete().eq("nazev", puvodniNazev);
    }
    setDodavatele((prev) => [...prev.filter((x) => x.nazev !== data.nazev && x.nazev !== puvodniNazev), data]);
    return data;
  };

  const smazatDodavatele = async (d) => {
    const { error } = await supabase.from("dodavatele").delete().eq("nazev", d.nazev);
    if (error) {
      console.error(error);
      setGlobalError("Dodavatele se nepovedlo smazat.");
      return;
    }
    setDodavatele((prev) => prev.filter((x) => x.nazev !== d.nazev));
  };

  // Checklist objednání materiálu: změna se provede nad AKTUÁLNÍM stavem z databáze
  // (dva lidé odškrtávající různé řádky si nic nepřepíšou) a zároveň se nastaví
  // příznak "materiál objednán", když je odškrtnuté všechno.
  const zmenitChecklistMaterialu = async (order, zmena) => {
    const { data: akt, error: chybaCteni } = await supabase.from("orders").select("materialChecklist, kalkulace").eq("id", order.id).single();
    if (chybaCteni) throw chybaCteni;
    const novyChecklist = zmena(akt?.materialChecklist || {});
    const stav = stavObjednaniMaterialu({ ...order, kalkulace: akt?.kalkulace, materialChecklist: novyChecklist }, nastaveni);
    const patch = { materialChecklist: novyChecklist };
    if (stav.celkem > 0) {
      patch.materialObjednano = stav.vse;
      patch.materialObjednanoDatum = stav.vse ? order.materialObjednanoDatum || todayISO() : null;
    }
    const { data, error } = await supabase.from("orders").update(patch).eq("id", order.id).select().single();
    if (error) {
      console.error(error);
      throw error;
    }
    setOrders((prev) => prev.map((o) => (o.id === data.id ? data : o)));
    setDetailOrder((cur) => (cur && cur.id === data.id ? data : cur));
    return data;
  };

  const deleteOrder = async (id) => {
    // Podzakázky smazané zakázky se nemažou — odpojí se a zůstanou jako samostatné
    // zakázky (jinak by v seznamu visely jako podzakázky neexistující zakázky).
    const podzakazky = orders.filter((o) => o.nadrazenaZakazkaId === id);
    for (const pz of podzakazky) {
      const { error: chybaOdpojeni } = await supabase.from("orders").update({ nadrazenaZakazkaId: null }).eq("id", pz.id);
      if (chybaOdpojeni) {
        console.error(chybaOdpojeni);
        setGlobalError("Smazání se nepovedlo (nešlo odpojit podzakázky). Zkus to znovu.");
        return;
      }
    }
    if (podzakazky.length) setOrders((prev) => prev.map((o) => (o.nadrazenaZakazkaId === id ? { ...o, nadrazenaZakazkaId: null } : o)));
    const { error } = await supabase.from("orders").delete().eq("id", id);
    if (error) {
      console.error(error);
      setGlobalError("Smazání zakázky se nepovedlo. Zkus to znovu.");
      return;
    }
    setOrders((prev) => prev.filter((o) => o.id !== id));
    setDetailOrder(null);
  };

  // ---- Bezpečné zápisy do seznamů zakázky (práce, náklady, fotky) ----
  // Dřív se do databáze posílal celý seznam tak, jak ho měl telefon v paměti. Když
  // mezitím kolega něco zapsal (a telefon to po probuzení ještě nevěděl), jeho
  // záznam se tím přepsal a zmizel. Teď se vždy nejdřív načte AKTUÁLNÍ seznam přímo
  // z databáze a změna se provede až na něm.
  const upravitSeznamZakazky = async (orderId, sloupec, zmena) => {
    const { data: aktualni, error: chybaCteni } = await supabase.from("orders").select(sloupec).eq("id", orderId).single();
    if (chybaCteni) return { data: null, error: chybaCteni };
    const novy = zmena(Array.isArray(aktualni?.[sloupec]) ? aktualni[sloupec] : []);
    return supabase.from("orders").update({ [sloupec]: novy }).eq("id", orderId).select().single();
  };

  // Z formuláře, který upravuje celý seznam (oprava/smazání záznamů), se do aktuálního
  // stavu v databázi přenesou jen skutečné změny: smazané, upravené a nově přidané
  // záznamy. Záznamy, které mezitím přidal někdo jiný, zůstanou.
  const sloucitZmenySeznamu = (puvodni, upraveny, aktualni) => {
    const vse = [...(puvodni || []), ...(upraveny || []), ...(aktualni || [])];
    if (vse.some((x) => !x || !x.id)) return upraveny; // starší záznamy bez id — nejde bezpečně sloučit
    const idPuvodnich = new Set(puvodni.map((x) => x.id));
    const idUpravenych = new Set(upraveny.map((x) => x.id));
    const smazane = new Set([...idPuvodnich].filter((id) => !idUpravenych.has(id)));
    const zmenene = new Map(upraveny.filter((x) => idPuvodnich.has(x.id)).map((x) => [x.id, x]));
    const pridane = upraveny.filter((x) => !idPuvodnich.has(x.id));
    return [...pridane, ...aktualni.filter((x) => !smazane.has(x.id)).map((x) => zmenene.get(x.id) || x)];
  };

  const addWorkEntry = async (order, entry) => {
    const { data, error } = await upravitSeznamZakazky(order.id, "prace", (akt) => [entry, ...akt]);
    if (error) {
      console.error(error);
      setGlobalError("Záznam práce se nepovedlo uložit. Zkontroluj připojení a zkus to znovu.");
      throw error;
    }
    setOrders((prev) => prev.map((o) => (o.id === data.id ? data : o)));
    if (detailOrder && detailOrder.id === data.id) setDetailOrder(data);
    setShowWorkModal(false);
  };

  // Oprava/smazání už zapsaného záznamu práce (pracovník se spletl atd.) — dostává
  // rovnou celé nové pole prace (upravené nebo bez smazaného záznamu).
  const editPrace = async (order, novePrace) => {
    const { data, error } = await upravitSeznamZakazky(order.id, "prace", (akt) => sloucitZmenySeznamu(order.prace || [], novePrace, akt));
    if (error) {
      console.error(error);
      setGlobalError("Opravu záznamu práce se nepovedlo uložit. Zkontroluj připojení a zkus to znovu.");
      throw error;
    }
    setOrders((prev) => prev.map((o) => (o.id === data.id ? data : o)));
    if (detailOrder && detailOrder.id === data.id) setDetailOrder(data);
  };

  // rozpocet = [{ order, naklad: {id, popis, castka, fotoPath} }, ...] — jeden náklad
  // zapsaný (případně poměrově rozdělený) do víc zakázek najednou.
  const zapsatNaklady = async (rozpocet) => {
    try {
      const vysledky = await Promise.all(
        rozpocet.map(({ order, naklad }) => upravitSeznamZakazky(order.id, "naklady", (akt) => [naklad, ...akt]))
      );
      const chyba = vysledky.find((v) => v.error);
      if (chyba) throw chyba.error;
      setOrders((prev) => {
        const mapa = new Map(vysledky.map((v) => [v.data.id, v.data]));
        return prev.map((o) => mapa.get(o.id) || o);
      });
      // KRITICKÉ: aplikace dřív zapomínala obnovit i otevřený detail zakázky
      // (detailOrder) — pokud aplikace detail měla zrovna otevřený (nebo aplikace v
      // detailu zůstala "zastaralá" verze), následná rychlá změna stavu by ho
      // uložila přes tenhle starý, ještě-bez-nákladu stav a náklady by aplikace
      // ztratila. Aplikace teď detail obnoví hned tady, ne až spoléhá na to, že to
      // stihne realtime.
      setDetailOrder((cur) => {
        if (!cur) return cur;
        const nalezeny = vysledky.find((v) => v.data.id === cur.id);
        return nalezeny ? nalezeny.data : cur;
      });
      setShowReceiptModal(false);
    } catch (error) {
      console.error(error);
      setGlobalError("Náklad se nepovedlo uložit. Zkontroluj připojení a zkus to znovu.");
      throw error;
    }
  };

  // Import faktur přijatých (CSV z ABRA Flexi) — na rozdíl od zapsatNaklady se tu
  // MŮŽE stát, že víc faktur patří ke stejné zakázce (dvě faktury na stejné číslo).
  // Aplikace proto zápisy nejdřív SESKUPÍ podle zakázky, ať dvě souběžné aktualizace
  // téhož řádku jedna druhou nepřepíší (klasické riziko souběhu).
  const importovatFaktury = async (polozky) => {
    try {
      const podleZakazky = new Map();
      polozky.forEach(({ order, naklad }) => {
        if (!podleZakazky.has(order.id)) podleZakazky.set(order.id, { order, naklady: [] });
        podleZakazky.get(order.id).naklady.push(naklad);
      });
      const vysledky = await Promise.all(
        Array.from(podleZakazky.values()).map(({ order, naklady }) => upravitSeznamZakazky(order.id, "naklady", (akt) => [...naklady, ...akt]))
      );
      const chyba = vysledky.find((v) => v.error);
      if (chyba) throw chyba.error;
      setOrders((prev) => {
        const mapa = new Map(vysledky.map((v) => [v.data.id, v.data]));
        return prev.map((o) => mapa.get(o.id) || o);
      });
      // Aplikace opravdu STEJNÝ důvod — aplikace dřív zapomínala obnovit otevřený
      // detail zakázky, viz podrobný komentář u zapsatNaklady výše.
      setDetailOrder((cur) => {
        if (!cur) return cur;
        const nalezeny = vysledky.find((v) => v.data.id === cur.id);
        return nalezeny ? nalezeny.data : cur;
      });
    } catch (error) {
      console.error(error);
      setGlobalError("Import faktur se nepovedl. Zkontroluj připojení a zkus to znovu.");
      throw error;
    }
  };

  // entry může být jedna fotka nebo pole fotek (výběr více fotek z galerie najednou)
  const addWorkPhoto = async (order, entry) => {
    const nove = Array.isArray(entry) ? entry : [entry];
    const { data, error } = await upravitSeznamZakazky(order.id, "fotky", (akt) => [...nove, ...akt]);
    if (error) {
      console.error(error);
      setGlobalError("Fotku se nepovedlo uložit. Zkontroluj připojení a zkus to znovu.");
      throw error;
    }
    setOrders((prev) => prev.map((o) => (o.id === data.id ? data : o)));
    if (detailOrder && detailOrder.id === order.id) setDetailOrder(data);
    setFotkaOrder(null);
  };

  // Odebrání fotky ze zakázky (např. omylem přiřazená k jiné zakázce). Odebere se jen
  // záznam v zakázce — soubor na Google Drive zůstává, nic se nenávratně neztratí.
  const smazatFotku = async (order, fotkaId) => {
    const { data, error } = await upravitSeznamZakazky(order.id, "fotky", (akt) => akt.filter((f) => f.id !== fotkaId));
    if (error) {
      console.error(error);
      setGlobalError("Fotku se nepovedlo odebrat. Zkontroluj připojení a zkus to znovu.");
      return;
    }
    setOrders((prev) => prev.map((o) => (o.id === data.id ? data : o)));
    setDetailOrder((cur) => (cur && cur.id === data.id ? data : cur));
  };

  const saveNaklady = async (radky) => {
    const { data, error } = await upravitSeznamZakazky(nakladyOrder.id, "naklady", (akt) => sloucitZmenySeznamu(nakladyOrder.naklady || [], radky, akt));
    if (error) {
      console.error(error);
      setGlobalError("Náklady se nepovedlo uložit. Zkontroluj připojení a zkus to znovu.");
      throw error;
    }
    setOrders((prev) => prev.map((o) => (o.id === data.id ? data : o)));
    if (detailOrder && detailOrder.id === data.id) setDetailOrder(data);
    setNakladyOrder(null);
  };

  const generatePdf = async (order) => {
    setGeneratingPdfId(order.id);
    setGlobalError("");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const res = await fetch(`/api/export-pdf/${order.id}`, {
        method: "POST",
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Vygenerování PDF se nepovedlo.");
      setOrders((prev) => prev.map((o) => (o.id === data.order.id ? data.order : o)));
      if (detailOrder && detailOrder.id === data.order.id) setDetailOrder(data.order);
    } catch (err) {
      console.error(err);
      setGlobalError("Vygenerování PDF se nepovedlo. Zkontroluj připojení a zkus to znovu.");
    }
    setGeneratingPdfId(null);
  };

  const saveNastaveni = async (n) => {
    // Číselná pole: prázdné políčko nejde do databáze uložit (číselný sloupec odmítne
    // prázdný text) — dřív se tím tiše nepovedlo uložit celé nastavení. Prázdné pole
    // teď dostane výchozí hodnotu a čísla se uloží jako čísla.
    const CISELNA = ["sazbaDilna", "sazbaMontaz", "nakladovaSazbaDilna", "nakladovaSazbaMontaz", "cenaZinkovani", "cenaLakovani", "zaokrouhleniNa"];
    const cista = { ...n };
    CISELNA.forEach((k) => {
      if (!(k in cista)) return;
      const v = cista[k];
      cista[k] = v === "" || v === null || v === undefined || isNaN(Number(v)) ? DEFAULT_NASTAVENI[k] ?? 0 : Number(v);
    });
    let { data, error } = await supabase.from("nastaveni").upsert({ id: 1, ...cista }).select().single();
    // Dokud není spuštěný SQL se sloupcem adresaDilny, uloží se nastavení bez něj
    // (zbytek nastavení se tím neztratí) a appka upozorní, co je potřeba udělat.
    if (error && /adresaDilny/.test(error.message || "")) {
      const { adresaDilny, ...bezAdresy } = cista; // eslint-disable-line no-unused-vars
      ({ data, error } = await supabase.from("nastaveni").upsert({ id: 1, ...bezAdresy }).select().single());
      if (!error) setGlobalError("Nastavení je uložené, jen adresa dílny ne — v Supabase je potřeba spustit řádek SQL se sloupcem adresaDilny.");
    }
    if (error) {
      console.error(error);
      setGlobalError("Nastavení se nepovedlo uložit. Zkus to znovu.");
      return;
    }
    setNastaveni({ ...DEFAULT_NASTAVENI, ...data });
    setShowNastaveni(false);
  };

  // Jednorázová migrace: staré samostatné "účtenky" se přesunou do Sledování nákladů
  // (nový způsob zápisu je od teď spojený s náklady). Bezpečné spustit i vícekrát —
  // po prvním úspěšném běhu už žádná zakázka nemá co migrovat.
  const migrovatUctenky = async () => {
    const kMigraci = orders.filter((o) => (o.uctenky || []).length > 0);
    if (kMigraci.length === 0) return { presunuto: 0, zakazek: 0 };
    let presunuto = 0;
    const vysledky = await Promise.all(
      kMigraci.map((order) => {
        const noveNaklady = order.uctenky.map((u) => ({
          id: u.id,
          popis: u.poznamka?.trim() || "Účtenka",
          castka: Number(u.castka) || 0,
          fotoPath: u.path || null,
        }));
        presunuto += noveNaklady.length;
        return supabase
          .from("orders")
          .update({ naklady: [...noveNaklady, ...(order.naklady || [])], uctenky: [] })
          .eq("id", order.id)
          .select()
          .single();
      })
    );
    const chyba = vysledky.find((v) => v.error);
    if (chyba) {
      setGlobalError("Migrace účtenek se nepovedla, zkus to znovu.");
      throw chyba.error;
    }
    setOrders((prev) => {
      const mapa = new Map(vysledky.map((v) => [v.data.id, v.data]));
      return prev.map((o) => mapa.get(o.id) || o);
    });
    setDetailOrder((cur) => {
      if (!cur) return cur;
      const nalezeny = vysledky.find((v) => v.data.id === cur.id);
      return nalezeny ? nalezeny.data : cur;
    });
    return { presunuto, zakazek: kMigraci.length };
  };

  const saveProtokol = async (order, protokol) => {
    const { data, error } = await supabase.from("orders").update({ protokol }).eq("id", order.id).select().single();
    if (error) {
      console.error(error);
      setGlobalError("Protokol se nepovedlo uložit. Zkontroluj připojení a zkus to znovu.");
      throw error;
    }
    setOrders((prev) => prev.map((o) => (o.id === data.id ? data : o)));
    if (detailOrder && detailOrder.id === order.id) setDetailOrder(data);
    setProtokolOrder(data);
    return data;
  };

  const saveKalkulace = async (order, polozky, celkem, sazbaDph) => {
    const planCasDilna = polozky.reduce((s, p) => s + (Number(p.praceDilnaHodiny) || 0) * Math.max(1, Number(p.pocetKs) || 1), 0);
    const planCasMontaz = polozky.reduce((s, p) => s + (Number(p.praceMontazHodiny) || 0) * Math.max(1, Number(p.pocetKs) || 1), 0);
    const { data, error } = await supabase
      .from("orders")
      // Každá položka si uloží sazby, se kterými byla spočítaná (viz SAZBY_KALKULACE) —
      // položky bez nich (nové nebo starší) dostanou aktuální sazby z Nastavení.
      .update({
        kalkulace: polozky.map((p) => (p.sazby ? p : { ...p, sazby: sazbyZNastaveni(nastaveni) })),
        cena: celkem.finalniCena,
        planCasDilna,
        planCasMontaz,
        sazbaDph,
      })
      .eq("id", order.id)
      .select()
      .single();
    if (error) {
      console.error(error);
      setGlobalError("Kalkulaci se nepovedlo uložit. Zkontroluj připojení a zkus to znovu.");
      return;
    }
    setOrders((prev) => prev.map((o) => (o.id === data.id ? data : o)));
    const vsechnyMaterialy = polozky.flatMap((p) => p.materialy || []);
    const nextHistory = upsertMaterialHistory(materialHistory, vsechnyMaterialy);
    setMaterialHistory(nextHistory);
    const { error: chybaKatalogu } = await supabase.from("material_history").upsert(nextHistory);
    if (chybaKatalogu) {
      console.error("Uložení katalogu materiálů se nepovedlo:", chybaKatalogu);
      setGlobalError("Zakázka se uložila, ale katalog materiálů (pro příští našeptávání) se uložit nepovedlo. Zkus to prosím znovu.");
    }
    setKalkulaceOrder(null);
    if (detailOrder && detailOrder.id === order.id) setDetailOrder(data);
  };

  const filteredOrders = useMemo(() => {
    return orders
      .filter((o) => (filterStav === "vse" ? true : o.stav === filterStav))
      .filter((o) => {
        if (filterMaterial === "vse") return true;
        const m = stavObjednaniMaterialu(o, nastaveni);
        if (filterMaterial === "objednany") return m.vse;
        // neobjednaný = rozpracované zakázky bez kompletně objednaného materiálu
        // (+ cokoli, kde je objednaná jen část); nabídky a uzavřené zakázky se nepletou
        return !m.vse && (o.stav === "probiha" || m.objednano > 0);
      })
      .filter((o) => {
        const q = search.toLowerCase();
        if (!q) return true;
        return o.zakaznik.toLowerCase().includes(q) || (o.popis || "").toLowerCase().includes(q) || o.cislo.toLowerCase().includes(q);
      })
      .sort((a, b) => (a.vytvoreno < b.vytvoreno ? 1 : -1));
  }, [orders, search, filterStav, filterMaterial, nastaveni]);

  const pracovniFronta = useMemo(() => {
    return orders
      .filter((o) => !UZAVRENE_STAVY.includes(o.stav) && o.stav !== "nova")
      .sort((a, b) => {
        if (!a.termin && !b.termin) return 0;
        if (!a.termin) return 1;
        if (!b.termin) return -1;
        return a.termin < b.termin ? -1 : a.termin > b.termin ? 1 : 0;
      });
  }, [orders]);

  const stats = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const counts = {};
    const sumyRok = {};
    STATUSES.forEach((s) => {
      counts[s.key] = 0;
      sumyRok[s.key] = 0;
    });
    orders.forEach((o) => {
      counts[o.stav] = (counts[o.stav] || 0) + 1;
      const rok = o.vytvoreno ? new Date(o.vytvoreno).getFullYear() : null;
      if (rok === currentYear) sumyRok[o.stav] = (sumyRok[o.stav] || 0) + (Number(o.cena) || 0);
    });
    const overdue = orders.filter(isOverdue);
    // Poptávky k vyřízení (Nová + Řeší se) a součet jejich odhadů ceny
    const aktivniPoptavky = poptavky.filter((p) => p.stav === "nova" || p.stav === "resiSe");
    const odhadPoptavek = aktivniPoptavky.reduce((sum, p) => sum + (Number(p.odhadCena) || 0), 0);
    const poptavkyBezOdhadu = aktivniPoptavky.filter((p) => !(Number(p.odhadCena) > 0)).length;
    return { counts, sumyRok, overdue, aktivniPoptavky: aktivniPoptavky.length, odhadPoptavek, poptavkyBezOdhadu, currentYear };
  }, [orders, poptavky]);

  if (session === undefined || loading) {
    return (
      <div style={{ height: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONTS.display, color: C.inkSoft, background: C.paper }}>
        Načítám dílnu…
      </div>
    );
  }
  if (!session) return null;

  return (
    <div style={{ minHeight: "100vh", background: C.paper, fontFamily: FONTS.body, color: C.ink, position: "relative" }}>
      <img
        src="/logo-mysteel.jpg"
        alt=""
        aria-hidden="true"
        style={{
          position: "fixed",
          bottom: "-8vw",
          right: "-8vw",
          width: "42vw",
          maxWidth: 520,
          opacity: 0.05,
          pointerEvents: "none",
          userSelect: "none",
          zIndex: 0,
        }}
      />
      <div style={{ position: "relative", zIndex: 1 }}>
      <div
        style={{
          background: "#fff",
          color: C.ink,
          padding: "14px 20px",
          paddingTop: "calc(14px + env(safe-area-inset-top))",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          rowGap: 10,
          columnGap: 10,
          borderBottom: `1px solid ${C.line}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <img src="/logo-mysteel.jpg" alt="MySteel" style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0 }} />
          <span
            style={{
              fontFamily: FONTS.display,
              fontSize: "clamp(15px, 4.2vw, 20px)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            Dílna — Zakázky
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "clamp(4px, 2vw, 14px)", flexWrap: "wrap", justifyContent: "flex-end" }}>
          <div className="skryt-na-mobilu" style={{ fontFamily: FONTS.mono, fontSize: 12, color: C.inkSoft, whiteSpace: "nowrap" }}>{fmtDate(todayISO())}</div>
          <button onClick={() => setShowGoogleDrive(true)} title="Google Drive" style={{ background: "none", border: "none", cursor: "pointer", color: C.ink, padding: 8 }}>
            <Cloud size={20} />
          </button>
          <button onClick={() => setShowZaloha(true)} title="Zálohování" style={{ background: "none", border: "none", cursor: "pointer", color: C.ink, padding: 8 }}>
            <DatabaseBackup size={20} />
          </button>
          <button onClick={() => setShowImportFaktur(true)} title="Import faktur přijatých (Flexi)" style={{ background: "none", border: "none", cursor: "pointer", color: C.ink, padding: 8 }}>
            <FileSpreadsheet size={20} />
          </button>
          <button onClick={() => setShowReport(true)} title="Měsíční report práce" style={{ background: "none", border: "none", cursor: "pointer", color: C.ink, padding: 8 }}>
            <BarChart3 size={20} />
          </button>
          <button onClick={() => setShowMaterialy(true)} title="Katalog materiálů" style={{ background: "none", border: "none", cursor: "pointer", color: C.ink, padding: 8 }}>
            <Layers size={20} />
          </button>
          <button onClick={() => setShowNastaveni(true)} title="Nastavení" style={{ background: "none", border: "none", cursor: "pointer", color: C.ink, padding: 8 }}>
            <Settings size={20} />
          </button>
          <button onClick={signOut} title="Odhlásit se" style={{ background: "none", border: "none", cursor: "pointer", color: C.ink, padding: 8 }}>
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {isOffline && (
        <div
          style={{
            background: "#E4E9EC",
            color: C.steelDark,
            borderBottom: `1px solid ${C.steel}`,
            padding: "10px 16px",
            fontSize: 13,
            textAlign: "center",
          }}
        >
          Jsi offline — aplikace zobrazuje poslední stažená data{offlineData ? "" : " z aktuální relace"}. Změny teď nejde uložit — zapiš je, až bude připojení zpátky.
        </div>
      )}

      {globalMessage && (
        <div
          style={{
            background: "#E6F0E8",
            color: C.mossDark,
            borderBottom: `1px solid ${C.moss}`,
            padding: "10px 16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 13,
            gap: 10,
          }}
        >
          <span>{globalMessage}</span>
          <button onClick={() => setGlobalMessage("")} style={{ background: "none", border: "none", color: C.mossDark, cursor: "pointer", padding: 6, margin: -6 }}>
            <X size={16} />
          </button>
        </div>
      )}

      {globalError && (
        <div
          style={{
            background: "#FBEAE3",
            color: C.danger,
            borderBottom: `1px solid ${C.rust}`,
            padding: "10px 16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 13,
            gap: 10,
          }}
        >
          <span>{globalError}</span>
          <button onClick={() => setGlobalError("")} style={{ background: "none", border: "none", color: C.danger, cursor: "pointer", padding: 6, margin: -6 }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Quick actions */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, padding: "12px 16px", background: C.paper }}>
        <button
          onClick={() => setShowWorkModal(true)}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "14px 6px", borderRadius: 10, border: `1.5px solid ${C.steel}`, background: C.surface, color: C.steel, cursor: "pointer" }}
        >
          <Timer size={22} />
          <span style={{ fontFamily: FONTS.display, textTransform: "uppercase", fontSize: 12, letterSpacing: "0.03em", textAlign: "center" }}>Zapsat práci</span>
        </button>
        <button
          onClick={() => setShowReceiptModal(true)}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "14px 6px", borderRadius: 10, border: `1.5px solid ${C.brass}`, background: C.surface, color: C.brass, cursor: "pointer" }}
        >
          <Camera size={22} />
          <span style={{ fontFamily: FONTS.display, textTransform: "uppercase", fontSize: 12, letterSpacing: "0.03em", textAlign: "center" }}>Zapsat náklady/účtenky</span>
        </button>
        <button
          onClick={() => setShowDetailPicker(true)}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "14px 6px", borderRadius: 10, border: `1.5px solid ${C.rust}`, background: C.surface, color: C.rust, cursor: "pointer" }}
        >
          <ClipboardList size={22} />
          <span style={{ fontFamily: FONTS.display, textTransform: "uppercase", fontSize: 12, letterSpacing: "0.03em", textAlign: "center" }}>Detail zakázek</span>
        </button>
      </div>

      {/* Tabs */}
      <div style={{ position: "relative" }}>
        <div style={{ display: "flex", gap: 4, padding: "10px 16px 0", background: C.paper, borderBottom: `1px solid ${C.line}`, overflowX: "auto" }}>
        {[
          { key: "prehled", label: "Přehled", icon: LayoutDashboard },
          { key: "zakazky", label: "Zakázky", icon: ClipboardList },
          { key: "kalendar", label: "Kalendář", icon: CalendarDays },
          { key: "vykaz", label: "Výkaz práce", icon: Timer },
          { key: "ukoly", label: "Úkoly", icon: ListChecks },
          { key: "poptavky", label: "Poptávky", icon: Inbox },
        ].map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => {
                if (t.key === "vykaz") setVykazInitialDen(null);
                setTab(t.key);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 16px",
                background: active ? C.surface : "transparent",
                border: "none",
                borderTopLeftRadius: 8,
                borderTopRightRadius: 8,
                borderBottom: active ? `3px solid ${C.rust}` : "3px solid transparent",
                fontFamily: FONTS.display,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                fontSize: 13,
                color: active ? C.ink : C.inkSoft,
                cursor: "pointer",
              }}
            >
              <Icon size={15} />
              {t.label}
              {t.key === "poptavky" && pocetNovychPoptavek > 0 && (
                <span
                  style={{
                    background: C.danger,
                    color: "#fff",
                    borderRadius: 10,
                    fontSize: 10,
                    fontFamily: FONTS.mono,
                    padding: "1px 6px",
                    marginLeft: 2,
                  }}
                >
                  {pocetNovychPoptavek}
                </span>
              )}
              {t.key === "ukoly" && ukoly.filter((u) => u.prirazenoKomu === session?.user?.email && !u.hotovo).length > 0 && (
                <span
                  style={{
                    background: C.ink,
                    color: "#fff",
                    borderRadius: 10,
                    fontSize: 10,
                    fontFamily: FONTS.mono,
                    padding: "1px 6px",
                    marginLeft: 2,
                  }}
                >
                  {ukoly.filter((u) => u.prirazenoKomu === session?.user?.email && !u.hotovo).length}
                </span>
              )}
            </button>
          );
        })}
        </div>
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 1,
            right: 0,
            width: 24,
            background: `linear-gradient(to right, transparent, ${C.paper})`,
            pointerEvents: "none",
          }}
        />
      </div>

      <div style={{ padding: 20, maxWidth: 1100, margin: "0 auto" }}>
        {tab === "prehled" && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontFamily: FONTS.display, letterSpacing: "0.12em", textTransform: "uppercase", fontSize: 12, color: C.inkSoft, marginBottom: 8 }}>
                Co se má dělat — podle termínu zhotovení
              </div>
              {pracovniFronta.length === 0 ? (
                <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 8, padding: 20, textAlign: "center", color: C.inkSoft, fontSize: 14 }}>
                  Žádná otevřená zakázka k práci.
                </div>
              ) : (
                <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 8, overflow: "hidden" }}>
                  {pracovniFronta.map((o, i) => {
                    const plan = planHodin(o);
                    const odvedeno = sumHodin(o.prace);
                    const overdueRow = isOverdue(o);
                    const madeProgress = plan > 0 ? Math.min(100, Math.round((odvedeno / plan) * 100)) : null;
                    return (
                      <div
                        key={o.id}
                        onClick={() => setDetailOrder(o)}
                        style={{
                          padding: "12px 16px",
                          borderTop: i > 0 ? `1px solid ${C.line}` : "none",
                          cursor: "pointer",
                          borderLeft: overdueRow ? `3px solid ${C.ink}` : `3px solid ${C.line}`,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <span style={{ fontFamily: FONTS.mono, fontSize: 12, color: C.inkSoft }}>{o.cislo}</span>
                          <StampBadge status={o.stav} small />
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                          <div style={{ fontWeight: 600, fontSize: 15 }}>{o.zakaznik}</div>
                          <div style={{ fontFamily: FONTS.mono, fontSize: 16, fontWeight: 600, whiteSpace: "nowrap" }}>{fmtMoney(o.cena)}</div>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: overdueRow ? C.ink : C.inkSoft, fontWeight: overdueRow ? 600 : 400, marginBottom: 4 }}>
                          <span>Termín {fmtDate(o.termin)}</span>
                          <span style={{ fontFamily: FONTS.mono }}>
                            plán {fmtCislo(plan)} h · odvedeno {fmtCislo(odvedeno)} h
                          </span>
                        </div>
                        {plan > 0 && (
                          <div style={{ height: 4, borderRadius: 2, background: C.paper, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${madeProgress}%`, background: C.ink }} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
              {STATUSES.map((s) => (
                <div key={s.key} style={{ background: C.surface, borderRadius: 8, padding: 14, border: `1px solid ${C.line}`, borderTop: `4px solid ${s.color}` }}>
                  <div style={{ fontSize: 30, fontFamily: FONTS.mono, fontWeight: 500 }}>{stats.counts[s.key] || 0}</div>
                  <div style={{ fontSize: 12, color: C.inkSoft, fontFamily: FONTS.display, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{s.label}</div>
                  <div style={{ fontSize: 13, fontFamily: FONTS.mono, color: s.color, borderTop: `1px dashed ${C.line}`, paddingTop: 6 }}>
                    {fmtMoney(stats.sumyRok[s.key] || 0)}
                    <span style={{ fontSize: 10, color: C.inkSoft, marginLeft: 4 }}>/ {stats.currentYear}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid-2" style={{ marginBottom: 20 }}>
              <div style={{ background: C.surface, borderRadius: 8, padding: 16, border: `1px solid ${C.line}` }}>
                <div style={{ fontFamily: FONTS.display, letterSpacing: "0.12em", textTransform: "uppercase", fontSize: 12, color: C.inkSoft, marginBottom: 8 }}>
                  Poptávky k vyřízení ({stats.aktivniPoptavky}) — odhad celkem
                </div>
                <div style={{ fontSize: 26, fontFamily: FONTS.mono, color: C.steel }}>{fmtMoney(stats.odhadPoptavek)}</div>
                {stats.poptavkyBezOdhadu > 0 && (
                  <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 4 }}>
                    {stats.poptavkyBezOdhadu} {stats.poptavkyBezOdhadu === 1 ? "poptávka nemá" : stats.poptavkyBezOdhadu < 5 ? "poptávky nemají" : "poptávek nemá"} vyplněný odhad
                  </div>
                )}
              </div>
              <div style={{ background: C.surface, borderRadius: 8, padding: 16, border: `1px solid ${C.line}` }}>
                <div style={{ fontFamily: FONTS.display, letterSpacing: "0.12em", textTransform: "uppercase", fontSize: 12, color: C.inkSoft, marginBottom: 8 }}>Zakázek celkem</div>
                <div style={{ fontSize: 26, fontFamily: FONTS.mono, color: C.steel }}>{orders.length}</div>
              </div>
            </div>

            {stats.overdue.length > 0 ? (
              <div style={{ background: "#FBEAE3", border: `1px solid ${C.rust}`, borderRadius: 8, padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, color: C.rust, fontFamily: FONTS.display, textTransform: "uppercase", fontSize: 13 }}>
                  <Clock size={16} /> Po termínu ({stats.overdue.length})
                </div>
                {stats.overdue.map((o) => (
                  <div key={o.id} onClick={() => setDetailOrder(o)} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", cursor: "pointer", fontSize: 14 }}>
                    <span>
                      <span style={{ fontFamily: FONTS.mono }}>{o.cislo}</span> — {o.zakaznik}
                    </span>
                    <span style={{ color: C.rust }}>termín {fmtDate(o.termin)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: C.inkSoft, fontSize: 14, textAlign: "center", padding: 30 }}>Žádné termíny nejsou po lhůtě. Dílna jede hladce.</div>
            )}
          </div>
        )}

        {tab === "poptavky" && (
          <PoptavkyPanel
            poptavky={poptavky}
            nacteno={poptavkyNacteny}
            onNova={() => setPoptavkaForm("nova")}
            onOpen={(p) => setDetailPoptavkyId(p.id)}
          />
        )}

        {tab === "zakazky" && (
          <div>
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ position: "relative", flex: "1 1 220px" }}>
                <Search size={15} style={{ position: "absolute", left: 10, top: 10, color: C.inkSoft }} />
                <TextInput value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 32 }} />
              </div>
              <Select value={filterStav} onChange={(e) => setFilterStav(e.target.value)} style={{ width: 180 }}>
                <option value="vse">Všechny stavy</option>
                {STATUSES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </Select>
              <Select value={filterMaterial} onChange={(e) => setFilterMaterial(e.target.value)} style={{ width: 190 }}>
                <option value="vse">Materiál: vše</option>
                <option value="neobjednany">Materiál neobjednaný</option>
                <option value="objednany">Materiál objednán ✓</option>
              </Select>
              <Button
                variant="rust"
                onClick={() => {
                  setEditingOrder(null);
                  setNadrazenaZakazkaProNovou(null);
                  setDuplikatZakazky(null);
                  setShowOrderForm(true);
                }}
              >
                <Plus size={15} /> Nová zakázka
              </Button>
              <div style={{ display: "flex", border: `1px solid ${C.line}`, borderRadius: 6, overflow: "hidden" }}>
                <button
                  onClick={() => setZakazkyView("seznam")}
                  style={{
                    padding: "9px 12px",
                    border: "none",
                    cursor: "pointer",
                    background: zakazkyView === "seznam" ? C.steel : C.surface,
                    color: zakazkyView === "seznam" ? "#fff" : C.steel,
                    fontFamily: FONTS.display,
                    textTransform: "uppercase",
                    fontSize: 12,
                    letterSpacing: "0.03em",
                  }}
                >
                  Seznam
                </button>
                <button
                  onClick={() => setZakazkyView("nastenka")}
                  style={{
                    padding: "9px 12px",
                    border: "none",
                    cursor: "pointer",
                    background: zakazkyView === "nastenka" ? C.steel : C.surface,
                    color: zakazkyView === "nastenka" ? "#fff" : C.steel,
                    fontFamily: FONTS.display,
                    textTransform: "uppercase",
                    fontSize: 12,
                    letterSpacing: "0.03em",
                  }}
                >
                  Nástěnka
                </button>
              </div>
            </div>

            {zakazkyView === "nastenka" ? (
              <Nastenka orders={filteredOrders} onOpen={setDetailOrder} onChangeStatus={(o, stav) => zmenitStavZakazky(o, stav)} />
            ) : filteredOrders.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: C.inkSoft }}>Žádné zakázky neodpovídají filtru. Založ novou zakázku tlačítkem výše.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {filteredOrders.map((o) => (
                  <div
                    key={o.id}
                    onClick={() => setDetailOrder(o)}
                    style={{
                      background: C.surface,
                      border: `1px solid ${C.line}`,
                      borderRadius: 8,
                      padding: "14px 16px",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                      borderLeft: isOverdue(o) ? `4px solid ${C.rust}` : "4px solid transparent",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                        <span style={{ fontFamily: FONTS.mono, fontSize: 13, color: C.inkSoft }}>{o.cislo}</span>
                        {o.nadrazenaZakazkaId && (
                          <span style={{ fontSize: 11, color: C.steel, fontFamily: FONTS.display, textTransform: "uppercase" }}>↳ podzakázka</span>
                        )}
                        <StampBadge status={o.stav} small />
                        {isOverdue(o) && <span style={{ fontSize: 11, color: C.rust, fontFamily: FONTS.display }}>PO TERMÍNU</span>}
                        {(() => {
                          const m = stavObjednaniMaterialu(o, nastaveni);
                          if (m.vse && (m.celkem > 0 || o.materialObjednano))
                            return <span style={{ fontSize: 11, color: C.moss, fontFamily: FONTS.display, letterSpacing: "0.04em" }}>MATERIÁL ✓</span>;
                          if (m.celkem > 0)
                            return (
                              <span style={{ fontSize: 11, color: m.objednano ? C.brass : C.inkSoft, fontFamily: FONTS.mono }}>
                                materiál {m.objednano}/{m.celkem}
                              </span>
                            );
                          return null;
                        })()}
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 600 }}>{o.zakaznik}</div>
                      <div style={{ fontSize: 13, color: C.inkSoft, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.popis}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontFamily: FONTS.mono, fontSize: 15 }}>{fmtMoney(o.cena)}</div>
                      <div style={{ fontSize: 12, color: C.inkSoft }}>termín {fmtDate(o.termin)}</div>
                      <div style={{ fontSize: 11, color: C.inkSoft, fontFamily: FONTS.mono }}>
                        plán {fmtCislo(planHodin(o))} h · odvedeno {fmtCislo(sumHodin(o.prace))} h
                      </div>
                    </div>
                    <ChevronRight size={18} color={C.inkSoft} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "kalendar" && (
          <Kalendar
            orders={orders}
            onOpen={setDetailOrder}
            onOpenVykaz={(datum) => {
              setVykazInitialDen(datum);
              setTab("vykaz");
            }}
          />
        )}
        {tab === "vykaz" && <VykazPrace orders={orders} onOpenOrder={setDetailOrder} initialDen={vykazInitialDen} />}
        {tab === "ukoly" && (
          <UkolyPanel
            ukoly={ukoly}
            orders={orders}
            uzivatele={uzivatele}
            mujEmail={session?.user?.email}
            onCreate={createUkol}
            onToggleHotovo={toggleUkolHotovo}
            onDelete={deleteUkol}
            onOpenOrder={setDetailOrder}
          />
        )}
      </div>

      {showOrderForm && (
        <Modal
          title={editingOrder ? "Upravit zakázku" : poptavkaProZakazku ? `Zakázka z poptávky ${poptavkaProZakazku.cislo}` : duplikatZakazky ? "Duplikovat zakázku" : "Nová zakázka"}
          onClose={() => {
            setShowOrderForm(false);
            if (poptavkaProZakazku) {
              setDetailPoptavkyId(poptavkaProZakazku.id);
              setPoptavkaProZakazku(null);
            }
          }}
        >
          <OrderForm
            initial={editingOrder || (poptavkaProZakazku ? zakazkaZPoptavky(poptavkaProZakazku) : null)}
            zPoptavky={poptavkaProZakazku}
            orders={orders}
            organizace={organizace}
            nadrazenaZakazka={nadrazenaZakazkaProNovou}
            duplikatZakazky={duplikatZakazky}
            onSaveOrganizace={saveOrganizace}
            onSave={poptavkaProZakazku ? ulozitZakazkuZPoptavky : saveOrder}
            onClose={() => {
              setShowOrderForm(false);
              setNadrazenaZakazkaProNovou(null);
              setDuplikatZakazky(null);
              if (poptavkaProZakazku) {
                setDetailPoptavkyId(poptavkaProZakazku.id);
                setPoptavkaProZakazku(null);
              }
            }}
          />
        </Modal>
      )}

      {poptavkaForm && (
        <Modal title={poptavkaForm === "nova" ? "Nová poptávka" : "Upravit poptávku"} onClose={() => setPoptavkaForm(null)}>
          <PoptavkaForm
            initial={poptavkaForm === "nova" ? null : poptavkaForm}
            poptavky={poptavky}
            organizace={organizace}
            onSaveOrganizace={saveOrganizace}
            vlastni={{
              // Vlastní e-maily a údaje firmy se při načítání z e-mailu nikdy nevyplní jako zákazník
              emaily: [nastaveni.firmaEmail, session?.user?.email, ...uzivatele.map((u) => u.email)].filter(Boolean),
              ico: nastaveni.firmaIco,
              nazev: nastaveni.firmaNazev,
              adresa: nastaveni.firmaAdresa,
            }}
            onSave={ulozitPoptavku}
            onClose={() => setPoptavkaForm(null)}
          />
        </Modal>
      )}

      {detailPoptavky && !poptavkaForm && (
        <Modal title={`Poptávka ${detailPoptavky.cislo}`} onClose={() => setDetailPoptavkyId(null)} width={600}>
          <PoptavkaDetail
            poptavka={detailPoptavky}
            jeSpravce={mojeRole === "sa"}
            onEdit={() => setPoptavkaForm(detailPoptavky)}
            onPridatFotky={pridatFotkyKPoptavce}
            onOdebratFotku={odebratFotkuZPoptavky}
            onPridatPoznamku={pridatPoznamkuKPoptavce}
            onZmenitStav={zmenitStavPoptavky}
            onVytvoritZakazku={vytvoritZakazkuZPoptavky}
            onOtevritZakazku={otevritZakazkuZPoptavky}
            onDelete={smazatPoptavku}
          />
        </Modal>
      )}

      {showDetailPicker && (
        <Modal title="Vyber zakázku" onClose={() => setShowDetailPicker(false)}>
          <OrderPicker
            orders={orders}
            onPick={(o) => {
              setShowDetailPicker(false);
              setDetailOrder(o);
            }}
          />
        </Modal>
      )}

      {showWorkModal && (
        <Modal title="Zapsat práci" onClose={() => setShowWorkModal(false)}>
          <WorkLogFlow orders={orders} nastaveni={nastaveni} uzivatele={uzivatele} onSubmit={addWorkEntry} onCreateOrder={createOrderQuick} onClose={() => setShowWorkModal(false)} />
        </Modal>
      )}

      {showReceiptModal && (
        <Modal title="Zapsat náklady/účtenky" onClose={() => setShowReceiptModal(false)}>
          <ZapsatNakladFlow orders={orders} onSubmit={zapsatNaklady} onClose={() => setShowReceiptModal(false)} />
        </Modal>
      )}

      {showImportFaktur && (
        <Modal title="Import faktur přijatých (Flexi)" onClose={() => setShowImportFaktur(false)} zIndex={60}>
          <ImportFakturFlow orders={orders} onImportovat={importovatFaktury} onClose={() => setShowImportFaktur(false)} />
        </Modal>
      )}

      {showNastaveni && (
        <Modal title="Nastavení" onClose={() => setShowNastaveni(false)} width={460}>
          <NastaveniForm
            initial={nastaveni}
            uzivatele={uzivatele}
            onSave={saveNastaveni}
            onMigrovatUctenky={migrovatUctenky}
            onClose={() => setShowNastaveni(false)}
          />
        </Modal>
      )}

      {showReport && (
        <Modal title="Měsíční report práce" onClose={() => setShowReport(false)} width={620}>
          <PraceReport orders={orders} onClose={() => setShowReport(false)} />
        </Modal>
      )}

      {showGoogleDrive && (
        <Modal title="Google Drive" onClose={() => setShowGoogleDrive(false)} width={480}>
          <GoogleDrivePanel onClose={() => setShowGoogleDrive(false)} />
        </Modal>
      )}

      {showZaloha && (
        <Modal title="Zálohování" onClose={() => setShowZaloha(false)} width={520}>
          <ZalohaPanel
            orders={orders}
            poptavky={poptavky}
            dodavatele={dodavatele}
            nastaveni={nastaveni}
            materialHistory={materialHistory}
            onRestored={loadAllData}
            onClose={() => setShowZaloha(false)}
          />
        </Modal>
      )}

      {showMaterialy && (
        <Modal title={katalogZalozka === "dodavatele" ? "Dodavatelé" : "Katalog materiálů"} onClose={() => setShowMaterialy(false)} width={560}>
          <div style={{ display: "flex", gap: 0, marginBottom: 14 }}>
            {[
              { key: "materialy", label: "Materiály" },
              { key: "dodavatele", label: "Dodavatelé" },
            ].map((z, i) => (
              <button
                key={z.key}
                type="button"
                onClick={() => setKatalogZalozka(z.key)}
                style={{
                  flex: 1,
                  padding: "8px 10px",
                  border: `1px solid ${C.line}`,
                  borderRadius: i === 0 ? "6px 0 0 6px" : "0 6px 6px 0",
                  background: katalogZalozka === z.key ? C.ink : C.surface,
                  color: katalogZalozka === z.key ? "#fff" : C.ink,
                  fontFamily: FONTS.display,
                  textTransform: "uppercase",
                  fontSize: 12,
                  letterSpacing: "0.05em",
                  cursor: "pointer",
                }}
              >
                {z.label}
              </button>
            ))}
          </div>
          {katalogZalozka === "dodavatele" ? (
            <DodavateleKatalog dodavatele={dodavatele} materialHistory={materialHistory} nacteno={dodavateleNacteni} onSave={ulozitDodavatele} onDelete={smazatDodavatele} />
          ) : (
            <MaterialyKatalog materialHistory={materialHistory} onChange={setMaterialHistory} onClose={() => setShowMaterialy(false)} />
          )}
        </Modal>
      )}

      {kalkulaceOrder && (
        <Modal title={`Kalkulace — ${kalkulaceOrder.cislo}`} onClose={() => setKalkulaceOrder(null)} width={640} zIndex={60}>
          <KalkulaceForm
            order={kalkulaceOrder}
            orders={orders}
            nastaveni={nastaveni}
            materialHistory={materialHistory}
            onSave={(polozky, celkem, sazbaDph) => saveKalkulace(kalkulaceOrder, polozky, celkem, sazbaDph)}
            onClose={() => setKalkulaceOrder(null)}
          />
        </Modal>
      )}

      {quoteData && <QuoteView order={quoteData.order} polozky={quoteData.polozky} celkem={quoteData.celkem} nastaveni={nastaveni} onClose={() => setQuoteData(null)} />}

      {poptavkaOrder && (
        <MaterialOrderView
          order={orders.find((o) => o.id === poptavkaOrder.id) || poptavkaOrder}
          nastaveni={nastaveni}
          dodavatele={dodavatele}
          onUlozitDodavatele={dodavateleNacteni ? ulozitDodavatele : null}
          onZmenaChecklistu={zmenitChecklistMaterialu}
          mujEmail={session?.user?.email || ""}
          onClose={() => setPoptavkaOrder(null)}
        />
      )}

      {protokolOrder && (
        <Modal title={`Předávací protokol — ${protokolOrder.cislo}`} onClose={() => setProtokolOrder(null)} width={640} zIndex={60}>
          <ProtokolView
            order={protokolOrder}
            nastaveni={nastaveni}
            onSave={saveProtokol}
            onClose={() => setProtokolOrder(null)}
            onPrint={(protokol, signatureUrl, fotky) => setProtokolPrint({ protokol, signatureUrl, fotky })}
          />
        </Modal>
      )}

      {protokolPrint && (
        <ProtokolPrintView protokol={protokolPrint.protokol} signatureUrl={protokolPrint.signatureUrl} fotky={protokolPrint.fotky} onClose={() => setProtokolPrint(null)} />
      )}

      {fotkaOrder && (
        <Modal title={`Fotka — ${fotkaOrder.cislo}`} onClose={() => setFotkaOrder(null)} width={480} zIndex={60}>
          <WorkPhotoFlow order={fotkaOrder} onSubmit={addWorkPhoto} onClose={() => setFotkaOrder(null)} />
        </Modal>
      )}

      {nakladyOrder && (
        <Modal
          title={`Sledování nákladů — ${nakladyOrder.cislo}`}
          onClose={() => {
            if (nakladyNeulozeno && !window.confirm("Máš tu nezapsaný (neuložený) náklad — opravdu zavřít bez uložení?")) return;
            setNakladyOrder(null);
            setNakladyNeulozeno(false);
          }}
          width={600}
          zIndex={60}
        >
          <NakladyForm
            order={nakladyOrder}
            nastaveni={nastaveni}
            onSave={saveNaklady}
            onDirtyChange={setNakladyNeulozeno}
            onClose={() => {
              if (nakladyNeulozeno && !window.confirm("Máš tu nezapsaný (neuložený) náklad — opravdu zavřít bez uložení?")) return;
              setNakladyOrder(null);
              setNakladyNeulozeno(false);
            }}
          />
        </Modal>
      )}

      {detailOrder && (
        <Modal title={`Zakázka ${detailOrder.cislo}`} onClose={() => setDetailOrder(null)} width={600}>
          <OrderDetail
            order={detailOrder}
            orders={orders}
            nastaveni={nastaveni}
            mojeRole={mojeRole}
            onSave={saveOrder}
            onZmenaStavu={zmenitStavZakazky}
            onZmenitDilciPole={aktualizovatDilciPole}
            onZmenitChecklist={zmenitChecklistMaterialu}
            onSmazatFotku={smazatFotku}
            mujEmail={session?.user?.email || ""}
            onDelete={deleteOrder}
            onEdit={() => {
              setEditingOrder(detailOrder);
              setNadrazenaZakazkaProNovou(null);
              setDuplikatZakazky(null);
              setShowOrderForm(true);
              setDetailOrder(null);
            }}
            onDuplikovat={(order) => {
              setEditingOrder(null);
              setNadrazenaZakazkaProNovou(null);
              setDuplikatZakazky(order);
              setShowOrderForm(true);
              setDetailOrder(null);
            }}
            onOpenKalkulace={() => setKalkulaceOrder(detailOrder)}
            onOpenNabidka={() => {
              const polozky = normalizovatKalkulaci(detailOrder.kalkulace);
              const sazbaDph = detailOrder.sazbaDph ?? DPH_SAZBA;
              const celkem = computeKalkulaceCelkem(polozky, nastaveni, sazbaDph);
              setQuoteData({ order: { ...detailOrder, sazbaDph }, polozky, celkem });
            }}
            onOpenPoptavka={() => setPoptavkaOrder(detailOrder)}
            onOpenProtokol={() => setProtokolOrder(detailOrder)}
            onOpenFotka={() => setFotkaOrder(detailOrder)}
            onOpenNaklady={() => {
              setNakladyNeulozeno(false);
              setNakladyOrder(detailOrder);
            }}
            onEditPrace={editPrace}
            onGeneratePdf={() => generatePdf(detailOrder)}
            generatingPdf={generatingPdfId === detailOrder?.id}
            onOpenOrder={(o) => setDetailOrder(o)}
            uzivatele={uzivatele}
            onAddPodzakazka={(rodic) => {
              setNadrazenaZakazkaProNovou(rodic);
              setEditingOrder(null);
              setDuplikatZakazky(null);
              setDetailOrder(null);
              setShowOrderForm(true);
            }}
            onClose={() => setDetailOrder(null)}
          />
        </Modal>
      )}
      </div>
    </div>
  );
}
