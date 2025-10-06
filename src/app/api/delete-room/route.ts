import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(req: Request) {
  try {
    const origin = req.headers.get("origin") || ""
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
      .split(",")
      .map(o => o.trim())
      .filter(Boolean)

    if (!allowedOrigins.includes(origin)) {
      console.warn(`Unauthorized origin: ${origin}`)
      return NextResponse.json({ error: "Unauthorized origin" }, { status: 403 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // must be SERVICE_ROLE key
    )

    // Parse body
    const body = await req.json().catch(() => null)
    const roomId = body?.roomId

    if (!roomId || typeof roomId !== "string") {
      console.error("❌ Missing or invalid roomId in request body:", body)
      return NextResponse.json({ error: "Missing roomId" }, { status: 400 })
    }

    console.log("Deleting room:", roomId)

    // Delete all players first, then room
    await supabase.from("players").delete().eq("room_id", roomId)
    await supabase.from("rooms").delete().eq("id", roomId)

    console.log("Room and players deleted successfully")

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Delete room error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}