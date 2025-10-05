"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import Image from "next/image"
import { Loader2 } from "lucide-react"
import type { Room } from "@/types/game"

type CoinData = {
  name: string
  src: string
}

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
  const [coin, setCoin] = useState<CoinData | null>(
    room.coin ? JSON.parse(room.coin) : null
  )

  // 🪙 If no coin yet, the host fetches a random one and saves it to Supabase
  useEffect(() => {
    const assignCoin = async () => {
      if (!isHost || coin) return // Only host picks new coin
      try {
        const res = await fetch("/api/coins")
        const coins: CoinData[] = await res.json()
        const random = coins[Math.floor(Math.random() * coins.length)]

        await supabase
          .from("rooms")
          .update({ coin: JSON.stringify(random) })
          .eq("id", room.id)

        setCoin(random)
        console.log("Assigned random coin:", random.name)
      } catch (err) {
        console.error("Failed to fetch coins:", err)
      }
    }

    assignCoin()
  }, [isHost, coin, room.id])

  useEffect(() => {
    if (!isHost || !coin) return
    if (timer <= 0) {
      supabase
        .from("rooms")
        .update({ phase: "draw" })
        .eq("id", room.id)
        .then(() => console.log("Phase → draw"))
      return
    }

    const tick = setTimeout(() => setTimer((t) => t - 1), 1000)
    return () => clearTimeout(tick)
  }, [timer, isHost, room.id, coin])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-6 bg-gradient-to-b from-yellow-50 to-amber-100 dark:from-yellow-900 dark:to-amber-950">
      <h2 className="text-3xl font-bold text-yellow-700">
        Memorize this coin {coin ? `(${timer}s)` : ""}
      </h2>

      {/* Coin or loading state */}
      {coin ? (
        <div className="bg-white/60 dark:bg-black/30 p-6 rounded-2xl shadow-lg flex flex-col items-center">
          <Image
            src={coin.src}
            alt={coin.name}
            width={200}
            height={200}
            className="rounded-full shadow-inner"
          />
          <p className="text-lg font-semibold text-gray-700 dark:text-gray-200 mt-4">
            {coin.name}
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-10 bg-white/60 dark:bg-black/30 rounded-2xl shadow-inner">
          <Loader2 className="w-8 h-8 animate-spin text-yellow-700" />
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
            Fetching coin...
          </p>
        </div>
      )}

      {/* Info message */}
      {isHost ? (
        <p className="text-xs text-gray-500 mt-4">
          Auto-advancing to drawing in {timer}s…
        </p>
      ) : (
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 mt-4">
          <Loader2 className="w-5 h-5 animate-spin" /> Waiting for host to start…
        </div>
      )}
    </div>
  )
}
