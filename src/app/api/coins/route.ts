import { NextResponse } from "next/server";
import coins from "@/data/coins.json";

export async function GET() {
  return NextResponse.json(coins);
}
