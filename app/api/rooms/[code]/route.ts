import { NextResponse } from "next/server";
import { getRoom } from "@/lib/rooms";

// ルーム情報取得
export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const room = getRoom(code);

    if (!room) {
      return NextResponse.json(
        { error: "ルームが見つかりません" },
        { status: 404 }
      );
    }

    return NextResponse.json({ room });
  } catch (error) {
    console.error("Error fetching room:", error);
    return NextResponse.json(
      { error: "ルーム情報の取得に失敗しました" },
      { status: 500 }
    );
  }
}
