"use client";

import { Room } from "@/types/game";
import { useState } from "react";

interface Props {
  room: Room;
  playerId: string;
}

export default function VotingPhase({ room, playerId }: Props) {
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const currentPlayer = room.players.find(p => p.id === playerId);
  const hasVoted = currentPlayer?.hasSubmitted || false;
  const votedCount = room.players.filter(p => p.hasSubmitted).length;

  const submitVote = async () => {
    if (!selectedTopicId) {
      alert("お題を選択してください");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/rooms/${room.code}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, topicId: selectedTopicId }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "投票に失敗しました");
      }
    } catch (err) {
      console.error(err);
      alert("投票に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">お題投票</h2>
        <p className="text-gray-600">
          遊びたいお題に投票してください
        </p>
        <div className="mt-2 text-sm text-gray-500">
          {votedCount} / {room.players.length} 人が投票済み
        </div>
      </div>

      {hasVoted ? (
        <div className="bg-green-50 border border-green-300 rounded-lg p-6 text-center">
          <div className="text-green-600 text-5xl mb-3">✓</div>
          <h3 className="text-xl font-bold text-green-900 mb-2">投票完了！</h3>
          <p className="text-green-700 mt-2">他のプレイヤーが投票するまで待機してください</p>

          {/* 現在の投票状況 */}
          <div className="mt-6 space-y-3">
            <h4 className="text-sm font-semibold text-gray-700">現在の投票状況</h4>
            {room.topicProposals
              .sort((a, b) => b.votes - a.votes)
              .map((proposal) => (
                <div
                  key={proposal.id}
                  className={`p-3 rounded-lg ${
                    proposal.id === currentPlayer?.votedTopicId
                      ? "bg-purple-100 border-2 border-purple-500"
                      : "bg-white border border-gray-200"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="text-left">
                      <div className="font-medium text-gray-800">{proposal.topic}</div>
                      <div className="text-xs text-gray-500">提案: {proposal.playerName}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-purple-600">{proposal.votes}</div>
                      <div className="text-xs text-gray-500">票</div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* お題リスト */}
          <div className="space-y-3">
            {room.topicProposals.map((proposal) => (
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
                    <div className="text-sm text-gray-500">提案: {proposal.playerName}</div>
                  </div>
                  {selectedTopicId === proposal.id && (
                    <div className="text-purple-600 text-2xl">✓</div>
                  )}
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={submitVote}
            disabled={submitting || !selectedTopicId}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-lg transition duration-200"
          >
            {submitting ? "投票中..." : "このお題に投票"}
          </button>
        </div>
      )}

      {/* 進行状況 */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">進行状況</span>
          <span className="text-sm text-gray-600">
            {votedCount} / {room.players.length}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-purple-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${(votedCount / room.players.length) * 100}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}
