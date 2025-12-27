"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const router = useRouter();

  const createRoom = async () => {
    if (!playerName.trim()) {
      alert("プレイヤー名を入力してください");
      return;
    }

    const res = await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostName: playerName }),
    });

    const data = await res.json();
    router.push(`/room/${data.roomCode}?name=${encodeURIComponent(playerName)}`);
  };

  const joinRoom = async () => {
    if (!playerName.trim()) {
      alert("プレイヤー名を入力してください");
      return;
    }
    if (!roomCode.trim()) {
      alert("ルームコードを入力してください");
      return;
    }

    router.push(`/room/${roomCode.toUpperCase()}?name=${encodeURIComponent(playerName)}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <h1 className="text-4xl font-bold text-center mb-2 text-gray-800">
          一致ゲーム
        </h1>
        <p className="text-center text-gray-600 mb-8">
          みんなで回答を一致させよう！
        </p>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              プレイヤー名
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="名前を入力"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-800"
            />
          </div>

          <button
            onClick={createRoom}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg transition duration-200"
          >
            新しいルームを作成
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">または</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ルームコード
            </label>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="コードを入力"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-800 uppercase"
              maxLength={6}
            />
          </div>

          <button
            onClick={joinRoom}
            className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-3 px-4 rounded-lg transition duration-200"
          >
            ルームに参加
          </button>
        </div>
      </div>
    </div>
  );
}
