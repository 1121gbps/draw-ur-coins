"use client"

import { useEffect, useRef, useState } from "react"
import { ReactSketchCanvas } from "react-sketch-canvas"
import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Paintbrush,
  Eraser,
  Undo2,
  Redo2,
  Trash,
  Pencil,
} from "lucide-react"
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
  const [timeLeft, setTimeLeft] = useState(60)
  const [isUploading, setIsUploading] = useState(false)
  const [isErasing, setIsErasing] = useState(false)
  const [strokeColor, setStrokeColor] = useState("#8b5cf6")
  const [customColor, setCustomColor] = useState("#000000")
  const [strokeWidth, setStrokeWidth] = useState(3)
  const canvasRef = useRef<any>(null)

  const swatches = [
    "#000000",
    "#ffffff",
    "#8b5cf6",
    "#ef4444",
    "#22c55e",
    "#3b82f6",
    "#facc15",
  ]

  // countdown timer
  useEffect(() => {
    if (timeLeft <= 0) return
    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000)
    return () => clearTimeout(timer)
  }, [timeLeft])

  useEffect(() => {
    if (timeLeft === 0) handleFinish()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft])

  const uploadDrawing = async (dataUrl: string) => {
    if (!currentPlayer) return
    try {
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      const path = `drawings/${room.code}/${currentPlayer.id}.png`

      const { error: uploadErr } = await supabase.storage
        .from("drawings")
        .upload(path, blob, { upsert: true, contentType: "image/png" })
      if (uploadErr) throw uploadErr

      const { data: urlData } = supabase.storage
        .from("drawings")
        .getPublicUrl(path)

      await supabase
        .from("players")
        .update({ drawing_url: urlData.publicUrl, done: true })
        .eq("id", currentPlayer.id)
    } catch (err) {
      console.error("Upload failed:", err)
    }
  }

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

    const channel = supabase
      .channel(`players-done-${room.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: `room_id=eq.${room.id}`,
        },
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

    return () => {
      supabase.removeChannel(channel)
    }
  }, [room.id, room.host_id, currentPlayer?.id])

  const getProgress = () => ((60 - timeLeft) / 60) * 100
  const effectiveColor = isErasing ? "#ffffff" : strokeColor

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-purple-50 to-pink-100 dark:from-purple-950 dark:to-pink-950 p-6 space-y-6">
      {/* Title */}
      <div className="text-center">
        <h2 className="text-2xl md: text-4xl font-bold text-purple-600 dark:text-purple-400 flex items-center justify-center gap-2">
          <Pencil className="w-8 h-8" /> Draw From Memory!
        </h2>
        <p className="text-lg text-muted-foreground">
          Recreate the coin as best as you can
        </p>
      </div>

      {/* Canvas */}
      <div className="border-4 scale-85 md:scale-100 border-dashed border-purple-300 dark:border-purple-700 rounded-xl overflow-hidden shadow-lg animate-scale-in">
        <ReactSketchCanvas
          ref={canvasRef}
          style={{ border: "none" }}
          width="400px"
          height="400px"
          strokeWidth={strokeWidth}
          strokeColor={effectiveColor}
          canvasColor="#ffffff"
        />
      </div>

      {/* Floating Toolbar (just above timer) */}
      <div className="bg-white/80 dark:bg-black/40 backdrop-blur-md rounded-2xl shadow-xl p-4 flex flex-wrap justify-center items-center gap-3 w-full max-w-xl border border-purple-200 dark:border-purple-800">
        {/* Brush / Eraser */}
        <div className="flex gap-2">
          <Button
            variant={isErasing ? "outline" : "default"}
            size="icon"
            onClick={() => setIsErasing(false)}
            className={!isErasing ? "bg-purple-600 hover:bg-purple-700" : ""}
            title="Brush"
          >
            <Paintbrush className="w-4 h-4" />
          </Button>
          <Button
            variant={isErasing ? "default" : "outline"}
            size="icon"
            onClick={() => setIsErasing(true)}
            className={
              isErasing
                ? "bg-rose-700 hover:bg-rose-700 dark:hover:bg-rose-400 text-white"
                : ""
            }
            title="Eraser"
          >
            <Eraser className="w-4 h-4" />
          </Button>
        </div>

        {/* Colors */}
        <div className="flex items-center gap-2 rounded-md bg-card p-1">
          {swatches.map((c) => (
            <button
              key={c}
              onClick={() => {
                setIsErasing(false)
                setStrokeColor(c)
              }}
              className={`h-6 w-6 rounded-full ring-2 ring-offset-2 ${
                strokeColor === c ? "ring-black" : "ring-transparent"
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
          <input
            type="color"
            value={customColor}
            onChange={(e) => {
              setCustomColor(e.target.value)
              setIsErasing(false)
              setStrokeColor(e.target.value)
            }}
            className="h-7 w-10 rounded-full cursor-pointer border border-muted"
            title="Custom color"
          />
        </div>

        {/* Width */}
        <div className="flex items-center gap-2">
          <label htmlFor="width" className="text-sm font-medium">
            W:
          </label>
          <select
            id="width"
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
            className="rounded-md border px-2 text-sm bg-background"
          >
            {[1, 2, 3, 4, 6, 8, 10, 12].map((w) => (
              <option key={w} value={w}>
                {w}px
              </option>
            ))}
          </select>
        </div>

        {/* Undo / Redo / Clear */}
        <div className="flex justify-left gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => canvasRef.current?.undo()}
          >
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => canvasRef.current?.redo()}
          >
            <Redo2 className="w-4 h-4" />
          </Button>
          <Button
            onClick={() => canvasRef.current?.clearCanvas()}
            variant="outline"
            size="icon"
          >
            <Trash className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Timer */}
      <div className="w-full max-w-md">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Time Remaining</span>
          <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {timeLeft}s
          </span>
        </div>
        <Progress
          value={getProgress()}
          className="h-3 bg-purple-100 dark:bg-purple-900"
        />
      </div>
    </div>
  )
}
