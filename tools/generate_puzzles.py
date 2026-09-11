#!/usr/bin/env python3
"""Generate valid Waffle puzzles.

A Waffle board is a 5x5 grid with the four "inner corner" tiles missing, giving
21 tiles.  Three rows (0, 2, 4) are complete 5-letter across words and three
columns (0, 2, 4) are complete 5-letter down words.  The remaining 12 tiles sit
on the edge of the grid and belong to a single word.

    row 0: A0[0] A0[1] A0[2] A0[3] A0[4]
    row 1: D0[1]   .   D2[1]   .   D4[1]
    row 2: A2[0] A2[1] A2[2] A2[3] A2[4]
    row 3: D0[3]   .   D2[3]   .   D4[3]
    row 4: A4[0] A4[1] A4[2] A4[3] A4[4]

The down words share letters with the across words at their crossings, so the
puzzle only works when D0[0] == A0[0], D0[2] == A2[0], D0[4] == A4[0], etc.

The initial board is a random rearrangement of the solution letters.  Like the
real game, every puzzle is guaranteed to need exactly a minimum of 10 swaps, so
playing perfectly (10 swaps) earns the maximum of 5 stars out of 15.

Run from the repo root:

    python3 tools/generate_puzzles.py
"""

from __future__ import annotations

import json
import os
import random

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
WORDLIST = os.path.join(HERE, "wordlist.txt")
# The Vite app imports the puzzle data as a module; the preserved no-build
# version in vanilla/ loads the same data as a classic script.
OUTPUT_APP = os.path.join(ROOT, "src", "lib", "puzzles.js")
OUTPUT_VANILLA = os.path.join(ROOT, "vanilla", "js", "puzzles.js")

DAILY_COUNT = 2000
PRACTICE_COUNT = 500
MIN_SWAPS = 10
MIN_GREEDY = 9  # a straightforward solve should leave a swap or two spare
MAX_GREEDY = 13

# Cell order for the 21 tiles: (x, y), row by row, left to right.
CELLS = [(x, y) for y in range(5) for x in range(5) if not (x % 2 == 1 and y % 2 == 1)]


def load_words() -> list[str]:
    with open(WORDLIST, encoding="utf-8") as handle:
        words = [line.strip().lower() for line in handle]
    words = [word for word in words if len(word) == 5 and word.isalpha()]
    return sorted(set(words))


def build_index(words: list[str]) -> dict[tuple[int, str], list[str]]:
    index: dict[tuple[int, str], list[str]] = {}
    for word in words:
        for position, char in enumerate(word):
            index.setdefault((position, char), []).append(word)
    return index


def candidates(index: dict[tuple[int, str], list[str]], *pairs: tuple[int, str]) -> list[str]:
    """Words matching every (position, character) constraint."""
    result: set[str] | None = None
    for position, char in pairs:
        bucket = set(index.get((position, char), ()))
        result = bucket if result is None else result & bucket
        if not result:
            return []
    return sorted(result or ())


def find_words(rng: random.Random, words: list[str], index) -> tuple[list[str], list[str]] | None:
    """Pick three across words and three down words that interlock."""
    a0, a2, a4 = rng.sample(words, 3)
    across = [a0, a2, a4]

    down: list[str] = []
    for column in (0, 2, 4):
        options = [
            word
            for word in candidates(
                index,
                (0, a0[column]),
                (2, a2[column]),
                (4, a4[column]),
            )
            if word not in across and word not in down
        ]
        if not options:
            return None
        down.append(rng.choice(options))

    return across, down


def solution_letters(across: list[str], down: list[str]) -> dict[tuple[int, int], str]:
    letters: dict[tuple[int, int], str] = {}
    for row, word in zip((0, 2, 4), across):
        for x, char in enumerate(word):
            letters[(x, row)] = char
    for column, word in zip((0, 2, 4), down):
        for y, char in enumerate(word):
            letters[(column, y)] = char
    return letters


def random_permutation(rng: random.Random, size: int, cycles: int, fixed: int) -> list[int]:
    """A permutation with exactly `cycles` cycles, `fixed` of them length 1.

    Conditioning a uniformly random permutation on a high cycle count would
    bias it towards fixed points, which would leave most tiles green.  Instead
    we build the cycle lengths directly: `fixed` one-cycles plus `cycles-fixed`
    cycles of length two or more.
    """
    moving = size - fixed
    long_cycles = cycles - fixed
    if long_cycles < 1 or moving < 2 * long_cycles:
        return None
    lengths = [2] * long_cycles
    for _ in range(moving - 2 * long_cycles):
        lengths[rng.randrange(long_cycles)] += 1
    rng.shuffle(lengths)

    order = list(range(size))
    rng.shuffle(order)
    stops = set(rng.sample(order, fixed)) if fixed else set()

    permutation = [0] * size
    for position in stops:
        permutation[position] = position
    remaining = [position for position in order if position not in stops]

    cursor = 0
    for length in lengths:
        block = remaining[cursor : cursor + length]
        cursor += length
        for index, position in enumerate(block):
            permutation[position] = block[(index + 1) % length]

    return permutation


def greedy_swaps(board: list[str], solution: list[str]) -> int:
    """Swaps a straightforward player needs: fix the first wrong cell, each time
    swapping in the tile that belongs there.

    Duplicate letters mean this can beat the permutation's own ten-swap minimum
    and can also overshoot it, so it is the yardstick for whether a board is
    fair to solve inside the 15-swap budget.
    """
    board = list(board)
    for swaps in range(len(board) + 1):
        if board == solution:
            return swaps
        wrong = next((i for i in range(len(board)) if board[i] != solution[i]), -1)
        if wrong < 0:
            return swaps
        letter = board[wrong]
        target = next((i for i in range(len(solution)) if solution[i] == letter and board[i] != letter), -1)
        if target < 0:
            return len(board) + 1
        board[wrong], board[target] = board[target], board[wrong]
    return len(board) + 1


def scramble(rng: random.Random, solution: list[str]) -> list[str]:
    """Permute the letters so sorting it back takes a minimum of 10 swaps."""
    cycles = len(solution) - MIN_SWAPS
    while True:
        permutation = random_permutation(rng, len(solution), cycles, rng.choice([1, 2, 2, 3]))
        if permutation is None:
            continue
        board = [solution[permutation[i]] for i in range(len(solution))]
        if board == solution:
            continue
        # Fair to solve without perfect play, but not a walkover.
        if not MIN_GREEDY <= greedy_swaps(board, solution) <= MAX_GREEDY:
            continue
        greens = sum(1 for i, char in enumerate(board) if char == solution[i])
        if greens > 5:
            continue
        return board


def make_puzzle(rng: random.Random, words, index) -> dict | None:
    picked = find_words(rng, words, index)
    if picked is None:
        return None
    across, down = picked
    letters_by_cell = solution_letters(across, down)
    solution = [letters_by_cell[cell] for cell in CELLS]
    board = scramble(rng, solution)
    return {
        "across": across,
        "down": down,
        "board": "".join(board),
    }


def generate(rng: random.Random, words, index, count: int) -> list[dict]:
    puzzles: list[dict] = []
    seen: set[str] = set()
    attempts = 0
    while len(puzzles) < count:
        attempts += 1
        if attempts > count * 4000:
            raise SystemExit(f"Only produced {len(puzzles)}/{count} puzzles")
        puzzle = make_puzzle(rng, words, index)
        if puzzle is None:
            continue
        key = "".join(puzzle["across"]) + "".join(puzzle["down"])
        if key in seen:
            continue
        seen.add(key)
        puzzles.append(puzzle)
    return puzzles


def main() -> None:
    rng = random.Random(20220213)
    words = load_words()
    index = build_index(words)

    daily = generate(rng, words, index, DAILY_COUNT)
    practice = generate(rng, words, index, PRACTICE_COUNT)

    header = [
        "// Generated by tools/generate_puzzles.py -- do not edit by hand.",
        "// Each puzzle lists the three across words, three down words (rows and",
        "// columns 0, 2 and 4) and the pre-scrambled 21-tile board in cell order.",
        "",
    ]
    daily_json = json.dumps(daily, separators=(",", ":"))
    practice_json = json.dumps(practice, separators=(",", ":"))

    os.makedirs(os.path.dirname(OUTPUT_APP), exist_ok=True)
    with open(OUTPUT_APP, "w", encoding="utf-8") as handle:
        handle.write(
            "\n".join(
                header
                + [
                    "export const WAFFLE_DAILY = " + daily_json + ";",
                    "",
                    "export const WAFFLE_PRACTICE = " + practice_json + ";",
                    "",
                ]
            )
        )

    os.makedirs(os.path.dirname(OUTPUT_VANILLA), exist_ok=True)
    with open(OUTPUT_VANILLA, "w", encoding="utf-8") as handle:
        handle.write(
            "\n".join(
                header
                + [
                    "const WAFFLE_DAILY = " + daily_json + ";",
                    "",
                    "const WAFFLE_PRACTICE = " + practice_json + ";",
                    "",
                ]
            )
        )

    print(f"Wrote {len(daily)} daily and {len(practice)} practice puzzles to:")
    print(f"  {OUTPUT_APP}")
    print(f"  {OUTPUT_VANILLA}")


if __name__ == "__main__":
    main()
