Ce document décrit l'architecture technique du projet SpeedCuber. Il sert de référence pour comprendre le flux de données, la structure des classes et les conventions utilisées.
Vue d'ensemble (High Level)
Le projet est un hybride React / Three.js utilisant un moteur de jeu personnalisé basé sur le pattern Entity-Component-System (ECS) inspiré Unity.
React gère l'UI (HUD, Menus), la persistance (Storage) et le cycle de vie du moteur.
GameEngine (TypeScript pur) gère la boucle de jeu, la physique et le rendu Three.js.
Three.js est utilisé uniquement pour le rendu graphique, encapsulé dans les composants logiques.
Le Flux de Données (Input to Movement)
Le cycle d'une frame (Update Loop) suit un ordre strict pour garantir la déterministe de la physique :
InputSystem : Capture les événements bruts (Clavier/Touch) et normalise l'état dans une structure InputState (left, right, jumpPressed, etc.).
GameLoop : Déclenche GameEngine.fixedUpdate(dt).
UpdateContext : Un objet contextuel est créé, contenant les références vitales (Input, World, PhysicsConfig, DeltaTime).
PlayerController (Component) :
Lit l'input depuis le UpdateContext.
Délègue la logique à son State Machine interne (currentState.update).
Exemple : Si AirborneState, il applique la gravité et les forces aériennes.
Modifie les données brutes du joueur (player.vx, player.vy).
CollisionResolver :
Prend la position théorique future.
Résout les collisions AABB contre le SpatialHashGrid (plateformes statiques) et les objets dynamiques.
Corrige directement player.x et player.y.
Transform Sync : Le PlayerController met à jour this.transform.position (Three.js) pour refléter l'état physique final.
Renderer : Dessine la scène à la position finale (avec interpolation possible via alpha).
Structure des Objets (Entity-Component)
L'architecture EC est "pragmatique" (Thin Wrapper autour de Three.js) :
GameObject : L'entité de base.
Possède toujours une propriété publique object3D qui est un THREE.Group.
Sert de conteneur pour les composants et les enfants Three.js.
Component : La brique logique.
constructor(gameObject) : Reçoit son parent.
update(dt, context) : Logique par frame.
Accès direct à Three.js via this.gameObject.object3D.
TransformComponent :
Composant présent par défaut sur tout GameObject.
Wrapper syntaxique pour object3D.position/rotation/scale.
Singletons et Managers Clés
Bien que peu de vrais "Singletons" statiques soient utilisés, ces classes agissent comme tels au sein d'une instance de jeu :
GameEngine : Le "Dieu" du système. Instancié par Game.tsx. Il orchestre le GameLoop, le GameWorld et le Renderer.
GameSession (React) : Le pont entre React et le Moteur. Il écoute les callbacks du moteur (mort, victoire) pour mettre à jour l'UI React (HUD, Timer).
SceneBuilder : Responsable du chargement d'un niveau.
Compare le niveau actuel et le nouveau.
Instancie/Recycle les GameObject (Pooling implicite).
Construit le SpatialHashGrid pour la physique statique.
SurfaceSystem & PathNavigator : Le cerveau de l'IA.
Analyse la géométrie du niveau pour créer un graphe de navigation (NavMesh 2D simplifié).
Permet aux ennemis de calculer des sauts complexes.
Hiérarchie Three.js (Scene Graph)
La structure de la scène Three.js est plate pour optimiser les draw calls et la gestion des matrices :
code
Text
THREE.Scene
├── PerspectiveCamera (Main)
├── OrthographicCamera (Editor)
├── AmbientLight & DirectionalLight
├── GridMesh (Le fond animé)
├── LevelGroup (Conteneur principal nettoyé à chaque chargement)
│   ├── Block_ID_Type (GameObject.object3D)
│   │   ├── Mesh (Visuel principal)
│   │   └── LineSegments (Contours/Edges)
│   └── Enemy_ID (GameObject.object3D)
│       └── Mesh
└── Particles (Ajoutées directement à la racine ou dans un groupe dédié)
Conventions de Nommage et Code
Interfaces : Préfixées par I lorsqu'elles définissent un contrat comportemental strict (ex: IPlayerState, IEnemyState, IMovement).
Types de données : Pas de préfixe, décrivent la donnée brute (ex: Level, Platform, Player).
Etats (FSM) : Nommés [Entity][Action]State (ex: DroneChaseState, WalkerDyingState).
Systèmes : Suffixés par System (ex: InputSystem, GhostSystem).
Factories : Responsables de l'assemblage des entités (ex: BlockFactory, EnemyFactory).
Configuration et Tweak
Toute la configuration de gameplay (constantes physiques, vitesses, couleurs) est centralisée et injectée via le DebugConfig.
Le code ne doit pas contenir de "magic numbers" pour la physique.
Il doit lire context.config ou context.physicsConfig pour permettre le réglage en temps réel via le panneau Debug.
La map mentale :
LE NOYAU (Do Not Touch)
CORE (/engine/core) : Le chef d'orchestre.
GameEngine instancie tout.
GameLoop gère le temps (FixedUpdate).
UpdateContext est l'objet vital passé partout (contient inputs, configs, delta time).
Règle d'or : On ne modifie GameEngine.ts que si on change le cycle de vie profond du moteur.
LA LOGIQUE DE JEU (Entity-Component)
COMPONENTS (/game/components) : C'est là que vit le gameplay.
Ce sont des briques logiques attachées aux GameObjects.
Player : Séparation stricte entre PlayerController (Physique/Inputs/États) et PlayerVisuals (Squash & Stretch, Rotation).
World : MovingPlatform, VanishingPlatform.
STATES (/player & /enemies/states) : Pattern FSM strict.
Chaque comportement est une classe isolée (AirborneState, DroneChaseState).
Règle : On ne met pas de if (isJumping) dans le contrôleur, on crée/transitionne vers un AirborneState.
L'INTELLIGENCE ARTIFICIELLE (Le "Cerveau")
NAVIGATION (/game/ai/navigation) : Ce n'est pas juste du A*.
SurfaceSystem : Découpe le niveau en "Surfaces" (segments navigables).
Generators (JumpGenerator, ClimbGenerator) : Pré-calculent les connexions physiques (Sauts, Chutes, Escalade).
Conscience : Les ennemis ne "marchent" pas juste vers X. Ils suivent un graphe de surfaces pré-calculé.
ENEMIES (/game/enemies) : Architecture modulaire.
Composition : Movement (Moteur) + Sensors (Yeux/Oreilles) + Combat (Tir) + Controller (Cerveau FSM).
LE RENDU & CONSTRUCTION (The View)
RENDERING (/engine/rendering) : Thin Wrapper Three.js.
Le Renderer gère la scène, la caméra, et les effets globaux (Grid, Bloom).
Les composants modifient directement this.gameObject.object3D (Three.js Mesh).
BUILDER (/engine/scene/SceneBuilder) :
Il convertit les données JSON (LevelData) en GameObjects vivants.
Il gère le pooling implicite (réutilisation des objets existants par ID).
LE PONT REACT (The Bridge)
MANAGERS (/components/managers/GameSession.tsx) :
C'est le seul endroit où React parle au Moteur (via engine.setOnUpdate).
Gère le cycle de vie UI (HUD, Mort, Victoire, Musique).
Règle : Le moteur ne connaît pas React. React observe le moteur.