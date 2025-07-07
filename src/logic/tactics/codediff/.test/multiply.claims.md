{
    "ask": { "summary": "Stub out the functionality for multiplication" },
    "claims": {
        "lessons": [
            "Multiplication is a basic arithmetic operation used to calculate the product of two numbers."
        ],
        "assumptions": [
            "Inputs are integers or floating-point numbers.",
            "The operation must handle positive and negative numbers."
        ],
        "questions": [
            "Should the function handle non-numeric inputs?",
            "What is the expected behavior for multiplying by zero or one?"
        ]
    },
    "contract": {
        "input": "two numbers (could be integers or floats)",
        "output": "the product of these two numbers as a number"
    },
    "cases": {
        "use": [
            { "who": "general user", "when": "calculating the product of two integers", "what": "receives the correct product" },
            { "who": "general user", "when": "using negative numbers", "what": "receives the correct product considering sign rules" },
            { "who": "financial analyst", "when": "multiplying large values for financial calculations", "what": "receives accurate and precise results" }
        ],
        "test": [
            { "form": "positive", "given": "multiplying 3 and 5", "when": "function is executed", "then": "result is 15", "because": "3*5 equals 15" },
            { "form": "positive", "given": "multiplying -3 and 5", "when": "function is executed", "then": "result is -15", "because": "negative times a positive yields a negative" },
            { "form": "positive", "given": "multiplying 0 and any number", "when": "function is executed", "then": "result is 0", "because": "zero multiplied by any number is always zero" },
            { "form": "negative", "given": "multiplying non-numeric types", "when": "non-supported types passed", "then": "error or exception raised", "because": "function should only handle numeric inputs" }
        ]
    }
}
