// DOM integration harness: runs the real gacha.js and attacks rate-change state handling
const fs   = require( "fs" );
const path = require( "path" );

class MockElement {
	constructor( value = "" ) {
		this.value       = value;
		this.disabled    = false;
		this.hidden      = false;
		this.textContent = "";
		this.children    = [];
		this.listeners   = new Map();
	}

	addEventListener( type, listener ) {
		this.listeners.set( type, listener );
	}

	dispatch( type ) {
		this.listeners.get( type )?.( { target: this } );
	}

	replaceChildren( ...children ) {
		this.children = children;
	}

	appendChild( child ) {
		this.children.push( child );
	}
}

const elements = new Map( [
	  [ "#ssr-input", new MockElement( "3" ) ]
	, [ "#pull-button", new MockElement() ]
	, [ "#clear-button", new MockElement() ]
	, [ "#ssr-error", new MockElement() ]
	, [ "#status", new MockElement() ]
	, [ "#results", new MockElement() ]
	, [ "#batch-stats", new MockElement() ]
	, [ "#session-stats", new MockElement() ]
	, [ "#expected-ssr-line", new MockElement() ]
	, [ "#odds-ssr", new MockElement() ]
	, [ "#odds-sr", new MockElement() ]
	, [ "#odds-r", new MockElement() ]
	, [ "#ten-pull-chance", new MockElement() ]
	, [ "#results-empty", new MockElement() ]
	, [ "#summary", new MockElement() ]
] );

global.window = {};
global.document = {
	querySelector( selector ) {
		return elements.get( selector );
	},
	createDocumentFragment() {
		return new MockElement();
	},
	createElement() {
		return new MockElement();
	}
};

const scriptPath = path.join( __dirname, "..", "js", "gacha.js" );
const source     = fs.readFileSync( scriptPath, "utf8" );
eval( `${ source }\n;window.__gachaState = state;` );

const state            = window.__gachaState;
const ssrInput         = elements.get( "#ssr-input" );
const resultsList      = elements.get( "#results" );
const batchStatsLine   = elements.get( "#batch-stats" );
const sessionStatsLine = elements.get( "#session-stats" );
const statusLine       = elements.get( "#status" );
const summary          = elements.get( "#summary" );

state.sessionPulls           = 20;
state.sessionSsr             = 2;
resultsList.children         = [ new MockElement() ];
batchStatsLine.textContent   = "old batch";
sessionStatsLine.textContent = "old session";
statusLine.hidden            = false;

ssrInput.value = "5";
ssrInput.dispatch( "input" );

if ( state.sessionPulls !== 0 || state.sessionSsr !== 0 ) {
	throw new Error( `Rate change kept mixed session stats: ${ state.sessionPulls } pulls, ${ state.sessionSsr } SSR` );
}
if ( resultsList.children.length !== 0 || batchStatsLine.textContent !== "" || sessionStatsLine.textContent !== "" || !statusLine.hidden || !summary.hidden ) {
	throw new Error( "Rate change kept results from the previous probability" );
}

console.log( "ALL TESTS PASSED" );
