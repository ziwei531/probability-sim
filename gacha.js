/* ==== PURE MATH (node-testable) ==== */

// Gacha odds live as percentages; the user only configures the SSR rate, and SR
// takes 20% of the leftover while R takes the rest, so the three always sum to 100

const SR_SHARE_OF_REMAINDER = 0.20;

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

function assignRarity( ssrPercent, roll ) {
	// roll is [0, 100); SSR wins below the configured rate, SR runs to 20% of the
	// remainder, and everything else falls to R
	const srPercent = ( 100 - ssrPercent ) * SR_SHARE_OF_REMAINDER;
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
	const roll  = random || Math.random;
	const batch = [];
	for ( let i = 0; i < count; i += 1 ) {
		batch.push( assignRarity( ssrPercent, roll() * 100 ) );
	}
	return batch;
}

function tallyBatch( rarities ) {
	// Counts each rarity so the summary never has to recompute from the DOM
	const tally = { ssr: 0, sr: 0, r: 0 };
	for ( const rarity of rarities ) {
		tally[ rarity.toLowerCase() ] += 1;
	}
	return tally;
}

function normalizeWaifuImages( payload ) {
	// Maps the provider payload onto the neutral ImageRecord shape so the UI never
	// depends on Waifu.im field names; records without a usable URL are dropped
	if ( !payload || !Array.isArray( payload.items ) ) {
		throw new TypeError( "malformed" );
	}
	const records = [];
	for ( const item of payload.items ) {
		if ( typeof item.url !== "string" || !/^https?:\/\//.test( item.url ) ) {
			continue;
		}
		records.push( {
			  id        : item.id
			, url       : item.url
			, sourceUrl : typeof item.source === "string" ? item.source : null
			, artistName: item.artists && item.artists[0] && typeof item.artists[0].name === "string" ? item.artists[0].name : null
			, width     : item.width
			, height    : item.height
			, isNsfw    : Boolean( item.isNsfw )
		} );
	}
	return records;
}

function dedupeById( records ) {
	// First occurrence wins so a ten-pull stays visually varied
	const seen   = new Set();
	const unique = [];
	for ( const record of records ) {
		if ( !seen.has( record.id ) ) {
			seen.add( record.id );
			unique.push( record );
		}
	}
	return unique;
}

function padRecords( records, amount ) {
	// Reuses artwork when the provider cannot return enough unique images; rarity is
	// assigned before images exist, so padding never changes an outcome
	const padded = [];
	for ( let i = 0; i < amount; i += 1 ) {
		padded.push( records[ i % records.length ] );
	}
	return padded;
}

function providerErrorFor( status ) {
	// Maps HTTP failures onto stable kinds so the UI can explain each failure mode
	if ( status === 403 ) {
		return "forbidden";
	}
	if ( status === 429 ) {
		return "rate-limited";
	}
	if ( status >= 500 ) {
		return "temporary";
	}
	return "provider";
}

/* ==== DOM WIRING ==== */

const PULL_COUNT         = 10;
const FETCH_TIMEOUT_MS   = 8000;
const DUPLICATE_ATTEMPTS = 3;

const state = {
	  ssrPercent   : 3
	, isLoading    : false
	, results      : []
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

function validateInput() {
	// Invalid percentages disable pulling and explain why; nothing is silently clamped
	const parsed = parseSsrPercent( ssrInput.value );
	if ( parsed === null ) {
		pullButton.disabled  = true;
		errorLine.textContent = "Enter a percentage between 0 and 100.";
		errorLine.hidden      = false;
		return;
	}
	state.ssrPercent    = parsed;
	pullButton.disabled = state.isLoading;
	errorLine.hidden    = true;
}

function providerErrorMessage( kind ) {
	// Each failure kind gets a specific explanation so a retry is informed
	switch ( kind ) {
		case "timeout":
			return "The image request timed out. Check your connection and try again.";
		case "forbidden":
			return "The image provider rejected the request (403). Try again later.";
		case "rate-limited":
			return "The image provider rate-limited the request (429). Wait a moment and try again.";
		case "temporary":
			return "The image provider hit a temporary error (5xx). Try again.";
		case "network":
			return "Could not reach the image provider. Check your connection.";
		case "malformed":
			return "The image provider returned an unexpected response. Try again.";
		default:
			return "The image provider rejected the request. Try again.";
	}
}

async function fetchImages( amount ) {
	// Waifu.im returns random SFW artwork; the query asks for one page of `amount`
	const params = new URLSearchParams( {
		  IncludedTags: "waifu"
		, IsNsfw      : "False"
		, PageSize    : String( amount )
	} );
	const controller = new AbortController();
	const timer      = setTimeout( () => controller.abort(), FETCH_TIMEOUT_MS );
	let response;
	try {
		response = await fetch( `https://api.waifu.im/images?${params.toString()}`, { signal: controller.signal } );
	} catch ( error ) {
		clearTimeout( timer );
		if ( error.name === "AbortError" ) {
			throw new Error( "timeout" );
		}
		throw new Error( "network" );
	}
	clearTimeout( timer );
	if ( !response.ok ) {
		throw new Error( providerErrorFor( response.status ) );
	}
	let payload;
	try {
		payload = await response.json();
	} catch ( error ) {
		throw new Error( "malformed" );
	}
	try {
		return normalizeWaifuImages( payload );
	} catch ( error ) {
		throw new Error( "malformed" );
	}
}

async function fetchUniqueImages( amount ) {
	// Fetches pages and drops duplicates until the batch is full or the attempt
	// limit is reached; the caller pads if the provider cannot cover the batch
	const seen   = new Set();
	const picked = [];
	let attempts = 0;
	while ( picked.length < amount && attempts < DUPLICATE_ATTEMPTS ) {
		attempts += 1;
		const batch = await fetchImages( amount );
		for ( const record of dedupeById( batch ) ) {
			if ( !seen.has( record.id ) ) {
				seen.add( record.id );
				picked.push( record );
			}
		}
	}
	return picked;
}

function renderResults( results ) {
	// Each card pairs artwork with its pre-assigned rarity; alt text names both
	const fragment = document.createDocumentFragment();
	for ( const result of results ) {
		const li     = document.createElement( "li" );
		li.className = `card card-${result.rarity.toLowerCase()}`;
		const media  = document.createElement( "div" );
		media.className = "card-media";
		const img    = document.createElement( "img" );
		img.src      = result.image.url;
		img.alt      = `Random anime character artwork, ${result.rarity} rarity, pull ${result.pullNumber}`;
		img.loading  = "lazy";
		img.addEventListener( "error", () => {
			// A broken artwork URL swaps to a labelled placeholder instead of an empty box
			const fallback     = document.createElement( "span" );
			fallback.className  = "card-fallback";
			fallback.textContent = "Image unavailable";
			media.replaceChildren( fallback );
		}, { once: true } );
		media.appendChild( img );
		const info  = document.createElement( "div" );
		info.className = "card-info";
		const badge = document.createElement( "span" );
		badge.className  = "rarity-badge";
		badge.textContent = result.rarity;
		const pull  = document.createElement( "span" );
		pull.className   = "pull-number";
		pull.textContent = `Pull #${result.pullNumber}`;
		info.append( badge, pull );
		li.append( media, info );
		if ( result.image.sourceUrl ) {
			const link    = document.createElement( "a" );
			link.className  = "card-source";
			link.href       = result.image.sourceUrl;
			link.target     = "_blank";
			link.rel        = "noopener noreferrer";
			link.textContent = result.image.artistName ? `Artist: ${result.image.artistName}` : "View source";
			li.appendChild( link );
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

function finishWithError( message ) {
	// A failed image fetch discards the rarity batch so stale cards never linger;
	// the next click starts a fresh batch (documented: retrying re-rolls everything)
	state.isLoading = false;
	state.results   = [];
	resultsList.replaceChildren();
	batchStatsLine.textContent   = "";
	sessionStatsLine.textContent = "";
	statusLine.textContent = message;
	statusLine.hidden      = false;
	pullButton.disabled  = parseSsrPercent( ssrInput.value ) === null;
	clearButton.disabled = false;
}

async function runPull() {
	// Guard first so the button cannot start a second batch while one is in flight
	if ( state.isLoading ) {
		return;
	}
	const ssrPercent = parseSsrPercent( ssrInput.value );
	if ( ssrPercent === null ) {
		validateInput();
		return;
	}
	state.isLoading  = true;
	state.results    = [];
	resultsList.replaceChildren();
	batchStatsLine.textContent   = "";
	sessionStatsLine.textContent = "";
	pullButton.disabled  = true;
	clearButton.disabled = true;
	statusLine.textContent = "Pulling 10×…";
	statusLine.hidden      = false;
	// Rarity never depends on artwork: rolls happen first, then images pair onto them
	const rarities = generateBatch( ssrPercent, PULL_COUNT );
	let images;
	try {
		images = await fetchUniqueImages( PULL_COUNT );
	} catch ( error ) {
		finishWithError( providerErrorMessage( error.message ) );
		return;
	}
	if ( images.length === 0 ) {
		// Without any artwork the batch cannot render, so no fake cards are shown
		finishWithError( "The image provider returned no usable artwork. Try again." );
		return;
	}
	const records = padRecords( images, PULL_COUNT );
	const results = rarities.map( ( rarity, index ) => ( {
		  pullNumber : index + 1
		, rarity     : rarity
		, image      : records[ index ]
	} ) );
	const tally  = tallyBatch( rarities );
	state.results = results;
	state.sessionPulls += PULL_COUNT;
	state.sessionSsr   += tally.ssr;
	renderResults( results );
	renderSummary( tally, ssrPercent );
	state.isLoading  = false;
	pullButton.disabled  = false;
	clearButton.disabled = false;
	statusLine.textContent = `Done — ${tally.ssr} SSR, ${tally.sr} SR, ${tally.r} R.`;
}

function clearResults() {
	// Clears displayed results without touching the configured percentage or session stats
	state.results = [];
	resultsList.replaceChildren();
	batchStatsLine.textContent   = "";
	sessionStatsLine.textContent = "";
	statusLine.hidden = true;
}

ssrInput.addEventListener( "input", validateInput );
pullButton.addEventListener( "click", runPull );
clearButton.addEventListener( "click", clearResults );
validateInput();

// Expose the pure functions so node can test them without a DOM
window.gachaSim = { parseSsrPercent, assignRarity, generateBatch, tallyBatch, normalizeWaifuImages, dedupeById, padRecords, providerErrorFor };
