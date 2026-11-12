# F11 — a tty is not proof of a human; release rests on the deny-list for robot directors

- **fork** — give `git.release.uses` grants the same two locks as `git.commit.uses` (deny-list + tty guard) · or demand a stronger proof of human for the release stamp alone (e.g., a keyrack unlock behind the human's own key)
- **taken** — the same two locks. the tty guard accepts `-t 0` (`git.commit.operations.sh:1015`), so a robot director that holds a pty passes it; the claude deny-list is then the only lock between a robot director and a self-granted release. that is exactly today's strength (today a commit quota is a release grant, behind the same two locks), so the wish's "at least as strict" holds. it is not the "human's release stamp" the wish describes in spirit
- **rework** — clean. a stronger proof can wrap the release `set` alone, later, with no contract change
- **confidence** — 70%. if robot directors run in a pty today, the commander may expect the release stamp to stop them, and this vision does not do so beyond the deny-list
- **where** — `1.vision.yield.md` contract · `case=7`
- **verdict** — ruled 2026-10-18 by the human: accepted as no weaker than today; flagged for the commander to re-review
