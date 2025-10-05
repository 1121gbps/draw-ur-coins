import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { randomUUID } from "crypto"
import { fileTypeFromBuffer } from "file-type"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function POST(req: Request) {
  try {
    const buffer = Buffer.from(await req.arrayBuffer())
    const fileType = await fileTypeFromBuffer(buffer)   

    if (!fileType || !fileType.mime.startsWith("image/")) {
      return NextResponse.json({ error: "Only image uploads allowed" }, { status: 400 })
    }

    const fileName = `${randomUUID()}.${fileType.ext}`
    const filePath = `drawings/${fileName}`

    const { error } = await supabase.storage
      .from("drawings")
      .upload(filePath, buffer, { contentType: fileType.mime })

    if (error) throw error

    // Generate signed URL (valid 24h)
    const { data: signed } = await supabase.storage
      .from("drawings")
      .createSignedUrl(filePath, 60 * 60 * 24)

    return NextResponse.json({
      success: true,
      url: signed?.signedUrl,
      path: filePath,
    })
  } catch (e) {
    console.error("Upload failed:", e)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
