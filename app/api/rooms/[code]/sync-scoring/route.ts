import { NextResponse } from "next/server";
import { updateRoom } from "@/lib/rooms";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { scoringGroups } = await request.json();
    const { code } = await params;

    // ルームの scoringGroups フィールドだけを更新
    // これにより、Pusher経由で「room update」イベントが全クライアントに飛び、
    // 全員の画面が同期される。
    const updatedRoom = await updateRoom(code, {
      scoringGroups: scoringGroups,
    });

    if (!updatedRoom) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, room: updatedRoom });
  } catch (error) {
    console.error("Sync scoring error:", error);
    return NextResponse.json(
      { error: "Failed to sync scoring state" },
      { status: 500 }
    );
  }
}
