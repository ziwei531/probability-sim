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

function rarityPercentages( ssrPercent, urPercent = 0 ) {
	const srPercent = ( 100 - ssrPercent ) * srShareOfRemainder;
	return {
		  ur      : urPercent
		, ssr     : ssrPercent
		, ssrOther: ssrPercent - urPercent
		, sr      : srPercent
		, r       : 100 - ssrPercent - srPercent
	};
}

function chanceAtLeastOneSsr( ssrPercent, count ) {
	const missChance = 1 - ( ssrPercent / 100 );
	return ( 1 - ( missChance ** count ) ) * 100;
}

function chanceAtLeastOneUr( urPercent, count ) {
	return chanceAtLeastOneSsr( urPercent, count );
}

function didProbabilityChange( previousPercent, nextPercent ) {
	return previousPercent !== nextPercent;
}

function assignRarity( ssrPercent, roll, urPercent = 0 ) {
	// UR is a tagged slice inside the configured SSR band, never an extra rate
	const { sr: srPercent } = rarityPercentages( ssrPercent, urPercent );
	if ( roll < urPercent ) {
		return "UR";
	}
	if ( roll < ssrPercent ) {
		return "SSR";
	}
	if ( roll < ssrPercent + srPercent ) {
		return "SR";
	}
	return "R";
}

function generateBatch( ssrPercent, count, random, urPercent = 0 ) {
	// Every pull gets its own fresh roll; UR remains a subset of SSR
	const roll = random ?? Math.random;
	return Array.from( { length: count }, () => assignRarity( ssrPercent, roll() * 100, urPercent ) );
}

function tallyBatch( rarities ) {
	// Counts each rarity so the summary never has to recompute from the DOM
	const tally = { ur: 0, ssr: 0, sr: 0, r: 0 };
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

function expectedUrSentence( urPercent ) {
	if ( urPercent === 0 ) {
		return "With UR set to 0%, a UR never appears.";
	}
	if ( urPercent === 100 ) {
		return "Every pull is a UR.";
	}
	const pulls = Math.round( expectedPullsPerSsr( urPercent ) );
	return `With UR set to ${ urPercent }%, expect about ${ pulls } pulls per UR.`;
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

const poolPresets = {
	  normal  : { label: "Normal Recruit", ssrPercent: 4, urPercent: 0.5 }
	, urPickup : { label: "UR Pickup", ssrPercent: 4, urPercent: 1 }
};

const state = {
	  pool         : "normal"
	, ssrPercent   : poolPresets.normal.ssrPercent
	, urPercent    : poolPresets.normal.urPercent
	, sessionPulls : 0
	, sessionSsr   : 0
	, sessionUr    : 0
};

const poolSelect        = document.querySelector( "#pool-select" );
const ssrInput         = document.querySelector( "#ssr-input" );
const urInput          = document.querySelector( "#ur-input" );
const pullButton       = document.querySelector( "#pull-button" );
const clearButton      = document.querySelector( "#clear-button" );
const errorLine        = document.querySelector( "#ssr-error" );
const statusLine       = document.querySelector( "#status" );
const resultsList      = document.querySelector( "#results" );
const batchStatsLine   = document.querySelector( "#batch-stats" );
const sessionStatsLine = document.querySelector( "#session-stats" );
const expectedSsrLine   = document.querySelector( "#expected-ssr-line" );
const ssrRateLine       = document.querySelector( "#odds-ssr" );
const urRateLine        = document.querySelector( "#odds-ur" );
const srRateLine        = document.querySelector( "#odds-sr" );
const rRateLine         = document.querySelector( "#odds-r" );
const tenPullChanceLine = document.querySelector( "#ten-pull-chance" );
const tenUrChanceLine   = document.querySelector( "#ten-ur-chance" );
const resultsEmptyLine  = document.querySelector( "#results-empty" );
const summary           = document.querySelector( "#summary" );

function formatPercentage( value ) {
	return `${ Number( value.toFixed( 2 ) ) }%`;
}

function updateOddsBreakdown( ssrPercent, urPercent ) {
	const rates = rarityPercentages( ssrPercent, urPercent );
	ssrRateLine.textContent       = formatPercentage( rates.ssr );
	urRateLine.textContent        = formatPercentage( rates.ur );
	srRateLine.textContent        = formatPercentage( rates.sr );
	rRateLine.textContent         = formatPercentage( rates.r );
	tenPullChanceLine.textContent = formatPercentage( chanceAtLeastOneSsr( ssrPercent, pullCount ) );
	tenUrChanceLine.textContent  = formatPercentage( chanceAtLeastOneUr( urPercent, pullCount ) );
}

function validateInput() {
	// UR is a labelled slice of SSR; reject any configuration that exceeds SSR
	const ssrPercent = parseSsrPercent( ssrInput.value );
	const urPercent  = parseSsrPercent( urInput.value );
	if ( ssrPercent === null || urPercent === null || urPercent > ssrPercent ) {
		pullButton.disabled    = true;
		errorLine.textContent  = urPercent > ssrPercent ? "UR cannot exceed the SSR rate." : "Enter valid SSR and UR percentages.";
		errorLine.hidden       = false;
		expectedSsrLine.hidden = true;
		return;
	}
	if ( didProbabilityChange( state.ssrPercent, ssrPercent ) || didProbabilityChange( state.urPercent, urPercent ) ) {
		clearResults();
	}
	state.ssrPercent            = ssrPercent;
	state.urPercent             = urPercent;
	pullButton.disabled         = false;
	errorLine.hidden            = true;
	expectedSsrLine.textContent = `${ expectedSsrSentence( ssrPercent ) } ${ expectedUrSentence( urPercent ) }`;
	expectedSsrLine.hidden      = false;
	updateOddsBreakdown( ssrPercent, urPercent );
}

function applyPoolPreset() {
	const preset = poolPresets[ poolSelect.value ] ?? poolPresets.normal;
	state.pool = poolSelect.value;
	ssrInput.value = preset.ssrPercent;
	urInput.value  = preset.urPercent;
	clearResults();
	validateInput();
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

function renderSummary( tally, ssrPercent, urPercent ) {
	// Batch stats cover this ten-pull; session stats show the running observed rate
	batchStatsLine.textContent = `This batch — UR: ${tally.ur} · SSR: ${tally.ssr} · SR: ${tally.sr} · R: ${tally.r} · configured UR rate: ${urPercent}% / SSR rate: ${ssrPercent}%`;
	const sessionUrRate = state.sessionPulls === 0 ? 0 : ( state.sessionUr / state.sessionPulls ) * 100;
	sessionStatsLine.textContent = `Session — pulls: ${state.sessionPulls} · UR: ${state.sessionUr} · other SSR: ${state.sessionSsr} · observed UR rate: ${sessionUrRate.toFixed( 1 )}% (experimental)`;
}

function runPull() {
	// The batch is instant and fully local, so every click simply rolls a fresh ten-pull
	const ssrPercent = parseSsrPercent( ssrInput.value );
	const urPercent  = parseSsrPercent( urInput.value );
	if ( ssrPercent === null || urPercent === null || urPercent > ssrPercent ) {
		validateInput();
		return;
	}
	resultsList.replaceChildren();
	batchStatsLine.textContent   = "";
	sessionStatsLine.textContent = "";
	// Rarity never depends on artwork: rolls happen first, then the bundled image pairs on
	const rarities = generateBatch( ssrPercent, pullCount, undefined, urPercent );
	const results  = rarities.map( ( rarity ) => ( {
		  rarity : rarity
		, image  : bundledImage
	} ) );
	const tally    = tallyBatch( rarities );
	state.sessionPulls += pullCount;
	state.sessionSsr   += tally.ssr;
	state.sessionUr    += tally.ur;
	renderResults( results );
	renderSummary( tally, ssrPercent, urPercent );
	resultsEmptyLine.hidden = true;
	summary.hidden          = false;
	statusLine.textContent  = `Done — ${tally.ur} UR, ${tally.ssr} SSR, ${tally.sr} SR, ${tally.r} R.`;
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
	state.sessionUr              = 0;
}

poolSelect.addEventListener( "change", applyPoolPreset );
ssrInput.addEventListener( "input", validateInput );
urInput.addEventListener( "input", validateInput );
pullButton.addEventListener( "click", runPull );
clearButton.addEventListener( "click", clearResults );
validateInput();

// Expose the pure functions so node can test them without a DOM
window.gachaSim = {
	  parseSsrPercent
	, rarityPercentages
	, chanceAtLeastOneSsr
	, chanceAtLeastOneUr
	, didProbabilityChange
	, assignRarity
	, generateBatch
	, tallyBatch
	, expectedPullsPerSsr
	, expectedSsrSentence
	, expectedUrSentence
};
