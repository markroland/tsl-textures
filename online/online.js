﻿
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import * as lil from "three/addons/libs/lil-gui.module.min.js";
import WebGPURenderer from 'three/addons/renderers/webgpu/WebGPURenderer.js';
import { MeshPhysicalNodeMaterial } from 'three/nodes';
import { dynamic } from 'tsl-textures/tsl-utils.js';



const HOME_URL = '../';


var params = {},
	dynamics = {};



// setting up the scene

var renderer = new WebGPURenderer( { antialias: true } );
renderer.setSize( innerWidth, innerHeight );
renderer.setAnimationLoop( animationLoop );
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
document.body.appendChild( renderer.domElement );

var scene = new THREE.Scene();
scene.background = new THREE.Color( 'white' );

var camera = new THREE.PerspectiveCamera( 5, innerWidth/innerHeight );
camera.position.set( 0, 0, 30 );
camera.lookAt( scene.position );

var light = new THREE.DirectionalLight( 'white', 1.5 );
light.decay = 0;
scene.add( light );

scene.add( new THREE.AmbientLight( 'white', 2 ) );

var controls = new OrbitControls( camera, renderer.domElement );
controls.enableDamping = true;

var model = new THREE.Mesh(
	new THREE.IcosahedronGeometry( 1, 20 ),
	new MeshPhysicalNodeMaterial( )
);
scene.add( model );


// manage window resizes

window.addEventListener( "resize", onResize );

function onResize( /*event*/ ) {

	camera.aspect = innerWidth/innerHeight;

	camera.updateProjectionMatrix( );

	renderer.setSize( innerWidth, innerHeight );

}

onResize( );







function animationLoop( /*t*/ ) {

	controls.update( );
	light.position.copy( camera.position );
	renderer.render( scene, camera );

}



function install( tslTexture, onChange ) {

	// process URL options
	var urlAddress = window.location.search.split( '#' )[ 0 ], // skip all after #
		urlParameters = new URLSearchParams( urlAddress ),
		url = {};

	for ( var [ key, value ] of urlParameters.entries() ) {

		if ( value == 'true' )
			url[ key ] = true;
		else
			if ( value == 'false' )
				url[ key ] = false;
			else
				url[ key ] = parseFloat( value );

	}

	for ( const [ key, value ] of Object.entries( tslTexture.defaults ) )
		if ( key[ 0 ]!='$' ) {

			if ( value.isColor )
				params[ key ] = new THREE.Color( url[ key ] ?? value );
			else
				params[ key ] = url[ key ] ?? value;

		}


	var name = tslTexture.defaults.$name;
	var filename = name.split( ' ' ).join( '-' ).toLowerCase();

	var funcname = name.split( ' ' );
	for ( var i=0; i<funcname.length; i++ ) {

		funcname[ i ] = funcname[ i ].toLowerCase();
		if ( i > 0 ) funcname[ i ] = funcname[ i ][ 0 ].toUpperCase() + funcname[ i ].slice( 1 );

	}

	funcname = funcname.join( '' );

	var title = `<big><em>${tslTexture.defaults.$name}</em> texture</big>
			<small class="fullline">
				<span id="home" class="link">HOME</span> &middot; 
				<span id="url" class="link">LINK</span> &middot; 
				<span id="code" class="link">CODE</span> &middot; 
				<span id="info" class="link">INFO</span>`;

	if ( isFinite( tslTexture.defaults.seed ) ) {

		title += ` &middot; 
				<span id="refresh" class="link">AGAIN</span>`;

	}

	title += `</small>`;

	var gui = new lil.GUI( { title: title } );
	gui.$title.style.marginBottom = "2em";
	gui.onChange( onChange );

	document.getElementById( 'home' ).addEventListener( 'click', goHome );
	document.getElementById( 'info' ).addEventListener( 'click', ( event )=>{

		goToWebPage( event, filename );

	} );
	document.getElementById( 'url' ).addEventListener( 'click', ( event )=>{

		shareURL( event, name );

	} );
	document.getElementById( 'code' ).addEventListener( 'click', ( event )=>{

		getCode( event, funcname, filename );

	} );
	document.getElementById( 'refresh' )?.addEventListener( 'click', refreshSeed );

	onResize( );

	dynamics = dynamic( params );
	model.material.colorNode = tslTexture( dynamics );
	onChange( ); // causes recalculation of dynamics

	return gui.addFolder( '<big>Options</big>' );

}



function shareURL( event, name ) {

	event.stopPropagation();

	var url = [];

	for ( const [ key, value ] of Object.entries( params ) )
		if ( value instanceof THREE.Color )
			url.push( `${key}=${value.getHex()}` );
		else
			url.push( `${key}=${value}` );

	url = url.join( '&' );

	url = window.location.href.split( '?' )[ 0 ].split( '#' )[ 0 ] + '?' + url;

	navigator.clipboard.writeText( url );

	alert( `URL for this ${name} copied to the clipboard.` );

}



function getCode( event, name, filename ) {

	event.stopPropagation();

	var js = [];

	for ( const [ key, value ] of Object.entries( params ) )
		if ( value instanceof THREE.Color )
			js.push( `${key}: new THREE.Color(${value.getHex()})` );
		else
			js.push( `${key}: ${value}` );

	js = js.join( `,\n	` );

	js = `
<script type="importmap">
	{
		"imports": {
			"three": "https://cdn.jsdelivr.net/npm/three@0.164.0/build/three.module.js",
			"three/nodes": "https://cdn.jsdelivr.net/npm/three@0.164.0/examples/jsm/nodes/Nodes.js",
			"tsl-textures/": "../src/"
		}
	}
</script>

import { ${name} } from "tsl-textures/${filename}.js";

model.material.colorNode = ${name} ( {
	${js}
} );
`;

	navigator.clipboard.writeText( js );

	alert( `Javascript code fragment for this ${name} copied to the clipboard.` );

}


function goHome( event ) {

	event.stopPropagation();
	window.location.assign( HOME_URL );

}


function goToWebPage( event, filename ) {

	event.stopPropagation();
	window.location.assign( `../docs/${filename}.html` );

}


function refreshSeed( event ) {

	event.stopPropagation();
	if ( typeof dynamics.seed != 'undefined' ) {

		params.seed = Math.floor( 10000*Math.random() );
		dynamics.seed.value = params.seed;

	}

}



export { model, install, params, light, dynamics };
