shape
```ts
type FiveWhysTree = {
  effect: string;
  causes: WhyNode[];
};

type WhyNode = {
  cause: string;
  explanation?: string;
  subwhys?: WhyNode[];
};

type Output = FiveWhysTree
```

example
```json
{
  "effect": "string",
  "causes": [
    {
      "cause": "string",
      "subwhys": [
        {
          "cause": "string",
          "subwhys": [
            {
              "cause": "string",
              "explanation": "string",
              "subwhys": [...]
            }
          ]
        }
      ]
    },
    {
      "cause": "string",
      "subwhys": [
        {
          "cause": "string",
          "explanation": "string"
        }
      ]
    }
  ]
}
```

critical:
- be sure to acheive atleast a depth of 5 whys on atleast 1 branch
