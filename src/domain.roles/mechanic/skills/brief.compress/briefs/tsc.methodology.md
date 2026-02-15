# tsc: telegraphic semantic compression

## definition

**tsc** = telegraphic semantic compression.

a compression methodology that removes predictable grammatical structure (low-entropy tokens) while preserving high-entropy content words that carry semantic meaning. the output resembles telegraphic speech — short, efficient communication that omits function words while retaining meaning.

## origin: telegraphic speech

the term comes from linguistics research on child language development:

> "the name derives from the fact that someone sending a telegram was generally charged by the word. to save money, people typically wrote their telegrams in a very compressed style, without conjunctions or articles."
> — [wikipedia: telegraphic speech](https://en.wikipedia.org/wiki/Telegraphic_speech)

> "the term 'telegraphic speech' was coined by the american psychologist roger brown, the author of many influential language studies in the 1960s and 1970s."
> — [wikipedia: telegraphic speech](https://en.wikipedia.org/wiki/Telegraphic_speech)

roger brown's 1973 research in *"a first language: the early stages"* demonstrated that children naturally produce telegraphic speech during language acquisition:

> "clinicians and researchers use the term telegraphic speech to describe the developmental stage during which young children produce primarily content words (e.g., ball go, daddy jump, want cup) in their spontaneous spoken language."
> — [pmc: parent telegraphic speech use](https://pmc.ncbi.nlm.nih.gov/articles/PMC4987034/)

## the linguistic foundation: content vs function words

tsc is grounded in the distinction between content words and function words:

> "content words are words that possess semantic content and contribute to the meaning of the sentence in which they occur."
> — [wikipedia: content word](https://en.wikipedia.org/wiki/Content_word)

> "open class words carry the bulk of the semantic meaning of an utterance, hence their second label content words. this contrasts with function words: function words have very little substantive meaning and primarily denote grammatical relationships between content words."
> — [grammarist: open class vs closed class words](https://grammarist.com/grammar/open-class-vs-closed-class-words/)

the ratio is striking:

> "with only around 150 function words, 99.9% of words in the english language are content words."
> — [wikipedia: content word](https://en.wikipedia.org/wiki/Content_word)

| word class | examples | semantic value | compressibility |
|------------|----------|----------------|-----------------|
| content (open class) | nouns, verbs, adjectives, adverbs | high | preserve |
| function (closed class) | articles, prepositions, conjunctions | low | remove |

## information theory: entropy and compression

tsc aligns with information-theoretic principles:

> "finding a low-entropy distribution that allows for good compression are equivalent tasks to achieving a good language model that gives good perplexity."
> — [stanford nlp: compression through language modeling](https://nlp.stanford.edu/courses/cs224n/2006/fp/aeldaher-jconnor-1-report.pdf)

> "entropy measures the unpredictability or randomness in a system. in the context of language models, entropy quantifies the uncertainty a model has when predicting the next token. a lower entropy indicates that the model is more confident in its predictions."
> — [medium: evaluating ai models](https://medium.com/@keerthanams1208/evaluating-ai-models-understanding-entropy-perplexity-bpb-and-bpc-df816062f21a)

function words are low-entropy (highly predictable from context). content words are high-entropy (carry the actual information). tsc removes low-entropy tokens because they can be reconstructed by the reader.

## case study: llmlingua benchmark results

microsoft's llmlingua series demonstrates tsc principles at scale:

### llmlingua (emnlp 2023)

> "within the gsm8k benchmark, llmlingua retained the reasoning capabilities of llms at a 20x compression ratio, with only a 1.5% loss in performance."
> — [microsoft research: llmlingua](https://www.microsoft.com/en-us/research/blog/llmlingua-innovating-llm-efficiency-with-prompt-compression/)

> "the approach was evaluated on four datasets from different scenarios (gsm8k, bbh, sharegpt, and arxiv-march23), yielding state-of-the-art performance with up to 20x compression with little performance loss."
> — [github: microsoft/llmlingua](https://github.com/microsoft/LLMLingua)

### longllmlingua (acl 2024)

> "in the naturalquestions benchmark, longllmlingua boosted performance by up to 21.4% with around 4x fewer tokens in gpt-3.5-turbo, leading to substantial cost savings."
> — [arxiv: longllmlingua](https://arxiv.org/abs/2310.06839)

> "it achieved a 94.0% cost reduction in the loogle benchmark."
> — [microsoft research: longllmlingua](https://www.microsoft.com/en-us/research/project/llmlingua/longllmlingua/)

### llmlingua-2 (acl 2024)

> "llmlingua-2 is 3x-6x faster than prior prompt compression methods, while accelerating end-to-end latency by 1.6x-2.9x with compression ratios of 2x-5x."
> — [arxiv: llmlingua-2](https://arxiv.org/abs/2403.12968)

> "on gsm8k using complex 9-step chain-of-thought prompts, llmlingua-2 maintained similar performance at a compression ratio of up to 14x."
> — [llmlingua.com: llmlingua-2](https://llmlingua.com/llmlingua2.html)

## semantic preservation metrics

research has established metrics for evaluating tsc quality:

> "two novel metrics—exact reconstructive effectiveness (ere) and semantic reconstruction effectiveness (sre)—quantify the level of preserved intent between text compressed and decompressed by llms."
> — [arxiv: semantic compression with large language models](https://arxiv.org/pdf/2304.12512)

> "gpt-4 can effectively compress and reconstruct text while preserving the semantic essence of the original text, providing a path to leverage ~5× more tokens than present limits allow."
> — [arxiv: semantic compression with llms](https://arxiv.org/pdf/2304.12512)

## tsc principles for brief compression

when compressing briefs for robot brain consumption:

### 1. preserve high-entropy tokens
- rule statements (the core directive)
- code examples (executable knowledge)
- domain terms (precise vocabulary)
- enforcement levels (blocker, nitpick)

### 2. remove low-entropy tokens
- articles (a, an, the)
- copulas (is, are, was)
- filler phrases (in order to, it should be noted that)
- redundant transitions (furthermore, additionally, moreover)
- verbose explanations (when X is the case, we observe that Y)

### 3. trust the reader's reconstruction
robot brains excel at reconstructing grammatical structure from telegraphic input. they can infer:
- articles from noun context
- tense from temporal markers
- relationships from semantic proximity

### 4. maintain structural markers
preserve markdown structure that aids parsing:
- headers (## .what, ## .why)
- code fences (```)
- bullet points (-)
- tables (|)

## example transformation

### before (verbose)
```
the rule is that you should always use named arguments on inputs.
this is because they make it clear when you read what the arguments are used for.
they also make it possible to reorder arguments without having to break the contract,
which is great for refactors, deprecations, renames, and so forth.
```

### after (tsc)
```
rule: always use named arguments on inputs

why:
- clear: reader sees what arguments are used for
- evolvable: reorder arguments without contract break
- enables: refactors, deprecations, renames
```

## summary statistics

| metric | value | source |
|--------|-------|--------|
| max compression ratio (llmlingua) | 20x | microsoft research |
| performance loss at 20x | 1.5% | gsm8k benchmark |
| cost reduction (longllmlingua) | 94% | loogle benchmark |
| speed improvement (llmlingua-2) | 3-6x | acl 2024 |
| content words in english | 99.9% | linguistics |
| function words in english | ~150 | linguistics |

## sources

1. [wikipedia: telegraphic speech](https://en.wikipedia.org/wiki/Telegraphic_speech)
2. [pmc: parent telegraphic speech use in preschoolers](https://pmc.ncbi.nlm.nih.gov/articles/PMC4987034/)
3. [wikipedia: content word](https://en.wikipedia.org/wiki/Content_word)
4. [grammarist: open class vs closed class words](https://grammarist.com/grammar/open-class-vs-closed-class-words/)
5. [stanford nlp: compression through language modeling](https://nlp.stanford.edu/courses/cs224n/2006/fp/aeldaher-jconnor-1-report.pdf)
6. [medium: evaluating ai models - entropy](https://medium.com/@keerthanams1208/evaluating-ai-models-understanding-entropy-perplexity-bpb-and-bpc-df816062f21a)
7. [microsoft research: llmlingua blog](https://www.microsoft.com/en-us/research/blog/llmlingua-innovating-llm-efficiency-with-prompt-compression/)
8. [github: microsoft/llmlingua](https://github.com/microsoft/LLMLingua)
9. [arxiv: longllmlingua](https://arxiv.org/abs/2310.06839)
10. [arxiv: llmlingua-2](https://arxiv.org/abs/2403.12968)
11. [arxiv: semantic compression with large language models](https://arxiv.org/pdf/2304.12512)
12. [llmlingua.com: llmlingua-2](https://llmlingua.com/llmlingua2.html)
