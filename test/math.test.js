// Node-only harness: evals the pure-math section of script.js and asserts its behaviour
// CommonJS: no package.json "type": "module", so node defaults to require
const fs   = require( "fs" );
const path = require( "path" );

const scriptPath = path.join( __dirname, "..", "script.js" );
const source     = fs.readFileSync( scriptPath, "utf8" );

const pureStart = source.indexOf( "/* ==== PURE MATH (node-testable) ==== */" );
const pureEnd   = source.indexOf( "/* ==== DOM WIRING ==== */" );

if ( pureStart === -1 || pureEnd === -1 || pureEnd <= pureStart ) {
	console.error( "FAIL: could not find the pure-math markers in script.js" );
	process.exit( 1 );
}

// Eval only the section between the markers so the DOM wiring never runs under node
eval( source.slice( pureStart, pureEnd ) );

let failures = 0;
function check( label, actual, expected ) {
	if ( actual !== expected ) {
		failures += 1;
		console.error( `FAIL: ${ label } — expected ${ expected }, got ${ actual }` );
	}
}

// toBp must round-trip every display value back to its exact basis points
check( "toBp( '37.25' )", toBp( "37.25" ), 3725 );
check( "toBp( '50.5' )", toBp( "50.5" ), 5050 );
check( "toBp( '99.99' )", toBp( "99.99" ), 9999 );
check( "toBp( '100' )", toBp( "100" ), 10000 );
check( "toBp( '0' )", toBp( "0" ), 0 );

// mirror must always make the pair sum to exactly 10000 (no float drift)
check( "mirror( 3725 ) + 3725", mirror( 3725 ) + 3725, 10000 );
check( "mirror( 5050 ) + 5050", mirror( 5050 ) + 5050, 10000 );
check( "mirror( 9999 ) + 9999", mirror( 9999 ) + 9999, 10000 );
check( "mirror( 10000 ) + 10000", mirror( 10000 ) + 10000, 10000 );
check( "mirror( 0 ) + 0", mirror( 0 ) + 0, 10000 );

// fromBp must format every basis point back to a two-decimal percentage string
check( "fromBp( 3725 )", fromBp( 3725 ), "37.25" );
check( "fromBp( 5050 )", fromBp( 5050 ), "50.50" );
check( "fromBp( 9999 )", fromBp( 9999 ), "99.99" );
check( "fromBp( 10000 )", fromBp( 10000 ), "100.00" );
check( "fromBp( 0 )", fromBp( 0 ), "0.00" );

// normalizePercentDisplay rounds excessive precision and clamps typed overflow
check( "normalizePercentDisplay( '33.333' )", normalizePercentDisplay( "33.333" ), "33.33" );
check( "normalizePercentDisplay( '150' )", normalizePercentDisplay( "150" ), "100.00" );
check( "normalizePercentDisplay( '-20' )", normalizePercentDisplay( "-20" ), "0.00" );
check( "normalizePercentDisplay( '' )", normalizePercentDisplay( "" ), null );

// Boundary behaviour with a fixed Math.random so the edges are exact, not statistical
function stubRandom( value ) {
	Math.random = () => value;
}

stubRandom( 0.99999 ); // roll = floor( 9999.9 ) = 9999
check( "flipHeadsBp( 10000 ) at roll 9999", flipHeadsBp( 10000 ), true );
check( "flipHeadsBp( 0 ) at roll 9999", flipHeadsBp( 0 ), false );

stubRandom( 0.4999 ); // roll = floor( 4999 ) = 4999
check( "flipHeadsBp( 5000 ) at roll 4999", flipHeadsBp( 5000 ), true );

stubRandom( 0.5 ); // roll = floor( 5000 ) = 5000
check( "flipHeadsBp( 5000 ) at roll 5000", flipHeadsBp( 5000 ), false );

// Distribution sanity: a deterministic LCG over 400k flips must land near the true rate
let lcgState = 123456789;
function lcgRandom() {
	// MINSTD LCG keeps every intermediate under 2^53 so the sequence is exactly reproducible
	lcgState = ( lcgState * 48271 ) % 2147483647;
	return lcgState / 2147483647;
}
Math.random = lcgRandom;

const trials   = 400000;
const headsBp  = 3725;
let headsCount = 0;
let trialIndex = 0;
while ( trialIndex < trials ) {
	if ( flipHeadsBp( headsBp ) ) {
		headsCount += 1;
	}
	trialIndex += 1;
}

const observedFraction = headsCount / trials;
if ( Math.abs( observedFraction - 0.3725 ) > 0.005 ) {
	failures += 1;
	console.error( `FAIL: distribution — observed ${ observedFraction }, expected 0.3725 ± 0.005` );
}

if ( failures > 0 ) {
	console.error( `${ failures } check(s) failed` );
	process.exit( 1 );
}

console.log( "ALL TESTS PASSED" );
