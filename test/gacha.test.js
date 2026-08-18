// Node-only harness: evals the pure-math section of gacha.js and asserts its behaviour
// CommonJS: no package.json "type": "module", so node defaults to require
const fs   = require( "fs" );
const path = require( "path" );

const scriptPath = path.join( __dirname, "..", "gacha.js" );
const source     = fs.readFileSync( scriptPath, "utf8" );

const pureStart = source.indexOf( "/* ==== PURE MATH (node-testable) ==== */" );
const pureEnd   = source.indexOf( "/* ==== DOM WIRING ==== */" );

if ( pureStart === -1 || pureEnd === -1 || pureEnd <= pureStart ) {
	console.error( "FAIL: could not find the pure-math markers in gacha.js" );
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
function checkClose( label, actual, expected, tolerance ) {
	if ( Math.abs( actual - expected ) > tolerance ) {
		failures += 1;
		console.error( `FAIL: ${ label } — expected ${ expected } ± ${ tolerance }, got ${ actual }` );
	}
}
function checkTrue( label, condition ) {
	if ( !condition ) {
		failures += 1;
		console.error( `FAIL: ${ label }` );
	}
}

// parseSsrPercent: valid decimal percentages are accepted
check( "parseSsrPercent( '3' )", parseSsrPercent( "3" ), 3 );
check( "parseSsrPercent( '2.5' )", parseSsrPercent( "2.5" ), 2.5 );
check( "parseSsrPercent( '3.75' )", parseSsrPercent( "3.75" ), 3.75 );
check( "parseSsrPercent( '0' )", parseSsrPercent( "0" ), 0 );
check( "parseSsrPercent( '100' )", parseSsrPercent( "100" ), 100 );
check( "parseSsrPercent( ' 5 ' )", parseSsrPercent( " 5 " ), 5 );

// parseSsrPercent: invalid values are rejected, never clamped
check( "parseSsrPercent( '' )", parseSsrPercent( "" ), null );
check( "parseSsrPercent( 'abc' )", parseSsrPercent( "abc" ), null );
check( "parseSsrPercent( '-1' )", parseSsrPercent( "-1" ), null );
check( "parseSsrPercent( '101' )", parseSsrPercent( "101" ), null );
check( "parseSsrPercent( 'Infinity' )", parseSsrPercent( "Infinity" ), null );
check( "parseSsrPercent( null )", parseSsrPercent( null ), null );
check( "parseSsrPercent( undefined )", parseSsrPercent( undefined ), null );

// assignRarity boundaries: 0% leaves SSR impossible, 100% is always SSR
check( "assignRarity( 0, 0 )", assignRarity( 0, 0 ), "SR" );        // with 0% SSR the SR band covers [0, 20)
check( "assignRarity( 0, 99.99 )", assignRarity( 0, 99.99 ), "R" );
check( "assignRarity( 100, 0 )", assignRarity( 100, 0 ), "SSR" );
check( "assignRarity( 100, 99.99 )", assignRarity( 100, 99.99 ), "SSR" );

// 3% SSR: SSR threshold at 3, SR threshold at 3 + 97 * 0.2
check( "assignRarity( 3, 0 )", assignRarity( 3, 0 ), "SSR" );
check( "assignRarity( 3, 2.99 )", assignRarity( 3, 2.99 ), "SSR" );
check( "assignRarity( 3, 3 )", assignRarity( 3, 3 ), "SR" );        // boundary exclusive for SSR
check( "assignRarity( 3, 5 )", assignRarity( 3, 5 ) === "SSR", false ); // above the SSR threshold is never SSR
check( "assignRarity( 3, 20 )", assignRarity( 3, 20 ), "SR" );
const srBoundary = 3 + ( 100 - 3 ) * 0.2;
check( "roll at SR boundary is not SR", assignRarity( 3, srBoundary ) === "SR", false );
check( "assignRarity( 3, 25 )", assignRarity( 3, 25 ), "R" );
check( "assignRarity( 3, 99.99 )", assignRarity( 3, 99.99 ), "R" );

// generateBatch: exactly ten results, each from its own roll
const allSsr = generateBatch( 3, 10, () => 0.01 ); // roll 1% -> every pull is SSR
check( "generateBatch length", allSsr.length, 10 );
check( "all SSR at 1%", allSsr.every( ( rarity ) => rarity === "SSR" ), true );
const allR = generateBatch( 3, 10, () => 0.5 ); // roll 50 -> every pull is R
check( "all R at 50%", allR.every( ( rarity ) => rarity === "R" ), true );
const tally = tallyBatch( generateBatch( 3, 10 ) );
check( "SSR + SR + R equals 10", tally.ssr + tally.sr + tally.r, 10 );

// Large sample: the observed SSR rate stays near the target (deterministic LCG)
let lcgState = 123456789;
function lcgRandom() {
	// MINSTD LCG keeps every intermediate under 2^53 so the sequence is exactly reproducible
	lcgState = ( lcgState * 48271 ) % 2147483647;
	return lcgState / 2147483647;
}
const trials  = 1000000;
let ssrCount  = 0;
for ( let i = 0; i < trials; i += 1 ) {
	if ( assignRarity( 3, lcgRandom() * 100 ) === "SSR" ) {
		ssrCount += 1;
	}
}
checkClose( "observed SSR % at 3% over 1M rolls", ( ssrCount / trials ) * 100, 3, 0.3 );

// normalizeWaifuImages: a real provider payload maps onto ImageRecord
const payload = {
	items: [
		{ id: 1, url: "https://cdn.example/1.jpg", source: "https://pixiv.example/1", artists: [ { name: "artist-a" } ], width: 900, height: 1200, isNsfw: false },
		{ id: 2, url: "https://cdn.example/2.jpg", source: null, artists: [], width: 800, height: 1000, isNsfw: false },
		{ id: 3, url: "not-a-url", source: null, artists: [], width: 800, height: 1000, isNsfw: false }
	]
};
const records = normalizeWaifuImages( payload );
check( "normalized count drops invalid url", records.length, 2 );
check( "normalized id", records[0].id, 1 );
check( "normalized artist name", records[0].artistName, "artist-a" );
check( "normalized sourceUrl null", records[1].sourceUrl, null );
check( "normalized isNsfw", records[0].isNsfw, false );
checkTrue( "malformed payload throws", ( () => {
	try {
		normalizeWaifuImages( {} );
		return false;
	} catch ( error ) {
		return true;
	}
} )() );

// dedupeById keeps first occurrences
const duped = [ { id: 1, url: "a" }, { id: 2, url: "b" }, { id: 1, url: "a" } ];
check( "dedupe length", dedupeById( duped ).length, 2 );

// padRecords fills a short unique set without touching rarity
const padded = padRecords( [ { id: 1, url: "a" }, { id: 2, url: "b" } ], 10 );
check( "pad length", padded.length, 10 );
check( "pad cycles", padded[9].id, 2 );

// providerErrorFor maps the statuses the UI needs to explain
check( "providerErrorFor( 403 )", providerErrorFor( 403 ), "forbidden" );
check( "providerErrorFor( 429 )", providerErrorFor( 429 ), "rate-limited" );
check( "providerErrorFor( 500 )", providerErrorFor( 500 ), "temporary" );
check( "providerErrorFor( 502 )", providerErrorFor( 502 ), "temporary" );
check( "providerErrorFor( 404 )", providerErrorFor( 404 ), "provider" );

if ( failures > 0 ) {
	console.error( `${ failures } check(s) failed` );
	process.exit( 1 );
}

console.log( "ALL TESTS PASSED" );
