"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { LogOut, Trash2, User, Menu } from "lucide-react"
import type { Room, Player } from "@/types/game"

export function FooterActions({
  currentPlayer,
  isHost,
  room,
  handleLeaveRoom,
  handleDeleteRoom,
}: {
  currentPlayer: Player | null
  isHost: boolean
  room: Room | null
  handleLeaveRoom: () => void
  handleDeleteRoom: () => void
}) {
  const [showCode, setShowCode] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Auto close drawer on phase change
  useEffect(() => {
    setDrawerOpen(false)
  }, [room?.phase])

  return (
    <>
      {/* Desktop Footer */}
      <footer className="hidden md:flex fixed bottom-4 inset-x-0 items-center justify-between px-6 py-2 bg-background/70 backdrop-blur-md border border-border rounded-lg shadow-sm z-40">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-2 font-medium text-foreground">
            <User className="h-4 w-4" />
            <span>{currentPlayer?.name || "Unnamed Player"}</span>
          </span>

          {room?.code && (
            <>
              <button
                onClick={() => setShowCode(!showCode)}
                className="text-xs underline hover:text-foreground"
              >
                {showCode ? "Hide Code" : "Show Code"}
              </button>
              {showCode && (
                <span className="font-mono text-xs bg-muted text-foreground px-2 py-1 rounded-md border">
                  {room.code}
                </span>
              )}
            </>
          )}
        </div>

        <div className="flex gap-2">
          {!isHost && (
            <Button
              variant="outline"
              onClick={handleLeaveRoom}
              className="border-red-300 text-red-500 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4 mr-1" /> Leave
            </Button>
          )}
          {isHost && (
            <Button
              variant="destructive"
              onClick={handleDeleteRoom}
              className="flex items-center"
            >
              <Trash2 className="w-4 h-4 mr-1" /> Delete
            </Button>
          )}
        </div>
      </footer>

      {/* 📱 Mobile Drawer */}
      <div className="fixed top-2 left-2 md:hidden z-50">
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetTrigger asChild>
            <Button size="icon" variant="outline" className="rounded-full shadow-md">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 bg-background/95 backdrop-blur-md border-r border-border">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <User className="h-4 w-4" />
                {currentPlayer?.name || "Unnamed Player"}
              </SheetTitle>
            </SheetHeader>

            <div className="mt-6 flex flex-col gap-3 text-sm p-4">
              {room?.code && (
                <div className="flex flex-col gap-1">
                  <p className="text-muted-foreground text-xs uppercase">Room Code</p>
                  <code className="font-mono text-sm bg-muted px-2 py-1 rounded-md">{room.code}</code>
                </div>
              )}

              <div className="mt-4 flex flex-col gap-2">
                {!isHost && (
                  <Button
                    variant="outline"
                    onClick={handleLeaveRoom}
                    className="justify-start border-red-300 text-red-500 hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4 mr-2" /> Leave Room
                  </Button>
                )}
                {isHost && (
                  <Button
                    variant="destructive"
                    onClick={handleDeleteRoom}
                    className="justify-start"
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Delete Room
                  </Button>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}