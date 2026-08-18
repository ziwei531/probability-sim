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
};

const flipButton = document.querySelector( "#flip-button" );
const resultLine = document.querySelector( "#result" );
const coin       = document.querySelector( "#coin" );
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

function handleHeadsInput( event ) {
	if ( state.isMirroring ) {
		return;
	}
	const raw = event.target.valueAsNumber;
	if ( Number.isNaN( raw ) ) {
		// Mid-edit empty or partial values keep the last valid state
		return;
	}
	state.headsBp = clampBp( toBp( raw ) );
	// Out-of-range typing writes the clamp back so the visible pair always sums to 100
	if ( raw < 0 || raw > 100 ) {
		event.target.value = fromBp( state.headsBp );
	}
	setMirroredDisplay( tailsInput, mirror( state.headsBp ) );
}

function handleTailsInput( event ) {
	if ( state.isMirroring ) {
		return;
	}
	const raw = event.target.valueAsNumber;
	if ( Number.isNaN( raw ) ) {
		return;
	}
	state.headsBp = clampBp( mirror( toBp( raw ) ) );
	setMirroredDisplay( headsInput, state.headsBp );
}

function handleFlipClick() {
	if ( flipButton.disabled ) {
		return;
	}
	flipButton.disabled = true;
	const outcome = flipToss( state.headsBp );
	// Even half-turns land the same face, odd half-turns land the opposite; pick so the face matches the outcome
	const turn = outcome === state.face ? 1800 : 1620;
	state.face       = outcome;
	state.rotation  += turn;
	coin.style.transform = `rotateY(${state.rotation}deg)`;
	// Clear before set so identical consecutive outcomes still announce on screen readers
	resultLine.textContent = "";
	resultLine.textContent = outcome === "heads" ? "Heads!" : "Tails!";
	// Button stays disabled for the full 0.7s transition so flips cannot stack
	setTimeout( () => {
		flipButton.disabled = false;
	}, 700 );
}

headsInput.addEventListener( "input", handleHeadsInput );
tailsInput.addEventListener( "input", handleTailsInput );
flipButton.addEventListener( "click", handleFlipClick );

// Expose the pure functions so node can test them without a DOM
window.coinFlip = { toBp, fromBp, mirror, flipHeadsBp, flipToss };
