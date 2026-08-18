# JavaScript Coding Preferences

## ES6+ First

**Always prefer modern ES6+ syntax.** The baseline is ES2015 (ES6) and newer. Avoid pre-ES6 patterns unless there is a specific, documented reason. When in doubt, reach for the modern equivalent:

| Avoid (pre-ES6) | Prefer (ES6+) |
|---|---|
| `var` | `const` / `let` |
| `function` expression callbacks | Arrow functions |
| `"str " + var + " more"` | Template literals |
| `function Constructor() {}` + prototype | `class` syntax |
| `require()` / `module.exports` | `import` / `export` |
| `for (;;)` over iterables | `for...of` / `forEach` / array methods |
| `{ key: key }` | Shorthand `{ key }` |
| `obj.fn = function() {}` | Method shorthand `fn() {}` |
| `arguments` object | Rest parameters `...args` |
| `Object.assign({}, obj, …)` | Object spread `{ ...obj }` |
| `Array.prototype.slice.call()` | Array spread `[...iterable]` |
| Manual default checks `x = x \|\| 5` | Default parameters `( x = 5 )` |
| Callback pyramids | `async` / `await` |
| `Promise.then().catch()` chains | `async` / `await` |

The rest of this document details *how* to format and apply these ES6+ constructs.

## Indentation and Whitespace

**Use TABS, not spaces.** Every indentation level is exactly one tab character.

```javascript
// CORRECT — tabs
const getActiveEvents = ( events ) => {
	const active = events.filter( ( event ) => {
		return event.isActive;
	} );

	return active;
};

// WRONG — spaces
const getActiveEvents = ( events ) => {
    const active = events.filter((event) => {
        return event.isActive;
    });
};
```

**Zero tolerance for trailing whitespace** — remove all trailing spaces/tabs from every line.

## The Leading Comma Pattern

The signature formatting pattern. Multi-line argument lists, array literals, and object literals use leading commas:

```javascript
// Function calls with multiple named-style args (options object)
loadDashboardData(
	  { projectId: projectId }
	, { includeArchived: false }
	, onSuccess
	, onError
);

// Array literals
const fields = [
	  "first_name"
	, "last_name"
	, "email_address"
	, "phone_number"
];

// Object literals
const data = {
	  label: "Annual Conference"
	, startDate: "2024-06-15"
	, category: categoryId
	, isActive: true
};
```

**Rules:**
- First item: indented with tab(s), preceded by two spaces (to align with `, `)
- Subsequent items: indented with tab(s), preceded by `, ` (comma-space)
- Closing paren/bracket/brace on its own line at the original indentation level
- Values loosely aligned by `:` or `=` (not strictly columnar, but visually grouped)

## Alignment

**Code should be visually aligned wherever practical.** Alignment makes code scannable — the eye should be able to run down a column of `=`, `:`, or `??` and instantly grasp the shape of the data.

This applies to:

- **Variable declarations** — align by `=` and `??` / `||`:

```javascript
const contactId    = rc.contactId ?? "";
const eventId      = rc.eventId   ?? "";
const isNewBooking = !bookingId;
```

- **Object literals** — align by `:`:

```javascript
const data = {
	  label    : "Annual Conference"
	, startDate: "2024-06-15"
	, category : categoryId
	, isActive : true
};
```

- **Multi-line ternary / expressions** — align by operator:

```javascript
const message = hasPermission
	? grantAccess()
	: showDenied();

const fullName = firstName
	+ " "
	+ lastName;
```

- **Import lists** — align by `from`:

```javascript
import { getEvents, createEvent } from "./eventService";
import { formatDate, parseDate }  from "./dateUtils";
import EventService               from "./eventService";
```

**Rules:**
- Alignment is **visual grouping**, not strict columnar — use your judgment
- Align related items within a block; don't force alignment across unrelated blocks
- Use spaces (not tabs) for the alignment padding between the end of the name and the operator

## Spacing Around Operators

Always use spaces around operators:

```javascript
// CORRECT
const result   = value1 + value2;
const isActive = status === "active";
const canEdit  = hasPermission && !isLocked;
const name     = firstName + " " + lastName;

if ( gapInDays <= 1 && sameGrade ) {
if ( !value ) {

// WRONG — no spaces
const result=value1+value2;
if(!value){
```

## Naming Conventions

- **Variables/functions:** camelCase — `contactId`, `bookingRef`, `isActive`, `getActiveEvents()`
- **Classes/constructors:** PascalCase — `EventService`, `SubscriptionGrade`
- **Private/internal helper functions:** prefixed with `_` — `_setupFeatures()`, `_notifyDelegates()`
- **Constants:** camelCase, same as variables — `maxRetries`, `defaultTimeout`. Immutable data declared with `const` does not need a different casing convention.

### Function Names

Be **specific and descriptive** — avoid generic terms like "update", "process", "handle". Use camelCase, starting with a lowercase character; never use PascalCase for functions.

```javascript
// BAD — too generic
function updateData() {}
function process() {}

// BAD — PascalCase (reserved for classes/constructors)
function SayHello() {}

// GOOD — specific, descriptive, camelCase
function archiveExpiredBookings() {}
function refreshSubscriptionRenewalGrades() {}
```

### Arrow Functions

**Prefer arrow functions for callbacks and expressions.** Arrow functions provide a concise syntax and lexical `this` binding, reducing boilerplate and avoiding `this`-related bugs.

Use **implicit return** (expression body) when the arrow body is a single expression:

```javascript
// CORRECT — implicit return
arr.map( ( e ) => e.id );
const sum = arr.reduce( ( a, b ) => a + b );
const add = ( a, b ) => a + b;

// WRONG — unnecessary braces + return for a single expression
arr.map( ( e ) => {
	return e.id;
} );
```

```javascript
// CORRECT — arrow functions for callbacks
fetchData().then( ( data ) => processData( data ) );
events.filter( ( event ) => event.isActive );
setTimeout( () => doSomething(), 1000 );

// Single-param arrow: parens optional, but keep consistent with project style
// When using leading-comma formatting, parens around single params are preferred
// for visual consistency:
items.map( ( item ) => transform( item ) );

// WRONG — unnecessary function expression
fetchData().then( function( data ) { return processData( data ); } );
events.filter( function( event ) { return event.isActive; } );
```

**Do not use arrow functions to assign a function to an identifier.** Use a proper function declaration instead. Arrow functions assigned to variables don't hoist and obscure the name in stack traces.

```javascript
// CORRECT — function declaration
function calculateTotal( items ) {
	return items.reduce( ( sum, item ) => sum + item.price, 0 );
}

// WRONG — arrow assigned to a variable
const calculateTotal = ( items ) => {
	return items.reduce( ( sum, item ) => sum + item.price, 0 );
};
```

**Use regular function declarations for top-level named functions and methods.** Arrow functions have no `this` binding, which is frequently desired for callbacks, but for methods and standalone named functions, a declaration is clearer:

```javascript
// CORRECT — function declaration for top-level / exported
function archiveExpiredBookings() { /* ... */ }
module.exports = { archiveExpiredBookings };

// CORRECT — method shorthand in objects
const service = {
	getEvents() {
		return fetch( "/events" );
	}
};

// WRONG — arrow for method or named identifier
const archiveExpiredBookings = () => { /* ... */ };
const service = {
	getEvents: () => fetch( "/events" )
};
```

## Variable Declarations

Always use `const` by default. Only use `let` when the variable must be reassigned. Never use `var`.

```javascript
// CORRECT
const maxSize     = 100;
let currentIndex  = 0;

// WRONG
var maxSize = 100;
```

Align related declarations by `=`:

```javascript
const contactId    = rc.contactId ?? "";
const eventId      = rc.eventId   ?? "";
const isNewBooking = !bookingId;
```

Use `??` for safe defaults on values that may not exist (e.g. inputs, external data) — but don't apply it defensively to values you just assigned yourself.

```javascript
// BAD — value was just assigned, can't be null
const name = record.label;
doSomething( name ?? "" ); // unnecessary

// GOOD — external/input values may not exist
const id = params.id ?? "";
```

Prefer `const` for values that won't be reassigned; use `let` when reassignment is needed. Never use `var`.

```javascript
// CORRECT
const maxSize    = 100;
let currentIndex = 0;

// WRONG
var maxSize = 100;
```

Declare one variable per line — don't chain or comma-separate declarations.

```javascript
// CORRECT
const name  = record.label;
const age   = record.age;
const email = record.email;

// WRONG
const name = record.label, age = record.age, email = record.email;
```

### Destructuring

Prefer destructuring to extract values from objects and arrays:

```javascript
// CORRECT — object destructuring
const { name, age, email } = user;
const { projectId, isActive } = rc;

// CORRECT — array destructuring
const [ first, second ] = items;
const [ head, ...tail ] = items;

// CORRECT — nested destructuring
const { address: { city, country } } = user;

// WRONG — manual extraction
const name  = user.name;
const age   = user.age;
const email = user.email;
```

### Spread & Rest

Use spread (`...`) for copying and merging; use rest for collecting remaining values:

```javascript
// CORRECT — array copy / merge
const copy   = [ ...original ];
const merged = [ ...items, newItem ];

// CORRECT — object copy / merge (shallow)
const defaults = { ...base, ...overrides };

// CORRECT — rest parameters (collect remaining args)
function logAll( prefix, ...values ) {
	values.forEach( ( v ) => console.log( prefix, v ) );
}

// WRONG — Object.assign / Array.prototype.slice
const merged = Object.assign( {}, base, overrides );
const args = Array.prototype.slice.call( arguments );
```

### Default Parameters

Use default parameter syntax instead of manual checks in the function body:

```javascript
// CORRECT
function fetchEvents( limit = 10, offset = 0 ) {
	// ...
}

// WRONG
function fetchEvents( limit, offset ) {
	limit  = limit  ?? 10;
	offset = offset ?? 0;
	// ...
}
```

## Strings

Use template literals for string interpolation; use regular string literals when there are no substitutions.

```javascript
// CORRECT — template literal for interpolation
const message = `Hello, ${ userName }. You have ${ count } new messages.`;

// CORRECT — plain string for no substitution
const label = "Loading…";

// WRONG — concatenation
const message = "Hello, " + userName + ". You have " + count + " new messages.";
```

## Type Coercion

Avoid implicit type coercion. Use `Number()` and `String()` (without `new`) instead of `+val` or `"" + val`.

```javascript
// CORRECT
const num  = Number( inputValue );
const str  = String( inputValue );

// WRONG
const num = +inputValue;
const str = "" + inputValue;
```

## Equality & Boolean Tests

Prefer strict equality (`===` / `!==`) over loose equality. The only acceptable use of `==` is `x == null` (which checks both `null` and `undefined`).

```javascript
// CORRECT
if ( status === "active" ) { /* ... */ }
if ( count !== 0 ) { /* ... */ }
if ( value == null ) { /* checks null and undefined */ }

// WRONG
if ( status == "active" ) { /* ... */ }
```

Use truthy/falsy shortcuts for boolean tests:

```javascript
// CORRECT
if ( x ) { /* ... */ }
if ( !x ) { /* ... */ }

// WRONG — redundant
if ( x === true ) { /* ... */ }
if ( x === false ) { /* ... */ }
```

Prefer the ternary operator for simple conditional assignments and returns:

```javascript
// CORRECT
const label = isActive ? "Active" : "Inactive";
return hasPermission ? grantAccess() : denyAccess();

// WRONG — verbose for a simple choice
let label;
if ( isActive ) {
	label = "Active";
} else {
	label = "Inactive";
}
```

## Control Structure Spacing

Space after keyword, space inside parens. Always use braces, even for single-statement bodies:

```javascript
// CORRECT
if ( condition ) {
	doSomething();
}

// WRONG — braces omitted
if ( condition ) doSomething();
```

Omit `else` after an `if` that ends with `return`:

```javascript
// CORRECT
if ( !isValid ) {
	return;
}

// continue with the happy path here — no else needed
processData();

// WRONG — unnecessary else
if ( !isValid ) {
	return;
} else {
	processData();
}
```

Switch statements: don't add `break` after `return`. Put `default` last, and don't end it with `break`. Use braces for case-local variables:

```javascript
switch ( status ) {
	case "active":
		return handleActive();
	case "archived":
		return handleArchived();
	default:
		return handleDefault();
}
```

Prefer `for...of` or `forEach()` over classical `for (;;)`. Use `const` for `for...of` loop variables. Consider semantic array methods (`map`, `filter`, `find`, etc.) before reaching for a loop:

```javascript
// CORRECT — for...of
for ( const item of items ) {
	process( item );
}

// CORRECT — forEach with index
items.forEach( ( item, i ) => {
	console.log( i, item );
} );

// CORRECT — semantic array methods when applicable
const names  = users.map( ( u ) => u.name );
const adults = users.filter( ( u ) => u.age >= 18 );

// WRONG — classical for loop when forEach/for...of would do
for ( let i = 0; i < items.length; i++ ) {
	process( items[ i ] );
}
```

Never use `for...in` with arrays or strings.

```javascript
while ( condition ) {
	// body
}

try {
	// risky code
} catch ( error ) {
	// handle error
}
```

## Error Handling

Don't fail silently — always surface errors to the user, not just the console:

```javascript
// BAD — silent failure
fetchData().catch( ( error ) => {
	console.error( "Error fetching data", error );
} );

// GOOD — inform the user
fetchData().catch( ( error ) => {
	console.error( "Error fetching data", error );
	showErrorMessage( "Failed to load data. Please refresh and try again." );
} );
```

When you don't need the `catch` parameter, omit it:

```javascript
// CORRECT
try {
	riskyOperation();
} catch {
	// handle error without needing the error object
	fallbackOperation();
}
```

Only catch **recoverable** errors — let non-recoverable errors bubble up.

## Async/Await

Prefer `async`/`await` over raw promise chains for readability:

```javascript
// CORRECT — async/await
async function loadPageData() {
	const user  = await fetchUser();
	const posts = await fetchPosts( user.id );

	return { user, posts };
}

// OK but less preferred — raw promise chain
function loadPageData() {
	return fetchUser().then( ( user ) => {
		return fetchPosts( user.id ).then( ( posts ) => {
			return { user, posts };
		} );
	} );
}
```

## ES Modules

Use ES module syntax (`import` / `export`) instead of CommonJS (`require` / `module.exports`).

```javascript
// CORRECT — ES modules
import { getEvents, createEvent } from "./eventService";
import EventService               from "./eventService";

export function formatDate( date ) { /* ... */ }
export { getEvents, createEvent };
export default EventService;

// WRONG — CommonJS
const { getEvents, createEvent } = require( "./eventService" );
module.exports = { getEvents, createEvent };
```

## Objects & Arrays

Use literal syntax, not constructors:

```javascript
// CORRECT
const obj = {};
const arr = [];

// WRONG
const obj = new Object();
const arr = new Array();
```

Use shorthand properties when the key and variable name match:

```javascript
// CORRECT
const config = { projectId, isActive, category };

// WRONG
const config = { projectId: projectId, isActive: isActive, category: category };
```

Use ES class syntax, not old-style constructor functions:

```javascript
// CORRECT
class EventService {
	constructor( api ) {
		this.api = api;
	}

	getEvents() {
		return this.api.fetch( "/events" );
	}
}

// WRONG
function EventService( api ) {
	this.api = api;
}
EventService.prototype.getEvents = function() {
	return this.api.fetch( "/events" );
};
```

Use method definition shorthand in object literals:

```javascript
// CORRECT
const service = {
	getEvents() {
		return fetch( "/events" );
	}
};

// WRONG
const service = {
	getEvents: function() {
		return fetch( "/events" );
	}
};
```

Add items to arrays with `push()`, not direct index assignment:

```javascript
// CORRECT
items.push( newItem );

// WRONG
items[ items.length ] = newItem;
```

## Comment Style

Explain WHY, not WHAT. Use single-line `//` comments, not `/* … */` block comments (except for JSDoc).

Start comments with a capital letter, like a sentence. Don't end with a period unless it's multi-sentence. Put a space after `//`.

```javascript
// Using a Map here to preserve insertion order across re-renders
// Debounced to avoid firing on every keystroke

/**
 * Refreshes subscription renewal grades for approaching renewals.
 *
 * @param {string} productId          ID of subscription product to process
 * @param {number} daysBeforeRenewal  Days before renewal to trigger update
 */
```

For console output in examples, annotate the expected output with a trailing comment:

```javascript
console.log( result ); // { name: "Alice", age: 30 }
```

When skipping code with ellipsis, put the `…` inside a comment:

```javascript
// … fetch user data and validate permissions …
doSomething( user );
```

Comment out unused parameters with `/* … */` in the parameter list:

```javascript
element.addEventListener( "click", ( /* event */ ) => {
	handleClick();
} );
```

## Avoid Duplication

If the same helper function appears in two files, extract it to a shared module rather than duplicating it.

## Pre-Commit Checklist

- [ ] Tabs used (not spaces) — check entire file
- [ ] No trailing whitespace
- [ ] Leading comma pattern used for multi-line arguments/arrays/objects
- [ ] Spaces around operators and inside parens
- [ ] Code visually aligned: `=` / `:` / `??` / `from` columns grouped
- [ ] ES6+ syntax used throughout (see ES6+ First table)
- [ ] `const`/`let` used (no `var`), `const` by default, one variable per line
- [ ] Destructuring used for object/array property access
- [ ] Spread/rest used instead of `Object.assign` / `arguments`
- [ ] Default parameter syntax used, not manual checks in body
- [ ] Template literals for interpolation; plain strings otherwise
- [ ] `Number()`/`String()` for type conversion (not `+val`/`"" + val`)
- [ ] ES modules (`import`/`export`) over CommonJS (`require`)
- [ ] Strict equality (`===`) used; `==` only for `== null`
- [ ] Truthy shortcuts for booleans; ternary for simple conditionals
- [ ] Braces always used with control flow, even single-statement
- [ ] No `else` after `return`; no `break` after `return` in switch
- [ ] `for...of`/`forEach()` preferred over classical `for (;;)`
- [ ] Arrow functions used for callbacks and expressions
- [ ] `async`/`await` preferred over raw promise chains
- [ ] Object/array literals (not constructors); shorthand properties used
- [ ] ES class syntax (not constructor functions)
- [ ] Unused `catch` parameters omitted
- [ ] Function names specific and descriptive
- [ ] No redundant/defensive null coalescing on values already known to exist
- [ ] Errors surfaced to the user, not just logged to console
- [ ] Comments explain WHY, not WHAT; single-line `//` preferred
- [ ] No duplicated helper functions across files