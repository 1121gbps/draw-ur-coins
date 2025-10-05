"use client"
import { useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"

export function useRoomRealtime(roomId: string, onUpdate: (room: any) => void) {
  useEffect(() => {
    const channel = supabase
      .channel(`room-${roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooms", filter: `id=eq.${roomId}` },
        (payload) => onUpdate(payload.new)
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomId, onUpdate])
}
