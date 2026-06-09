import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { ids }: { ids: string[] } = await request.json()
  if (!ids?.length) return NextResponse.json({ error: "ids required" }, { status: 400 })

  // Best-effort storage cleanup
  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const imagePaths = ids.map((id) => `${user.id}/${id}/image.png`)
  await service.storage.from("wardrobe-images").remove(imagePaths)

  // Delete items (outfit_items junction rows cascade automatically)
  const { error } = await supabase
    .from("wardrobe_items")
    .delete()
    .in("id", ids)
    .eq("user_id", user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ deleted: ids.length })
}
