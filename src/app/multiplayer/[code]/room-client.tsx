"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import LobbyView from "@/components/game/LobbyView"
import MemorizeView from "@/components/game/MemorizeView"
import DrawView from "@/components/game/DrawView"
import CompareView from "@/components/game/CompareView"
import { Loader2 } from "lucide-react"
import type { Room, Player, RoomPhase } from "@/types/game"

export default function RoomClient({ code }: { code: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [room, setRoom] = useState<Room | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null)
  const [isHost, setIsHost] = useState(false)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [name, setName] = useState<string>("")

  // A ref that survives re-renders within a single mount (Strict Mode safe pattern)
  const didJoinRef = useRef(false)

  // ————————————————————————————————————————————————————————————
  // Helpers
  // ————————————————————————————————————————————————————————————
  const getClientId = () => {
    let cid = localStorage.getItem("client-id")
    if (!cid) {
      cid = (typeof crypto !== "undefined" && "randomUUID" in crypto)
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`
      localStorage.setItem("client-id", cid)
    }
    return cid
  }

  // Read ?name= early and persist so we don’t prompt again
  useEffect(() => {
    const n = searchParams.get("name")
    if (n) {
      const decoded = decodeURIComponent(n)
      setName(decoded)
      localStorage.setItem("player-name", decoded)
    } else {
      const stored = localStorage.getItem("player-name")
      if (stored) setName(stored)
    }
  }, [searchParams])

  // Core join logic: STRICT MODE & race safe
  useEffect(() => {
    if (didJoinRef.current) return
    didJoinRef.current = true

    ;(async () => {
      setLoading(true)

      // 1) Fetch room by code
      const { data: roomData, error: roomErr } = await supabase
        .from("rooms")
        .select("*")
        .eq("code", code)
        .single()
      if (roomErr || !roomData) {
        alert("Room not found.")
        router.push("/multiplayer")
        return
      }
      setRoom(roomData as Room)

      // 2) Resolve name
      let playerName = (name || "").trim()
      if (!playerName) {
        const stored = localStorage.getItem("player-name")
        if (stored) playerName = stored
        else {
          playerName = prompt("Enter your name:")?.trim() || "Player"
          localStorage.setItem("player-name", playerName)
        }
        setName(playerName)
      }

      const client_id = getClientId()

      let localPlayer: Player | null = null
      const savedJSON = localStorage.getItem(`player-${code}`)
      if (savedJSON) {
        try {
          const saved = JSON.parse(savedJSON) as Player
          if (saved.room_id) localPlayer = saved
        } catch {}
      }

      setJoining(true)
      const { data: upserted, error: upsertErr } = await supabase
        .from("players")
        .upsert(
          { room_id: roomData.id, client_id, name: playerName },
          { onConflict: "room_id,client_id" }
        )
        .select()
        .single()
      setJoining(false)

      if (upsertErr) {
        console.error("Join upsert error:", upsertErr)
        const { data: existing } = await supabase
          .from("players")
          .select("*")
          .eq("room_id", roomData.id)
          .eq("client_id", client_id)
          .maybeSingle()
        if (!existing) {
          setLoading(false)
          return
        }
        setCurrentPlayer(existing as Player)
        localStorage.setItem(`player-${code}`, JSON.stringify(existing))
      } else if (upserted) {
        setCurrentPlayer(upserted as Player)
        localStorage.setItem(`player-${code}`, JSON.stringify(upserted))
      }

      if (roomData.host_id === null && (upserted as Player | null)?.id) {
        await supabase
          .from("rooms")
          .update({ host_id: (upserted as Player).id })
          .eq("id", roomData.id)
          .is("host_id", null)
      }

      setTimeout(() => setLoading(false), 300)
    })()
  }, [code, name, router])

  // Subscribe realtime: room + players
  useEffect(() => {
    if (!room) return

    const roomCh = supabase
      .channel(`room-${room.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooms", filter: `id=eq.${room.id}` },
        (payload) => setRoom(payload.new as Room)
      )
      .subscribe()

    const fetchPlayers = async () => {
      const { data } = await supabase.from("players").select("*").eq("room_id", room.id)
      setPlayers((data as Player[]) || [])
    }

    const playersCh = supabase
      .channel(`players-${room.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players", filter: `room_id=eq.${room.id}` },
        fetchPlayers
      )
      .subscribe()

    fetchPlayers()

    return () => {
      supabase.removeChannel(roomCh)
      supabase.removeChannel(playersCh)
    }
  }, [room?.id])

  // Determine host
  useEffect(() => {
    if (room && currentPlayer) setIsHost(room.host_id === currentPlayer.id)
  }, [room, currentPlayer])

  // Deduped view of players (in case old duplicates exist pre-constraint)
  const visiblePlayers = useMemo(() => {
    const map = new Map<string, Player>()
    for (const p of players) {
      // Prefer client_id if present; fallback to id
      const key = p.client_id || p.id
      if (!map.has(key)) map.set(key, p)
    }
    return Array.from(map.values())
  }, [players])

  if (loading || !room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    )
  }

  switch (room.phase as RoomPhase) {
    case "waiting":
      return (
        <LobbyView
          code={code}
          room={room}
          players={visiblePlayers}
          currentPlayer={currentPlayer}
          isHost={isHost}
          joining={joining}
        />
      )
    case "memorize":
      return <MemorizeView code={code} room={room} isHost={isHost} />
    case "draw":
      return <DrawView code={code} room={room} currentPlayer={currentPlayer} />
    case "compare":
      return <CompareView code={code} room={room} players={visiblePlayers} />
    default:
      return (
        <div className="min-h-screen flex items-center justify-center text-gray-500">
          Invalid state
        </div>
      )
  }
}
