// Server-only pomocníci pro práci s rolemi uživatelů (sa = správce, user = běžný pracovník).
export async function ziskatRoli(supabaseAdmin, userId) {
  const { data } = await supabaseAdmin.from("uzivatele_role").select("role").eq("user_id", userId).maybeSingle();
  return data?.role || "user"; // bez záznamu = bezpečný výchozí stav "user"
}

export async function jeSA(supabaseAdmin, userId) {
  return (await ziskatRoli(supabaseAdmin, userId)) === "sa";
}

// Ověří Bearer token z requestu a vrátí přihlášeného uživatele, nebo null.
export async function overitPrihlaseni(supabaseAdmin, request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}
