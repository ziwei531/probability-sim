const loader = document.currentScript;
const mount = document.querySelector( "#app" );

async function loadView() {
	if ( new URLSearchParams( location.search ).has( "embed" ) ) {
		document.documentElement.dataset.embed = "1";
	}

	try {
		const response = await fetch( loader.dataset.view );
		if ( !response.ok ) {
			throw new Error( `View request failed with ${ response.status }.` );
		}
		mount.innerHTML = await response.text();
		await loadSimulatorScript();
	} catch ( error ) {
		mount.innerHTML = "<p>Unable to load the simulator. Refresh to try again.</p>";
		console.error( error );
	}
}

function loadSimulatorScript() {
	return new Promise( ( resolve, reject ) => {
		const script = document.createElement( "script" );
		script.src = loader.dataset.script;
		script.addEventListener( "load", resolve, { once: true } );
		script.addEventListener( "error", reject, { once: true } );
		document.body.appendChild( script );
	} );
}

loadView();
