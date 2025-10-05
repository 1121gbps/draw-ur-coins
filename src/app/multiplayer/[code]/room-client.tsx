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

  const didJoinRef = useRef(false)

  // ————————————————————————————————————————————————————————
  // Helper utilities
  // ————————————————————————————————————————————————————————
  const getClientId = () => {
    let cid = localStorage.getItem("client-id")
    if (!cid) {
      cid = crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
      localStorage.setItem("client-id", cid)
    }
    return cid
  }

  useEffect(() => {
    const ensureAuth = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) {
        const { error } = await supabase.auth.signInAnonymously()
        if (error) console.error("Anonymous sign-in failed:", error)
        else console.log("✅ Guest signed in anonymously")
      }
    }
    ensureAuth()
  }, [])

  useEffect(() => {
    const fromQuery = searchParams.get("name")
    if (fromQuery) {
      const decoded = decodeURIComponent(fromQuery)
      setName(decoded)
      localStorage.setItem("player-name", decoded)
    } else {
      const stored = localStorage.getItem("player-name")
      if (stored) setName(stored)
    }
  }, [searchParams])

  useEffect(() => {
    if (didJoinRef.current) return
    didJoinRef.current = true

    const joinRoom = async () => {
      setLoading(true)
      const client_id = getClientId()

      // 1️⃣ Fetch room
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

      setJoining(true)
      const { data: playerData, error: joinErr } = await supabase
        .from("players")
        .upsert(
          { room_id: roomData.id, client_id, name: playerName },
          { onConflict: "room_id,client_id" }
        )
        .select()
        .single()
      setJoining(false)

      if (joinErr) {
        console.error("Join error:", joinErr)
        alert("Failed to join room.")
        setLoading(false)
        return
      }

      if (playerData) {
        setCurrentPlayer(playerData as Player)
        localStorage.setItem(`player-${code}`, JSON.stringify(playerData))
      }

      if (!roomData.host_id && playerData?.id) {
        await supabase
          .from("rooms")
          .update({ host_id: playerData.id })
          .eq("id", roomData.id)
          .is("host_id", null)
      }

      setLoading(false)
    }

    joinRoom()
  }, [code, name, router])

  // ————————————————————————————————————————————————————————
  // Subscribe to realtime updates
  // ————————————————————————————————————————————————————————
  useEffect(() => {
    if (!room) return

    // Room subscription (phase, coin, etc.)
    const roomCh = supabase
      .channel(`room-${room.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${room.id}` },
        (payload) => {
          setRoom(payload.new as Room)
        }
      )
      .subscribe()

    // Player subscription
    const fetchPlayers = async () => {
      const { data } = await supabase.from("players").select("*").eq("room_id", room.id)
      setPlayers((data as Player[]) || [])
    }

    const playerCh = supabase
      .channel(`players-${room.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players", filter: `room_id=eq.${room.id}` },
        fetchPlayers
      )
      .subscribe()

    // Initial load
    fetchPlayers()

    return () => {
      supabase.removeChannel(roomCh)
      supabase.removeChannel(playerCh)
    }
  }, [room?.id])

  // ————————————————————————————————————————————————————————
  // Derived state
  // ————————————————————————————————————————————————————————
  useEffect(() => {
    if (room && currentPlayer) {
      setIsHost(room.host_id === currentPlayer.id)
    }
  }, [room, currentPlayer])

  const visiblePlayers = useMemo(() => {
    const map = new Map<string, Player>()
    for (const p of players) {
      const key = p.client_id || p.id
      if (!map.has(key)) map.set(key, p)
    }
    return Array.from(map.values())
  }, [players])

  // ————————————————————————————————————————————————————————
  // Render views based on room phase
  // ————————————————————————————————————————————————————————
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
          Invalid phase: {room.phase}
        </div>
      )
  }
}
