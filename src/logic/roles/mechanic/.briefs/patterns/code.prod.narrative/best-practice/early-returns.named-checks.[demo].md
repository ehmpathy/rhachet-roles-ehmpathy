
● The check now walks up the prototype chain starting from error.constructor, checking if any class in the
  inheritance hierarchy is named 'BadRequestError'. This handles cases where a custom error class extends
  BadRequestError (or extends something that extends it, etc.).

> lets actually create a new constant called "isExtensionOfBadRequestError"
  ⎿  Found 3 new diagnostic issues in 1 file (ctrl+o to expand)

● Update(src/logic/middlewares/badRequestErrorMiddleware.ts)
  ⎿  Updated src/logic/middlewares/badRequestErrorMiddleware.ts with 4 additions and 2 removals
        8     */
        9    export const decideIsBadRequestError = ({ error }: { error: Error }) => {
       10      const isInstanceOfBadRequestError = error instanceof BadRequestError;
       11 -    const isNamedAfterBadRequestError = (() => {
       12 -      let proto = error.constructor;
       11 +    const isNamedAfterBadRequestError =
       12 +      error.constructor.name === 'BadRequestError';
       13 +    const isExtensionOfBadRequestError = (() => {
       14 +      let proto = Object.getPrototypeOf(error.constructor);
       15        while (proto) {
       16          if (proto.name === 'BadRequestError') return true;
       17          proto = Object.getPrototypeOf(proto);

● Now I need to add the new constant to the return statement:

● Update(src/logic/middlewares/badRequestErrorMiddleware.ts)
  ⎿  Updated src/logic/middlewares/badRequestErrorMiddleware.ts with 1 addition and 1 removal
       18        }
       19        return false;
       20      })();
       21 -    return isInstanceOfBadRequestError || isNamedAfterBadRequestError;
       21 +    return isInstanceOfBadRequestError || isNamedAfterBadRequestError
          +   || isExtensionOfBadRequestError;
       22    };
       23
       24    /**

● Done. Now decideIsBadRequestError has three separate checks:

  1. isInstanceOfBadRequestError - uses instanceof check
  2. isNamedAfterBadRequestError - checks if the error's constructor is named 'BadRequestError'
  3. isExtensionOfBadRequestError - walks up the prototype chain to check if any parent class is named
  'BadRequestError'

> add a header comment for each constant
  ⎿  Found 1 new diagnostic issue in 1 file (ctrl+o to expand)

● Update(src/logic/middlewares/badRequestErrorMiddleware.ts)
  ⎿  Updated src/logic/middlewares/badRequestErrorMiddleware.ts with 11 additions and 1 removal
        7     * .what = procedure for deciding whether an error is a bad request error
        8     */
        9    export const decideIsBadRequestError = ({ error }: { error: Error }) => {
       10 +    // check if the error is an instance of BadRequestError
       11      const isInstanceOfBadRequestError = error instanceof BadRequestError;
       12 +
       13 +    // check if the error's constructor is named 'BadRequestError'
       14      const isNamedAfterBadRequestError =
       15        error.constructor.name === 'BadRequestError';
       16 +
       17 +    // check if any parent class in the prototype chain is named 'BadRequestError'
       18      const isExtensionOfBadRequestError = (() => {
       19        let proto = Object.getPrototypeOf(error.constructor);
       20        while (proto) {
     ...
       18        }
       19        return false;
       20      })();
       21 -    return isInstanceOfBadRequestError || isNamedAfterBadRequestError ||
          - isExtensionOfBadRequestError;
       21 +
       22 +    return (
       23 +      isInstanceOfBadRequestError ||
       24 +      isNamedAfterBadRequestError ||
       25 +      isExtensionOfBadRequestError
       26 +    );
       27    };
       28
       29    /**

● Done. Added header comments for each constant and also fixed the formatting on the return statement to
  satisfy the eslint rule.

> use early returns after each check, rather than needoing to evalaute all three
  ⎿  Found 3 new diagnostic issues in 1 file (ctrl+o to expand)

● Update(src/logic/middlewares/badRequestErrorMiddleware.ts)
  ⎿  Updated src/logic/middlewares/badRequestErrorMiddleware.ts with 8 additions and 16 removals
        8     */
        9    export const decideIsBadRequestError = ({ error }: { error: Error }) => {
       10      // check if the error is an instance of BadRequestError
       11 -    const isInstanceOfBadRequestError = error instanceof BadRequestError;
       11 +    if (error instanceof BadRequestError) return true;
       12
       13      // check if the error's constructor is named 'BadRequestError'
       14 -    const isNamedAfterBadRequestError =
       15 -      error.constructor.name === 'BadRequestError';
       14 +    if (error.constructor.name === 'BadRequestError') return true;
       15
       16      // check if any parent class in the prototype chain is named 'BadRequestError'
       17 -    const isExtensionOfBadRequestError = (() => {
       18 -      let proto = Object.getPrototypeOf(error.constructor);
       19 -      while (proto) {
       20 -        if (proto.name === 'BadRequestError') return true;
       21 -        proto = Object.getPrototypeOf(proto);
       22 -      }
       23 -      return false;
       24 -    })();
       17 +    let proto = Object.getPrototypeOf(error.constructor);
       18 +    while (proto) {
       19 +      if (proto.name === 'BadRequestError') return true;
       20 +      proto = Object.getPrototypeOf(proto);
       21 +    }
       22
       23 -    return (
       24 -      isInstanceOfBadRequestError ||
       25 -      isNamedAfterBadRequestError ||
       26 -      isExtensionOfBadRequestError
       27 -    );
       23 +    return false;
       24    };
       25
       26    /**

● Done. Now the function uses early returns, so it short-circuits as soon as any check passes without needing
  to evaluate the remaining checks.

> header comment on the last return, too
  ⎿  Found 3 new diagnostic issues in 1 file (ctrl+o to expand)

● Update(src/logic/middlewares/badRequestErrorMiddleware.ts)
  ⎿  Updated src/logic/middlewares/badRequestErrorMiddleware.ts with 1 addition
       20        proto = Object.getPrototypeOf(proto);
       21      }
       22
       23 +    // otherwise, not a bad request error
       24      return false;
       25    };
       26

● Done.

> keep the names of the constants though; if (isXyz) is important for greater readability
  ⎿  Found 3 new diagnostic issues in 1 file (ctrl+o to expand)

● Update(src/logic/middlewares/badRequestErrorMiddleware.ts)
  ⎿  Updated src/logic/middlewares/badRequestErrorMiddleware.ts with 14 additions and 7 removals
        8     */
        9    export const decideIsBadRequestError = ({ error }: { error: Error }) => {
       10      // check if the error is an instance of BadRequestError
       11 -    if (error instanceof BadRequestError) return true;
       11 +    const isInstanceOfBadRequestError = error instanceof BadRequestError;
       12 +    if (isInstanceOfBadRequestError) return true;
       13
       14      // check if the error's constructor is named 'BadRequestError'
       15 -    if (error.constructor.name === 'BadRequestError') return true;
       15 +    const isNamedAfterBadRequestError =
       16 +      error.constructor.name === 'BadRequestError';
       17 +    if (isNamedAfterBadRequestError) return true;
       18
       19      // check if any parent class in the prototype chain is named 'BadRequestError'
       20 -    let proto = Object.getPrototypeOf(error.constructor);
       21 -    while (proto) {
       22 -      if (proto.name === 'BadRequestError') return true;
       23 -      proto = Object.getPrototypeOf(proto);
       24 -    }
       20 +    const isExtensionOfBadRequestError = (() => {
       21 +      let proto = Object.getPrototypeOf(error.constructor);
       22 +      while (proto) {
       23 +        if (proto.name === 'BadRequestError') return true;
       24 +        proto = Object.getPrototypeOf(proto);
       25 +      }
       26 +      return false;
       27 +    })();
       28 +    if (isExtensionOfBadRequestError) return true;
       29
       30      // otherwise, not a bad request error
       31      return false;

● Done. Now each check has a named constant (isInstanceOfBadRequestError, isNamedAfterBadRequestError,
  isExtensionOfBadRequestError) followed by an early return, giving both readability and short-circuit
  evaluation.
