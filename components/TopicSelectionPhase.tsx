"use client";

import { Room, TopicProposal } from "@/types/game";
import { useState } from "react";

interface Props {
  room: Room;
  playerId: string;
}

export default function TopicSelectionPhase({ room, playerId }: Props) {
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const currentPlayer = room.players.find(p => p.id === playerId);
  const isHost = currentPlayer?.isHost;

  const submitSelection = async () => {
    if (!selectedTopicId) {
      alert("お題を選択してください");
      return;
    }

    if (!confirm("このお題で決定しますか？")) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/rooms/${room.code}/select-topic`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, topicId: selectedTopicId }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "お題の決定に失敗しました");
      }
    } catch (err) {
      console.error(err);
      alert("お題の決定に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  // 投票数順にソート (多い順)
  const sortedProposals = [...room.topicProposals].sort((a, b) => b.votes - a.votes);

  if (!isHost) {
    return (
      <div className="text-center py-8">
         <div className="text-5xl mb-4">🤔</div>
         <h2 className="text-2xl font-bold text-gray-800 mb-2">ホストがお題を選んでいます</h2>
         <p className="text-gray-600">しばらくお待ちください...</p>
         
         <div className="mt-8 max-w-md mx-auto bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-bold text-gray-500 mb-3 text-left">投票結果</h3>
            <div className="space-y-2">
              {sortedProposals.map(proposal => (
                <div key={proposal.id} className="flex justify-between items-center p-2 bg-white rounded border border-gray-200">
                  <span className="text-gray-800">{proposal.topic}</span>
                  <span className="font-bold text-purple-600">{proposal.votes}票</span>
                </div>
              ))}
            </div>
         </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">お題の最終決定</h2>
        <p className="text-gray-600">
          今回プレイするお題を決定してください。<br/>
          （投票数が多かった順に並んでいます）
        </p>
      </div>

      <div className="space-y-3">
        {sortedProposals.map((proposal) => (
          <button
            key={proposal.id}
            onClick={() => setSelectedTopicId(proposal.id)}
            className={`w-full p-4 rounded-lg border-2 transition-all duration-200 text-left ${
              selectedTopicId === proposal.id
                ? "border-purple-500 bg-purple-50"
                : "border-gray-200 bg-white hover:border-purple-300"
            }`}
            disabled={submitting}
          >
            <div className="flex justify-between items-center">
              <div>
                <div className="text-lg font-bold text-gray-800">{proposal.topic}</div>
                {/* 匿名化（ホストには見せてもいいが、一貫性のため隠す） */}
                {/* <div className="text-sm text-gray-500">提案: {proposal.playerName}</div> */}
              </div>
              <div className="flex items-center gap-4">
                 <div className="text-right">
                    <div className="text-xl font-bold text-purple-600">{proposal.votes}票</div>
                 </div>
                 {selectedTopicId === proposal.id && (
                    <div className="text-purple-600 text-2xl">✓</div>
                 )}
              </div>
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={submitSelection}
        disabled={submitting || !selectedTopicId}
        className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-lg transition duration-200 shadow-lg"
      >
        {submitting ? "決定中..." : "このお題で決定"}
      </button>
    </div>
  );
}
