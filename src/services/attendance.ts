import { supabase } from "@/integrations/supabase/client";

export async function getAttendanceSettings() {
  const { data, error } = await supabase
    .from("attendance_settings")
    .select("*")
    .eq("id", true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateAttendanceSettings(input: {
  check_in_start: string;
  check_in_end: string;
  check_out_start: string;
  check_out_end: string;
  timezone: string;
}) {
  const { data, error } = await supabase
    .from("attendance_settings")
    .update(input)
    .eq("id", true)
    .select()
    .single();
  if (error) throw error;
  return data;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export async function getTodayAttendance() {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await supabase
    .from("attendance")
    .select("*")
    .eq("user_id", auth.user.id)
    .eq("date", todayStr())
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function checkIn() {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("attendance")
    .upsert(
      {
        user_id: auth.user.id,
        date: todayStr(),
        check_in: new Date().toISOString(),
      },
      { onConflict: "user_id,date" },
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function checkOut() {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not authenticated");
  const today = todayStr();
  const { data: existing, error: e1 } = await supabase
    .from("attendance")
    .select("*")
    .eq("user_id", auth.user.id)
    .eq("date", today)
    .maybeSingle();
  if (e1) throw e1;
  if (!existing?.check_in) throw new Error("You must check in first");

  const { data, error } = await supabase
    .from("attendance")
    .update({ check_out: new Date().toISOString() })
    .eq("id", existing.id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getMyAttendanceHistory() {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data, error } = await supabase
    .from("attendance")
    .select("*")
    .eq("user_id", auth.user.id)
    .order("date", { ascending: false })
    .limit(60);
  if (error) throw error;
  return data;
}

export async function getAllAttendance(filters?: { date?: string; userId?: string }) {
  let q = supabase
    .from("attendance")
    .select("*, profiles:profiles!attendance_user_id_fkey(name, email)")
    .order("date", { ascending: false })
    .limit(500);
  if (filters?.date) q = q.eq("date", filters.date);
  if (filters?.userId) q = q.eq("user_id", filters.userId);
  const { data, error } = await q;
  if (error) {
    let q2 = supabase.from("attendance").select("*").order("date", { ascending: false }).limit(500);
    if (filters?.date) q2 = q2.eq("date", filters.date);
    if (filters?.userId) q2 = q2.eq("user_id", filters.userId);
    const f = await q2;
    if (f.error) throw f.error;
    return f.data.map((r) => ({ ...r, profiles: null }));
  }
  return data;
}

// Determine if check-in/out is allowed right now based on settings (UTC server clock approximated by client clock).
export function withinWindow(now: Date, start: string, end: string, tz: string): boolean {
  // Compute the local time-of-day in the configured tz
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const hh = parts.find((p) => p.type === "hour")?.value ?? "00";
  const mm = parts.find((p) => p.type === "minute")?.value ?? "00";
  const cur = `${hh}:${mm}`;
  return cur >= start.slice(0, 5) && cur <= end.slice(0, 5);
}
