import * as THREE from 'three'
import { AmbientLight, Color, DoubleSide, ExtrudeGeometry, Group, LineBasicMaterial, LineSegments, Matrix4, Mesh, MeshBasicMaterial, MeshPhongMaterial, PerspectiveCamera, PointLight, Scene, Shape, SphereGeometry, Vector2, Vector3, WebGLRenderer, WireframeGeometry } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls';
import { FlyControls } from 'three/examples/jsm/controls/FlyControls';
import { DragControls } from 'three/examples/jsm/controls/DragControls';
import Stats from 'stats.js';
import rStats from './rstats';
import './rstats.extra';

// JSON TEST
import dataGeometry from '../test/geometrys.json';
import dataGeometryMan from '../test/geometrysManzanas.json';
import predios from '../test/predios.json';
import { BrowserStats, glStats } from './rstats.extra';


let camera, scene, renderer, groupS, target, controls;
let cameraPosition;
const stats = new Stats();
var rS = new rStats();
const rotationMatrix = new THREE.Matrix4();
const targetQuaternion = new THREE.Quaternion();

init();
animate();

var bS,glS,tS;

function init() {
	// Camara
	camera = new PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.005, 1000 );
	camera.position.z = 1;
	camera.position.y = 5;

	cameraPerspectiveHelper = new THREE.CameraHelper( camera );
	

	// Escena
	scene = new Scene();
	scene.background = new Color(0xcccccc);
	scene.add(new AmbientLight(0x444));


	const targetGeometryCentroide = new THREE.SphereGeometry(0.01);
	const targetMaterialCentroide = new THREE.MeshBasicMaterial({ color: 0x006420 });
	let targetCentroide = new THREE.Mesh(targetGeometryCentroide, targetMaterialCentroide);
	let res = getCenterPoint(targetCentroide);
	scene.add(targetCentroide);


	groupS = new Group();
	dataGeometry.forEach((item, idx)=> {
		
		let groupG = new THREE.Object3D();
		let geomData = [];
		let vertices = JSON.parse(item.vertices);
		let holes = item.hasOwnProperty('huecos') ? JSON.parse(item.huecos) : [];
		let position = JSON.parse(item.position);

		
		if(vertices.length > 0) {
			vertices.forEach((vertex, i) => {
				let v2 = new Vector2(vertex[0], vertex[1]);
				geomData.push(v2);
			});
		}

		if(idx == 0) {
			console.log(geomData);
		};

		// const length = 12, width = 8;
		let shape = new Shape(geomData);

		const extrudeSettings = {
			steps: 1,
			depth: 0.01,
			bevelEnabled: false,
			bevelThickness: 1,
			bevelSize: 1,
			bevelOffset: 1,
			bevelSegments: 1
		};

		// let geometry = new THREE.BufferGeometry(geomData);

        let geometry = new ExtrudeGeometry(shape, extrudeSettings);
        geometry
			.rotateY(3.14159)
			.rotateX(1.5708)
			.rotateZ(0)
			.translate(position[0] * -1, 0, position[1]);

		
		// let bufferGeo = new THREE.BufferGeometry().setFromPoints(geometry);
		// let displacement = new Float32Array(bufferGeo.attributes.position.count);

		// console.log(displacement);
			
		let material = new MeshBasicMaterial( { color: 0x072944 } );
		// let material = new MeshPhongMaterial( { side: DoubleSide, color: 0x310C0C, combine: false,  emissive: 0x0C051C, flatShading: false} );
		let mesh = new Mesh(geometry, material);

		if(idx == 0) {
			cameraPosition = getCenterPoint(mesh)
		};

		const edges = new THREE.EdgesGeometry( geometry );
		const line = new THREE.LineSegments( edges, new THREE.LineBasicMaterial( { color: 0xffffff, fog: true } ) );
		
		groupG.add(line);
		groupG.add(mesh);

		groupS.add(groupG);
	});
	

	const targetGeometry = new THREE.SphereGeometry(0.2);
	const targetMaterial = new THREE.MeshBasicMaterial({
	  color: 0xff0000
	});
	
	target = new THREE.Mesh(targetGeometry, targetMaterial);
	generateTarget();
  	scene.add(target);

	let grid = new THREE.GridHelper(50, 50, 0x808080, 0x808080); // xy-grid
		grid.geometry.rotateX(Math.PI * 5);
		scene.add(grid);

	scene.add(groupS);

	// Lights
	const lights = [];
	lights[ 0 ] = new PointLight( 0xffffff, 0.8, 0);
	lights[ 1 ] = new PointLight( 0xffffff, 1, 0 );
	lights[ 2 ] = new PointLight( 0xffffff, 1, 0 );

	lights[ 0 ].position.set( 0, 200, 0 );
	lights[ 1 ].position.set( 100, 200, 100 );
	lights[ 2 ].position.set( - 100, - 200, - 100 );

	scene.add( lights[ 0 ] );
	scene.add( lights[ 2 ] );	

	// Renderizado
	renderer = new WebGLRenderer({antialias: true});
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	document.body.appendChild(renderer.domElement);

	bS = new BrowserStats();
    glS = new glStats();
    tS = new threeStats( renderer );

    rS = new rStats( {
        userTimingAPI: true,
        values: {
            frame: { caption: 'Total frame time (ms)', over: 16, average: true, avgMs: 100 },
            fps: { caption: 'Framerate (FPS)', below: 30 },
            calls: { caption: 'Calls (three.js)', over: 3000 },
            raf: { caption: 'Time since last rAF (ms)', average: true, avgMs: 100 },
            rstats: { caption: 'rStats update (ms)', average: true, avgMs: 100 },
            texture: { caption: 'GenTex', average: true, avgMs: 100 }
        },
        groups: [
            { caption: 'Framerate', values: [ 'fps', 'raf' ] },
            { caption: 'Frame Budget', values: [ 'frame', 'texture', 'setup', 'render' ] }
        ],
        fractions: [
            { base: 'frame', steps: [ 'texture', 'setup', 'render' ] }
        ],
        plugins: [
            bS,
            tS,
            glS
        ]
    } );

	// Controles de camara
	// camera.position.set(cameraPosition[0], 0.6, cameraPosition[1])
	// camera.position.x = cameraPosition[0] + -1
	// camera.position.z = cameraPosition[1] + -1

	// controls = new TrackballControls( camera, renderer.domElement );
	controls = new OrbitControls( camera, renderer.domElement );
	// controls.target.set(cameraPosition.x * -1,
	// 	0,
	// 	cameraPosition.z * -1
	// );
	// controls.update()
	// controls = new DragControls( groupS, camera, renderer.domElement )
	// controls = new FlyControls( camera, renderer.domElement );
	// controls.movementSpeed = 0.05;
	// controls.rollSpeed = 0.01;
	// controls.autoForward = false;
	// controls.dragToLook = true;
	// controls.lookVertical = true;
	// controls.lookAt(cameraPosition[0], 5, cameraPosition[1] );

}

function getCenterPoint(mesh) {
    var geometry = mesh.geometry;
    geometry.computeBoundingBox();
    var center = new THREE.Vector3();
    geometry.boundingBox.getCenter( center );
    mesh.localToWorld( center );
    return center;
}

function animate() {
	requestAnimationFrame(animate);

	rS( 'frame' ).start();
    glS.start();

    rS( 'rAF' ).tick();
    rS( 'FPS' ).frame();

    rS( 'texture' ).start();
    // var m = 10;// + 3000 * Math.sin( .001 * Date.now() );
    // for( var j = 0; j < m; j++ ) {
    //     ctx.fillStyle = '#'+Math.floor(Math.random()*16777215).toString(16);
    //     var x = Math.random() * scene.width,
    //         y = Math.random() * scene.height,
    //         w = Math.random() * scene.width,
    //         h = Math.random() * scene.height;
    //     ctx.fillRect( x, y, w, h );
    // }
    // mat.map.needsUpdate = true;
    rS( 'texture' ).end();

    rS( 'setup' ).start();

    // if( nfov < 1 ) nfov = 1;
    // if( nfov > 150 ) nfov = 150;

    // lon += ( nlon - lon ) * .2;
    // lat += ( nlat - lat ) * .2;
    // fov += ( nfov - fov ) * .2;

    // camera.projectionMatrix.makePerspective( fov, window.innerWidth / window.innerHeight, camera.near, camera.far );

    // lat = Math.max( - 85, Math.min( 85, lat ) );
    // phi = ( 90 - lat ) * Math.PI / 180;
    // theta = lon * Math.PI / 180;

    // camera.position.x = 100 * Math.sin( phi ) * Math.cos( theta );
    // camera.position.y = 100 * Math.cos( phi );
    // camera.position.z = 100 * Math.sin( phi ) * Math.sin( theta );

    // camera.lookAt( scene.position );

    rS( 'setup' ).end();

    rS( 'render' ).start();
    // renderer.render( scene, camera );
    rS( 'render' ).end();

    rS( 'frame' ).end();

    /*rS( 'memory.limit' ).set( performance.memory.jsHeapSizeLimit );
    rS( 'memory.used' ).set( performance.memory.usedJSHeapSize );
    rS( 'memory.total' ).set( performance.memory.totalJSHeapSize );*/

    rS( 'rStats' ).start();
    rS().update();
    rS( 'rStats' ).end();

	stats.begin();
	stats.end();
	if (groupS !== undefined && !groupS.quaternion.equals(targetQuaternion)) {
		const step = 2;
		groupS.quaternion.rotateTowards(targetQuaternion, step);
	}

	// controls.update(1)
	
	renderer.render(scene, camera);
}

// console.log(groupS);
// console.log(cameraPosition);
// console.log(camera);

function generateTarget() {  
	target.position.x = 0;
	target.position.z = -5;
  
	if (groupS !== undefined) {
	  rotationMatrix.lookAt(target.position, groupS.position, groupS.up);
	  targetQuaternion.setFromRotationMatrix(rotationMatrix);
	}  
}