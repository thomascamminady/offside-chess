import { describe, it, expect } from "vitest";
import { offsideBoundary } from "../src/chess/offside";
import { generateAllLegalMoves } from "../src/chess/moves";
import { emptyBoard, place, makeState } from "../src/chess/testUtils";
import { fromAlgebraic, rankOf } from "../src/chess/types";

describe("offsideBoundary", () => {
  it("is unrestricted when the opponent has only a king left", () => {
    const board = emptyBoard();
    place(board, "e1", "k", "w");
    place(board, "e8", "k", "b");
    expect(offsideBoundary(board, "w")).toBe(7);
    expect(offsideBoundary(board, "b")).toBe(0);
  });

  it("never restricts a mover inside its own half", () => {
    const board = emptyBoard();
    place(board, "e1", "k", "w");
    place(board, "e8", "k", "b");
    place(board, "e7", "q", "b"); // black's second-deepest piece sits at rank 7 -> very tight line
    // second-deepest black piece (after the king) is the queen at rank 7 (index 6).
    expect(offsideBoundary(board, "w")).toBe(6);
  });

  it("clamps the line to the halfway rank when defenders push forward", () => {
    const board = emptyBoard();
    place(board, "e1", "k", "w");
    place(board, "e8", "k", "b");
    place(board, "e3", "q", "b"); // black queen advanced deep into white's half
    // second-deepest black piece is the queen at rank 3 (index 2), but white can never
    // be offside in its own half (through rank 4 / index 3).
    expect(offsideBoundary(board, "w")).toBe(3);
  });
});

describe("offside move restriction", () => {
  it("forbids a rook from advancing past the enemy's defensive line", () => {
    const board = emptyBoard();
    place(board, "a1", "r", "w");
    place(board, "e1", "k", "w");
    place(board, "e8", "k", "b");
    place(board, "d7", "q", "b");
    place(board, "a6", "p", "b");
    // Black's deepest piece: king (rank8). Second-deepest: queen or pawn -> pawn at rank6 is
    // shallower than queen at rank7, so second-deepest by depth is the queen (rank 7, index 6)... wait
    // depth is measured from black's own back rank (8), so pawn at rank6 is depth 2, queen at rank7 is depth1.
    // Sorted ascending: king depth0, queen depth1, pawn depth2 -> second-deepest = queen -> boundary rank index 6 (rank7).
    const boundary = offsideBoundary(board, "w");
    expect(boundary).toBe(6);

    const state = makeState({ board, turn: "w" });
    const rookMoves = generateAllLegalMoves(state).filter((m) => m.from === fromAlgebraic("a1"));
    expect(rookMoves.every((m) => rankOf(m.to) <= 6)).toBe(true);
    expect(rookMoves.some((m) => m.to === fromAlgebraic("a7"))).toBe(false);
    expect(rookMoves.some((m) => m.to === fromAlgebraic("a6"))).toBe(true); // capturing the pawn is fine, it's onside
  });

  it("allows pawns to advance and promote regardless of the offside line", () => {
    const board = emptyBoard();
    place(board, "e1", "k", "w");
    place(board, "e8", "k", "b");
    place(board, "d8", "q", "b");
    place(board, "h8", "r", "b");
    place(board, "a7", "p", "w");

    const state = makeState({ board, turn: "w" });
    const pawnMoves = generateAllLegalMoves(state).filter((m) => m.from === fromAlgebraic("a7"));
    expect(pawnMoves.length).toBeGreaterThan(0);
    expect(pawnMoves.every((m) => m.promotion !== undefined)).toBe(true);
  });

  it("lets a piece back into play once the enemy defenders retreat", () => {
    const withDefender = emptyBoard();
    place(withDefender, "a1", "r", "w");
    place(withDefender, "e1", "k", "w");
    place(withDefender, "e8", "k", "b");
    place(withDefender, "d7", "q", "b");
    const restrictedState = makeState({ board: withDefender, turn: "w" });
    const restrictedMoves = generateAllLegalMoves(restrictedState).filter(
      (m) => m.from === fromAlgebraic("a1"),
    );
    expect(restrictedMoves.some((m) => m.to === fromAlgebraic("a8"))).toBe(false);

    const withoutDefender = emptyBoard();
    place(withoutDefender, "a1", "r", "w");
    place(withoutDefender, "e1", "k", "w");
    place(withoutDefender, "e8", "k", "b");
    const openState = makeState({ board: withoutDefender, turn: "w" });
    const openMoves = generateAllLegalMoves(openState).filter((m) => m.from === fromAlgebraic("a1"));
    expect(openMoves.some((m) => m.to === fromAlgebraic("a8"))).toBe(true);
  });
});
