import { NextResponse } from "next/server";
import { updateRoom, getRoom } from "@/lib/rooms";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { playerId, targetPlayerId } = await request.json();
    const { code } = await params;

    const room = await getRoom(code);
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // ホスト権限チェック
    if (room.hostId !== playerId) {
      return NextResponse.json(
        { error: "Only host can kick players" },
        { status: 403 }
      );
    }
    
    // 自分自身はキックできない
    if (playerId === targetPlayerId) {
        return NextResponse.json(
            { error: "Cannot kick yourself" },
            { status: 400 }
        );
    }

    // プレイヤー削除
    const updatedPlayers = room.players.filter(p => p.id !== targetPlayerId);
    
    // 更新
    const updatedRoom = await updateRoom(code, {
      players: updatedPlayers,
    });

    return NextResponse.json({ success: true, room: updatedRoom });
  } catch (error) {
    console.error("Kick player error:", error);
    return NextResponse.json(
      { error: "Failed to kick player" },
      { status: 500 }
    );
  }
}
