"use client";

import { Room } from "@/types/game";
import { useState } from "react";

interface Props {
  room: Room;
  playerId: string;
}

export default function AnsweringPhase({ room, playerId }: Props) {
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const currentPlayer = room.players.find(p => p.id === playerId);
  const hasAnswered = currentPlayer?.hasSubmitted || false;
  const answeredCount = room.players.filter(p => p.hasSubmitted).length;

  const submitAnswer = async () => {
    if (!answer.trim()) {
      alert("回答を入力してください");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/rooms/${room.code}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, answer: answer.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "回答の提出に失敗しました");
      }
    } catch (err) {
      console.error(err);
      alert("回答の提出に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">回答入力</h2>
        <div className="inline-block bg-purple-100 border-2 border-purple-500 rounded-xl px-6 py-3 mt-2">
          <p className="text-sm text-purple-700 mb-1">今回のお題</p>
          <p className="text-2xl font-bold text-purple-900">{room.selectedTopic}</p>
        </div>
        <p className="text-gray-600 mt-4">
          みんなの回答が一致するように考えよう！
        </p>
        <div className="mt-2 text-sm text-gray-500">
          {answeredCount} / {room.players.length} 人が回答済み
        </div>
      </div>

      {hasAnswered ? (
        <div className="bg-green-50 border border-green-300 rounded-lg p-6 text-center">
          <div className="text-green-600 text-5xl mb-3">✓</div>
          <h3 className="text-xl font-bold text-green-900 mb-2">回答完了！</h3>
          <p className="text-green-800">あなたの回答: <span className="font-bold text-xl">{currentPlayer?.answer}</span></p>
          <p className="text-green-700 mt-2">他のプレイヤーが回答するまで待機してください</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              回答を入力
            </label>
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="みんなと一致しそうな答えを入力"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-800 text-lg"
              maxLength={30}
              disabled={submitting}
              onKeyDown={(e) => {
                if (e.key === "Enter" && answer.trim() && !submitting) {
                  submitAnswer();
                }
              }}
            />
            <p className="text-xs text-gray-500 mt-1">
              {answer.length} / 30 文字
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">ヒント</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• 多くの人が思いつきそうな答えを選ぼう</li>
              <li>• 一般的で分かりやすい答えがおすすめ</li>
              <li>• 2人以上一致すればポイントがもらえます</li>
            </ul>
          </div>

          <button
            onClick={submitAnswer}
            disabled={submitting || !answer.trim()}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-lg transition duration-200"
          >
            {submitting ? "提出中..." : "回答を提出"}
          </button>
        </div>
      )}

      {/* 進行状況 */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">進行状況</span>
          <span className="text-sm text-gray-600">
            {answeredCount} / {room.players.length}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-purple-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${(answeredCount / room.players.length) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* プレイヤー状態 */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">プレイヤー状態</h3>
        <div className="grid grid-cols-2 gap-2">
          {room.players.map((player) => (
            <div
              key={player.id}
              className={`p-2 rounded-lg text-sm ${
                player.hasSubmitted
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              <span className="font-medium">{player.name}</span>
              {player.hasSubmitted && <span className="ml-1">✓</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
