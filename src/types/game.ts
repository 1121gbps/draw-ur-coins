export type RoomPhase = "waiting" | "memorize" | "draw" | "compare"

export type Room = {
  id: string
  code: string
  coin?: string | null
  phase: RoomPhase
  host_id: string | null
}

export type Player = {
  id: string
  room_id: string
  client_id: string | null
  name: string
  drawing_url?: string | null
  created_at?: string
}
