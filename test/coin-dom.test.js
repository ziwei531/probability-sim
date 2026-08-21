// DOM integration harness: attacks invalid input and in-flight control state in script.js
const fs   = require( "fs" );
const path = require( "path" );

class MockElement {
	constructor( value = "" ) {
		this.value       = value;
		this.disabled    = false;
		this.hidden      = true;
		this.textContent = "";
		this.listeners   = new Map();
		this.attributes  = new Map();
		this.style       = { setProperty() {} };
		this.classList   = { add() {}, remove() {} };
		this.offsetWidth = 100;
	}

	get valueAsNumber() {
		return this.value.trim() === "" ? Number.NaN : Number( this.value );
	}

	addEventListener( type, listener ) {
		this.listeners.set( type, listener );
	}

	dispatch( type ) {
		this.listeners.get( type )?.( { target: this } );
	}

	querySelector() {
		return coinInner;
	}

	setAttribute( name, value ) {
		this.attributes.set( name, value );
	}
}

const coinInner  = new MockElement();
const flipButton = new MockElement();
const resultLine = new MockElement();
const statsLine  = new MockElement();
const coin       = new MockElement();
const headsInput = new MockElement( "50" );
const tailsInput = new MockElement( "50" );
const errorLine  = new MockElement();
const elements   = new Map( [
	  [ "#flip-button", flipButton ]
	, [ "#result", resultLine ]
	, [ "#stats", statsLine ]
	, [ "#coin", coin ]
	, [ "#heads-input", headsInput ]
	, [ "#tails-input", tailsInput ]
	, [ "#coin-error", errorLine ]
] );

let scheduledCompletion = null;
global.setTimeout = ( callback ) => {
	scheduledCompletion = callback;
};
global.window = {
	matchMedia() {
		return { matches: false };
	}
};
global.document = {
	querySelector( selector ) {
		return elements.get( selector );
	}
};

const scriptPath = path.join( __dirname, "..", "js", "script.js" );
const source     = fs.readFileSync( scriptPath, "utf8" );
eval( `${ source }\n;window.__coinState = state;` );

headsInput.value = "";
headsInput.dispatch( "input" );
if ( !flipButton.disabled || !coin.disabled || errorLine.hidden ) {
	throw new Error( "An empty probability did not block both flip controls with a visible error" );
}

headsInput.value = "37.25";
headsInput.dispatch( "input" );
if ( flipButton.disabled || coin.disabled || !errorLine.hidden ) {
	throw new Error( "Correcting an invalid probability did not restore both flip controls" );
}

headsInput.value = "50.005";
headsInput.dispatch( "input" );
headsInput.dispatch( "change" );
if ( headsInput.value !== "50.01" || tailsInput.value !== "49.99" ) {
	throw new Error( `Heads precision did not normalize to the effective odds: ${ headsInput.value } / ${ tailsInput.value }` );
}

tailsInput.value = "50.005";
tailsInput.dispatch( "input" );
tailsInput.dispatch( "change" );
if ( headsInput.value !== "49.99" || tailsInput.value !== "50.01" ) {
	throw new Error( `Tails precision did not normalize to the effective odds: ${ headsInput.value } / ${ tailsInput.value }` );
}

flipButton.dispatch( "click" );
if ( resultLine.textContent !== "" ) {
	throw new Error( "A toss revealed its outcome before the animation completed" );
}
if ( !flipButton.disabled || !coin.disabled || !headsInput.disabled || !tailsInput.disabled ) {
	throw new Error( "A toss did not lock every odds-changing control" );
}
if ( !scheduledCompletion ) {
	throw new Error( "A toss did not schedule completion" );
}
scheduledCompletion();
if ( flipButton.disabled || coin.disabled || headsInput.disabled || tailsInput.disabled ) {
	throw new Error( "Completed toss did not restore valid controls" );
}
if ( !/^(Heads|Tails)!$/.test( resultLine.textContent ) ) {
	throw new Error( "Completed toss did not announce its result" );
}

console.log( "ALL TESTS PASSED" );
