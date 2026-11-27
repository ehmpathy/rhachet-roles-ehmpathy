# ref.nd.hyrum-wright

grade: ✅ for the quote (the author's own page, first person: "Who's Hyrum? I'm a Principal Scientist at Adobe, and before that, a software engineer at Google"; "credit goes to Titus Winters for actually naming it"). the surname, wright, is from recall — the page gives only "Hyrum"; no date on the page
cite: Hyrum (n.d.). Hyrum's Law: An observation on Software Engineering. https://www.hyrumslaw.com/
seen: `.raw/page.hyrum.json` · `.raw/page.hyrum-author.json`

## .quote

> "With a sufficient number of users of an API, it does not matter what you promise in the contract: all observable behaviors of your system will be depended on by somebody."

## .supports

- contrast to "consumers may rely only on the declared guarantee"
- the response (bound): each guarantee names what is unpromised and is proven by a blackbox acceptance test; consumers who lean on unpromised behavior lean on an assumption with no upstream guarantee behind it
