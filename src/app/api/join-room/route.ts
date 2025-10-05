import { supabase } from "@/lib/supabaseClient"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const { roomCode, name } = await req.json()
  const { data: room } = await supabase
    .from("rooms")
    .select("id")
    .eq("code", roomCode)
    .single()

  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 })

  const { data: player, error } = await supabase
    .from("players")
    .insert({ room_id: room.id, name })
    .select()
    .single()

  if (error) return NextResponse.json({ error }, { status: 400 })
  return NextResponse.json({ player })
}
