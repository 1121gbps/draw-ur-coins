"use client"

import { useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { ReactSketchCanvas } from "react-sketch-canvas"
import { Button } from "@/components/ui/button"
import type { Room, Player } from "@/types/game"

export default function DrawView({
  code,
  room,
  currentPlayer,
}: {
  code: string
  room: Room
  currentPlayer: Player | null
}) {
  const [timer, setTimer] = useState(60)
  const [isUploading, setIsUploading] = useState(false)
  const canvasRef = useRef<any>(null)

  const uploadDrawing = async (dataUrl: string) => {
    if (!currentPlayer) return
    try {
      // convert base64 to Blob
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      const filePath = `drawings/${room.code}/${currentPlayer.id}.png`

      const { error: uploadError } = await supabase.storage
        .from("drawings")
        .upload(filePath, blob, { upsert: true, contentType: "image/png" })
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from("drawings")
        .getPublicUrl(filePath)

      await supabase
        .from("players")
        .update({ drawing_url: urlData.publicUrl, done: true })
        .eq("id", currentPlayer.id)
    } catch (err) {
      console.error("Upload failed:", err)
    }
  }

  // countdown timer
  useEffect(() => {
    if (timer <= 0) return
    const tick = setTimeout(() => setTimer((t) => t - 1), 1000)
    return () => clearTimeout(tick)
  }, [timer])

  useEffect(() => {
    if (timer === 0) handleFinish()
  }, [timer])

  const handleFinish = async () => {
    if (isUploading) return
    setIsUploading(true)

    try {
      if (canvasRef.current) {
        const img = await canvasRef.current.exportImage("png")
        await uploadDrawing(img)
      }

    } finally {
      setIsUploading(false)
    }
  }

  useEffect(() => {
    if (room.host_id !== currentPlayer?.id) return
    const sub = supabase
      .channel(`players-done-${room.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players", filter: `room_id=eq.${room.id}` },
        async () => {
          const { data } = await supabase
            .from("players")
            .select("done")
            .eq("room_id", room.id)
          if (data && data.every((p) => p.done)) {
            await supabase.from("rooms").update({ phase: "compare" }).eq("id", room.id)
          }
        }
      )
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [room.id, room.host_id, currentPlayer?.id])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-6 bg-gradient-to-b from-purple-50 to-pink-100 dark:from-purple-950 dark:to-pink-950">
      <h2 className="text-3xl font-bold text-purple-700">
        Draw the coin ({timer}s)
      </h2>

      <ReactSketchCanvas
        ref={canvasRef}
        width="400px"
        height="400px"
        strokeWidth={3}
        strokeColor="#8b5cf6"
        className="bg-white rounded-xl shadow-lg"
      />

      <div className="flex gap-3 mt-2">
        <Button
          variant="outline"
          onClick={() => canvasRef.current?.clearCanvas()}
          disabled={isUploading}
        >
          Clear
        </Button>
        <Button onClick={handleFinish} disabled={isUploading}>
          {isUploading ? "Saving..." : "Finish Early"}
        </Button>
      </div>
    </div>
  )
}
