import { NextResponse } from "next/server";
import { getRoom, updateRoom } from "@/lib/rooms";

// お題投票
export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const { playerId, topicId } = await request.json();

    const room = getRoom(code);
    if (!room) {
      return NextResponse.json(
        { error: "ルームが見つかりません" },
        { status: 404 }
      );
    }

    if (room.phase !== "voting") {
      return NextResponse.json(
        { error: "投票フェーズではありません" },
        { status: 400 }
      );
    }

    const player = room.players.find(p => p.id === playerId);
    if (!player) {
      return NextResponse.json(
        { error: "プレイヤーが見つかりません" },
        { status: 404 }
      );
    }

    // 投票を記録
    const updatedPlayers = room.players.map(p =>
      p.id === playerId
        ? { ...p, votedTopicId: topicId, hasSubmitted: true }
        : p
    );

    // 投票数を集計
    const updatedProposals = room.topicProposals.map(proposal => ({
      ...proposal,
      votes: updatedPlayers.filter(p => p.votedTopicId === proposal.id).length,
    }));

    // 全員が投票したか確認
    const allVoted = updatedPlayers.every(p => p.hasSubmitted);

    let newPhase = room.phase;
    let selectedTopic: string | undefined;

    if (allVoted) {
      // 最多得票のお題を選択
      const sortedProposals = [...updatedProposals].sort((a, b) => b.votes - a.votes);
      selectedTopic = sortedProposals[0]?.topic;

      // 回答フェーズへ移行
      newPhase = "answering";

      // hasSubmittedとanswerをリセット
      updatedPlayers.forEach(p => {
        p.hasSubmitted = false;
        p.answer = undefined;
      });
    }

    const updatedRoom = updateRoom(code, {
      players: updatedPlayers,
      phase: newPhase,
      topicProposals: updatedProposals,
      selectedTopic,
    });

    return NextResponse.json({ room: updatedRoom });
  } catch (error) {
    console.error("Error voting:", error);
    return NextResponse.json(
      { error: "投票に失敗しました" },
      { status: 500 }
    );
  }
}
