shape
```ts
type AbstractionLadderLabeled = {
  base: string;
  steps: {
    higher: string;
    bridge?: string;  // optional: "what makes this an abstraction of the previous"
  }[];
  top?: string;
};
```

example
```json
{
  "base": "missed customer appointment",
  "steps": [
    {
      "higher": "a failed confirmation",
      "bridge": "appointment depends on digital alerts"
    },
    {
      "higher": "a communication breakdown",
      "bridge": "notification is a form of communication"
    },
    {
      "higher": "a disruption of service reliability",
      "bridge": "communication affects perceived reliability"
    },
    {
      "higher": "a failure to maintain customer trust",
      "bridge": "reliability is core to trust"
    }
  ],
  "top": "trust erosion"
}
```
