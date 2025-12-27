"use client";

import { Room } from "@/types/game";

interface Props {
  room: Room;
  playerId: string;
}

export default function WaitingRoom({ room, playerId }: Props) {
  const isHost = room.hostId === playerId;

  const startGame = async () => {
    try {
      const res = await fetch(`/api/rooms/${room.code}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "ゲームの開始に失敗しました");
      }
    } catch (err) {
      console.error(err);
      alert("ゲームの開始に失敗しました");
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">待機中</h2>
        <p className="text-gray-600">
          {isHost
            ? "プレイヤーが揃ったらゲームを開始してください"
            : "ホストがゲームを開始するまで待機してください"}
        </p>
      </div>

      {/* プレイヤーリスト */}
      <div>
        <h3 className="text-lg font-semibold text-gray-700 mb-3">
          参加プレイヤー ({room.players.length}人)
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {room.players.map((player) => (
            <div
              key={player.id}
              className={`p-3 rounded-lg ${
                player.id === playerId
                  ? "bg-purple-100 border-2 border-purple-500"
                  : "bg-gray-100"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-800">{player.name}</span>
                {player.isHost && (
                  <span className="text-xs bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full">
                    ホスト
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ゲーム開始ボタン */}
      {isHost && (
        <button
          onClick={startGame}
          disabled={room.players.length < 2}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-lg transition duration-200"
        >
          {room.players.length < 2
            ? "2人以上必要です"
            : "ゲームを開始"}
        </button>
      )}

      {/* 参加方法の案内 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">友達を招待</h4>
        <p className="text-sm text-blue-800">
          このルームコードを共有してください:
        </p>
        <div className="mt-2 flex items-center gap-2">
          <code className="flex-1 bg-white border border-blue-300 rounded px-4 py-2 text-2xl font-bold text-center text-purple-600">
            {room.code}
          </code>
          <button
            onClick={() => {
              navigator.clipboard.writeText(room.code);
              alert("コピーしました！");
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition duration-200"
          >
            コピー
          </button>
        </div>
      </div>
    </div>
  );
}
