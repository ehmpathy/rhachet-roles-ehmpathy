when possible, prefer data driven, caselist based, tests

this is especially applicable for unit tests, which often evaluate a transform

---


for example


```ts

const TEST_CASES = [
  {
    description: 'capitalizes the first word in a sentence',
    given: {
      input: 'the bird is in the basket',
    },
    expect: {
      output: 'The bird is in the basket',
    }
  },
  {
    description: 'retains prior capitals in the sentence',
    given: {
      input: 'that Doctor Goose is a loon!',
    },
    expect: {
      output: 'That Doctor Goose is a loon!',
    }
  },
]

describe('asSentenceCase', () => {
  TEST_CASES.map(thisCase => test(thisCase.description, () => {
    const output = asSentenceCase(thisCase.given.input);
    expect(output).toEqual(thisCase.expect.output);
  }))
})

```
