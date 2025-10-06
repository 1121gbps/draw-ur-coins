"use client"

import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardContent, CardFooter, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabaseClient"
import { useState } from "react"
import { toast } from "sonner"
import { Sparkles } from "lucide-react"


type Player = {
  id: string
  name: string
}

type Room = {
  id: string
  host_id: string
}

interface LobbyViewProps {
  code: string
  room: Room
  players: Player[]
  currentPlayer: Player
  isHost: boolean
  joining: boolean
}

export default function LobbyView({ code, room, players, currentPlayer, isHost, joining }: LobbyViewProps) {
  const [starting, setStarting] = useState(false)

  const startGame = async () => {
    if (starting) return
    setStarting(true)
    toast.info("Get rekt... Starting in 3 seconds!")

    let count = 3
    const overlay = document.createElement("div")
    overlay.className =
      "fixed inset-0 flex items-center justify-center text-8xl bg-black/80 text-white font-bold z-50 transition-all"
    document.body.appendChild(overlay)

    const interval = setInterval(async () => {
      overlay.textContent = count.toString()
      if (count <= 0) {
        clearInterval(interval)
        overlay.remove()
        toast.success("Game started!")
        await supabase.from("rooms").update({ phase: "memorize" }).eq("id", room.id)
      }
      count--
    }, 1000)
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-blue-50 to-blue-100 dark:from-blue-950 dark:to-slate-900 flex items-center justify-center overflow-hidden">
      <Card className="w-full max-w-md text-center shadow-lg">
        <CardHeader>
          <CardTitle className="text-4xl font-bold mb-2 flex items-center justify-center gap-3"><Sparkles className="w-10 h-10 text-yellow-500 animate-pulse" />draw-ur-coins</CardTitle>
          <CardTitle className="text-2xl font-medium">Room Code: {code}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-2 font-medium">Players</p>
          <ul className="space-y-1 text-gray-300">
            {players.map((p) => (
              <li key={p.id} className={p.id === room.host_id ? "font-bold text-purple-600" : ""}>
                {p.name} {p.id === room.host_id && "(Host)"}
              </li>
            ))}
          </ul>
        </CardContent>
        <CardFooter className="flex justify-center">
          {isHost ? (
            <Button onClick={startGame} disabled={starting} className="bg-gradient-to-r from-cyan-500 to-purple-600 text-white">
              Start Game
            </Button>
          ) : (
            <p className="text-gray-500 text-sm italic animate-pulse">Waiting for host to start...</p>
          )}

        
        </CardFooter>
      </Card>
    </div>
  )
}
