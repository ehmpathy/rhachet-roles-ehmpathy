[
    {
        "kind": "blocker",
        "what": "Function uses positional arguments instead of destructured input.",
        "why": "The function should use a destructuring pattern to adhere to the defined coding standards and facilitate future enhancements.",
        "where": {
            "scope": "implementation",
            "sample": "export const multiply=(a,b)=>a*b;"
        },
        "impacts": "technical.consistency"
    },
    {
        "kind": "blocker",
        "what": "Arrow function is not declared with proper syntax.",
        "why": "The function declaration lacks spaces around arguments and the arrow, reducing readability and deviating from standard formatting practices.",
        "where": {
            "scope": "implementation",
            "sample": "export const multiply=(a,b)=>a*b;"
        },
        "impacts": "technical.readability"
    },
    {
        "kind": "blocker",
        "what": "No validation for non-numeric inputs.",
        "why": "There should be checks to ensure that the inputs are numbers to prevent runtime errors and adhere to the contract's requirement to handle numeric inputs only.",
        "where": {
            "scope": "implementation",
            "sample": "export const multiply=(a,b)=>a*b;"
        },
        "impacts": "functional"
    }
]
