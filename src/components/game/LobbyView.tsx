"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from "@/components/ui/dialog"
import { LogOut, Loader2 } from "lucide-react"
import type { Room, Player } from "@/types/game"

export default function LobbyView({
  code,
  room,
  players,
  currentPlayer,
  isHost,
  joining,
}: {
  code: string
  room: Room
  players: Player[]
  currentPlayer: Player | null
  isHost: boolean
  joining: boolean
}) {
  const [leaveOpen, setLeaveOpen] = useState(false)
  const count = players.length

  const handleLeave = async () => {
    setLeaveOpen(false)
    if (!room || !currentPlayer) {
      localStorage.removeItem(`player-${code}`)
      location.href = "/multiplayer"
      return
    }
    try {
      if (isHost) {
        await supabase.from("players").delete().eq("room_id", room.id)
        await supabase.from("rooms").delete().eq("id", room.id)
      } else {
        await supabase.from("players").delete().eq("id", currentPlayer.id)
      }
    } finally {
      localStorage.removeItem(`player-${code}`)
      location.href = "/multiplayer"
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-blue-100 dark:from-blue-950 dark:to-slate-900 p-6">
      <Card className="w-full max-w-lg border-2 border-blue-300 dark:border-blue-800 shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            Room Code: <span className="font-mono text-purple-600">{code}</span>
          </CardTitle>
          <p className="text-muted-foreground">Players: {count}</p>
        </CardHeader>

        <CardContent className="space-y-6 text-center">
          <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
            {players.map((p) => (
              <li key={p.client_id ?? p.id} className={p.id === room.host_id ? "font-bold text-yellow-600" : ""}>
                {p.name} {p.id === room.host_id && "(Host)"}
              </li>
            ))}
          </ul>

          {isHost ? (
            <Button
              onClick={async () => {
                await supabase.from("rooms").update({ phase: "memorize" }).eq("id", room.id)
              }}
              className="bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500"
              disabled={joining || !currentPlayer}  // allow host to start even if count==1
            >
              {joining ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Start Game"}
            </Button>
          ) : (
            <p className="text-sm italic text-gray-500">Waiting for host to start...</p>
          )}

          <Button
            variant="destructive"
            className="flex mx-auto gap-2"
            onClick={() => setLeaveOpen(true)}
            disabled={!currentPlayer}
          >
            <LogOut className="w-4 h-4" /> Leave Room
          </Button>
        </CardContent>
      </Card>

      <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave Room?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {isHost
              ? "You're the host. Leaving will delete the room for everyone."
              : "Are you sure you want to leave this room?"}
          </p>
          <DialogFooter className="mt-4 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setLeaveOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleLeave}>Leave</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
