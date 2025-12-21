# 🧠 .brief: Claude Context Caching

## .what
Claude's context caching mechanism that reduces token costs by caching prompt prefixes

## .how.it.works

### cache key = exact prefix match
- Claude caches content based on the **exact sequence of tokens from the start** of the conversation
- a cache hit requires the **exact same prefix** to be present
- cache is valid for ~5 minutes of inactivity

### prefix-based matching
```
Turn 1: [system prompt] + [briefs: 30k tokens] → writes to cache
Turn 2: [system prompt] + [briefs: 30k tokens] + [user msg] + [response] → cache hit ✅
Turn 3: [system prompt] + [briefs: 30k tokens] + [history] + [new msg] → cache hit ✅
```

### when cache hits occur

✅ **cache hit (free reads)** when:
- the content appears at the **exact same position** in the context
- everything before it is **identical** to the cached version
- less than ~5 minutes of inactivity

❌ **cache miss (full tokens charged)** when:
- anything changed in the context **before** the cached content (even a single token)
- the content moved to a different position in the conversation
- more than ~5 minutes passed with no activity
- new conversation started (different session)

## .implications.for.briefs

### sessionstart hooks
when loading briefs via sessionstart hooks:

1. **first boot**: full tokens cached (e.g., 30k tokens written to cache)
2. **within same session**: cached if prefix matches (free reads)
3. **new session**: full tokens charged again (new conversation = different prefix)

### optimization strategies
to maximize cache hits:

1. **load briefs once per session** (sessionstart hook pattern)
2. **keep them at consistent position** (ideally at the start)
3. **avoid regenerating them** if content hasn't changed
4. **batch related work** in same session to reuse cache

## .key.insight

the cache **does not move tokens around** or do LRU eviction - it's purely prefix-based matching

this means:
- you can't "refresh" cached content by using it again
- cached content must appear in the exact same position to hit
- any prefix changes invalidate the entire cache for that position

## .cost.model

### cache writes
- **first use**: 25% of normal input token cost
- **cache write**: happens on first occurrence of new content

### cache reads
- **cache hit**: 10% of normal input token cost
- **cache miss**: 100% of normal input token cost (no cache benefit)

### example: 30k token briefs
- **first load**: ~7.5k tokens charged (25% write cost)
- **subsequent hits**: ~3k tokens charged (10% read cost)
- **cache miss**: 30k tokens charged (100% cost)

## .sources
- based on Anthropic's context caching documentation
- observed behavior in production usage
