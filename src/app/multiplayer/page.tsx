"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import Link from "next/link"
import { Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"

export default function MultiplayerPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [roomCode, setRoomCode] = useState("")
  const [loading, setLoading] = useState(false)

  // Always have a stable client ID per browser
  useEffect(() => {
    let cid = localStorage.getItem("client-id")
    if (!cid) {
      cid =
        (typeof crypto !== "undefined" && "randomUUID" in crypto)
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`
      localStorage.setItem("client-id", cid)
    }
  }, [])

  const createRoom = async () => {
    if (!name.trim()) return alert("Please enter your name first!")
    setLoading(true)

    localStorage.setItem("player-name", name.trim())

    const code = Math.random().toString(36).substring(2, 8).toUpperCase()

    const { data: room, error: roomErr } = await supabase
      .from("rooms")
      .insert({ code, phase: "waiting" })
      .select()
      .single()

    if (roomErr || !room) {
      setLoading(false)
      alert(roomErr?.message || "Failed to create room")
      return
    }

    const client_id = localStorage.getItem("client-id")!
    const { data: hostPlayer, error: playerErr } = await supabase
      .from("players")
      .upsert(
        { room_id: room.id, client_id, name: name.trim() },
        { onConflict: "room_id,client_id" }
      )
      .select()
      .single()

    if (playerErr) {
      setLoading(false)
      alert(playerErr.message)
      return
    }

    await supabase.from("rooms").update({ host_id: hostPlayer.id }).eq("id", room.id)

    localStorage.setItem(`player-${code}`, JSON.stringify(hostPlayer))

    setLoading(false)

    router.push(`/multiplayer/${room.code}?name=${encodeURIComponent(name.trim())}`)
  }

  const joinRoom = async () => {
    if (!name.trim()) return alert("Please enter your name first!")
    if (!roomCode.trim()) return alert("Please enter a room code!")

    localStorage.setItem("player-name", name.trim())
    router.push(`/multiplayer/${roomCode.toUpperCase()}?name=${encodeURIComponent(name.trim())}`)
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-blue-50 to-blue-100 dark:from-blue-950 dark:to-slate-900 flex items-center justify-center overflow-hidden">
      <Card className="w-full max-w-md border-2 border-blue-300 dark:border-blue-800 shadow-2xl">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-4xl font-bold mb-2 flex items-center justify-center gap-3"><Sparkles className="w-10 h-10 text-yellow-500 animate-pulse" />draw-ur-coins</CardTitle>
          <CardDescription>Multiplayer Lobby</CardDescription>
          <Link href="/" className="text-sm text-muted-foreground">No friends? Play solo</Link>
        </CardHeader>

        <CardContent className="space-y-4">
          <Input
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div className="flex items-center justify-between gap-2">
            <Button onClick={createRoom} disabled={loading || !name.trim()} className="flex-1">
              {loading ? "Creating..." : "Create Room"}
            </Button>
            <Button variant="outline" onClick={joinRoom} disabled={!name.trim()} className="flex-1">
              Join Room
            </Button>
          </div>

          <Input
            placeholder="Enter room code (e.g., ABC123)"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
          />
        </CardContent>

        <CardFooter className="text-center text-xs text-muted-foreground">
          Share the room code with friends to play together!
        </CardFooter>
      </Card>
    </div>
  )
}
