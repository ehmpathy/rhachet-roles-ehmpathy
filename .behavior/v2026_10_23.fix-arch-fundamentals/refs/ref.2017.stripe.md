# ref.2017.stripe

grade: ✅ (the publisher's own page; the date, august 5 2017, and the author, brandur leach, are on the page)
cite: Brandur Leach (2017). APIs as infrastructure: future-proofing Stripe with versioning. Stripe blog. https://stripe.com/blog/api-versioning
seen: `.raw/page.stripe2017.json`

## .quote

> "To date, we've maintained compatibility with every version of our API since the company's inception in 2011."

> "Fields that were present before should stay present, and fields should always preserve their same type and name."

> "The first time a user makes an API request, their account is automatically pinned to the most recent version available, and from then on, every API call they make is assigned that version implicitly."

## .supports

- converge: a guarantee carries a since-version; a consumer is pinned to the promise it built against
