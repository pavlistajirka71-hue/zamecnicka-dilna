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
  Settings,
  LogOut,
  Layers,
  BarChart3,
  DatabaseBackup,
  Cloud,
  FileSpreadsheet,
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
  upsertMaterialHistory,
  upsertOrganizaceHistory,
  planHodin,
  sumHodin,
  isOverdue,
  fmtDate,
  fmtMoney,
  todayISO,
} from "@/lib/theme";
import { Button, TextInput, Select, Modal, StampBadge } from "@/components/ui";
import OrderForm from "@/components/OrderForm";
import OrderPicker from "@/components/OrderPicker";
import WorkLogFlow from "@/components/WorkLogFlow";
import ZapsatNakladFlow from "@/components/ZapsatNakladFlow";
import ImportFakturFlow from "@/components/ImportFakturFlow";
import KalkulaceForm from "@/components/KalkulaceForm";
import Kalendar from "@/components/Kalendar";
import VykazPrace from "@/components/VykazPrace";
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

  const [tab, setTab] = useState("prehled");
  const [vykazInitialDen, setVykazInitialDen] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStav, setFilterStav] = useState("vse");
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
  const [poptavkaOrder, setPoptavkaOrder] = useState(null);
  const [showReport, setShowReport] = useState(false);
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
    const [ordersRes, nastaveniRes, historyRes, organizaceRes] = await Promise.all([
      supabase.from("orders").select("*").order("vytvoreno", { ascending: false }),
      supabase.from("nastaveni").select("*").eq("id", 1).maybeSingle(),
      supabase.from("material_history").select("*"),
      supabase.from("organizace").select("*"),
    ]);
    const noveOrders = ordersRes.data || [];
    setOrders(noveOrders);
    if (nastaveniRes.data) setNastaveni({ ...DEFAULT_NASTAVENI, ...nastaveniRes.data });
    setMaterialHistory(historyRes.data || []);
    setOrganizace(organizaceRes.data || []);
    setOfflineData(false);
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

    const { data, error } = await supabase.from("orders").upsert(cistaZakazka).select().single();
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

  const deleteOrder = async (id) => {
    const { error } = await supabase.from("orders").delete().eq("id", id);
    if (error) {
      console.error(error);
      setGlobalError("Smazání zakázky se nepovedlo. Zkus to znovu.");
      return;
    }
    setOrders((prev) => prev.filter((o) => o.id !== id));
    setDetailOrder(null);
  };

  const addWorkEntry = async (order, entry) => {
    const nextPrace = [entry, ...(order.prace || [])];
    const { data, error } = await supabase.from("orders").update({ prace: nextPrace }).eq("id", order.id).select().single();
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
    const { data, error } = await supabase.from("orders").update({ prace: novePrace }).eq("id", order.id).select().single();
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
        rozpocet.map(({ order, naklad }) => {
          const noveNaklady = [naklad, ...(order.naklady || [])];
          return supabase.from("orders").update({ naklady: noveNaklady }).eq("id", order.id).select().single();
        })
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
        Array.from(podleZakazky.values()).map(({ order, naklady }) => {
          const noveNaklady = [...naklady, ...(order.naklady || [])];
          return supabase.from("orders").update({ naklady: noveNaklady }).eq("id", order.id).select().single();
        })
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

  const addWorkPhoto = async (order, entry) => {
    const nextFotky = [entry, ...(order.fotky || [])];
    const { data, error } = await supabase.from("orders").update({ fotky: nextFotky }).eq("id", order.id).select().single();
    if (error) {
      console.error(error);
      setGlobalError("Fotku se nepovedlo uložit. Zkontroluj připojení a zkus to znovu.");
      throw error;
    }
    setOrders((prev) => prev.map((o) => (o.id === data.id ? data : o)));
    if (detailOrder && detailOrder.id === order.id) setDetailOrder(data);
    setFotkaOrder(null);
  };

  const saveNaklady = async (radky) => {
    const { data, error } = await supabase.from("orders").update({ naklady: radky }).eq("id", nakladyOrder.id).select().single();
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
    const { data, error } = await supabase.from("nastaveni").upsert({ id: 1, ...n }).select().single();
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
      .update({ kalkulace: polozky, cena: celkem.finalniCena, planCasDilna, planCasMontaz, sazbaDph })
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
        const q = search.toLowerCase();
        if (!q) return true;
        return o.zakaznik.toLowerCase().includes(q) || (o.popis || "").toLowerCase().includes(q) || o.cislo.toLowerCase().includes(q);
      })
      .sort((a, b) => (a.vytvoreno < b.vytvoreno ? 1 : -1));
  }, [orders, search, filterStav]);

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
    const otevrenaHodnota = orders.filter((o) => o.stav !== "fakturovano" && o.stav !== "neuspesnaNabidka").reduce((sum, o) => sum + (Number(o.cena) || 0), 0);
    return { counts, sumyRok, overdue, otevrenaHodnota, currentYear };
  }, [orders]);

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
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `1px solid ${C.line}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/logo-mysteel.jpg" alt="MySteel" style={{ width: 30, height: 30, borderRadius: "50%" }} />
          <span style={{ fontFamily: FONTS.display, fontSize: 20, letterSpacing: "0.04em", textTransform: "uppercase" }}>Dílna — Zakázky</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontFamily: FONTS.mono, fontSize: 12, color: C.inkSoft }}>{fmtDate(todayISO())}</div>
          <button onClick={() => setShowGoogleDrive(true)} title="Google Drive" style={{ background: "none", border: "none", cursor: "pointer", color: C.ink, padding: 10, margin: -10 }}>
            <Cloud size={20} />
          </button>
          <button onClick={() => setShowZaloha(true)} title="Zálohování" style={{ background: "none", border: "none", cursor: "pointer", color: C.ink, padding: 10, margin: -10 }}>
            <DatabaseBackup size={20} />
          </button>
          <button onClick={() => setShowImportFaktur(true)} title="Import faktur přijatých (Flexi)" style={{ background: "none", border: "none", cursor: "pointer", color: C.ink, padding: 10, margin: -10 }}>
            <FileSpreadsheet size={20} />
          </button>
          <button onClick={() => setShowReport(true)} title="Měsíční report práce" style={{ background: "none", border: "none", cursor: "pointer", color: C.ink, padding: 10, margin: -10 }}>
            <BarChart3 size={20} />
          </button>
          <button onClick={() => setShowMaterialy(true)} title="Katalog materiálů" style={{ background: "none", border: "none", cursor: "pointer", color: C.ink, padding: 10, margin: -10 }}>
            <Layers size={20} />
          </button>
          <button onClick={() => setShowNastaveni(true)} style={{ background: "none", border: "none", cursor: "pointer", color: C.ink, padding: 10, margin: -10 }}>
            <Settings size={20} />
          </button>
          <button onClick={signOut} title="Odhlásit se" style={{ background: "none", border: "none", cursor: "pointer", color: C.ink, padding: 10, margin: -10 }}>
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
          Jsi offline — aplikace zobrazuje poslední stažená data{offlineData ? "" : " z aktuální relace"}. Nové změny se uloží, až se připojení obnoví.
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
      <div style={{ display: "flex", gap: 4, padding: "10px 16px 0", background: C.paper, borderBottom: `1px solid ${C.line}`, overflowX: "auto" }}>
        {[
          { key: "prehled", label: "Přehled", icon: LayoutDashboard },
          { key: "zakazky", label: "Zakázky", icon: ClipboardList },
          { key: "kalendar", label: "Kalendář", icon: CalendarDays },
          { key: "vykaz", label: "Výkaz práce", icon: Timer },
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
            </button>
          );
        })}
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
                    return (
                      <div
                        key={o.id}
                        onClick={() => setDetailOrder(o)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "12px 16px",
                          borderTop: i > 0 ? `1px solid ${C.line}` : "none",
                          cursor: "pointer",
                          borderLeft: overdueRow ? `4px solid ${C.rust}` : "4px solid transparent",
                        }}
                      >
                        <div style={{ width: 78, flexShrink: 0 }}>
                          <div style={{ fontFamily: FONTS.mono, fontSize: 13, color: overdueRow ? C.rust : C.ink, fontWeight: 600 }}>{fmtDate(o.termin)}</div>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span style={{ fontFamily: FONTS.mono, fontSize: 12, color: C.inkSoft }}>{o.cislo}</span>
                            <StampBadge status={o.stav} small />
                          </div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{o.zakaznik}</div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontFamily: FONTS.mono, fontSize: 14 }}>{fmtMoney(o.cena)}</div>
                          <div style={{ fontSize: 11, color: C.inkSoft, fontFamily: FONTS.mono }}>
                            plán {plan} h · odvedeno {odvedeno} h
                          </div>
                        </div>
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
                  Otevřená hodnota zakázek (nevyfakturováno)
                </div>
                <div style={{ fontSize: 26, fontFamily: FONTS.mono, color: C.steel }}>{fmtMoney(stats.otevrenaHodnota)}</div>
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
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 600 }}>{o.zakaznik}</div>
                      <div style={{ fontSize: 13, color: C.inkSoft, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.popis}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontFamily: FONTS.mono, fontSize: 15 }}>{fmtMoney(o.cena)}</div>
                      <div style={{ fontSize: 12, color: C.inkSoft }}>termín {fmtDate(o.termin)}</div>
                      <div style={{ fontSize: 11, color: C.inkSoft, fontFamily: FONTS.mono }}>
                        plán {planHodin(o)} h · odvedeno {sumHodin(o.prace)} h
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
      </div>

      {showOrderForm && (
        <Modal title={editingOrder ? "Upravit zakázku" : duplikatZakazky ? "Duplikovat zakázku" : "Nová zakázka"} onClose={() => setShowOrderForm(false)}>
          <OrderForm
            initial={editingOrder}
            orders={orders}
            organizace={organizace}
            nadrazenaZakazka={nadrazenaZakazkaProNovou}
            duplikatZakazky={duplikatZakazky}
            onSaveOrganizace={saveOrganizace}
            onSave={saveOrder}
            onClose={() => {
              setShowOrderForm(false);
              setNadrazenaZakazkaProNovou(null);
              setDuplikatZakazky(null);
            }}
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
            nastaveni={nastaveni}
            materialHistory={materialHistory}
            onRestored={loadAllData}
            onClose={() => setShowZaloha(false)}
          />
        </Modal>
      )}

      {showMaterialy && (
        <Modal title="Katalog materiálů" onClose={() => setShowMaterialy(false)} width={560}>
          <MaterialyKatalog materialHistory={materialHistory} onChange={setMaterialHistory} onClose={() => setShowMaterialy(false)} />
        </Modal>
      )}

      {kalkulaceOrder && (
        <Modal title={`Kalkulace — ${kalkulaceOrder.cislo}`} onClose={() => setKalkulaceOrder(null)} width={640} zIndex={60}>
          <KalkulaceForm
            order={kalkulaceOrder}
            nastaveni={nastaveni}
            materialHistory={materialHistory}
            onSave={(polozky, celkem, sazbaDph) => saveKalkulace(kalkulaceOrder, polozky, celkem, sazbaDph)}
            onClose={() => setKalkulaceOrder(null)}
          />
        </Modal>
      )}

      {quoteData && <QuoteView order={quoteData.order} polozky={quoteData.polozky} celkem={quoteData.celkem} nastaveni={nastaveni} onClose={() => setQuoteData(null)} />}

      {poptavkaOrder && <MaterialOrderView order={poptavkaOrder} onClose={() => setPoptavkaOrder(null)} />}

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
