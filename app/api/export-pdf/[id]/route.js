import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { generovatPdfZakazky } from "@/lib/orderPdf";
import { nahratFotkuNaServeru } from "@/lib/photoUpload";
import { uid, todayISO, nazevSlozkyZakazky } from "@/lib/theme";

export async function POST(request, { params }) {
  const { id } = params;

  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Chybí přihlášení." }, { status: 401 });

  const supabaseAdmin = getSupabaseAdmin();
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData?.user) {
    return NextResponse.json({ error: "Neplatné přihlášení." }, { status: 401 });
  }

  const [{ data: order, error: orderError }, { data: nastaveniRow }] = await Promise.all([
    supabaseAdmin.from("orders").select("*").eq("id", id).maybeSingle(),
    supabaseAdmin.from("nastaveni").select("*").eq("id", 1).maybeSingle(),
  ]);
  if (orderError || !order) return NextResponse.json({ error: "Zakázka nenalezena." }, { status: 404 });

  const nastaveni = nastaveniRow || {};

  try {
    const pdfBuffer = await generovatPdfZakazky(order, nastaveni, supabaseAdmin);
    const filename = `archiv-${order.cislo}-${Date.now()}.pdf`;
    const url = await nahratFotkuNaServeru(pdfBuffer, filename, "application/pdf", "archivy", nazevSlozkyZakazky(order));

    const noveArchivy = [{ id: uid(), datum: todayISO(), url }, ...(order.archivy || [])];
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("orders")
      .update({ archivy: noveArchivy })
      .eq("id", id)
      .select()
      .single();
    if (updateError) throw updateError;

    return NextResponse.json({ order: updated });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Vygenerování nebo uložení PDF se nepovedlo." }, { status: 500 });
  }
}
