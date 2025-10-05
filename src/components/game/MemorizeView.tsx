"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import Image from "next/image"
import { Loader2 } from "lucide-react"
import type { Room } from "@/types/game"

const DEFAULT_COIN = { name: "US Quarter", src: "/coins/us-quarter.png" }

export default function MemorizeView({
  code,
  room,
  isHost,
}: {
  code: string
  room: Room
  isHost: boolean
}) {
  const [timer, setTimer] = useState(10)
  const coin = room.coin
    ? JSON.parse(room.coin)
    : DEFAULT_COIN

  useEffect(() => {
    if (!isHost) return // guests don't control phase
    if (timer <= 0) {
      // ✅ Host updates the room to start drawing
      supabase
        .from("rooms")
        .update({ phase: "draw" })
        .eq("id", room.id)
        .then(() => console.log("Phase → draw"))
      return
    }

    const tick = setTimeout(() => setTimer((t) => t - 1), 1000)
    return () => clearTimeout(tick)
  }, [timer, isHost, room.id])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-6 bg-gradient-to-b from-yellow-50 to-amber-100 dark:from-yellow-900 dark:to-amber-950">
      <h2 className="text-3xl font-bold text-yellow-700">
        Memorize this coin ({timer}s)
      </h2>

      <div className="bg-white/60 dark:bg-black/30 p-4 rounded-2xl shadow-lg">
        <Image
          src={coin.src}
          alt={coin.name}
          width={200}
          height={200}
          className="rounded-full shadow-inner"
        />
      </div>

      {isHost ? (
        <p className="text-xs text-gray-500 mt-4">
          Auto-advancing to drawing in {timer}s…
        </p>
      ) : (
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 mt-4">
          <Loader2 className="w-5 h-5 animate-spin" /> Waiting for host…
        </div>
      )}
    </div>
  )
}
