"use client"

import { useEffect, useRef, useState } from "react"
import { ReactSketchCanvas } from "react-sketch-canvas"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { supabase } from "@/lib/supabaseClient"
import { Undo2, Redo2, Trash, Paintbrush, Eraser } from "lucide-react"

export default function DrawView({
  code,
  room,
  currentPlayer,
}: {
  code: string
  room: any
  currentPlayer: any
}) {
  const canvasRef = useRef<any>(null)
  const [timeLeft, setTimeLeft] = useState(60)
  const [isErasing, setIsErasing] = useState(false)
  const [strokeColor, setStrokeColor] = useState("#000000")
  const [strokeWidth, setStrokeWidth] = useState(3)
  const [isUploading, setIsUploading] = useState(false)
  const [hasSaved, setHasSaved] = useState(false)

  const swatches = ["#000000", "#FF0000", "#00FF00", "#0000FF", "#FFD700", "#FF69B4"]

  useEffect(() => {
    const ensureGuest = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) {
        const { error } = await supabase.auth.signInAnonymously()
        if (error) console.error("Anonymous sign-in failed:", error)
        else console.log("✅ Guest signed in anonymously")
      }
    }
    ensureGuest()
  }, [])

  useEffect(() => {
    if (hasSaved) return
    if (timeLeft <= 0) {
      saveDrawing()
      return
    }
    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000)
    return () => clearTimeout(timer)
  }, [timeLeft])

  const saveDrawing = async () => {
    if (isUploading || hasSaved) return
    setIsUploading(true)

    try {
      const dataUrl = await canvasRef.current.exportImage("png")
      const blob = await (await fetch(dataUrl)).blob()
      const filePath = `drawings/${room.code}/${currentPlayer.id}-${Date.now()}.png`

      // Upload securely to private bucket
      const { error: uploadError } = await supabase.storage
        .from("drawings")
        .upload(filePath, blob, {
          contentType: blob.type,
          upsert: true,
        })

      if (uploadError) throw uploadError

      // Generate signed URL to view in CompareView
      const { data: signed } = await supabase.storage
        .from("drawings")
        .createSignedUrl(filePath, 60 * 60 * 24)

      // Mark player as done
      await supabase
        .from("players")
        .update({ done: true, drawing_url: signed?.signedUrl })
        .eq("id", currentPlayer.id)

      const { data: allPlayers } = await supabase
        .from("players")
        .select("id, done")
        .eq("room_id", room.id)

      const everyoneDone = allPlayers?.every((p) => p.done)

      if (everyoneDone && currentPlayer.id === room.host_id) {
        await supabase
          .from("rooms")
          .update({ phase: "compare" })
          .eq("id", room.id)
        console.log("All players done, switched to compare phase")
      }

      setHasSaved(true)
    } catch (err) {
      console.error("❌ Failed to save drawing:", err)
    } finally {
      setIsUploading(false)
    }
  }

  const getProgress = () => ((60 - timeLeft) / 60) * 100

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-purple-50 to-pink-100 dark:from-purple-950 dark:to-pink-950">
      <h2 className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-4">
        Draw From Memory!
      </h2>

      {/* Canvas */}
      <div className="flex justify-center mb-6">
        <div className="border-4 border-dashed border-purple-300 dark:border-purple-700 rounded-xl overflow-hidden shadow-lg">
          <ReactSketchCanvas
            ref={canvasRef}
            style={{ border: "none" }}
            width="400px"
            height="400px"
            strokeWidth={strokeWidth}
            strokeColor={isErasing ? "#FFFFFF" : strokeColor}
            canvasColor="#FFFFFF"
          />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-center gap-3 bg-white/40 dark:bg-black/30 rounded-xl p-4 shadow-md mb-4 backdrop-blur-sm">
        {/* Brush / Eraser */}
        <Button
          onClick={() => setIsErasing(false)}
          variant={isErasing ? "outline" : "default"}
          className={!isErasing ? "bg-purple-600 hover:bg-purple-700 text-white" : ""}
        >
          <Paintbrush className="w-4 h-4 mr-1" /> Brush
        </Button>
        <Button
          onClick={() => setIsErasing(true)}
          variant={isErasing ? "default" : "outline"}
          className={isErasing ? "bg-rose-600 hover:bg-rose-700 text-white" : ""}
        >
          <Eraser className="w-4 h-4 mr-1" /> Eraser
        </Button>

        {/* Color swatches */}
        {swatches.map((c) => (
          <button
            key={c}
            onClick={() => {
              setIsErasing(false)
              setStrokeColor(c)
            }}
            className={`h-7 w-7 rounded-full ring-2 ring-offset-2 ${
              strokeColor === c ? "ring-black" : "ring-transparent"
            }`}
            style={{ backgroundColor: c }}
          />
        ))}

        {/* Width selector */}
        <select
          value={strokeWidth}
          onChange={(e) => setStrokeWidth(Number(e.target.value))}
          className="rounded-md border px-2 py-1 bg-background"
        >
          {[1, 2, 3, 4, 6, 8, 10].map((w) => (
            <option key={w} value={w}>
              {w}px
            </option>
          ))}
        </select>

        {/* Undo/Redo/Clear */}
        <div className="flex gap-2 ml-4">
          <Button onClick={() => canvasRef.current?.undo()} variant="outline">
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button onClick={() => canvasRef.current?.redo()} variant="outline">
            <Redo2 className="w-4 h-4" />
          </Button>
          <Button onClick={() => canvasRef.current?.clearCanvas()} variant="outline">
            <Trash className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Timer */}
      <div className="space-y-2 w-full max-w-md">
        <div className="flex justify-between">
          <span className="font-medium">Time Remaining</span>
          <span className="font-bold text-purple-600 dark:text-purple-400">
            {timeLeft}s
          </span>
        </div>
        <Progress value={getProgress()} />
      </div>

      {/* Submit */}
      <div className="mt-6">
        <Button
          onClick={saveDrawing}
          disabled={isUploading || hasSaved}
          className="bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg"
        >
          {isUploading ? "Uploading..." : hasSaved ? "Done!" : "Finish Early"}
        </Button>
      </div>
    </div>
  )
}
