# F29 — a socket on stdin waits 1s for a first byte

## .the fork

grepsafe reads piped text as its subject (#598, #622). a FIFO or a file is safe to read to EOF. a
socket is not: node hands a child a socket, often one nobody writes to, so a read to EOF can hang.

- **A** — wait up to 1s for a first byte. a byte ⇒ read to EOF, search the text. none ⇒ the file
  search stands
- **B** — never read a socket unasked. only `--from @stdin` reads it
- **C** — read a socket to EOF, as a FIFO

## .taken — A, and why

- B leaves `cmd | grepsafe` broken wherever the pipe arrives as a socket, the exact report
- C hangs any harness that hands an idle socket and never closes it
- harness stdin measured as `/dev/null`, never read under A. a pipe through `rhx` arrives as a FIFO
- `--from @stdin` forces the read, so a slow producer has a sure path

## .rework — clean

one `read -t` value, one branch. B or C is a line edit; `[case42][t5]`/`[t6]` pin the edges.

## .confidence — 80%, and why not higher

a producer slower than 1s to its first byte, over a socket, falls back to a file search. the answer
then names `path:`, never `input: stdin`, so the miss is visible — but it is a wrong subject.

## .where

- `grepsafe.sh` — the subject block (`STDIN_READABLE`, `read -r -N 1 -t 1`)
- `grepsafe.integration.test.ts` — `[case42][t2]`–`[t6]`

## .verdict

open.
