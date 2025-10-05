import { supabase } from "@/lib/supabaseClient"
import { NextResponse } from "next/server"

export async function POST() {
  const code = Math.random().toString(36).substring(2, 8).toUpperCase()

  const { data, error } = await supabase
    .from("rooms")
    .insert({ code })
    .select()
    .single()

  if (error) return NextResponse.json({ error }, { status: 400 })
  return NextResponse.json({ room: data })
}
