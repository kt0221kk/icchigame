import { NextResponse } from "next/server";
import { getRoom, updateRoom } from "@/lib/rooms";

// 採点確定・結果表示へ
export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const { playerId, adjustments, scoringGroups } = await request.json(); 
    // adjustments: { [playerId]: scoreDelta } 
    // scoringGroups: 最終的なグループ構成

    const room = await getRoom(code);
    if (!room) {
      return NextResponse.json(
        { error: "ルームが見つからない" }, // Typo fix: ルームが見つかりません -> ルームが見つからない (match other errors if needed, or keep consistent)
        { status: 404 }
      );
    }

    // ホストチェック
    if (room.hostId !== playerId) {
      return NextResponse.json(
        { error: "ホストのみが採点を確定できます" },
        { status: 403 }
      );
    }

    if (room.phase !== "scoring") {
      return NextResponse.json(
        { error: "採点フェーズではありません" },
        { status: 400 }
      );
    }

    // スコア更新
    const updatedPlayers = room.players.map(p => {
      const adjustment = adjustments[p.id] || 0;
      return {
        ...p,
        score: p.score + adjustment
      };
    });

    const updatedRoom = await updateRoom(code, {
      players: updatedPlayers,
      phase: "results",
      scoringGroups: scoringGroups, // 保存
    });

    return NextResponse.json({ room: updatedRoom });
  } catch (error) {
    console.error("Error finalizing scores:", error);
    return NextResponse.json(
      { error: "スコアの確定に失敗しました" },
      { status: 500 }
    );
  }
}
