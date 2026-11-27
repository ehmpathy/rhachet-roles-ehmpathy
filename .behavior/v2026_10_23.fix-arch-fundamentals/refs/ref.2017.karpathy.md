# ref.2017.karpathy

grade: ✅ (full text read in the headful session after a human cleared the medium challenge; byline "Andrej Karpathy", dated "Nov 11, 2017" on the page)
cite: Andrej Karpathy (2017, november 11). Software 2.0. Medium. https://karpathy.medium.com/software-2-0-a64152b37c35
seen: `.raw/page.karpathy2017.text.md` (fetched 2026-11-23)

## .quote

> Instead, our approach is to specify some goal on the behavior of a desirable program (e.g., “satisfy a dataset of input output pairs of examples”, or “win a game of Go”), write a rough skeleton of the code (i.e. a neural net architecture) that identifies a subset of program space to search, and use the computational resources at our disposal to search this space for a program that works.

> In Software 2.0 most often the source code comprises 1) the dataset that defines the desirable behavior and 2) the neural net architecture that gives the rough skeleton of the code, but with many details (the weights) to be filled in.

## .supports

- converge: the source moves up a layer. the human writes the goal on behavior; a machine searches for the program that meets it
- contrast: his source is a dataset of examples, not a stated rule
- the response (narrow): a dataset defines behavior by example, so it says what is desired only where it has a row. an invariant states the rule for every state; examples (and tests) prove it at points
