/* ============================================================
   Capa de nube (Supabase): autenticación, amigos, listas
   compartidas, notificaciones y push. Si config.js no tiene
   credenciales, cloudEnabled=false y la app funciona 100% local.
   ============================================================ */
import { createClient } from "@supabase/supabase-js";

const cfg = (typeof window !== "undefined" && window.FINANZAS_CONFIG) || {};

export const cloudEnabled = !!(cfg.supabaseUrl && cfg.supabaseAnonKey);
export const supabase = cloudEnabled ? createClient(cfg.supabaseUrl, cfg.supabaseAnonKey) : null;

export const EMPTY_SOCIAL = {
  profile: null, friends: [], notifications: [],
  lists: [], members: [], categories: [], transactions: [],
};

/* filas de Supabase → forma que usa la app */
const mapCat = (c) => ({ id: c.id, listId: c.list_id, name: c.name, emoji: c.emoji, color: c.color, shared: true });
const mapTx = (t) => ({
  id: t.id, listId: t.list_id, categoryId: t.category_id, type: t.type,
  amount: Number(t.amount), description: t.description || "", date: t.date,
  authorId: t.author, shared: true,
});

/* Carga todo el estado social del usuario (RLS filtra lo que no le toca). */
export async function fetchSocial(uid) {
  const [prof, fr, notifs, lists, members, cats, txs] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
    supabase.from("friendships").select("*"),
    supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(120),
    supabase.from("shared_lists").select("*").order("created_at", { ascending: true }),
    supabase.from("list_members").select("*"),
    supabase.from("shared_categories").select("*").order("created_at", { ascending: true }),
    supabase.from("shared_transactions").select("*"),
  ]);
  const friendIds = (fr.data || []).map((f) => (f.user_lo === uid ? f.user_hi : f.user_lo));
  const memberIds = (members.data || []).map((m) => m.user_id);
  const ids = [...new Set([...friendIds, ...memberIds])];
  let profileMap = new Map();
  if (ids.length) {
    const { data } = await supabase.from("profiles").select("id,name,photo,email").in("id", ids);
    profileMap = new Map((data || []).map((p) => [p.id, p]));
  }
  return {
    profile: prof.data || null,
    friends: friendIds.map((id) => profileMap.get(id)).filter(Boolean),
    notifications: notifs.data || [],
    lists: lists.data || [],
    members: (members.data || []).map((m) => ({
      listId: m.list_id, userId: m.user_id, profile: profileMap.get(m.user_id) || null,
    })),
    categories: (cats.data || []).map(mapCat),
    transactions: (txs.data || []).map(mapTx),
  };
}

/* ---------------- mutaciones ---------------- */
export const cloudApi = {
  signUp: (email, password, name) =>
    supabase.auth.signUp({ email: email.trim().toLowerCase(), password, options: { data: { name } } }),
  signIn: (email, password) =>
    supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password }),
  signOut: () => supabase.auth.signOut(),
  updateProfile: (uid, patch) =>
    supabase.from("profiles").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", uid),

  sendFriendRequest: (email) => supabase.rpc("send_friend_request", { target_email: email }),
  respondFriendRequest: (id, accept) => supabase.rpc("respond_friend_request", { request_id: id, accept }),
  removeFriend: (fid) => supabase.rpc("remove_friend", { friend_id: fid }),

  createSharedList: (name) => supabase.rpc("create_shared_list", { list_name: name }),
  renameSharedList: (id, name) => supabase.from("shared_lists").update({ name }).eq("id", id),
  leaveSharedList: (id) => supabase.rpc("leave_shared_list", { target_list: id }),
  inviteToList: (listId, fid) => supabase.rpc("invite_to_list", { target_list: listId, friend_id: fid }),
  respondListInvite: (id, accept) => supabase.rpc("respond_list_invite", { invite_id: id, accept }),

  addCategory: async (listId, { name, emoji, color }) => {
    const { data, error } = await supabase.from("shared_categories")
      .insert({ list_id: listId, name, emoji, color }).select().single();
    if (error) throw error;
    return mapCat(data);
  },
  updateCategory: (id, patch) => supabase.from("shared_categories").update(patch).eq("id", id),
  deleteCategory: (id) => supabase.from("shared_categories").delete().eq("id", id),

  addTransaction: (uid, p) => supabase.from("shared_transactions").insert({
    list_id: p.listId, category_id: p.categoryId, author: uid,
    type: p.type, amount: p.amount, description: p.description, date: p.date,
  }),
  editTransaction: (id, p) => supabase.from("shared_transactions").update({
    category_id: p.categoryId, type: p.type, amount: p.amount, description: p.description, date: p.date,
  }).eq("id", id),
  deleteTransaction: (id) => supabase.from("shared_transactions").delete().eq("id", id),

  markNotificationsRead: () => supabase.from("notifications").update({ read: true }).eq("read", false),
  deleteNotification: (id) => supabase.from("notifications").delete().eq("id", id),
};

/* ---------------- push ---------------- */
function urlB64ToUint8(base64) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export async function enablePush(uid) {
  if (!cfg.vapidPublicKey) return "no_key";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return "denied";
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlB64ToUint8(cfg.vapidPublicKey),
    });
  }
  const j = sub.toJSON();
  const { error } = await supabase.from("push_subscriptions").upsert({
    user_id: uid, endpoint: sub.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth,
  });
  return error ? "error" : "ok";
}
