'use strict';

var three = require('three');
var tsl = require('three/tsl');

//import { mx_perlin_noise_float as noise } from 'https://cdn.jsdelivr.net/npm/three@0.167.0/src/nodes/materialx/lib/mx_noise.js';


// helper function - convert hsl to rgb, ported to TSL from:
// https://en.wikipedia.org/wiki/HSL_and_HSV#HSL_to_RGB_alternative

const hslHelper = tsl.Fn( ([ h, s, l, n ])=>{

	var k = n.add( h.mul( 12 ) ).mod( 12 );
	var a = s.mul( tsl.min( l, tsl.sub( 1, l ) ) );
	return l.sub( a.mul( tsl.max( -1, tsl.min( tsl.min( k.sub( 3 ), tsl.sub( 9, k ) ), 1 ) ) ) );

} );

hslHelper.setLayout( {
	name: 'hslHelper',
	type: 'float',
	inputs: [
		{ name: 'h', type: 'float' },
		{ name: 's', type: 'float' },
		{ name: 'l', type: 'float' },
		{ name: 'n', type: 'float' },
	]
} );



// convert from hsl to rgb
const hsl = tsl.Fn( ([ h, s, l ]) => {

	h = h.fract().add( 1 ).fract();
	s = s.clamp( 0, 1 );
	l = l.clamp( 0, 1 );

	var r = hslHelper( h, s, l, 0 );
	var g = hslHelper( h, s, l, 8 );
	var b = hslHelper( h, s, l, 4 );

	return tsl.vec3( r, g, b );

} );

hsl.setLayout( {
	name: 'hsl',
	type: 'vec3',
	inputs: [
		{ name: 'h', type: 'float' },
		{ name: 's', type: 'float' },
		{ name: 'l', type: 'float' },
	]
} );


// convert from rgb to hsl
tsl.Fn( ([ rgb ]) => {

	var R = tsl.float( rgb.x ).toVar(),
		G = tsl.float( rgb.y ).toVar(),
		B = tsl.float( rgb.z ).toVar();

	var mx = tsl.max( R, tsl.max( G, B ) ).toVar();
	var mn = tsl.min( R, tsl.min( G, B ) ).toVar();

	var H = tsl.float( 0 ).toVar(),
		S = tsl.float( 0 ).toVar(),
		L = tsl.add( mx, mn ).div( 2 );

	tsl.If( mn.notEqual( mx ), ()=>{

		const delta = tsl.sub( mx, mn ).toVar();

		S.assign( tsl.select( L.lessThanEqual( 0.5 ), delta.div( tsl.add( mn, mx ) ), delta.div( tsl.sub( 2, tsl.add( mn, mx ) ) ) ) );
		tsl.If( mx.equal( R ), ()=>{

			H.assign( tsl.sub( G, B ).div( delta ).add( tsl.select( G.lessThanEqual( B ), 6, 0 ) ) );

		} )
			.ElseIf( mx.equal( G ), ()=>{

				H.assign( tsl.sub( B, R ).div( delta ).add( 2 ) );

			} )
			.Else( ()=>{

				H.assign( tsl.sub( R, G ).div( delta ).add( 4 ) );

			} );
		H.divAssign( 6 );

	} );
	return tsl.vec3( H, S, L );

} );



// convert phi-theta angles to position on unit sphere
const spherical = tsl.Fn( ([ phi, theta ]) => {

	return tsl.vec3(
		tsl.sin( theta ).mul( tsl.sin( phi ) ),
		tsl.cos( phi ),
		tsl.cos( theta ).mul( tsl.sin( phi ) )
	);

} );

spherical.setLayout( {
	name: 'spherical',
	type: 'vec3',
	inputs: [
		{ name: 'phi', type: 'float' },
		{ name: 'theta', type: 'float' },
	]
} );



// apply Euler rotation to a vector
tsl.Fn( ([ vec, eu ]) => {

	var quat = quaternionFromEuler( eu );
	return applyQuaternion( vec, quat );

} );


// convert Euler XYZ angles to quaternion
const quaternionFromEuler = tsl.Fn( ([ eu ]) => {

	var c1 = tsl.cos( eu.x.div( 2 ) );
	var c2 = tsl.cos( eu.y.div( 2 ) );
	var c3 = tsl.cos( eu.z.div( 2 ) );

	var s1 = tsl.sin( eu.x.div( 2 ) );
	var s2 = tsl.sin( eu.y.div( 2 ) );
	var s3 = tsl.sin( eu.z.div( 2 ) );

	return tsl.vec4(
		tsl.add( tsl.mul( s1, c2, c3 ), tsl.mul( c1, s2, s3 ) ),
		tsl.sub( tsl.mul( c1, s2, c3 ), tsl.mul( s1, c2, s3 ) ),
		tsl.add( tsl.mul( c1, c2, s3 ), tsl.mul( s1, s2, c3 ) ),
		tsl.sub( tsl.mul( c1, c2, c3 ), tsl.mul( s1, s2, s3 ) ),
	);

} );


// apply quaternion rotation to a vector
const applyQuaternion = tsl.Fn( ([ vec, quat ]) => {

	var t = tsl.cross( quat, vec ).mul( 2 ).toVar( );

	return tsl.add( vec, t.mul( quat.w ), tsl.cross( quat.xyz, t ) );

} );



// exponential version of remap
tsl.Fn( ([ x, fromMin, fromMax, toMin, toMax ]) => {

	x = tsl.remap( x, fromMin, fromMax, 0, 1 );
	x = tsl.pow( 2, tsl.mul( x, tsl.log2( toMax.div( toMin ) ) ).add( tsl.log2( toMin ) ) );
	return x;
	/*

function mapExp( x, toMin, toMax, fromMin=0, fromMax=100 ) {

	x = map( x, 0, 1, fromMin, fromMax );
	x = 2**( x * Math.log2( toMax/toMin ) + Math.log2( toMin ) );

	return x;

}
*/

} );



// simple vector noise, vec3->float[-1,1]
tsl.Fn( ([ v ])=>{

	return v.dot( tsl.vec3( 12.9898, 78.233, -97.5123 ) ).sin().mul( 43758.5453 ).fract().mul( 2 ).sub( 1 );

} );



// generate X-rotation matrix
const matRotX = tsl.Fn( ([ angle ])=>{

	var	cos = angle.cos().toVar(),
		sin = angle.sin().toVar();

	return tsl.mat4(
		1, 0, 0, 0,
		0, cos, sin, 0,
		0, sin.negate(), cos, 0,
		0, 0, 0, 1 );

} );



// generate Y-rotation matrix
const matRotY = tsl.Fn( ([ angle ])=>{

	var	cos = angle.cos().toVar(),
		sin = angle.sin().toVar();

	return tsl.mat4(
		cos, 0, sin.negate(), 0,
		0, 1, 0, 0,
		sin, 0, cos, 0,
		0, 0, 0, 1 );

} );



// generate Z-rotation matrix
const matRotZ = tsl.Fn( ([ angle ])=>{

	var	cos = angle.cos().toVar(),
		sin = angle.sin().toVar();

	return tsl.mat4(
		cos, sin, 0, 0,
		sin.negate(), cos, 0, 0,
		0, 0, 1, 0,
		0, 0, 0, 1 );

} );



// generate YXZ rotation matrix
tsl.Fn( ([ angles ])=>{

	var RX = matRotX( angles.x ),
		RY = matRotY( angles.y ),
		RZ = matRotZ( angles.z );

	return RY.mul( RX ).mul( RZ );

} );



// generate scaling matrix
tsl.Fn( ([ scales ])=>{

	return tsl.mat4(
		scales.x, 0, 0, 0,
		0, scales.y, 0, 0,
		0, 0, scales.z, 0,
		0, 0, 0, 1 );

} );



// generate translation matrix
tsl.Fn( ([ vector ])=>{

	return tsl.mat4(
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		vector.x, vector.y, vector.z, 1 );

} );


const selectPlanar = tsl.Fn( ([ pos, selAngles, selCenter, selWidth ])=>{

	// select zone in a plane through point selCenter,
	// rotated according to selAngles and selWidth thick
	// result is [0,1] inside plane, 0 below plane, 1 above plane

	// C is projected on segment AB
	// result is [0,1] inside AB, 0 before A, 1 after B

	/* non-optimized version
	var s = spherical(selAngles.x,selAngles.y).mul(selWidth).toVar(),
		c = pos,
		a = selCenter.sub(s.div(2)),
		b = selCenter.add(s.div(2));

	var ca = a.sub(c),
		ab = b.sub(a).toVar();

	var caab = ca.dot(s),
		abab = ab.dot(ab);

	var k = caab.div(abab).negate();
	*/

	var s = spherical( selAngles.x, selAngles.y ).mul( selWidth ).toVar();

	var k = selCenter.sub( s.div( 2 ) ).sub( pos ).dot( s ).div( s.dot( s ) ).negate();

	return tsl.smoothstep( 0, 1, k );

} );



tsl.Fn( ( params )=>{

	var zone = selectPlanar(
		tsl.positionGeometry,
		params.selectorAngles,
		params.selectorCenter,
		params.selectorWidth
	).sub( 0.5 ).mul( 2 ).abs().oneMinus().pow( 0.25 ).negate().mul(
		params.selectorShow
	);

	return tsl.vec3( 0, zone, zone );

} );



tsl.Fn( ([ pos ])=>{

	var dU = tsl.dFdx( pos ),
		dV = tsl.dFdy( pos );

	return tsl.transformNormalToView( tsl.cross( dU, dV ).normalize() );

} );



// converts all numeric, color and vector properties to nodes
function prepare( params ) {

	for ( var name of Object.keys( params ) ) {

		if ( typeof params[ name ] === 'number' )
			params[ name ] = tsl.float( params[ name ]);
		else
			if ( params[ name ] instanceof three.Color )
				params[ name ] = tsl.vec3( params[ name ].r, params[ name ].g, params[ name ].b );
			else
				if ( params[ name ] instanceof three.Vector3 )
					params[ name ] = tsl.vec3( params[ name ].x, params[ name ].y, params[ name ].z );

	}

	return params;

}

var planet = tsl.Fn( ( params )=>{

	params = prepare( { ...planet.defaults, ...params } );

	var k = tsl.float( 0 ).toVar(),
		sum = tsl.float( 0 ).toVar(),
		scale = tsl.exp( params.scale.sub( 2 ) ).toVar(),
		power = tsl.float( 2 ).toVar();

	tsl.Loop( params.iterations.add( 10 ), ()=>{

		k.addAssign( tsl.mul( power, tsl.mx_noise_float( tsl.positionGeometry.mul( scale ).add( params.seed ) ) ) );
		sum.addAssign( power );
		scale.mulAssign( 1.5 );
		power.mulAssign( 0.8 );

	} );

	k.assign( tsl.mul( k, k, 0.5 ).div( sum ) );

	var levelSea = params.levelSea.pow( 2 ).toVar();
	var levelMountain = params.levelMountain.pow( 2 ).toVar();
	var levelSand = tsl.mix( levelSea, levelMountain, params.balanceSand ).toVar();
	var levelCoast = tsl.mix( levelSea, levelSand, 0.4 ).toVar();
	var levelGrass = tsl.mix( levelSea, levelSand, 0.6 ).toVar();

	var color = tsl.vec3().toVar();

	// process water
	tsl.If( k.lessThan( levelSea ), ()=>{

		// deep-shallow
		color.assign( tsl.mix(
			params.colorDeep,
			params.colorShallow,
			tsl.remap( k, 0, levelSea, 0, 1 ).pow( tsl.exp( params.balanceWater.mul( -8 ).add( 4 ) ) )
		) );

	} )
		.ElseIf( k.lessThan( levelCoast ), ()=>{

			// shallow-sand
			color.assign( tsl.mix(
				params.colorShallow,
				params.colorBeach,
				tsl.remap( k, levelSea, levelCoast )
			) );

		} )
		.ElseIf( k.lessThan( levelGrass ), ()=>{

			// sand
			color.assign( params.colorBeach );

		} )
		.ElseIf( k.lessThan( levelSand ), ()=>{

			// shallow-sand-grass
			color.assign( tsl.mix(
				params.colorBeach,
				params.colorGrass,
				tsl.remap( k, levelGrass, levelSand )
			) );

		} )
		.ElseIf( k.lessThan( levelMountain ), ()=>{

			// grass-forest
			color.assign( tsl.mix(
				params.colorGrass,
				params.colorForest,
				tsl.remap( k, levelSand, levelMountain ).pow( 0.75 )
			) );

		} )
		.Else( ()=>{

			// forest-snow
			var levelSnow = tsl.mix( 1, levelMountain, params.balanceSnow );
			color.assign( tsl.mix(
				params.colorForest,
				params.colorSnow,
				tsl.smoothstep( tsl.mix( levelSnow, levelMountain, params.balanceSnow.pow( 0.5 ) ), levelSnow, k )
			) );

		} );

	return color;

} );



planet.defaults = {
	$name: 'Planet',

	scale: 2,

	iterations: 5,

	levelSea: 0.3,
	levelMountain: 0.7,

	balanceWater: 0.3,
	balanceSand: 0.2,
	balanceSnow: 0.8,

	colorDeep: new three.Color( 0x123a59 ).convertLinearToSRGB(), // SteelBlue
	colorShallow: new three.Color( 0x87CEEB ).convertLinearToSRGB(), // SkyBlue
	colorBeach: new three.Color( 0xFFFACD ).convertLinearToSRGB(), // LemonChiffon
	colorGrass: new three.Color( 0x3CB371 ).convertLinearToSRGB(), // MediumSeaGreen
	colorForest: new three.Color( 0x003000 ).convertLinearToSRGB(), // Dark green
	colorSnow: new three.Color( 0xF0FFFF ).convertLinearToSRGB(), // Azure

	seed: 0,
};

exports.planet = planet;
