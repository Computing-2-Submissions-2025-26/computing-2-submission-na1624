import Game from "../game.js";

// ── Test helpers ──

// Build a state by merging overrides on top of a fresh game.
const stateWith = function (overrides) {
    const base = Game.createGame();
    return Object.assign({}, base, overrides, {
        pieces:  Object.assign({}, base.pieces,  overrides.pieces  || {}),
        shields: Object.assign({}, base.shields, overrides.shields || {}),
        frozen:  Object.assign({}, base.frozen,  overrides.frozen  || {})
    });
};

// Throws with a descriptive message if condition is false.
const assert = function (condition, message) {
    if (!condition) {
        throw new Error(message);
    }
};

// Throws if the two values are not strictly equal, showing both.
const assertEqual = function (actual, expected, label) {
    if (actual !== expected) {
        throw new Error(
            label + ": expected " + JSON.stringify(expected) +
            ", got " + JSON.stringify(actual)
        );
    }
};

// Throws if arr does not contain exactly the elements in expected
// (order-independent).
const assertIndices = function (actual, expected, label) {
    const sorted = function (a) {
        const copy = a.slice();
        return copy.sort(function (x, y) { return x - y; });
    };
    const a = JSON.stringify(sorted(actual));
    const e = JSON.stringify(sorted(expected));
    if (a !== e) {
        throw new Error(
            label + ": expected indices " + e + ", got " + a
        );
    }
};

// ── createGame ──

describe("createGame", function () {
    it("starts with all Red pieces in spawn (-1)", function () {
        const state = Game.createGame();
        const pieces = Game.getPieces(state, "red");
        const allInSpawn = pieces.every(function (pos) {
            return pos === -1;
        });
        assert(
            allInSpawn,
            "Expected all red pieces at -1, got " + JSON.stringify(pieces)
        );
    });

    it("starts with all Blue pieces in spawn (-1)", function () {
        const state = Game.createGame();
        const pieces = Game.getPieces(state, "blue");
        const allInSpawn = pieces.every(function (pos) {
            return pos === -1;
        });
        assert(
            allInSpawn,
            "Expected all blue pieces at -1, got " + JSON.stringify(pieces)
        );
    });

    it("starts with Red as the current player", function () {
        const state = Game.createGame();
        assertEqual(Game.getCurrentPlayer(state), "red", "currentPlayer");
    });

    it("starts in the roll phase", function () {
        const state = Game.createGame();
        assertEqual(Game.getPhase(state), "roll", "phase");
    });

    it("starts with no winner", function () {
        const state = Game.createGame();
        assertEqual(Game.getWinner(state), null, "winner");
    });

    it("starts with no mines on the board", function () {
        const state = Game.createGame();
        assertEqual(Game.getMines(state).length, 0, "mines.length");
    });

    it("starts with no dice result", function () {
        const state = Game.createGame();
        assertEqual(Game.getDice(state), null, "dice");
    });
});

// ── getValidMoves — phase guard ──

describe("getValidMoves — phase guard", function () {
    it("returns an empty array when in 'roll' phase", function () {
        const state = stateWith({
            phase: "roll",
            dice: null,
            pieces: { red: [3, -1, -1, -1] }
        });
        assertEqual(
            Game.getValidMoves(state).length,
            0,
            "moves.length in roll phase"
        );
    });

    it("returns an empty array when in 'swap' phase", function () {
        const state = stateWith({
            phase: "swap",
            dice: 4,
            pieces: { red: [13, -1, -1, -1] }
        });
        assertEqual(
            Game.getValidMoves(state).length,
            0,
            "moves.length in swap phase"
        );
    });

    it("returns an empty array when the game is done", function () {
        const state = stateWith({
            phase: "done",
            dice: 3,
            winner: "red",
            pieces: { red: [42, 42, 42, 42] }
        });
        assertEqual(
            Game.getValidMoves(state).length,
            0,
            "moves.length in done phase"
        );
    });
});

// ── getValidMoves — deploying from spawn ──

describe("getValidMoves — deploying from spawn", function () {
    it("allows deploying a spawn piece when dice is 6", function () {
        const state = stateWith({
            phase: "move",
            dice: 6,
            pieces: { red: [-1, -1, -1, -1] }
        });
        assertIndices(
            Game.getValidMoves(state),
            [0, 1, 2, 3],
            "all spawn pieces deployable on a 6"
        );
    });

    it("allows deploying a spawn piece when dice is 1", function () {
        const state = stateWith({
            phase: "move",
            dice: 1,
            pieces: { red: [-1, -1, -1, -1] }
        });
        assertIndices(
            Game.getValidMoves(state),
            [0, 1, 2, 3],
            "all spawn pieces deployable on a 1"
        );
    });

    it("does not allow deploying from spawn when dice is 2", function () {
        const state = stateWith({
            phase: "move",
            dice: 2,
            pieces: { red: [-1, -1, -1, -1] }
        });
        assertEqual(
            Game.getValidMoves(state).length,
            0,
            "no valid moves: dice 2, all pieces in spawn"
        );
    });

    it("does not allow deploying from spawn when dice is 3", function () {
        const state = stateWith({
            phase: "move",
            dice: 3,
            pieces: { red: [-1, -1, -1, -1] }
        });
        assertEqual(
            Game.getValidMoves(state).length,
            0,
            "no valid moves: dice 3, all pieces in spawn"
        );
    });

    it("does not allow deploying from spawn when dice is 4", function () {
        const state = stateWith({
            phase: "move",
            dice: 4,
            pieces: { red: [-1, -1, -1, -1] }
        });
        assertEqual(
            Game.getValidMoves(state).length,
            0,
            "no valid moves: dice 4, all pieces in spawn"
        );
    });

    it("does not allow deploying from spawn when dice is 5", function () {
        const state = stateWith({
            phase: "move",
            dice: 5,
            pieces: { red: [-1, -1, -1, -1] }
        });
        assertEqual(
            Game.getValidMoves(state).length,
            0,
            "no valid moves: dice 5, all pieces in spawn"
        );
    });

    it("returns only ring piece when dice is 3 and one piece is in spawn",
        function () {
        // piece 0 on ring (pos 13), piece 1 in spawn — dice 3 can only move 0
        const state = stateWith({
            phase: "move",
            dice: 3,
            pieces: { red: [13, -1, -1, -1] }
        });
        assertIndices(
            Game.getValidMoves(state),
            [0],
            "only piece 0 should be movable"
        );
    });

    it("returns both ring and spawn piece when dice is 6", function () {
        // piece 0 on ring, piece 1 in spawn, pieces 2 and 3 finished
        const state = stateWith({
            phase: "move",
            dice: 6,
            pieces: { red: [13, -1, 42, 42] }
        });
        assertIndices(
            Game.getValidMoves(state),
            [0, 1],
            "piece 0 (ring) and piece 1 (spawn) both valid on 6"
        );
    });
});

// ── getValidMoves — exact entry ──

describe("getValidMoves — exact entry to Home Base", function () {
    it("allows a piece that lands exactly on FINISH (42)", function () {
        // piece at 39 (first home connector), dice = 3 → lands exactly on 42
        const state = stateWith({
            phase: "move",
            dice: 3,
            pieces: { red: [39, 42, 42, 42] }
        });
        assertIndices(
            Game.getValidMoves(state),
            [0],
            "piece at 39 + dice 3 = 42 is a valid move"
        );
    });

    it("excludes a piece that would overshoot FINISH", function () {
        // piece at 39, dice = 4 → 39 + 4 = 43 > 42, overshoot
        const state = stateWith({
            phase: "move",
            dice: 4,
            pieces: { red: [39, 42, 42, 42] }
        });
        assertEqual(
            Game.getValidMoves(state).length,
            0,
            "piece at 39 + dice 4 overshoots FINISH"
        );
    });

    it("excludes third connector piece when dice overshoots", function () {
        // piece at 41, dice = 2 → 41 + 2 = 43 > 42, overshoot
        const state = stateWith({
            phase: "move",
            dice: 2,
            pieces: { red: [41, 42, 42, 42] }
        });
        assertEqual(
            Game.getValidMoves(state).length,
            0,
            "piece at 41 + dice 2 overshoots FINISH"
        );
    });

    it("allows third connector piece when dice is exactly 1", function () {
        const state = stateWith({
            phase: "move",
            dice: 1,
            pieces: { red: [41, 42, 42, 42] }
        });
        assertIndices(
            Game.getValidMoves(state),
            [0],
            "piece at 38 + dice 1 reaches FINISH exactly"
        );
    });

    it("excludes a finished piece (at FINISH) from valid moves", function () {
        // piece 0 already finished, piece 1 on ring
        const state = stateWith({
            phase: "move",
            dice: 3,
            pieces: { red: [42, 13, -1, -1] }
        });
        assertIndices(
            Game.getValidMoves(state),
            [1],
            "only piece 1 (ring) should be movable; piece 0 is finished"
        );
    });
});

// ── getValidMoves — frozen pieces ──

describe("getValidMoves — frozen pieces", function () {
    it("excludes a frozen piece from valid moves", function () {
        const state = stateWith({
            phase: "move",
            dice: 3,
            pieces: { red: [8, 13, -1, -1] },
            frozen: { red: [true, false, false, false] }
        });
        assertIndices(
            Game.getValidMoves(state),
            [1],
            "piece 0 is frozen and must be excluded"
        );
    });

    it("returns empty array when all on-board pieces are frozen", function () {
        const state = stateWith({
            phase: "move",
            dice: 3,
            pieces: { red: [8, 13, -1, -1] },
            frozen: { red: [true, true, false, false] }
        });
        assertEqual(
            Game.getValidMoves(state).length,
            0,
            "all on-board pieces frozen, no deployable pieces on dice 3"
        );
    });

    it("excludes a frozen spawn piece even on dice 6", function () {
        const state = stateWith({
            phase: "move",
            dice: 6,
            pieces: { red: [-1, -1, -1, -1] },
            frozen: { red: [true, false, false, false] }
        });
        assertIndices(
            Game.getValidMoves(state),
            [1, 2, 3],
            "frozen piece 0 in spawn excluded even on dice 6"
        );
    });
});

// ── getValidMoves — sprint lock ──

describe("getValidMoves — sprint lock", function () {
    it("returns only the sprint piece during sprint phase", function () {
        const state = stateWith({
            phase: "move",
            dice: 2,
            sprintPiece: 1,
            pieces: { red: [8, 13, 18, 23] }
        });
        assertIndices(
            Game.getValidMoves(state),
            [1],
            "only sprint piece (index 1) is valid during sprint"
        );
    });

    it("excludes sprint piece if it would overshoot FINISH", function () {
        const state = stateWith({
            phase: "move",
            dice: 6,
            sprintPiece: 0,
            pieces: { red: [41, -1, -1, -1] }   // 41 + 6 = 47 > 42
        });
        assertEqual(
            Game.getValidMoves(state).length,
            0,
            "sprint piece at 38 with dice 6 overshoots FINISH"
        );
    });
});

// ── movePiece — turn management ──

describe("movePiece — turn transitions", function () {
    it("switches the current player from Red to Blue after a move",
        function () {
        const state = stateWith({
            currentPlayer: "red",
            phase: "move",
            dice: 3,
            pieces: { red: [8, -1, -1, -1] }
        });
        const after = Game.movePiece(state, 0);
        assertEqual(
            Game.getCurrentPlayer(after),
            "blue",
            "currentPlayer after Red moves"
        );
    });

    it("resets the phase to 'roll' after a move ends the turn", function () {
        const state = stateWith({
            currentPlayer: "red",
            phase: "move",
            dice: 2,
            pieces: { red: [8, -1, -1, -1] }
        });
        const after = Game.movePiece(state, 0);
        assertEqual(Game.getPhase(after), "roll", "phase after turn");
    });

    it("clears the dice after a move ends the turn", function () {
        const state = stateWith({
            currentPlayer: "red",
            phase: "move",
            dice: 2,
            pieces: { red: [8, -1, -1, -1] }
        });
        const after = Game.movePiece(state, 0);
        assertEqual(Game.getDice(after), null, "dice after turn");
    });

    it("returns state unchanged when an invalid piece index is chosen",
        function () {
        // dice 3 cannot deploy — no valid moves
        const state = stateWith({
            currentPlayer: "red",
            phase: "move",
            dice: 3,
            pieces: { red: [-1, -1, -1, -1] }
        });
        const after = Game.movePiece(state, 0);
        assertEqual(
            Game.getPhase(after), "move",
            "phase should not change for invalid move"
        );
        assertEqual(
            Game.getCurrentPlayer(after),
            "red",
            "player should not change for invalid move"
        );
    });
});

// ── movePiece — capture ──

describe("movePiece — capture", function () {
    // Blue piece at the shared ring position that Red is moving to.
    // Red's path position r maps to shared position r - 3.
    // Blue's path position b maps to shared position (b - 3 + 18) % 36.
    // To place Blue at Red's shared destination 5:
    // b = (5 - 18 + 36) % 36 + 3 = 26.
    const blueAtShared5 = (5 - 18 + 36) % 36 + 3;   // = 26

    it("sends an enemy piece to spawn when landing on its square", function () {
        const state = stateWith({
            currentPlayer: "red",
            phase: "move",
            dice: 3,
            pieces: {
                red: [5, -1, -1, -1],
                blue: [blueAtShared5, -1, -1, -1]
            }
        });
        const after = Game.movePiece(state, 0);
        assertEqual(
            Game.getPieces(after, "blue")[0],
            -1,
            "Blue piece 0 should be at spawn after being captured"
        );
    });

    it("does not capture a shielded enemy; shield persists", function () {
        const state = stateWith({
            currentPlayer: "red",
            phase: "move",
            dice: 3,
            pieces: {
                red: [5, -1, -1, -1],
                blue: [blueAtShared5, -1, -1, -1]
            },
            shields: { blue: [true, false, false, false] }
        });
        const after = Game.movePiece(state, 0);
        assert(
            Game.getPieces(after, "blue")[0] !== -1,
            "Shielded blue piece 0 should NOT be sent to spawn"
        );
        assert(
            Game.isShielded(after, "blue", 0),
            "Shield should persist after blocking a capture"
        );
    });

    it("does not capture a teammate on the same square", function () {
        // Red piece 0 moves to position 5; Red piece 1 already at position 5
        const state = stateWith({
            currentPlayer: "red",
            phase: "move",
            dice: 3,
            pieces: { red: [5, 8, -1, -1] }
        });
        const after = Game.movePiece(state, 0);
        assert(
            Game.getPieces(after, "red")[1] !== -1,
            "Red piece 1 (teammate) should not be sent to spawn"
        );
    });
});

// ── movePiece — win condition ──

describe("movePiece — win condition", function () {
    it("declares Red the winner when the last piece reaches FINISH",
        function () {
        // pieces 1-3 finished; piece 0 at 38 needs dice 1
        const state = stateWith({
            currentPlayer: "red",
            phase: "move",
            dice: 1,
            pieces: { red: [41, 42, 42, 42] }
        });
        const after = Game.movePiece(state, 0);
        assertEqual(
            Game.getWinner(after),
            "red",
            "winner after Red's last piece finishes"
        );
    });

    it("does not declare a winner if only 3 of 4 pieces are finished",
        function () {
        const state = stateWith({
            currentPlayer: "red",
            phase: "move",
            dice: 1,
            pieces: { red: [41, 42, -1, -1] }
        });
        const after = Game.movePiece(state, 0);
        assertEqual(
            Game.getWinner(after),
            null,
            "winner should be null when 2 pieces remain"
        );
    });

    it("sets phase to 'done' when the game is won", function () {
        const state = stateWith({
            currentPlayer: "red",
            phase: "move",
            dice: 1,
            pieces: { red: [41, 42, 42, 42] }
        });
        const after = Game.movePiece(state, 0);
        assertEqual(Game.getPhase(after), "done", "phase after winning move");
    });
});
