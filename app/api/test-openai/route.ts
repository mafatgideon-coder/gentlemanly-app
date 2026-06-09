import OpenAI from "openai"
import { NextResponse } from "next/server"

export async function GET() {
  const key = process.env.OPENAI_API_KEY

  if (!key) {
    return NextResponse.json({ status: "MISSING", message: "OPENAI_API_KEY is not set in Vercel env vars" })
  }

  try {
    const client = new OpenAI({ apiKey: key })
    const result = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "Say OK" }],
      max_tokens: 5,
    })
    return NextResponse.json({
      status: "OK",
      key_prefix: key.slice(0, 12) + "...",
      response: result.choices[0]?.message?.content,
    })
  } catch (err) {
    return NextResponse.json({
      status: "ERROR",
      key_prefix: key.slice(0, 12) + "...",
      message: err instanceof Error ? err.message : String(err),
    })
  }
}
