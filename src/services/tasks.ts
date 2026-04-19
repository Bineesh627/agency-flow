import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type TaskStatus = Database["public"]["Enums"]["task_status"];
export type TaskPriority = Database["public"]["Enums"]["task_priority"];
export type Task = Database["public"]["Tables"]["tasks"]["Row"];

export async function getTasksForProject(projectId: string) {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getMyTasks() {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("assigned_to", auth.user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function getTask(id: string) {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createTask(input: {
  title: string;
  description?: string;
  priority: TaskPriority;
  project_id: string;
  assigned_to?: string | null;
  due_date?: string | null;
}) {
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("tasks")
    .insert({ ...input, created_by: auth.user?.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTask(id: string, input: Partial<Task>) {
  const { data, error } = await supabase
    .from("tasks")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTaskStatus(id: string, status: TaskStatus) {
  return updateTask(id, { status });
}

export async function deleteTask(id: string) {
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw error;
}
