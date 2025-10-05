"use client"

import type { Room, Player } from "@/types/game"
import Image from "next/image"

export default function CompareView({
  code,
  room,
  players,
}: {
  code: string
  room: Room
  players: Player[]
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-6 bg-gradient-to-b from-green-50 to-emerald-100 dark:from-green-950 dark:to-emerald-950">
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
    </div>
  )
}
