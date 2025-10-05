"use client"

import type { Room, Player } from "@/types/game"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabaseClient"
import { useState } from "react"
import { Loader2 } from "lucide-react"

export default function CompareView({
  code,
  room,
  players,
}: {
  code: string
  room: Room
  players: Player[]
}) {
  const [loading, setLoading] = useState(false)

  const handleNextRound = async () => {
    setLoading(true)
    try {
      // fetch a random coin from your /api/coins
      const res = await fetch("/api/coins")
      const data = await res.json()
      const randomCoin = data[Math.floor(Math.random() * data.length)]

      // reset player "done" flags
      await supabase.from("players").update({ done: false, drawing_url: null }).eq("room_id", room.id)

      // update room: set new coin + go back to memorize phase
      await supabase
        .from("rooms")
        .update({
          coin: JSON.stringify(randomCoin),
          phase: "memorize",
        })
        .eq("id", room.id)
    } finally {
      setLoading(false)
    }
  }

  const handleBackToLobby = async () => {
    setLoading(true)
    try {
      // reset player states
      await supabase.from("players").update({ done: false, drawing_url: null }).eq("room_id", room.id)

      // reset room to waiting
      await supabase
        .from("rooms")
        .update({
          coin: null,
          phase: "waiting",
        })
        .eq("id", room.id)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 p-6 bg-gradient-to-b from-green-50 to-emerald-100 dark:from-green-950 dark:to-emerald-950">
      <h2 className="text-3xl font-bold text-green-700 mb-4">Compare Drawings</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {players.map((p) => (
          <div key={p.id} className="text-center space-y-2">
            <div className="bg-white/70 dark:bg-black/30 p-3 rounded-lg shadow-lg">
              {p.drawing_url ? (
                <Image
                  src={p.drawing_url}
                  alt={p.name}
                  width={180}
                  height={180}
                  className="rounded-md object-contain"
                />
              ) : (
                <div className="w-[180px] h-[180px] flex items-center justify-center text-gray-400 bg-gray-100 rounded-md">
                  No drawing
                </div>
              )}
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {p.name}
            </p>
          </div>
        ))}
      </div>

      {/* Host controls */}
      <div className="flex gap-4 mt-6">
        <Button
          onClick={handleNextRound}
          className="bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 text-white"
          disabled={loading}
        >
          {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Next Round 🔁"}
        </Button>

        <Button
          variant="outline"
          onClick={handleBackToLobby}
          disabled={loading}
        >
          {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Back to Lobby 🔙"}
        </Button>
      </div>
    </div>
  )
}
