import { NextResponse } from "next/server";
import coins from "@/data/coins.json";

export async function GET() {
  const shuffled = [...coins].sort(() => Math.random() - Math.random());
  return NextResponse.json(shuffled)
}