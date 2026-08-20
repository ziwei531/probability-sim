/* ==== PURE MATH (node-testable) ==== */

// Gacha odds live as percentages; the user only configures the SSR rate, and SR
// takes 20% of the leftover while R takes the rest, so the three always sum to 100

const srShareOfRemainder = 0.20;

function parseSsrPercent( raw ) {
	// Decimals like 2.5 and 3.75 are accepted; empty, non-numeric, negative, and
	// above-100 values return null so the caller can reject them without clamping
	if ( raw === null || raw === undefined ) {
		return null;
	}
	const trimmed = String( raw ).trim();
	if ( trimmed === "" ) {
		return null;
	}
	const value = Number( trimmed );
	if ( Number.isNaN( value ) || value < 0 || value > 100 ) {
		return null;
	}
	return value;
}

function rarityPercentages( ssrPercent ) {
	const srPercent = ( 100 - ssrPercent ) * srShareOfRemainder;
	return {
		  ssr: ssrPercent
		, sr : srPercent
		, r  : 100 - ssrPercent - srPercent
	};
}

function chanceAtLeastOneSsr( ssrPercent, count ) {
	const missChance = 1 - ( ssrPercent / 100 );
	return ( 1 - ( missChance ** count ) ) * 100;
}

function didProbabilityChange( previousPercent, nextPercent ) {
	return previousPercent !== nextPercent;
}

function assignRarity( ssrPercent, roll ) {
	// roll is [0, 100); SSR wins below the configured rate, SR runs to 20% of the
	// remainder, and everything else falls to R
	const { sr: srPercent } = rarityPercentages( ssrPercent );
	if ( roll < ssrPercent ) {
		return "SSR";
	}
	if ( roll < ssrPercent + srPercent ) {
		return "SR";
	}
	return "R";
}

function generateBatch( ssrPercent, count, random ) {
	// Every pull gets its own fresh roll; one shared roll would freeze the whole batch
	const roll = random ?? Math.random;
	return Array.from( { length: count }, () => assignRarity( ssrPercent, roll() * 100 ) );
}

function tallyBatch( rarities ) {
	// Counts each rarity so the summary never has to recompute from the DOM
	const tally = { ssr: 0, sr: 0, r: 0 };
	for ( const rarity of rarities ) {
		tally[ rarity.toLowerCase() ] += 1;
	}
	return tally;
}

function expectedPullsPerSsr( ssrPercent ) {
	// The sim has no pity, so pulls-to-first-SSR follow a geometric distribution;
	// its mean is 1 / p, and p is the configured rate as a fraction (percent / 100)
	if ( ssrPercent === 0 ) {
		return Infinity;
	}
	return 100 / ssrPercent;
}

function expectedSsrSentence( ssrPercent ) {
	// Pure wording so node can test it; a 0% rate never produces an SSR and a
	// 100% rate guarantees one, so both get honest sentences instead of "∞" or
	// a misleading "on average"; display rounds the exact expectation
	if ( ssrPercent === 0 ) {
		return "With SSR set to 0%, an SSR never appears.";
	}
	if ( ssrPercent === 100 ) {
		return "Every pull is an SSR.";
	}
	const pulls = Math.round( expectedPullsPerSsr( ssrPercent ) );
	return `With SSR set to ${ ssrPercent }%, expect about ${ pulls } pulls per SSR.`;
}

/* ==== DOM WIRING ==== */

const pullCount = 10;

// One bundled artwork serves every pull so the simulator never touches the image
// API at runtime; rarity is still assigned independently, exactly as before
const bundledImage = {
	  id        : 6881
	, url       : "assets/gacha-waifu.jpg"
	, sourceUrl : "https://www.pixiv.net/en/artworks/93407462"
	, artistName: "FALL"
	, width     : 369
	, height    : 640
	, isNsfw    : false
};

const state = {
	  ssrPercent   : 3
	, sessionPulls : 0
	, sessionSsr   : 0
};

const ssrInput         = document.querySelector( "#ssr-input" );
const pullButton       = document.querySelector( "#pull-button" );
const clearButton      = document.querySelector( "#clear-button" );
const errorLine        = document.querySelector( "#ssr-error" );
const statusLine       = document.querySelector( "#status" );
const resultsList      = document.querySelector( "#results" );
const batchStatsLine   = document.querySelector( "#batch-stats" );
const sessionStatsLine = document.querySelector( "#session-stats" );
const expectedSsrLine   = document.querySelector( "#expected-ssr-line" );
const ssrRateLine       = document.querySelector( "#odds-ssr" );
const srRateLine        = document.querySelector( "#odds-sr" );
const rRateLine         = document.querySelector( "#odds-r" );
const tenPullChanceLine = document.querySelector( "#ten-pull-chance" );
const resultsEmptyLine  = document.querySelector( "#results-empty" );
const summary           = document.querySelector( "#summary" );

function formatPercentage( value ) {
	return `${ Number( value.toFixed( 2 ) ) }%`;
}

function updateOddsBreakdown( ssrPercent ) {
	const rates = rarityPercentages( ssrPercent );
	ssrRateLine.textContent       = formatPercentage( rates.ssr );
	srRateLine.textContent        = formatPercentage( rates.sr );
	rRateLine.textContent         = formatPercentage( rates.r );
	tenPullChanceLine.textContent = formatPercentage( chanceAtLeastOneSsr( ssrPercent, pullCount ) );
}

function validateInput() {
	// Invalid percentages disable pulling and explain why; nothing is silently clamped
	const parsed = parseSsrPercent( ssrInput.value );
	if ( parsed === null ) {
		pullButton.disabled    = true;
		errorLine.textContent  = "Enter a percentage between 0 and 100.";
		errorLine.hidden       = false;
		expectedSsrLine.hidden = true;
		return;
	}
	if ( didProbabilityChange( state.ssrPercent, parsed ) ) {
		clearResults();
	}
	state.ssrPercent            = parsed;
	pullButton.disabled         = false;
	errorLine.hidden            = true;
	expectedSsrLine.textContent = expectedSsrSentence( parsed );
	expectedSsrLine.hidden      = false;
	updateOddsBreakdown( parsed );
}

function renderResults( results ) {
	// Each card is the bundled artwork plus its rarity badge; the card links to the source
	const fragment = document.createDocumentFragment();
	for ( const result of results ) {
		const li     = document.createElement( "li" );
		li.className = `card card-${result.rarity.toLowerCase()}`;
		const media  = document.createElement( "div" );
		media.className = "card-media";
		const img    = document.createElement( "img" );
		img.src      = result.image.url;
		img.alt      = `Anime character artwork, ${result.rarity} rarity`;
		img.loading  = "lazy";
		img.addEventListener( "error", () => {
			// A broken artwork URL swaps to a labelled placeholder; the badge stays
			const fallback     = document.createElement( "span" );
			fallback.className  = "card-fallback";
			fallback.textContent = "Image unavailable";
			img.replaceWith( fallback );
		}, { once: true } );
		const badge = document.createElement( "span" );
		badge.className  = "rarity-badge";
		badge.textContent = result.rarity;
		media.append( img, badge );
		if ( result.image.sourceUrl ) {
			// Cards with a source open it in a new tab; the rarity badge stays put
			const link    = document.createElement( "a" );
			link.className  = "card-link";
			link.href       = result.image.sourceUrl;
			link.target     = "_blank";
			link.rel        = "noopener noreferrer";
			link.setAttribute( "aria-label", `View artwork source (${result.rarity})` );
			link.appendChild( media );
			li.appendChild( link );
		} else {
			li.appendChild( media );
		}
		fragment.appendChild( li );
	}
	resultsList.appendChild( fragment );
}

function renderSummary( tally, ssrPercent ) {
	// Batch stats cover this ten-pull; session stats show the running observed rate
	batchStatsLine.textContent = `This batch — SSR: ${tally.ssr} · SR: ${tally.sr} · R: ${tally.r} · configured SSR rate: ${ssrPercent}%`;
	const sessionRate = state.sessionPulls === 0 ? 0 : ( state.sessionSsr / state.sessionPulls ) * 100;
	sessionStatsLine.textContent = `Session — pulls: ${state.sessionPulls} · SSR: ${state.sessionSsr} · observed SSR rate: ${sessionRate.toFixed( 1 )}% (experimental)`;
}

function runPull() {
	// The batch is instant and fully local, so every click simply rolls a fresh ten-pull
	const ssrPercent = parseSsrPercent( ssrInput.value );
	if ( ssrPercent === null ) {
		validateInput();
		return;
	}
	resultsList.replaceChildren();
	batchStatsLine.textContent   = "";
	sessionStatsLine.textContent = "";
	// Rarity never depends on artwork: rolls happen first, then the bundled image pairs on
	const rarities = generateBatch( ssrPercent, pullCount );
	const results  = rarities.map( ( rarity ) => ( {
		  rarity : rarity
		, image  : bundledImage
	} ) );
	const tally    = tallyBatch( rarities );
	state.sessionPulls += pullCount;
	state.sessionSsr   += tally.ssr;
	renderResults( results );
	renderSummary( tally, ssrPercent );
	resultsEmptyLine.hidden = true;
	summary.hidden          = false;
	statusLine.textContent  = `Done — ${tally.ssr} SSR, ${tally.sr} SR, ${tally.r} R.`;
	statusLine.hidden       = false;
}

function clearResults() {
	// Clears displayed results and resets the session tally; the percentage stays
	resultsList.replaceChildren();
	resultsEmptyLine.hidden      = false;
	summary.hidden               = true;
	batchStatsLine.textContent   = "";
	sessionStatsLine.textContent = "";
	statusLine.hidden            = true;
	state.sessionPulls           = 0;
	state.sessionSsr             = 0;
}

ssrInput.addEventListener( "input", validateInput );
pullButton.addEventListener( "click", runPull );
clearButton.addEventListener( "click", clearResults );
validateInput();

// Expose the pure functions so node can test them without a DOM
window.gachaSim = { parseSsrPercent, rarityPercentages, chanceAtLeastOneSsr, didProbabilityChange, assignRarity, generateBatch, tallyBatch, expectedPullsPerSsr, expectedSsrSentence };
