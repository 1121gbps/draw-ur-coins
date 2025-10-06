"use client"

import { useEffect, useRef, useState } from "react"
import { ReactSketchCanvas } from "react-sketch-canvas"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { supabase } from "@/lib/supabaseClient"
import { Undo2, Redo2, Trash, Paintbrush, Eraser, Palette } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

type AnyRoom = {
  id: string
  code: string
  host_id: string | null
  phase: "waiting" | "memorize" | "draw" | "compare"
}

type AnyPlayer = {
  id: string
  name: string
}

export default function DrawView({
  code,
  room,
  currentPlayer,
}: {
  code: string
  room: AnyRoom
  currentPlayer: AnyPlayer
}) {
  const canvasRef = useRef<ReactSketchCanvas | null>(null)
  const [timeLeft, setTimeLeft] = useState(60)
  const [isErasing, setIsErasing] = useState(false)
  const [strokeColor, setStrokeColor] = useState("#000000")
  const [customColor, setCustomColor] = useState("#000000")
  const [strokeWidth, setStrokeWidth] = useState(3)
  const [isUploading, setIsUploading] = useState(false)
  const [hasSaved, setHasSaved] = useState(false)
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null)

  const savingRef = useRef(false)
  const isHost = currentPlayer?.id === room?.host_id

  const SWATCHES = ["#000000", "#FF0000", "#00B050", "#1E90FF", "#FFD700", "#FF69B4"]

  // Ensure anonymous auth (client-only)
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) await supabase.auth.signInAnonymously()
    })
  }, [])

  // Countdown (stops when saved OR not in "draw")
  useEffect(() => {
    if (hasSaved) return
    if (room.phase !== "draw") return
    if (timeLeft <= 0) {
      void saveDrawing()
      return
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [timeLeft, hasSaved, room.phase])

  // Host: after any player updates, re-check if everyone is done and force phase → compare.
  useEffect(() => {
    if (!isHost || !room?.id) return
    const ch = supabase
      .channel(`players-${room.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "players", filter: `room_id=eq.${room.id}` },
        async () => {
          const { data: players } = await supabase
            .from("players")
            .select("done")
            .eq("room_id", room.id)

          const allDone = players?.length ? players.every((p: any) => p.done) : false
          if (allDone && room.phase === "draw") {
            // Force compare (covers Vercel realtime flakiness)
            await supabase.from("rooms").update({ phase: "compare" }).eq("id", room.id)
            // Optional console log for debugging:
            console.log("✅ Host detected all done → phase set to compare")
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(ch)
    }
  }, [isHost, room?.id, room?.phase])

  // Guest: react to room phase change → refresh (small delay to let state flush)
  useEffect(() => {
    if (!room?.id) return
    const ch = supabase
      .channel(`room-${room.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${room.id}` },
        (payload) => {
          const newPhase = payload.new?.phase
          if (newPhase === "compare") {
            // Small delay avoids race with UI unmounting on Vercel
            setTimeout(() => window.location.reload(), 400)
          }
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  }, [room?.id])

  const getProgress = () => ((60 - timeLeft) / 60) * 100

  // Save drawing (upload + mark done + host forces compare if all done)
  const saveDrawing = async () => {
    if (savingRef.current || isUploading || hasSaved) return
    savingRef.current = true
    setIsUploading(true)

    try {
      const dataUrl = await canvasRef.current?.exportImage("png")
      if (!dataUrl) throw new Error("Canvas export failed")
      const blob = await (await fetch(dataUrl)).blob()
      const filePath = `drawings/${room.code}/${currentPlayer.id}-${Date.now()}.png`

      // Upload to private bucket (or public if you configured it so)
      const { error: uploadError } = await supabase.storage
        .from("drawings")
        .upload(filePath, blob, { contentType: blob.type, upsert: true })
      if (uploadError) throw uploadError

      // Get a signed URL (24h) so CompareView can render it
      const { data: signed } = await supabase.storage
        .from("drawings")
        .createSignedUrl(filePath, 60 * 60 * 24)

      // Mark player as done with URL
      const { error: updateErr } = await supabase
        .from("players")
        .update({ done: true, drawing_url: signed?.signedUrl })
        .eq("id", currentPlayer.id)
      if (updateErr) throw updateErr

      // Host immediately re-checks everyone and forces compare if needed
      if (isHost) {
        const { data: players } = await supabase
          .from("players")
          .select("done")
          .eq("room_id", room.id)

        const allDone = players?.length ? players.every((p: any) => p.done) : false
        console.log("🔎 Host immediate check after save:", players)
        if (allDone) {
          await supabase.from("rooms").update({ phase: "compare" }).eq("id", room.id)
          console.log("✅ All players done (host fast path) → phase set to compare")
        }
      }

      setHasSaved(true)
    } catch (err) {
      console.error("❌ Failed to save drawing:", err)
    } finally {
      setIsUploading(false)
      savingRef.current = false
    }
  }

  return (
    <motion.div
      className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-purple-50 to-pink-100 dark:from-purple-950 dark:to-pink-950"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <motion.h2
        className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-4"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        Draw From Memory!
      </motion.h2>

      {/* Canvas + cursor preview */}
      <div
        className="relative border-4 border-dashed border-purple-300 dark:border-purple-700 rounded-xl overflow-hidden shadow-lg mb-6"
        style={{ width: 400, height: 400 }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
        }}
        onMouseLeave={() => setCursorPos(null)}
      >
        <ReactSketchCanvas
          ref={canvasRef}
          style={{ border: "none" }}
          width="400px"
          height="400px"
          strokeWidth={strokeWidth}
          strokeColor={isErasing ? "#FFFFFF" : strokeColor}
          canvasColor="#FFFFFF"
        />
        <AnimatePresence>
          {cursorPos && (
            <motion.div
              className="absolute rounded-full pointer-events-none hidden md:block"
              style={{
                left: cursorPos.x - strokeWidth / 2,
                top: cursorPos.y - strokeWidth / 2,
                width: strokeWidth,
                height: strokeWidth,
                backgroundColor: isErasing ? "rgba(255,255,255,0.75)" : `${strokeColor}cc`,
                border: "1px solid rgba(0,0,0,0.2)",
              }}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0 }}
              transition={{ duration: 0.1 }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Toolbar */}
      <motion.div
        className="flex flex-wrap items-center justify-center gap-3 bg-white/40 dark:bg-black/30 rounded-xl p-4 shadow-md mb-4 backdrop-blur-sm"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
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

        {/* Swatches */}
        {SWATCHES.map((c) => (
          <button
            key={c}
            onClick={() => {
              setIsErasing(false)
              setStrokeColor(c)
              setCustomColor(c)
            }}
            className={`h-7 w-7 rounded-full ring-2 ring-offset-2 ${
              strokeColor === c ? "ring-black" : "ring-transparent"
            }`}
            style={{ backgroundColor: c }}
            aria-label={`Color ${c}`}
            title={c}
          />
        ))}

        {/* Color Picker */}
        <label className="flex items-center gap-1 cursor-pointer">
          <Palette className="w-4 h-4 text-purple-600" />
          <input
            type="color"
            value={customColor}
            onChange={(e) => {
              const v = e.target.value
              setIsErasing(false)
              setStrokeColor(v)
              setCustomColor(v)
            }}
            className="w-7 h-7 border-none cursor-pointer bg-transparent"
            aria-label="Custom color"
            title="Custom color"
          />
        </label>

        {/* Width */}
        <select
          value={strokeWidth}
          onChange={(e) => setStrokeWidth(Number(e.target.value))}
          className="rounded-md border px-2 py-1 bg-background text-sm"
          aria-label="Brush width"
          title="Brush width"
        >
          {[2, 4, 6, 8, 10, 12, 14, 16].map((w) => (
            <option key={w} value={w}>
              {w}px
            </option>
          ))}
        </select>

        {/* Undo/Redo/Clear */}
        <div className="flex gap-2 ml-2">
          <Button onClick={() => canvasRef.current?.undo()} variant="outline" title="Undo">
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button onClick={() => canvasRef.current?.redo()} variant="outline" title="Redo">
            <Redo2 className="w-4 h-4" />
          </Button>
          <Button onClick={() => canvasRef.current?.clearCanvas()} variant="outline" title="Clear">
            <Trash className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>

      {/* Timer */}
      <div className="space-y-2 w-full max-w-md">
        <div className="flex justify-between">
          <span className="font-medium">Time Remaining</span>
          <span className="font-bold text-purple-600 dark:text-purple-400">{timeLeft}s</span>
        </div>
        <Progress value={getProgress()} />
      </div>

      {/* Submit */}
      <div className="mt-6">
        <Button
          onClick={saveDrawing}
          disabled={isUploading || hasSaved}
          className="bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg shadow-md"
        >
          {isUploading ? "Uploading..." : hasSaved ? "Done!" : "Finish Early"}
        </Button>
      </div>
    </motion.div>
  )
}