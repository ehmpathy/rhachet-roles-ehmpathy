# rule.forbid.term=hold.example=one-word-three-concepts

## .what

a real case from a peer repo, for `rule.forbid.term=hold`. one codebase used `hold` for three concepts. two of the three already had precise names in its own domain. the word did not add meaning; it hid which meaning was meant.

## .the three concepts

| the "hold" | what it really was | the precise name |
| --- | --- | --- |
| a pause hold — `getOneAdvertiserPauseHold` | the answer to "may this pro's campaigns turn back on now?": free to enable, or refused for one of three reasons — stop-pause, lease-headroom, cost-halt | an enable refusal: `getOneAdvertiserEnableRefusal`, `AdvertiserEnableRefusalReason`, subdomain `campaign/refusal/` |
| a refund hold | a refund ask not yet done. while it is open, the pro gets no new lease over the cap, no auto-reload, and no out-of-credit text | no new word: an open refund ask. open → done is already its lifecycle |
| an invoice line hold | an afterpaid invoice kept back until the spend it bills can no longer change | no new word: the invoice stays draft until its spend is settled. draft and settled already exist |

## .the lesson

- each sense had a precise name, and `hold` hid which one was meant
- two of the three needed no new word at all: the domain already said it
- the one new name, `refusal`, names the outcome — a refusal and its reason — where `hold` named only that a grip existed
