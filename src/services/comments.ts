import { supabase } from "@/integrations/supabase/client";

export async function getComments(taskId: string) {
  const { data, error } = await supabase
    .from("comments")
    .select("*, profiles:profiles!comments_user_id_fkey(name, email)")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });
  if (error) {
    // Fallback if join name isn't auto-detected
    const fallback = await supabase
      .from("comments")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", { ascending: true });
    if (fallback.error) throw fallback.error;
    return fallback.data.map((c) => ({ ...c, profiles: null }));
  }
  return data;
}

export async function addComment(taskId: string, content: string) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Not authenticated");
  const { data, error } = await supabase
    .from("comments")
    .insert({ task_id: taskId, content, user_id: auth.user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}
