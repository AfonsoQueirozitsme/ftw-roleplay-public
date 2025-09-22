// src/lib/api/leaderboard.ts
import { supabase } from "@/lib/supabase";

export type LeaderRow = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  minutes_total: number;
  hours_total: number;
  tasks_done: number;
  rank_hours: number;
  rank_tasks: number;
};

export async function getLeaderboard(period: "week"|"month"|"all" = "week", limit = 50) {
  const { data, error } = await supabase.rpc("dev_leaderboard", { p_period: period, p_limit: limit });
  if (error) throw new Error(error.message);
  return data as LeaderRow[];
}
