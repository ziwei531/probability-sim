const loader = document.currentScript;
const mount = document.querySelector( "#app" );
const requestedView = new URLSearchParams( location.search ).get( "view" );
const initialView = requestedView === "gacha" ? "views/gacha.html" : loader.dataset.view;
const initialScript = requestedView === "gacha" ? "js/gacha.js" : loader.dataset.script;
const reloadToken  = Date.now().toString( 36 );
let scriptSequence = 0;

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

function updateNavigation( viewUrl ) {
	for ( const link of mount.querySelectorAll( ".nav-link" ) ) {
		const isActive = link.dataset.view === viewUrl;
		link.classList.toggle( "active", isActive );
		if ( isActive ) {
			link.setAttribute( "aria-current", "page" );
		} else {
			link.removeAttribute( "aria-current" );
		}
	}
}

function loadSimulatorScript( rawUrl ) {
	return new Promise( ( resolve, reject ) => {
		const script = document.createElement( "script" );
		script.type = "module";
		const scriptUrl = freshUrl( rawUrl );
		scriptUrl.searchParams.set( "module", String( ++scriptSequence ) );
		script.src = scriptUrl;
		script.addEventListener( "load", resolve, { once: true } );
		script.addEventListener( "error", reject, { once: true } );
		document.body.appendChild( script );
	} );
}

async function loadView( viewUrl, scriptUrl, shouldPushHistory = false ) {
	mount.setAttribute( "aria-busy", "true" );
	try {
		const response = await fetch( freshUrl( viewUrl ), { cache: "no-store" } );
		if ( !response.ok ) {
			throw new Error( `View request failed with ${ response.status }.` );
		}
		mount.innerHTML = await response.text();
		refreshImageUrls();
		updateNavigation( viewUrl );
		await loadSimulatorScript( scriptUrl );
		if ( shouldPushHistory ) {
			const historyUrl = scriptUrl.includes( "gacha" ) ? "index.html?view=gacha" : "index.html";
			history.pushState( { viewUrl, scriptUrl }, "", historyUrl );
		}
	} catch ( error ) {
		mount.innerHTML = "<p>Unable to load the simulator. Refresh to try again.</p>";
		console.error( error );
	} finally {
		mount.removeAttribute( "aria-busy" );
	}
}

mount.addEventListener( "click", ( event ) => {
	const link = event.target.closest( ".nav-link" );
	if ( !link ) {
		return;
	}
	event.preventDefault();
	loadView( link.dataset.view, link.dataset.script, true );
} );

window.addEventListener( "popstate", () => {
	const isGacha = new URLSearchParams( location.search ).get( "view" ) === "gacha";
	loadView( isGacha ? "views/gacha.html" : "views/coin-flip.html", isGacha ? "js/gacha.js" : "js/script.js" );
} );

if ( new URLSearchParams( location.search ).has( "embed" ) ) {
	document.documentElement.dataset.embed = "1";
}

refreshStylesheetUrls();
loadView( initialView, initialScript );
