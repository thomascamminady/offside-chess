import { createInitialBoard, isInCheck } from "./board";
import { generateAllLegalMoves, generateLegalMoves, applyMove } from "./moves";
import { moveToSAN } from "./notation";
import { offsideLineRank } from "./offside";
import type { Color, GameState, GameStatus, Move, PieceType, Square } from "./types";

export interface HistoryEntry {
  move: Move;
  san: string;
  stateBefore: GameState;
  stateAfter: GameState;
}

function initialState(): GameState {
  return {
    board: createInitialBoard(),
    turn: "w",
    castling: { wK: true, wQ: true, bK: true, bQ: true },
    enPassant: null,
    halfmoveClock: 0,
    fullmoveNumber: 1,
  };
}

function boardKey(state: GameState): string {
  const pieces = state.board.map((p) => (p ? `${p.color}${p.type}` : "-")).join("");
  const castling = `${state.castling.wK ? "K" : ""}${state.castling.wQ ? "Q" : ""}${state.castling.bK ? "k" : ""}${state.castling.bQ ? "q" : ""}`;
  return `${pieces}|${state.turn}|${castling}|${state.enPassant ?? "-"}`;
}

function hasInsufficientMaterial(state: GameState): boolean {
  const pieces = state.board.filter((p) => p !== null);
  if (pieces.length <= 2) return true; // king vs king
  if (pieces.length === 3) {
    return pieces.some((p) => p!.type === "b" || p!.type === "n");
  }
  return false;
}

export class Game {
  state: GameState;
  history: HistoryEntry[] = [];
  private positionCounts = new Map<string, number>();

  constructor() {
    this.state = initialState();
    this.recordPosition();
  }

  private recordPosition() {
    const key = boardKey(this.state);
    this.positionCounts.set(key, (this.positionCounts.get(key) ?? 0) + 1);
  }

  getLegalMoves(from: Square): Move[] {
    return generateLegalMoves(this.state, from);
  }

  getAllLegalMoves(): Move[] {
    return generateAllLegalMoves(this.state);
  }

  /** The furthest rank the side to move may advance non-pawn pieces to right now. */
  getOffsideLine(color: Color = this.state.turn): number {
    return offsideLineRank(this.state.board, color);
  }

  makeMove(from: Square, to: Square, promotion?: PieceType): HistoryEntry | null {
    const legal = this.getLegalMoves(from).find(
      (m) => m.to === to && (m.promotion ?? "q") === (promotion ?? m.promotion ?? "q"),
    );
    if (!legal) return null;

    const san = moveToSAN(this.state, legal);
    const stateBefore = this.state;
    const stateAfter = applyMove(this.state, legal);
    const entry: HistoryEntry = { move: legal, san, stateBefore, stateAfter };

    this.state = stateAfter;
    this.history.push(entry);
    this.recordPosition();
    return entry;
  }

  get status(): GameStatus {
    const legalMoves = this.getAllLegalMoves();
    const inCheck = isInCheck(this.state.board, this.state.turn);

    if (legalMoves.length === 0) {
      return inCheck ? "checkmate" : "stalemate";
    }
    if (this.state.halfmoveClock >= 100) return "draw-fifty-move";
    if (hasInsufficientMaterial(this.state)) return "draw-insufficient";
    if ((this.positionCounts.get(boardKey(this.state)) ?? 0) >= 3) return "draw-repetition";
    return inCheck ? "check" : "ongoing";
  }

  get isGameOver(): boolean {
    return this.status !== "ongoing" && this.status !== "check";
  }

  reset() {
    this.state = initialState();
    this.history = [];
    this.positionCounts.clear();
    this.recordPosition();
  }
}
