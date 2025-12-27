import { NextResponse } from "next/server";
import { getRoom, updateRoom } from "@/lib/rooms";

// ホストによるお題決定
export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const { playerId, topicId } = await request.json();

    const room = await getRoom(code);
    if (!room) {
      return NextResponse.json(
        { error: "ルームが見つかりません" },
        { status: 404 }
      );
    }

    // ホストチェック
    if (room.hostId !== playerId) {
      return NextResponse.json(
        { error: "ホストのみがお題を決定できます" },
        { status: 403 }
      );
    }

    if (room.phase !== "topic_selection") {
      return NextResponse.json(
        { error: "お題決定フェーズではありません" },
        { status: 400 }
      );
    }

    const selectedProposal = room.topicProposals.find(p => p.id === topicId);
    if (!selectedProposal) {
      return NextResponse.json(
        { error: "選択されたお題が見つかりません" },
        { status: 404 }
      );
    }

    // 回答フェーズへ移行
    const updatedRoom = await updateRoom(code, {
      phase: "answering",
      selectedTopic: selectedProposal.topic,
    });

    return NextResponse.json({ room: updatedRoom });
  } catch (error) {
    console.error("Error selecting topic:", error);
    return NextResponse.json(
      { error: "お題の決定に失敗しました" },
      { status: 500 }
    );
  }
}
