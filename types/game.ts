export type GamePhase =
  | "waiting"      // プレイヤー待機中
  | "proposing"    // お題提案中
  | "voting"       // お題投票中
  | "topic_selection" // お題決定中（ホスト）
  | "answering"    // 回答入力中
  | "scoring"      // 採点中（ホスト）
  | "results"      // 結果表示中
  | "ended";       // ゲーム終了

export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  score: number;
  proposedTopic?: string;      // 提案したお題
  votedTopicId?: string;        // 投票したお題のID
  answer?: string;              // 回答
  hasSubmitted: boolean;        // 提出済みフラグ
}

export interface TopicProposal {
  id: string;
  playerId: string;
  playerName: string;
  topic: string;
  votes: number;
}

export interface Room {
  code: string;
  hostId: string;
  players: Player[];
  phase: GamePhase;
  currentRound: number;
  topicProposals: TopicProposal[];
  scoringGroups?: { answers: string[]; players: string[]; score: number; }[]; // 採点中のグループ分け状態
  selectedTopic?: string;
  createdAt: number;
  updatedAt: number;
}

export interface AnswerResult {
  answer: string;
  players: string[];  // このansweerを選んだプレイヤー名
  count: number;
  isMatch: boolean;   // 2人以上が選んだ場合true
}
