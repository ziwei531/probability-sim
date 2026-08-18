/* ==== PURE MATH (node-testable) ==== */

// Percentages live as integer basis points (1% = 100) so the pair can sum to exactly 10000

function toBp( v ) {
	// Math.round absorbs float drift like 0.29 * 100 === 28.999999999999996
	return Math.round( Number( v ) * 100 );
}

function fromBp( bp ) {
	return ( bp / 100 ).toFixed( 2 );
}

function mirror( headsBp ) {
	// Integer subtraction is exact, so the mirrored pair always sums to 10000
	return 10000 - headsBp;
}

function flipHeadsBp( headsBp ) {
	const roll = Math.floor( Math.random() * 10000 ); // uniform 0..9999
	return roll < headsBp;                            // 10000 always heads, 0 never
}

function flipToss( headsBp ) {
	return flipHeadsBp( headsBp ) ? "heads" : "tails";
}

/* ==== DOM WIRING ==== */

const state = {
	  headsBp    : 5000
	, isMirroring: false
	, face       : "heads"
	, rotation   : 0
	, headsCount : 0
	, tailsCount : 0
};

const flipButton = document.querySelector( "#flip-button" );
const resultLine = document.querySelector( "#result" );
const statsLine  = document.querySelector( "#stats" );
const coin       = document.querySelector( "#coin" );
const coinInner  = coin.querySelector( ".coin" );
const headsInput = document.querySelector( "#heads-input" );
const tailsInput = document.querySelector( "#tails-input" );

// Typed values can exceed the input constraints, so pin them to 0..10000 after parsing
function clampBp( bp ) {
	return Math.min( 10000, Math.max( 0, bp ) );
}

// Programmatic .value writes can echo back as input events, so the flag keeps the pair from fighting
function setMirroredDisplay( field, bp ) {
	state.isMirroring = true;
	field.value = fromBp( bp );
	state.isMirroring = false;
}

function updateStats() {
	statsLine.textContent = `Heads: ${state.headsCount} · Tails: ${state.tailsCount}`;
}

// A changed percentage makes old counts meaningless, so the tally starts over
function resetCountsOnBpChange( previousBp ) {
	if ( state.headsBp !== previousBp ) {
		state.headsCount = 0;
		state.tailsCount = 0;
		updateStats();
	}
}

function handleHeadsInput( event ) {
	if ( state.isMirroring ) {
		return;
	}
	const raw = event.target.valueAsNumber;
	if ( Number.isNaN( raw ) ) {
		// Mid-edit empty or partial values keep the last valid state
		return;
	}
	const previousBp = state.headsBp;
	state.headsBp = clampBp( toBp( raw ) );
	// Out-of-range typing writes the clamp back so the visible pair always sums to 100
	if ( raw < 0 || raw > 100 ) {
		event.target.value = fromBp( state.headsBp );
	}
	setMirroredDisplay( tailsInput, mirror( state.headsBp ) );
	resetCountsOnBpChange( previousBp );
}

function handleTailsInput( event ) {
	if ( state.isMirroring ) {
		return;
	}
	const raw = event.target.valueAsNumber;
	if ( Number.isNaN( raw ) ) {
		return;
	}
	const previousBp = state.headsBp;
	state.headsBp = clampBp( mirror( toBp( raw ) ) );
	if ( raw < 0 || raw > 100 ) {
		event.target.value = fromBp( mirror( state.headsBp ) );
	}
	setMirroredDisplay( headsInput, state.headsBp );
	resetCountsOnBpChange( previousBp );
}

function flipCoin() {
	if ( flipButton.disabled ) {
		return;
	}
	flipButton.disabled = true;
	const outcome  = flipToss( state.headsBp );
	const from     = state.rotation;
	// Even half-turns land the same face, odd half-turns land the opposite; pick so the face matches the outcome
	const turn     = outcome === state.face ? 1800 : 1620;
	const to       = from + turn;
	state.face     = outcome;
	state.rotation = to;
	if ( outcome === "heads" ) {
		state.headsCount += 1;
	} else {
		state.tailsCount += 1;
	}
	updateStats();
	// The toss keyframes read these angles, so the next flip spins from where the last one landed
	coin.style.setProperty( "--flip-from", `${from}deg` );
	coin.style.setProperty( "--flip-to", `${to}deg` );
	// CSS has no replay API: remove, force reflow, re-add to restart with the new angles
	coin.classList.remove( "flipping" );
	void coin.offsetWidth;
	coin.classList.add( "flipping" );
	// Clear before set so identical consecutive outcomes still announce on screen readers
	resultLine.textContent = "";
	resultLine.textContent = outcome === "heads" ? "Heads!" : "Tails!";
	// Release the lock when the toss animation actually ends, never on a fixed timer
	coin.addEventListener( "animationend", () => {
		finalizeToss( to );
	}, { once: true } );
	// Safety net in case animationend is swallowed; the guard keeps it idempotent
	setTimeout( () => {
		if ( flipButton.disabled ) {
			finalizeToss( to );
		}
	}, 1200 );
}

function finalizeToss( to ) {
	flipButton.disabled   = false;
	coin.classList.remove( "flipping" );
	coinInner.style.transform = `rotateX(${to}deg)`;
}

headsInput.addEventListener( "input", handleHeadsInput );
tailsInput.addEventListener( "input", handleTailsInput );
flipButton.addEventListener( "click", flipCoin );
coin.addEventListener( "click", flipCoin );
coin.addEventListener( "keydown", ( event ) => {
	// Enter and Space activate the coin exactly like the flip button
	if ( event.key === "Enter" || event.key === " " ) {
		event.preventDefault();
		flipCoin();
	}
} );

// Expose the pure functions so node can test them without a DOM
window.coinFlip = { toBp, fromBp, mirror, flipHeadsBp, flipToss };
