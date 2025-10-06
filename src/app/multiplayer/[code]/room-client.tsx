"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import LobbyView from "@/components/game/LobbyView"
import MemorizeView from "@/components/game/MemorizeView"
import DrawView from "@/components/game/DrawView"
import CompareView from "@/components/game/CompareView"
import { FooterActions } from "@/components/game/FooterActions"
import { Loader2, CircleX } from "lucide-react"
import { toast } from "sonner"
import debounce from "lodash.debounce"
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
  const prevDoneRef = useRef<Record<string, boolean>>({})
  const prevPhaseRef = useRef<string>("")

  // Ensure unique client ID per browser
  const getClientId = (): string => {
    try {
      let cid = localStorage.getItem("client-id")
      if (!cid) {
        cid = crypto.randomUUID()
        localStorage.setItem("client-id", cid)
      }
      return cid
    } catch {
      return `${Date.now()}-${Math.random()}`
    }
  }

  // Ensure Supabase anon auth
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        await supabase.auth.signInAnonymously()
        toast.success("Connected to multiplayer ⚡")
      }
    })
  }, [])

  //  Persist player name from URL or localStorage
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

  //  Join Room Logic
  useEffect(() => {
    if (didJoinRef.current) return
    didJoinRef.current = true

    const joinRoom = async () => {
      setLoading(true)
      const client_id = getClientId()

      const { data: roomData, error: roomErr } = await supabase
        .from("rooms")
        .select("*")
        .eq("code", code)
        .single()

      if (roomErr || !roomData) {
        toast.error("Room not found!")
        router.push("/multiplayer")
        return
      }

      setRoom(roomData)
      const playerName = name || localStorage.getItem("player-name") || "Player"
      setName(playerName)
      localStorage.setItem("player-name", playerName)

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

      if (joinErr || !playerData) {
        toast.error("Failed to join room.")
        setLoading(false)
        return
      }

      setCurrentPlayer(playerData)
      localStorage.setItem(`player-${code}`, JSON.stringify(playerData))

      if (!roomData.host_id && playerData.id) {
        await supabase
          .from("rooms")
          .update({ host_id: playerData.id })
          .eq("id", roomData.id)
          .is("host_id", null)
        toast.success("You are the host 🎮")
      }

      setLoading(false)
    }

    joinRoom()
  }, [code, name, router])

  //  Subscribe to realtime updates (Room + Players)
  useEffect(() => {
    if (!room) return

    const debouncedFetchPlayers = debounce(async () => {
      const { data } = await supabase.from("players").select("*").eq("room_id", room.id)
      if (data) setPlayers(data)
    }, 250)

    // ROOM CHANNEL (phase / coin / etc)
    const roomCh = supabase
      .channel(`room-${room.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${room.id}` },
        (payload) => {
          const newRoom = payload.new as Room

          //  Notify if coin changed
          try {
            const oldCoin = room?.coin ? JSON.parse(room.coin as string) : null
            const newCoin = newRoom?.coin ? JSON.parse(newRoom.coin as string) : null
            if (newCoin && (!oldCoin || oldCoin.name !== newCoin.name)) {
              if (!isHost) toast.success(`Coin selected: ${newCoin.name}`)
            }
          } catch {}

          //  Refresh guest when host moves from lobby → memorize
          if (room?.phase === "waiting" && newRoom.phase === "memorize" && !isHost) {
            toast("Game started! Refreshing…")
            setTimeout(() => window.location.reload(), 1000)
          }

          setRoom(newRoom)
        }
      )
      .subscribe()

    // PLAYER CHANNEL
    const playerCh = supabase
      .channel(`players-${room.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players", filter: `room_id=eq.${room.id}` },
        async (payload) => {
          debouncedFetchPlayers()
          if (payload.eventType === "UPDATE") {
            const player = payload.new as Player
            if (player.done && !prevDoneRef.current[player.id]) {
              toast(`${player.name} finished drawing 🖌️`, { duration: 2500 })
              prevDoneRef.current[player.id] = true
            }
          }
        }
      )
      .subscribe()

    debouncedFetchPlayers()
    return () => {
      supabase.removeChannel(roomCh)
      supabase.removeChannel(playerCh)
    }
  }, [room?.id, isHost])

  //  Determine Host
  useEffect(() => {
    if (room && currentPlayer) setIsHost(room.host_id === currentPlayer.id)
  }, [room, currentPlayer])

  // Host: auto move to compare when all done
  useEffect(() => {
    if (!isHost || !room || room.phase !== "draw") return
    if (players.length === 0) return

    const allDone = players.every((p) => p.done)
    if (allDone) {
      supabase.from("rooms").update({ phase: "compare" }).eq("id", room.id)
      toast.success("All players finished! Showing results…")
    }
  }, [players, room?.phase, isHost])

  //  Host: choose random coin at start
  useEffect(() => {
    if (!room || room.phase !== "memorize" || !isHost) return
    if (room.coin && room.coin !== "null") return

    const pickCoin = async () => {
      const res = await fetch("/api/coins?_t=" + Date.now())
      const data = await res.json()
      const randomCoin = data[Math.floor(Math.random() * data.length)]
      await supabase.from("rooms").update({ coin: JSON.stringify(randomCoin) }).eq("id", room.id)
      setRoom((r) => (r ? { ...r, coin: JSON.stringify(randomCoin) } : r))
    }
    pickCoin()
  }, [room?.phase, isHost])

  //  Unique players only
  const visiblePlayers = useMemo(() => {
    const map = new Map<string, Player>()
    for (const p of players) map.set(p.client_id || p.id, p)
    return Array.from(map.values())
  }, [players])

  //  Leave / Delete Room
  const handleLeaveRoom = async () => {
    if (!room || !currentPlayer) return
    await supabase.from("players").delete().eq("id", currentPlayer.id)
    toast.info("You left the room.")
    router.push("/multiplayer")
  }

const handleDeleteRoom = async () => {
  if (!room?.id) {
    toast.error("Missing room information.")
    return
  }

  try {
    const res = await fetch("/api/delete-room", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ roomId: room.id }), // send the correct room ID
    })

    const data = await res.json()
    if (!res.ok) {
      console.error("Delete room failed:", data)
      toast.error(data.error || "Failed to delete room.")
      return
    }

    toast.success("Room deleted successfully.")
    router.push("/multiplayer")
  } catch (err) {
    console.error("Unexpected delete error:", err)
    toast.error("Unexpected error while deleting room.")
  }
}

  // Loading Screen
  if (loading || !room)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        <p>Connecting to room...</p>
      </div>
    )

  //  Phase Switch
  let phaseView
  switch (room.phase as RoomPhase) {
    case "waiting":
      phaseView = (
        <LobbyView
          code={code}
          room={room}
          players={visiblePlayers}
          currentPlayer={currentPlayer}
          isHost={isHost}
          joining={joining}
        />
      )
      break
    case "memorize":
      phaseView = <MemorizeView code={code} room={room} isHost={isHost} />
      break
    case "draw":
      phaseView = <DrawView code={code} room={room} currentPlayer={currentPlayer} />
      break
    case "compare":
      phaseView = <CompareView code={code} room={room} players={visiblePlayers} />
      break
    default:
      phaseView = (
        <div className="min-h-screen flex flex-col items-center justify-center text-gray-500">
          <CircleX className="w-10 h-10 text-red-400 mb-2 animate-pulse" />
          <p>Invalid phase: {room.phase}</p>
        </div>
      )
  }

  return (
    <>
      {phaseView}
      <FooterActions
        currentPlayer={currentPlayer}
        isHost={isHost}
        room={room}
        handleLeaveRoom={handleLeaveRoom}
        handleDeleteRoom={handleDeleteRoom}
      />
    </>
  )
}