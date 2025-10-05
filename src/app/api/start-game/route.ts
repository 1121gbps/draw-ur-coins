import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies })
  const { roomId, coin } = await req.json()

  const { data, error } = await supabase
    .from('rooms')
    .update({ coin, phase: 'memorize' })
    .eq('id', roomId)
    .select()

  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ data })
}
