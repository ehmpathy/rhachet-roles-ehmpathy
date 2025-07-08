[
  {
    "kind": "blocker",
    "what": "Arrow function uses incorrect arguments pattern",
    "why": "Function 'multiply' must follow the enforced pattern of `(input, context?)` for arguments to simplify function call readability and align with domain patterns.",
    "where": {
      "scope": "implementation",
      "sample": "export const multiply=(a,b)=>a*b;"
    }
  },
  {
    "kind": "nitpick",
    "what": "Destructuring of function arguments",
    "why": "Arguments 'a' and 'b' in the 'multiply' function should be passed as destructured properties of an object to improve readability and preserve the flexibility of argument handling.",
    "where": {
      "scope": "implementation",
      "sample": "export const multiply=(a,b)=>a*b;"
    }
  },
  {
    "kind": "nitpick",
    "what": "Whitespace conventions",
    "why": "Follow conventional formatting with whitespaces around operators and after commas for better readability of the arrow function.",
    "where": {
      "scope": "implementation",
      "sample": "export const multiply=(a,b)=>a*b;"
    }
  }
]
