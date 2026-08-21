const loader = document.currentScript;
const mount = document.querySelector( "#app" );
const reloadToken = Date.now().toString( 36 );

function freshUrl( rawUrl ) {
	const url = new URL( rawUrl, document.baseURI );
	url.searchParams.set( "cache", reloadToken );
	return url;
}

function refreshStylesheetUrls() {
	for ( const link of document.querySelectorAll( "link[rel=stylesheet]" ) ) {
		link.href = freshUrl( link.href );
	}
}

function refreshImageUrls() {
	for ( const image of mount.querySelectorAll( "img[src]" ) ) {
		image.src = freshUrl( image.src );
	}
}

async function loadView() {
	if ( new URLSearchParams( location.search ).has( "embed" ) ) {
		document.documentElement.dataset.embed = "1";
	}

	refreshStylesheetUrls();

	try {
		const response = await fetch( freshUrl( loader.dataset.view ), { cache: "no-store" } );
		if ( !response.ok ) {
			throw new Error( `View request failed with ${ response.status }.` );
		}
		mount.innerHTML = await response.text();
		refreshImageUrls();
		await loadSimulatorScript();
	} catch ( error ) {
		mount.innerHTML = "<p>Unable to load the simulator. Refresh to try again.</p>";
		console.error( error );
	}
}

function loadSimulatorScript() {
	return new Promise( ( resolve, reject ) => {
		const script = document.createElement( "script" );
		script.src = freshUrl( loader.dataset.script );
		script.addEventListener( "load", resolve, { once: true } );
		script.addEventListener( "error", reject, { once: true } );
		document.body.appendChild( script );
	} );
}

loadView();
