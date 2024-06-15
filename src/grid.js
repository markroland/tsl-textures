﻿
//	TSL-Textures: Grid



import { Color } from "three";
import { abs, add, div, equirectUV, min, mix, mul, oneMinus, positionLocal, pow, remapClamp, round, sin, smoothstep, sub, tslFn } from 'three/nodes';



var grid = tslFn( ( params ) => {

	var uv = equirectUV( positionLocal.normalize() ).toVar(),
		a = mul( uv.x, 2*Math.PI ),
		b = mul( uv.y, Math.PI ).toVar();

	var uTo = div( round( mul( uv.x, params.countU ) ), params.countU ),
		vTo = div( round( mul( uv.y, params.countV ) ), params.countV ),
		aTo = mul( uTo, 2*Math.PI ),
		bTo = mul( vTo, Math.PI );

	var angleU = abs( sub( a, aTo ) ).mul( sin( b ) ),
		angleV = abs( sub( b, bTo ) ),
		angle = min( angleU, angleV );

	var treshold = mul( min( div( 2*Math.PI, params.countU ), div( Math.PI, params.countV ) ), remapClamp( pow( params.thinness, 0.5 ), 0, 1, 0.9, 0.04 ), 0.5 );
	var k = oneMinus( smoothstep( sub( treshold, 0.002 ), add( treshold, 0.002 ), angle ) );

	return mix( params.background, params.color, k );

} );



grid.defaults = {
	$name: 'Grid',

	countU: 32,
	countV: 16,

	thinness: 0.8,

	color: new Color( 0x000000 ),
	background: new Color( 0xFFFFFF ),
};



export { grid };
