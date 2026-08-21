// Node-only harness: evals the pure-math section of gacha.js and asserts its behaviour
// CommonJS: no package.json "type": "module", so node defaults to require
const fs   = require( "fs" );
const path = require( "path" );

const scriptPath = path.join( __dirname, "..", "js", "gacha.js" );
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

// UR is a tagged subset of SSR; boundaries stay deterministic
check( "assignRarity( 4, 0.49, 0.5 )", assignRarity( 4, 0.49, 0.5 ), "UR" );
check( "assignRarity( 4, 0.5, 0.5 )", assignRarity( 4, 0.5, 0.5 ), "SSR" );
check( "assignRarity( 4, 3.99, 0.5 )", assignRarity( 4, 3.99, 0.5 ), "SSR" );
check( "assignRarity( 4, 4, 0.5 )", assignRarity( 4, 4, 0.5 ), "SR" );
const ratesAtFourPercent = rarityPercentages( 4, 0.5 );
check( "UR never exceeds SSR", ratesAtFourPercent.ur <= ratesAtFourPercent.ssr, true );
checkClose( "UR + other SSR equals SSR", ratesAtFourPercent.ur + ratesAtFourPercent.ssrOther, ratesAtFourPercent.ssr, 1e-12 );

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
let trialIndex = 0;
while ( trialIndex < trials ) {
	if ( assignRarity( 3, lcgRandom() * 100 ) === "SSR" ) {
		ssrCount += 1;
	}
	trialIndex += 1;
}
checkClose( "observed SSR % at 3% over 1M rolls", ( ssrCount / trials ) * 100, 3, 0.3 );

// expectedPullsPerSsr: geometric mean 1 / p is exact for the no-pity model
checkClose( "expectedPullsPerSsr( 3 )", expectedPullsPerSsr( 3 ), 100 / 3, 1e-9 );
checkClose( "expectedPullsPerSsr( 3.75 )", expectedPullsPerSsr( 3.75 ), 100 / 3.75, 1e-9 );
check( "expectedPullsPerSsr( 100 )", expectedPullsPerSsr( 100 ), 1 );
check( "expectedPullsPerSsr( 0 ) is Infinity", expectedPullsPerSsr( 0 ), Infinity );

// expectedSsrSentence: wording stays testable and honest about "on average";
// the expectation rounds to the nearest whole pull for display, and the 0% /
// 100% endpoints get certainty-appropriate sentences instead of ∞ or "1 pull"
check( "expectedSsrSentence( 3 )", expectedSsrSentence( 3 ), "With SSR set to 3%, expect about 33 pulls per SSR." );
check( "expectedSsrSentence( 3.75 )", expectedSsrSentence( 3.75 ), "With SSR set to 3.75%, expect about 27 pulls per SSR." );
check( "expectedSsrSentence( 7 )", expectedSsrSentence( 7 ), "With SSR set to 7%, expect about 14 pulls per SSR." );
check( "expectedSsrSentence( 0.5 )", expectedSsrSentence( 0.5 ), "With SSR set to 0.5%, expect about 200 pulls per SSR." );
check( "expectedSsrSentence( 8 ) rounds exact half up", expectedSsrSentence( 8 ), "With SSR set to 8%, expect about 13 pulls per SSR." );
check( "expectedSsrSentence( 40 ) rounds exact half up", expectedSsrSentence( 40 ), "With SSR set to 40%, expect about 3 pulls per SSR." );
check( "expectedSsrSentence( 100 )", expectedSsrSentence( 100 ), "Every pull is an SSR." );
check( "expectedSsrSentence( 0 )", expectedSsrSentence( 0 ), "With SSR set to 0%, an SSR never appears." );

// The displayed rarity breakdown must match the assignment thresholds exactly
const ratesAtThreePercent = rarityPercentages( 3 );
checkClose( "rarityPercentages( 3 ).ssr", ratesAtThreePercent.ssr, 3, 1e-12 );
checkClose( "rarityPercentages( 3 ).sr", ratesAtThreePercent.sr, 19.4, 1e-12 );
checkClose( "rarityPercentages( 3 ).r", ratesAtThreePercent.r, 77.6, 1e-12 );
checkClose( "rarity percentages sum to 100", ratesAtThreePercent.ssr + ratesAtThreePercent.sr + ratesAtThreePercent.r, 100, 1e-12 );

// Independent binomial complement: at least one SSR in ten pulls at 3%
checkClose( "chanceAtLeastOneSsr( 3, 10 )", chanceAtLeastOneSsr( 3, 10 ), 26.257587310507174, 1e-12 );
check( "chanceAtLeastOneSsr( 0, 10 )", chanceAtLeastOneSsr( 0, 10 ), 0 );
checkClose( "chanceAtLeastOneSsr( 100, 10 )", chanceAtLeastOneSsr( 100, 10 ), 100, 1e-12 );
checkClose( "chanceAtLeastOneUr( 0.5, 10 )", chanceAtLeastOneUr( 0.5, 10 ), 4.888986953422814, 1e-12 );

// A session observed rate is only meaningful while the configured rate stays fixed
check( "didProbabilityChange( 3, 3 )", didProbabilityChange( 3, 3 ), false );
check( "didProbabilityChange( 3, 3.1 )", didProbabilityChange( 3, 3.1 ), true );

// Empirical geometric mean: first-SSR arrival over many trials must land near
// the 1 / p theory — this pins the theorem, not just the implementation formula
let arrivalSum  = 0;
const arrivalCount = 200000;
let arrivalIndex = 0;
while ( arrivalIndex < arrivalCount ) {
	let pulls = 0;
	do {
		pulls += 1;
	} while ( assignRarity( 3, lcgRandom() * 100 ) !== "SSR" );
	arrivalSum += pulls;
	arrivalIndex += 1;
}
checkClose( "mean pulls to first SSR over 200k trials", arrivalSum / arrivalCount, 100 / 3, 0.5 );

if ( failures > 0 ) {
	console.error( `${ failures } check(s) failed` );
	process.exit( 1 );
}

console.log( "ALL TESTS PASSED" );
