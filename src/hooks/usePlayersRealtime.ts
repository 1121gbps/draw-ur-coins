"use client"
import { useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"

export function usePlayersRealtime(roomId: string, onChange: (players: any[]) => void) {
  useEffect(() => {
    const channel = supabase
      .channel(`players-${roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players", filter: `room_id=eq.${roomId}` },
        async () => {
          const { data } = await supabase.from("players").select("*").eq("room_id", roomId)
          onChange(data || [])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomId, onChange])
}
