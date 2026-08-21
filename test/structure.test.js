const fs   = require( "fs" );
const path = require( "path" );

const rootDirectory = path.join( __dirname, ".." );
const rootHtmlFiles = fs.readdirSync( rootDirectory ).filter( ( file ) => file.endsWith( ".html" ) );
const viewHtmlFiles = fs.readdirSync( path.join( rootDirectory, "views" ) ).filter( ( file ) => file.endsWith( ".html" ) );

if ( rootHtmlFiles.length !== 1 || rootHtmlFiles[ 0 ] !== "index.html" ) {
	throw new Error( `Root HTML files must contain only index.html: ${ rootHtmlFiles.join( ", " ) }` );
}

for ( const requiredView of [ "coin-flip.html", "gacha.html" ] ) {
	if ( !viewHtmlFiles.includes( requiredView ) ) {
		throw new Error( `Missing required view: views/${ requiredView }` );
	}
}

console.log( "HTML structure is valid" );