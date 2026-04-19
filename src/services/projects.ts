import { supabase } from "@/integrations/supabase/client";

export async function getProjects() {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getProject(id: string) {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createProject(input: { name: string; description?: string }) {
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("projects")
    .insert({ ...input, created_by: auth.user?.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProject(id: string, input: { name?: string; description?: string }) {
  const { data, error } = await supabase
    .from("projects")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteProject(id: string) {
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw error;
}
