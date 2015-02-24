(function(){

	var box2dUtils;		// classe utilitaire
	var world; 			// "monde" 2dbox
	var canvas;			// notre canvas
	var canvasWidth;	// largeur du canvas
	var canvasHeight;	// hauteur du canvas
	var context;		// contexte 2d
	var SCALE = 30;		// échelle
	
	// "Includes" box2dweb
	var b2Vec2 = Box2D.Common.Math.b2Vec2;
	var b2AABB = Box2D.Collision.b2AABB;
	var b2Body = Box2D.Dynamics.b2Body;
	
	// Gestion de la souris
	var mouseX = undefined; // position x de la souris
	var mouseY = undefined;	// position y de la souris
	var mouseVec; // les coordonnées de la souris sous forme de vecteur (b2Vec2)
	var isMouseDown = false; // le clic est-il enfoncé ?
	var mouseJoint = false; // la liaison de type "souris"
	var canvasPosition; // la position du canvas
	var selectedBody; // le body sélectionné
	
	// Référence de l'intervalle
	var intervalId;
	

	// Initialisation
	$(document).ready(function() {
		init();
	});

	// Lancer à l'initialisation de la page
	this.init = function() {
		
		initButton();
		
		box2dUtils = new Box2dUtils(SCALE);	// instancier la classe utilitaire

		// Récupérer la canvas, ses propriétés et le contexte 2d
		canvas = $('#gipCanvas').get(0);
		canvasWidth = parseInt(canvas.width);
		canvasHeight = parseInt(canvas.height);
		canvasPosition = $(canvas).position();
		context = canvas.getContext('2d');

		world = box2dUtils.createWorld(context); // box2DWorld
		
		// Par défaut, afficher l'exemple "Mouse Joint"
		setExempleMouseJoint();
				
		// Ajouter les listeners d'événements souris	
		window.addEventListener('mousedown', handleMouseDown);
		window.addEventListener('mouseup', handleMouseUp);
		
		// Désactiver les scrollings vertical lors d'un appui sur les touches directionnelles "haut" et "bas"
		document.onkeydown = function(event) {
			return event.keyCode != 38 && event.keyCode != 40;
		}
	}
	
	// Gestion de l'événement "Mouse Down"
	this.handleMouseDown = function(evt) {
		isMouseDown = true;
		handleMouseMove(evt);
		window.addEventListener('mousemove', handleMouseMove);
	}
	

	// Gestion de l'événement "Mouse Up"
	this.handleMouseUp = function(evt) {
		window.removeEventListener('mousemove', handleMouseMove);
		isMouseDown = false;
		mouseX = undefined;
		mouseY = undefined;
	}
	
	// Gestion de l'événement "Mouse Move"
	this.handleMouseMove = function(evt) {
		mouseX = (evt.clientX - canvasPosition.left) / SCALE;
		mouseY = (evt.clientY - canvasPosition.top) / SCALE;
	}
	
	// Récupérer le body cliqué
	this.getBodyAtMouse = function() {
		selectedBody = null;
		mouseVec = new b2Vec2(mouseX, mouseY);
		var aabb = new b2AABB();
		aabb.lowerBound.Set(mouseX, mouseY);
		aabb.upperBound.Set(mouseX, mouseY);
		world.QueryAABB(getBodyCallBack, aabb);
		return selectedBody;
	}
	
	// Callback de getBody -> QueryAABB
	this.getBodyCallBack = function(fixture) {
        if (fixture.GetBody().GetType() != b2Body.b2_staticBody) {
            if (fixture.GetShape().TestPoint(fixture.GetBody().GetTransform(), mouseVec)) {
               selectedBody = fixture.GetBody();
               return false;
            }
        }
        return true;
	}

	// Mettre à jour le rendu de l'environnement 2d
	this.update = function() {
		// Mouse Down et pas de liaison
		if (isMouseDown && (!mouseJoint)) {
			var body = getBodyAtMouse();
            if (body) {
            	mouseJoint = box2dUtils.createMouseJoint(world, body, mouseX, mouseY);
            	body.SetAwake(true);
            }
        }
        // Liaison existante
		if (mouseJoint) {
        	if (isMouseDown) {
        		mouseJoint.SetTarget(new b2Vec2(mouseX, mouseY));
            } else {
            	world.DestroyJoint(mouseJoint);
            	mouseJoint = null;
            }
        }
        // effectuer les simulations physiques et mettre à jour le canvas
		world.Step(1 / 60,  10, 10);
		world.DrawDebugData();
		world.ClearForces();
	}
	
	this.initButton = function() {
		$('#btnMouseJoint').click(function(){
			setExempleMouseJoint();
		});
		$('#btnDistanceJoint').click(function(){
			setExempleDistanceJoint();
		});
		$('#btnRevoluteJoint').click(function(){
			setExempleRevoluteJoint();
		});
		$('#btnPrismaticJoint').click(function(){
			setExemplePrismaticJoint();
		});
		$('#btnPulleyJoint').click(function(){
			setExemplePulleyJoint();
		});
		$('#btnLineJoint').click(function(){
			setExempleLineJoint();
		});
		$('#btnWeldJoint').click(function(){
			setExempleWeldJoint();
		});
		$('#btnFrictionJoint').click(function(){
			setExempleFrictionJoint();
		});
		$('#btnGearJoint').click(function(){
			setExempleGearJoint();
		});
	}
	
	this.clearWorld = function(callback) {
		clearInterval(intervalId);
		for (var j = world.GetJointList() ; j; j = j.GetNext()) {
			world.DestroyJoint(j);
		}
		for (var b = world.GetBodyList() ; b; b = b.GetNext()) {
			world.DestroyBody(b);
		}
		intervalId = window.setInterval(update, 1000 / 60);
		callback(true);
	}

	// Créer les limites de l'environnement
	this.setWorldBounds = function() {
		// Créer le "sol" et le "plafond" de notre environnement physique
		ground = box2dUtils.createBox(world, 400, canvasHeight - 10, 400, 10, null, true, 'ground');
		ceiling = box2dUtils.createBox(world, 400, -5, 400, 1, null, true, 'ceiling');
		
		// Créer les "murs" de notre environnement physique
		leftWall = box2dUtils.createBox(world, -5, canvasHeight, 1, canvasHeight, null, true, 'leftWall');
		leftWall = box2dUtils.createBox(world, canvasWidth + 5, canvasHeight, 1, canvasHeight, null, true, 'leftWall');
	}
	
	// Lancer l'exemple de liaison "souris"
	this.setExempleMouseJoint = function() {
		clearWorld(function(reset){
			if (reset) {
				
				setWorldBounds();
				
				// Créer 2 box statiques
				staticBox = box2dUtils.createBox(world, 600, 450, 50, 50, null, true, 'staticBox');
				staticBox2 = box2dUtils.createBox(world, 200, 250, 80, 30, null, true, 'staticBox2');
		
				// Créer 2 ball statiques
				staticBall = box2dUtils.createBall(world, 50, 400, 50, true, 'staticBall');
				staticBall2 = box2dUtils.createBall(world, 500, 150, 60, true, 'staticBall2');
				
				// Créer 20 éléments ball dynamiques de différentes tailles
				for (var i=0; i<30; i++) {
					var radius = 20;
					if (i < 10) {
						radius = 15;
					}
					// Placer aléatoirement les objets dans le canvas
					box2dUtils.createBall(world,
							Math.random() * canvasWidth,
							Math.random() * canvasHeight - 400 / SCALE,
							radius, false, 'ball'+i);
				}
		
				// Créer 20 éléments box dynamiques de différentes tailles
				for (var i=0; i<30; i++) {
					var length = 20;
					if (i < 10) {
						length = 15;
					}
					// Placer aléatoirement les objets dans le canvas
					box2dUtils.createBox(world,
							Math.random() * canvasWidth,
							Math.random() * canvasHeight - 400 / SCALE,
							length, length, null, false, 'box'+i);
				}
			}
		});
	}
	
	// Lancer l'exemple de liaison "Distance"
	this.setExempleDistanceJoint = function() {
		clearWorld(function(reset){
			if (reset) {
				setWorldBounds();
				
				// Exemple sur deux objets dynamiques en spécifiant la distance
				var box1 = box2dUtils.createBox(world, 650, 50, 30, 30, null, false, 'box1');
				var box2 = box2dUtils.createBox(world, 400, 150, 30, 30, null, false, 'box2');
				box2dUtils.createDistanceJoint(world, box1, box2, {length: 200});
				
				// Exemple sur un objet statique et un objet dynamique avec la distance par défaut
				var ball1 = box2dUtils.createBall(world, 50, 50, 30, false, 'ball1');
				var ball2 = box2dUtils.createBall(world, 250, 150, 20, true, 'ball2');
				box2dUtils.createDistanceJoint(world, ball1, ball2, null);
				
				// Exemple sur un objet statique et un objet dynamique en spécifiant la distance
				var box3 = box2dUtils.createBox(world, 700, 150, 10, 10, null, true, 'box3');
				var ball3 = box2dUtils.createBall(world, 700, 10, 30, false, 'ball3');
				box2dUtils.createDistanceJoint(world, box3, ball3, {length: 60}); 
			}
		});
	}
	
	// Lancer l'exemple de liaison "Glissière"
	this.setExemplePrismaticJoint = function() {
		clearWorld(function(reset){
			if (reset) {
				setWorldBounds();

				// Exemple rattaché au GroundBody sans options
				var box1 = box2dUtils.createBox(world, 380, 250, 30, 30, null, false, 'box1');
				var worldAxis = new b2Vec2(0.3, 1.0);
				box2dUtils.createPrismaticJoint(world, box1, null, worldAxis);
				
				// Exemple avec option "limites"
				var box2 = box2dUtils.createBox(world, 180, 250, 80, 20, null, false, 'box2');
				var staticBox = box2dUtils.createBox(world, 180, 250, 30, 30, null, true, 'staticBox');
				var worldAxis = new b2Vec2(0.0, 1.0);
				box2dUtils.createPrismaticJoint(world, box2, staticBox, worldAxis, {limits: [-100, 240]});
				
				// Exemple avec options "limites" et "moteur" (axe vertical)
				var box3 = box2dUtils.createBox(world, 680, 450, 100, 10, null, false, 'box3');
				var worldAxis = new b2Vec2(0.0, 1.0);
				box2dUtils.createPrismaticJoint(world, box3, null, worldAxis, {limits: [-300, 200], motor: [200, -5]});
				var box4 = box2dUtils.createBox(world, 680, 440, 20, 20, null, false, 'box3');
				
				// Exemple avec options "limites" et "moteur" (axe horizontal)
				var ball1 = box2dUtils.createBall(world, 50, 50, 30, false, 'ball1');
				var worldAxis = new b2Vec2(1.0, 0.0);
				box2dUtils.createPrismaticJoint(world, ball1, null, worldAxis, {limits: [0, 400], motor: [20, 5]});
				
			}
		});
	}
	
	// Lancer l'exemple de liaison "Linéaire"
	this.setExempleLineJoint = function() {
		clearWorld(function(reset){
			if (reset) {
				setWorldBounds();
				
				// Exemple rattaché au GroundBody et option "limites"
				var box1 = box2dUtils.createBox(world, 550, 350, 30, 30, null, false, 'box1');
				var worldAxis = new b2Vec2(0.0, 1.0);
				box2dUtils.createLineJoint(world, box1, null, worldAxis, {limits: [-100, 150]});
				
				// Exemple avec option "moteur" (axe horizontal)
				var ball1 = box2dUtils.createBall(world, 750, 50, 30, false, 'ball1');
				var ball2 = box2dUtils.createBall(world, 700, 50, 10, true, 'ball2');
				var worldAxis = new b2Vec2(-1.0, 0.0);
				box2dUtils.createLineJoint(world, ball1, ball2, worldAxis, {motor: [100, 10]});
				
				// Exemple avec modification de la liaison post-création
				var box2 = box2dUtils.createBox(world, 150, 450, 80, 10, null, false, 'box2');
				var worldAxis = new b2Vec2(-0.5, 1.0);
				var lj = box2dUtils.createLineJoint(world, box2, null, worldAxis, {limits: [-300, 150]});
				// Activer le moteur
				lj.SetMaxMotorForce(200);
				lj.SetMotorSpeed(-5);
				lj.EnableMotor(true);
				var box3 = box2dUtils.createBox(world, 150, 440, 30, 30, null, false, 'box3');
				
			}
		});
	}
	
	// Lancer l'exemple de liaison "Soudure"
	this.setExempleWeldJoint = function() {
		clearWorld(function(reset){
			if (reset) {
				setWorldBounds();
				
				// Créer un objet complexe "bonhomme"
				var tete = box2dUtils.createBall(world, 350, 0, 20, false, 'tete');
				var corps = box2dUtils.createBox(world, 350, 20, 6, 20, null, false, 'corps');
				box2dUtils.createWeldJoint(world, tete, corps);
				var bras = box2dUtils.createBox(world, 350, 30, 30, 6, null, false, 'bras');
				box2dUtils.createWeldJoint(world, bras, corps);
				var jambe1 = box2dUtils.createBox(world, 345, 60, 6, 20, 10, false, 'jambe');
				box2dUtils.createWeldJoint(world, jambe1, corps);
				var jambe2 = box2dUtils.createBox(world, 355, 60, 6, 20, -10, false, 'jambe');
				box2dUtils.createWeldJoint(world, jambe2, corps);
												
				// Exemple avec un point d'ancrage par défaut (centre de bodyA)
				var box1 = box2dUtils.createBox(world, 40, 160, 20, 20, null, false, 'box1');
				box2dUtils.createWeldJoint(world, box1, null);
				var box2 = box2dUtils.createBox(world, 300, 160, 50, 10, null, false, 'box2');
				box2dUtils.createWeldJoint(world, box2, box1);
				
				// Exemple avec un point d'ancrage déplacé
				var box3 = box2dUtils.createBox(world, 40, 260, 20, 20, null, false, 'box3');
				box2dUtils.createWeldJoint(world, box3, null);
				var box4 = box2dUtils.createBox(world, 420, 360, 50, 10, null, false, 'box4');
				box2dUtils.createWeldJoint(world, box4, box3, {anchor: [40, 360]});
				
				// Exemple avec un point d'ancrage fixé sur le centre de gravité de body2
				var box5 = box2dUtils.createBox(world, 60, 480, 20, 20, null, false, 'box5');
				box2dUtils.createWeldJoint(world, box5, null); 
				var box6 = box2dUtils.createBox(world, 560, 480, 50, 10, null, false, 'box6');				
				box2dUtils.createWeldJoint(world, box6, box5, {anchor: box5.GetBody().GetWorldCenter()});
				
			}
		});
	}
	
	// Lancer l'exemple de liaison "Pivot"
	this.setExempleRevoluteJoint = function() {
		clearWorld(function(reset){
			if (reset) {
				setWorldBounds();
				
				// Balle "libre"
				var ball1 = box2dUtils.createBall(world, 450, 50, 30, false, 'ball1');
				
				// Exemples de pivots rattachés au GroundBody
				var box1 = box2dUtils.createBox(world, 480, 250, 30, 30, null, false, 'box1');
				box2dUtils.createRevoluteJoint(world, box1);
				var box2 = box2dUtils.createBox(world, 180, 350, 40, 40, null, false, 'box2');
				box2dUtils.createRevoluteJoint(world, box2);
				
				// Exemple de pivot rattaché à un body fixe
				var box3 = box2dUtils.createBox(world, 280, 450, 30, 30, null, false, 'box3');
				var staticBox1 = box2dUtils.createBox(world, 280, 450, 10, 10, null, true, 'staticBox');
				box2dUtils.createRevoluteJoint(world, box3, staticBox1);
				
				// Exemple de pivot avec moteur et rattaché à un objet distant
				var box4 = box2dUtils.createBox(world, 180, 150, 30, 30, null, false, 'box3');
				var staticBox2 = box2dUtils.createBox(world, 180, 250, 10, 10, null, true, 'staticBox');
				box2dUtils.createRevoluteJoint(world, box4, staticBox2, {motor: [10, -5]});
				
				// Exemple avec un point d'ancrage fixé sur le centre de gravité de body2
				var box5 = box2dUtils.createBox(world, 680, 440, 30, 30, null, false, 'box5');
				var staticBox3 = box2dUtils.createBox(world, 600, 440, 10, 10, null, true, 'staticBox');
				box2dUtils.createRevoluteJoint(world, box5, staticBox3, {anchor: staticBox3.GetBody().GetWorldCenter(), motor: [30, 5]});
			}
		});
	}
	
	// Lancer l'exemple de liaison "Poulie"
	this.setExemplePulleyJoint = function() {
		clearWorld(function(reset){
			if (reset) {
				setWorldBounds();
				
				// Exemple avec longueurs max et ratio de 0.5
				var box1 = box2dUtils.createBox(world, 50, 240, 30, 30, null, false, 'box1');
				var box2 = box2dUtils.createBox(world, 150, 240, 30, 30, null, false, 'box2');
				box2dUtils.createPulleyJoint(world, box1, box2, [50, 100], [150, 100], {maxLength1: 300, maxLength2: 400, ratio: 0.5});
				
				// Exemple avec un ratio de 1.5
				var ball1 = box2dUtils.createBall(world, 300, 300, 30, false, 'ball1');
				var ball2 = box2dUtils.createBall(world, 400, 300, 30, false, 'ball2');
				box2dUtils.createPulleyJoint(world, ball1, ball2, [300, 50], [400, 50], {ratio: 1.5});
				
				// Exemple avec un ratio de 0.5 et ancres identiques
				var box3 = box2dUtils.createBox(world,550, 250, 30, 30, null, false, 'box3');
				var box4 = box2dUtils.createBox(world, 750, 250, 30, 30, null, false, 'box4');
				box2dUtils.createPulleyJoint(world, box3, box4, [650, 50], [650, 50]);
			}
		});
	}
	
	// Lancer l'exemple de liaison "Friction"
	this.setExempleFrictionJoint = function() {
		clearWorld(function(reset){
			if (reset) {
				setWorldBounds();
				
				// Exemple sans friction
				var box1 = box2dUtils.createBox(world, 100, 50, 30, 30, null, false, 'box1');
				
				// Exemple avec friction : maxForce 20
				var box2 = box2dUtils.createBox(world, 300, 50, 30, 30, null, false, 'box2');
				var staticBox = box2dUtils.createBox(world, 300, 10, 100, 5, null, true, 'staticBox');
				box2dUtils.createFrictionJoint(world, box2, staticBox, 20);
				
				// Exemple avec friction : maxForce 30
				var box3 = box2dUtils.createBox(world, 500, 50, 30, 30, null, false, 'box3');
				box2dUtils.createFrictionJoint(world, box3, null, 30);
			}
		});
	}
	
	// Lancer l'exemple de liaison "Engrenage"
	this.setExempleGearJoint = function() {
		clearWorld(function(reset){
			if (reset) {
				setWorldBounds();
				
				// Liaison de type "pivot"
				var box1 = box2dUtils.createBox(world, 150, 150, 30, 30, null, false, 'box1');
				var revoluteJoint = box2dUtils.createRevoluteJoint(world, box1);
				// Liaison de type "glissière"
				var box2 = box2dUtils.createBox(world, 400, 150, 30, 30, null, false, 'box2');
				var worldAxis = new b2Vec2(1.0, 0.0);
				var prismaticJoint1 = box2dUtils.createPrismaticJoint(world, box2, null, worldAxis, {limits: [-150, 100]});
				// Liaison engrenage "pivot - glissière"
				box2dUtils.createGearJoint(world, revoluteJoint, prismaticJoint1, box1, box2); 

				// Liaison de type "pivot"
				var box3 = box2dUtils.createBox(world, 150, 450, 30, 30, null, false, 'box3');
				var revoluteJoint2 = box2dUtils.createRevoluteJoint(world, box3);
				// Liaison de type "pivot"
				var box4 = box2dUtils.createBox(world, 400, 450, 30, 30, null, false, 'box4');
				var revoluteJoint3 = box2dUtils.createRevoluteJoint(world, box4);
				// Liaison engrenage "pivot - pivot"
				box2dUtils.createGearJoint(world, revoluteJoint2, revoluteJoint3, box3, box4);
				
				// Liaison de type "glissière" (axe horizontal)
				var ball1 = box2dUtils.createBall(world, 300, 300, 30, false, 'ball1');
				var worldAxis = new b2Vec2(1.0, 0.0);
				var prismaticJoint2 = box2dUtils.createPrismaticJoint(world, ball1, null, worldAxis, {limits: [-200, 200]});
				// Liaison de type "glissière" (axe vertical)
				var ball2 = box2dUtils.createBall(world, 700, 300, 30, false, 'ball2');
				var worldAxis = new b2Vec2(0.0, 1.0);
				var prismaticJoint3 = box2dUtils.createPrismaticJoint(world, ball2, null, worldAxis, {limits: [-200, 200]});
				// Liaison engrenage "glissière - glissière"
				box2dUtils.createGearJoint(world, prismaticJoint2, prismaticJoint3, ball1, ball2, {ratio: 0.5});
				
			}
		});
	}
	
}());