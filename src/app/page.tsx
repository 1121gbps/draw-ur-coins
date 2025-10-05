"use client"

import { useState, useEffect, useRef } from "react"
import { ReactSketchCanvas } from "react-sketch-canvas"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Sparkles, Brain, Pencil, Eye, RotateCcw, Undo2, Redo2, Eraser, Paintbrush, Trash } from "lucide-react"
import Coin from "@/components/Coin"
import ScrollingCoins from "@/components/ScrollingCoins";
import Image from 'next/image'

type CoinData = {
  name: string
  src: string
}

export default function CoinGame() {
  const [stage, setStage] = useState("start")
  const [coins, setCoins] = useState<CoinData[]>([])
  const [coin, setCoin] = useState<CoinData | null>(null)
  const [timeLeft, setTimeLeft] = useState(10)
  const [drawing, setDrawing] = useState<string | null>(null)

  // drawing controls
  const canvasRef = useRef<any>(null)
  const [strokeColor, setStrokeColor] = useState("#8b5cf6") // default purple
  const [customColor, setCustomColor] = useState("#000000")
  const [strokeWidth, setStrokeWidth] = useState(3)
  const [isErasing, setIsErasing] = useState(false)

  // Fetch coins from API
  useEffect(() => {
    fetch("/api/coins")
      .then((res) => res.json())
      .then((data) => setCoins(data))
  }, [])

  // Timer logic
  useEffect(() => {
    if (stage === "memorize" || stage === "draw") {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            if (stage === "memorize") {
              setStage("draw")
              return 60
            } else {
              saveDrawing()
              setStage("compare")
              return 0
            }
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [stage])

  // Toggle erase mode on the canvas when isErasing changes
  useEffect(() => {
    if (canvasRef.current?.eraseMode) {
      canvasRef.current.eraseMode(isErasing)
    }
  }, [isErasing])

  const startGame = () => {
    if (coins.length > 0) {
      const randomCoin = coins[Math.floor(Math.random() * coins.length)]
      setCoin(randomCoin)
      setStage("memorize")
      setTimeLeft(10)
    }
  }

  const saveDrawing = async () => {
    if (canvasRef.current) {
      const dataUrl = await canvasRef.current.exportImage("png")
      setDrawing(dataUrl)
    }
  }

  const resetGame = () => {
    setStage("start")
    setCoin(null)
    setDrawing(null)
    setTimeLeft(10)
    setIsErasing(false)
    setStrokeColor("#8b5cf6")
    setStrokeWidth(3)
  }

  const getProgress = () => {
    const limit = stage === "memorize" ? 10 : 60
    return ((limit - timeLeft) / limit) * 100
  }

  // preset color swatches
  const swatches = ["#000000", "#ffffff", "#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"]

  return (
  <div className="relative min-h-screen bg-gradient-to-b from-sky-100 via-blue-100 to-blue-200 dark:from-sky-900 dark:via-blue-950 dark:to-blue-950 flex items-center justify-center overflow-hidden">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-5xl font-bold text-fuchsia-500 mb-2 flex items-center justify-center gap-3">
            <Sparkles className="w-10 h-10 text-yellow-500 animate-pulse" />
            draw-ur-coin
          </h1>
        </div>
        {/* Start Stage */}
        {stage === "start" && (
          <Card className="border-2 border-purple-200 dark:border-purple-800 shadow-2xl animate-scale-in">
            <CardHeader className="text-center space-y-4">
              {/* background coins */}
              <div className="absolute inset-x-0 top-4 opacity-60">
                <ScrollingCoins height={64} gap={20} durationSec={28} rows={2} />
              </div>
              <CardTitle className="text-3xl">Ready to Play?</CardTitle>
              <CardDescription className="text-base">
                You&apos;ll have 10 seconds to memorize a coin, then 60 seconds to draw it from memory!
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center pb-8">
              <Button
                onClick={startGame}
                size="lg"
                className="bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 hover:from-cyan-600 hover:via-purple-600 hover:to-pink-600 text-white font-bold text-lg px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                <Sparkles className="mr-2 h-5 w-5" />
                Start Game
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Memorize Stage */}
        {stage === "memorize" && coin && (
          <Card className="border-2 border-cyan-200 dark:border-cyan-800 shadow-2xl animate-fade-in">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center mb-4 animate-pulse">
                <Eye className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-3xl text-cyan-600 dark:text-cyan-400">Memorize This Coin!</CardTitle>
              <CardDescription className="text-lg">Study it carefully...</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-center animate-scale-in">
                <div className="p-8 bg-gradient-to-br from-yellow-100 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30 rounded-2xl shadow-inner">
                  <Coin src={coin.src} name={coin.name} size={200} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Time Remaining</span>
                  <span className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{timeLeft}s</span>
                </div>
                <Progress value={getProgress()} className="h-3 bg-cyan-100 dark:bg-cyan-900" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Draw Stage */}
        {stage === "draw" && (
          <Card className="border-2 border-purple-200 dark:border-purple-800 shadow-2xl animate-fade-in">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center mb-4 animate-pulse">
                <Pencil className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-3xl text-purple-600 dark:text-purple-400">Draw From Memory!</CardTitle>
              <CardDescription className="text-lg">Recreate the coin as best as you can</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Canvas */}
              <div className="flex justify-center">
                <div className="border-4 border-dashed border-purple-300 dark:border-purple-700 rounded-xl overflow-hidden shadow-lg animate-scale-in">
                  <ReactSketchCanvas
                    ref={canvasRef}
                    style={{ border: "none" }}
                    width="400px"
                    height="400px"
                    strokeWidth={strokeWidth}
                    strokeColor={strokeColor}
                    canvasColor="#ffffff"
                  />
                </div>
              </div>
              {/* Controls */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-muted rounded-md p-4">
                {/* Brush / Eraser toggle */}
                <div className="flex items-center gap-2">
                  <Button
                    variant={isErasing ? "outline" : "default"}
                    onClick={() => setIsErasing(false)}
                    className={!isErasing ? "bg-purple-600 hover:bg-purple-700" : ""}
                    title="Brush"
                  >
                    <Paintbrush className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={isErasing ? "default" : "outline"}
                    onClick={() => setIsErasing(true)}
                    className={isErasing ? "bg-rose-700 hover:bg-rose-700 dark:hover:bg-rose-400 text-white" : ""}
                    title="Eraser"
                  >
                    <Eraser className="w-4 h-4" />
                  </Button>
                </div>

                {/* Colors */}
                <div className="flex items-center gap-2 rounded-md bg-card">
                  {swatches.map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        setIsErasing(false)
                        setStrokeColor(c)
                      }}
                      className="h-7 w-7 rounded-full ring-2 ring-offset-2 ring-offset-background"
                      style={{ backgroundColor: c, ringColor: strokeColor === c ? "#000" : "transparent" }}
                      aria-label={`Pick ${c}`}
                      title={c}
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
                    className="h-8 w-10 rounded-full cursor-pointer border border-muted"
                    title="Custom color"
                  />
                </div>

                {/* Width */}
                <div className="flex items-center gap-2">
                  <label htmlFor="width" className="text-sm">Width</label>
                  <select
                    id="width"
                    value={strokeWidth}
                    onChange={(e) => setStrokeWidth(Number(e.target.value))}
                    className="h-9 rounded-md border px-2 bg-background"
                  >
                    {[1, 2, 3, 4, 6, 8, 10, 12].map((w) => (
                      <option key={w} value={w}>{w}px</option>
                    ))}
                  </select>
                </div>

                {/* Undo/Redo/Clear */}
                <div className="flex justify-left gap-2">
                  <Button variant="outline" onClick={() => canvasRef.current?.undo()} className="bg-slate-900 hover:bg-blue-300 dark:hover:bg-blue-600">
                    <Undo2 className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" onClick={() => canvasRef.current?.redo()} className="bg-slate-900 hover:bg-green-600 dark:hover:bg-green-300">
                    <Redo2 className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => canvasRef.current?.clearCanvas()}
                    variant="outline"
                    className="border-2 border-white bg-slate-900 hover:bg-red-600 dark:hover:bg-red-300"
                  >
                    <Trash />
                  </Button>
                </div>
              </div>
              {/* Timer */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Time Remaining</span>
                  <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">{timeLeft}s</span>
                </div>
                <Progress value={getProgress()} className="h-3 bg-purple-100 dark:bg-purple-900" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Compare Stage */}
        {stage === "compare" && coin && (
          <Card className="border-2 border-pink-200 dark:border-pink-800 shadow-2xl animate-fade-in">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl text-pink-600 dark:text-pink-400">How Did You Do?</CardTitle>
              <CardDescription className="text-lg">Compare your drawing to the original</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-4 animate-slide-in-left">
                  <h3 className="text-xl font-semibold text-center text-cyan-600 dark:text-cyan-400">Original Coin</h3>
                  <div className="flex justify-center">
                    <div className="p-6 bg-gradient-to-br from-yellow-100 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30 rounded-2xl shadow-lg">
                      <Coin src={coin.src} name={coin.name} size={180} />
                    </div>
                  </div>
                </div>
                <div className="space-y-4 animate-slide-in-right">
                  <h3 className="text-xl font-semibold text-center text-purple-600 dark:text-purple-400">
                    Your Drawing
                  </h3>
                  <div className="flex justify-center">
                    {drawing ? (
                      <div className="p-6 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-2xl shadow-lg">
                        <Image
                          src={drawing || "/placeholder.svg"}
                          alt="your drawing"
                          width={180}
                          height={180}
                          className="rounded-lg"
                        ></Image>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No drawing found</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex justify-center pt-4">
                <Button
                  onClick={resetGame}
                  size="lg"
                  className="bg-pink-500 hover:from-cyan-600 hover:via-purple-600 hover:to-pink-600 text-white font-bold text-lg px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  <RotateCcw className="mr-2 h-5 w-5" />
                  Play Again
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
          <Card className="border-2 border-blue-200 dark:border-blue-800 shadow-2xl animate-scale-in mt-8">
            <CardFooter className="text-left space-y-4">
              Made with 🥰 by 1121gbps
            </CardFooter>
            <CardFooter className="text-right">
              @ Siege Hackclub&apos;s Event 
            </CardFooter>
          </Card>
      </div>
    </div>
  )
}
