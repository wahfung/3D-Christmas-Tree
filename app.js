/**
 * 3D Christmas Tree - Gesture Interactive Application
 * High-performance particle system with hand gesture recognition
 */

// All libraries loaded via CDN in index.html, access from window
const THREE = window.THREE;
const Hands = window.Hands;
const Camera = window.Camera;

// ===== Global State =====
const state = {
    currentMode: 'tree', // 'tree' | 'nebula'
    currentTheme: 0,
    isPhotoShown: false,
    isLetterShown: false,
    lastGesture: null,
    gestureStartTime: 0,
    handPosition: { x: 0, y: 0, z: 0 },
    prevHandPosition: { x: 0, y: 0, z: 0 },
    rotationVelocity: { x: 0, y: 0 },
    targetRotation: { x: 0, y: 0 },
    targetScale: 1,
    isResourcesLoaded: false,
    lastGestureTime: 0,
    gestureCooldown: 300 // ms
};

// ===== Color Themes =====
const colorThemes = [
    {
        name: '经典红绿',
        primary: 0x00ff00,
        secondary: 0xff0000,
        accent: 0xffd700,
        star: 0xffd700,
        background: 0x0a0a0f
    },
    {
        name: '金色华丽',
        primary: 0xffd700,
        secondary: 0xffa500,
        accent: 0xffffe0,
        star: 0xffffff,
        background: 0x0f0a05
    },
    {
        name: '冰蓝梦幻',
        primary: 0x00bfff,
        secondary: 0x87ceeb,
        accent: 0xe0ffff,
        star: 0xffffff,
        background: 0x050a0f
    },
    {
        name: '紫色魔法',
        primary: 0x9400d3,
        secondary: 0xff69b4,
        accent: 0xe6e6fa,
        star: 0xffd700,
        background: 0x0a050f
    }
];

// ===== Love Letter Content =====
const loveLetterContent = `亲爱的：

在这个温暖的圣诞节，
我想对你说一些藏在心底很久的话。

遇见你，是我生命中最美的意外。
你的笑容像冬日里的阳光，
温暖了我所有的寒冷时刻。

感谢你陪我走过的每一天，
无论风雨还是晴天，
有你在身边，便是最好的礼物。

愿这棵圣诞树的每一颗星光，
都承载着我对你的祝福和爱意。

圣诞快乐，我爱你。

                    永远爱你的人
                    2024年圣诞`;

// ===== Demo Photo (Base64 placeholder) =====
const demoPhotoUrl = 'data:image/svg+xml;base64,' + btoa(`
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1a2e"/>
      <stop offset="100%" style="stop-color:#16213e"/>
    </linearGradient>
    <linearGradient id="tree" x1="50%" y1="0%" x2="50%" y2="100%">
      <stop offset="0%" style="stop-color:#2ecc71"/>
      <stop offset="100%" style="stop-color:#27ae60"/>
    </linearGradient>
  </defs>
  <rect width="400" height="300" fill="url(#bg)"/>
  <polygon points="200,50 280,180 120,180" fill="url(#tree)"/>
  <polygon points="200,100 300,220 100,220" fill="url(#tree)"/>
  <rect x="185" y="220" width="30" height="40" fill="#8b4513"/>
  <circle cx="200" cy="50" r="12" fill="#ffd700"/>
  <circle cx="160" cy="130" r="6" fill="#e74c3c"/>
  <circle cx="230" cy="150" r="6" fill="#e74c3c"/>
  <circle cx="180" cy="180" r="6" fill="#f39c12"/>
  <circle cx="220" cy="200" r="6" fill="#e74c3c"/>
  <text x="200" y="280" text-anchor="middle" fill="#fff" font-size="16" font-family="Arial">Merry Christmas</text>
</svg>`);

// ===== Three.js Setup =====
let scene, camera, renderer;
let particleSystem, particleMaterial;
let particles = [];
const PARTICLE_COUNT = 8000;

// Store initial tree positions (fixed, calculated once at startup)
let initialTreePositions = null;

// ===== MediaPipe Hands Setup =====
let hands, videoElement, cameraInstance;
let isHandsInitialized = false;

// ===== DOM Elements =====
const elements = {};

// ===== Initialize Application =====
async function init() {
    cacheElements();
    initThreeJS();
    createParticleSystem();
    await initHandGesture();
    preloadResources();
    animate();
}

function cacheElements() {
    elements.loadingOverlay = document.getElementById('loading-overlay');
    elements.gestureIndicator = document.getElementById('gesture-indicator');
    elements.gestureIcon = document.getElementById('gesture-icon');
    elements.gestureText = document.getElementById('gesture-text');
    elements.photoModal = document.getElementById('photo-modal');
    elements.photoDisplay = document.getElementById('photo-display');
    elements.letterModal = document.getElementById('letter-modal');
    elements.letterContent = document.getElementById('letter-content');
    elements.themeIndicator = document.getElementById('theme-indicator');
    elements.themeName = document.getElementById('theme-name');
    elements.video = document.getElementById('video');
}

function initThreeJS() {
    scene = new THREE.Scene();

    const width = window.innerWidth;
    const height = window.innerHeight;

    camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 0.5, 5.5); // Position camera to see full tree
    camera.lookAt(0, 0.5, 0); // Look at center of tree (tree spans y: -1.5 to 2.5)

    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(colorThemes[state.currentTheme].background);

    document.getElementById('canvas-container').appendChild(renderer.domElement);

    window.addEventListener('resize', onWindowResize, false);
}

function onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

// ===== Particle System =====
function createParticleSystem() {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);
    const targetPositions = new Float32Array(PARTICLE_COUNT * 3);
    const velocities = new Float32Array(PARTICLE_COUNT * 3);

    // Initialize and store fixed tree positions (calculated once)
    initialTreePositions = new Float32Array(PARTICLE_COUNT * 3);

    // Initialize particles in tree formation
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const treePos = getTreePosition(i / PARTICLE_COUNT);

        // Store in fixed array (never changes)
        initialTreePositions[i * 3] = treePos.x;
        initialTreePositions[i * 3 + 1] = treePos.y;
        initialTreePositions[i * 3 + 2] = treePos.z;

        // Set current positions
        positions[i * 3] = treePos.x;
        positions[i * 3 + 1] = treePos.y;
        positions[i * 3 + 2] = treePos.z;

        targetPositions[i * 3] = treePos.x;
        targetPositions[i * 3 + 1] = treePos.y;
        targetPositions[i * 3 + 2] = treePos.z;

        velocities[i * 3] = 0;
        velocities[i * 3 + 1] = 0;
        velocities[i * 3 + 2] = 0;

        sizes[i] = Math.random() * 0.03 + 0.01;

        // Set initial colors based on theme
        const theme = colorThemes[state.currentTheme];
        const colorChoice = Math.random();
        let color;
        if (colorChoice < 0.5) {
            color = new THREE.Color(theme.primary);
        } else if (colorChoice < 0.85) {
            color = new THREE.Color(theme.secondary);
        } else {
            color = new THREE.Color(theme.accent);
        }

        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('customColor', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('targetPosition', new THREE.BufferAttribute(targetPositions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));

    // Custom shader material for better performance
    particleMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            pixelRatio: { value: renderer.getPixelRatio() }
        },
        vertexShader: `
            attribute float size;
            attribute vec3 customColor;
            varying vec3 vColor;
            varying float vAlpha;
            uniform float time;
            uniform float pixelRatio;

            void main() {
                vColor = customColor;

                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

                // Depth-based size and alpha
                float depth = -mvPosition.z;
                float depthScale = 1.0 / (1.0 + depth * 0.1);

                gl_PointSize = size * 300.0 * pixelRatio * depthScale;
                gl_Position = projectionMatrix * mvPosition;

                // Alpha based on depth for layering effect
                vAlpha = 0.6 + 0.4 * depthScale;
            }
        `,
        fragmentShader: `
            precision mediump float;
            varying vec3 vColor;
            varying float vAlpha;

            void main() {
                // Circular particle with soft edges
                float dist = length(gl_PointCoord - vec2(0.5));
                if (dist > 0.5) discard;

                float alpha = (1.0 - dist * 2.0) * vAlpha;

                // Add glow effect
                vec3 glowColor = vColor * 1.2;

                gl_FragColor = vec4(glowColor, alpha);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexColors: true
    });

    particleSystem = new THREE.Points(geometry, particleMaterial);
    scene.add(particleSystem);

    // Add star at top
    createStar();
}

function createStar() {
    const starGeometry = new THREE.BufferGeometry();
    const starVertices = [];
    const starColors = [];
    const starSizes = [];

    // Star position at tree top (matches tree height: bottom=-1.5, top=2.5)
    const starY = 2.6;

    // Create star shape with multiple particles - 5-pointed star pattern
    for (let i = 0; i < 150; i++) {
        const angle = (i / 150) * Math.PI * 2;

        // Create 5-pointed star shape
        const pointFactor = Math.cos(angle * 2.5) * 0.5 + 0.5;
        const radius = 0.08 + pointFactor * 0.12;

        // Add glow particles around star
        const isGlow = i > 100;
        const glowRadius = isGlow ? 0.2 + Math.random() * 0.15 : radius;
        const finalRadius = isGlow ? glowRadius : radius;

        starVertices.push(
            Math.cos(angle) * finalRadius,
            starY + Math.sin(angle) * finalRadius * 0.3 + (Math.random() - 0.5) * 0.05,
            Math.sin(angle) * finalRadius * 0.3
        );

        const color = new THREE.Color(colorThemes[state.currentTheme].star);
        starColors.push(color.r, color.g, color.b);
        starSizes.push(isGlow ? 0.02 + Math.random() * 0.02 : 0.05 + Math.random() * 0.03);
    }

    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    starGeometry.setAttribute('customColor', new THREE.Float32BufferAttribute(starColors, 3));
    starGeometry.setAttribute('size', new THREE.Float32BufferAttribute(starSizes, 1));

    const starMaterial = new THREE.ShaderMaterial({
        uniforms: {
            pixelRatio: { value: renderer.getPixelRatio() }
        },
        vertexShader: `
            attribute float size;
            attribute vec3 customColor;
            varying vec3 vColor;
            uniform float pixelRatio;

            void main() {
                vColor = customColor;
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = size * 400.0 * pixelRatio;
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            precision mediump float;
            varying vec3 vColor;

            void main() {
                float dist = length(gl_PointCoord - vec2(0.5));
                if (dist > 0.5) discard;
                float alpha = (1.0 - dist * 2.0);
                gl_FragColor = vec4(vColor * 1.5, alpha);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexColors: true
    });

    const starPoints = new THREE.Points(starGeometry, starMaterial);
    starPoints.name = 'star';
    scene.add(starPoints);
}

function getTreePosition(t) {
    // Generate Christmas tree shape - cone/pyramid visible from front
    // Tree grows upward: bottom at y=-1.5, top at y=2.5
    const treeBottom = -1.5;
    const treeTop = 2.5;
    const treeHeight = treeTop - treeBottom;

    // Use sqrt distribution to concentrate more particles at the bottom (wider part)
    // This creates a more natural density distribution
    const heightRatio = Math.sqrt(t);
    const y = treeBottom + heightRatio * treeHeight;

    // Normalized height for radius calculation (0 at bottom, 1 at top)
    const normalizedY = (y - treeBottom) / treeHeight;

    // Tree silhouette - wider at bottom, pointed at top
    // Classic Christmas tree cone profile
    const baseRadius = 1.6;
    const maxRadius = baseRadius * (1 - normalizedY * 0.95);

    // Create layered branches effect (5 tiers)
    const layerCount = 5;
    const layerProgress = (normalizedY * layerCount) % 1;

    // Branch wave effect - creates scalloped edge
    const branchWave = Math.sin(layerProgress * Math.PI) * 0.15;

    // Random angle for circular distribution
    const angle = Math.random() * Math.PI * 2;

    // Final radius with variation
    const radiusVariation = 0.7 + Math.random() * 0.3;
    const radius = (maxRadius + branchWave) * radiusVariation;

    // Small jitter for natural look
    const jitter = 0.05;

    return {
        x: Math.cos(angle) * radius + (Math.random() - 0.5) * jitter,
        y: y,
        z: Math.sin(angle) * radius + (Math.random() - 0.5) * jitter
    };
}

function getNebulaPosition() {
    // Generate random nebula/galaxy shape
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const radius = 1.5 + Math.random() * 1.5;

    // Add spiral effect
    const spiralOffset = theta * 0.3;

    return {
        x: radius * Math.sin(phi) * Math.cos(theta + spiralOffset),
        y: radius * Math.cos(phi) * 0.6, // Flatten slightly
        z: radius * Math.sin(phi) * Math.sin(theta + spiralOffset)
    };
}

// ===== Gesture Recognition =====
async function initHandGesture() {
    videoElement = elements.video;

    // Check if MediaPipe is available from CDN
    if (typeof Hands === 'undefined' || typeof Camera === 'undefined') {
        console.warn('MediaPipe not loaded from CDN, gesture recognition disabled');
        updateGestureIndicator('⚠️', '手势识别未加载');
        return;
    }

    try {
        hands = new Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`;
            }
        });

        hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 0, // Use lite model for better performance
            minDetectionConfidence: 0.7,
            minTrackingConfidence: 0.5
        });

        hands.onResults(onHandResults);

        cameraInstance = new Camera(videoElement, {
            onFrame: async () => {
                if (isHandsInitialized) {
                    await hands.send({ image: videoElement });
                }
            },
            width: 320,
            height: 240
        });

        await cameraInstance.start();
        isHandsInitialized = true;

        console.log('Hand gesture recognition initialized');
    } catch (error) {
        console.error('Failed to initialize hand gesture:', error);
        updateGestureIndicator('⚠️', '手势识别初始化失败');
    }
}

function onHandResults(results) {
    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
        state.lastGesture = null;
        updateGestureIndicator('🤚', '等待手势...');
        return;
    }

    const landmarks = results.multiHandLandmarks[0];

    // Update hand position for rotation control
    const wrist = landmarks[0];
    state.prevHandPosition = { ...state.handPosition };
    state.handPosition = {
        x: wrist.x,
        y: wrist.y,
        z: wrist.z || 0.5
    };

    // Recognize gesture
    const gesture = recognizeGesture(landmarks);

    if (gesture && gesture !== state.lastGesture) {
        const now = Date.now();
        if (now - state.lastGestureTime > state.gestureCooldown) {
            handleGesture(gesture);
            state.lastGestureTime = now;
        }
    }

    state.lastGesture = gesture;

    // Handle palm movement for nebula rotation
    if (gesture === 'palm' && state.currentMode === 'nebula') {
        handlePalmMovement();
    }
}

function recognizeGesture(landmarks) {
    // Calculate finger states
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];

    const thumbIP = landmarks[3];
    const indexPIP = landmarks[6];
    const middlePIP = landmarks[10];
    const ringPIP = landmarks[14];
    const pinkyPIP = landmarks[18];

    const wrist = landmarks[0];

    // Finger extended check
    const isThumbExtended = thumbTip.x < thumbIP.x; // For right hand
    const isIndexExtended = indexTip.y < indexPIP.y;
    const isMiddleExtended = middleTip.y < middlePIP.y;
    const isRingExtended = ringTip.y < ringPIP.y;
    const isPinkyExtended = pinkyTip.y < pinkyPIP.y;

    // Count extended fingers
    const extendedCount = [isIndexExtended, isMiddleExtended, isRingExtended, isPinkyExtended].filter(Boolean).length;

    // 👊 Fist - all fingers closed
    if (!isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended) {
        return 'fist';
    }

    // 🖐 Palm - all fingers extended
    if (isIndexExtended && isMiddleExtended && isRingExtended && isPinkyExtended) {
        return 'palm';
    }

    // 👉 Pointing - only index extended
    if (isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended) {
        return 'pointing';
    }

    // ✌️ Peace - index and middle extended
    if (isIndexExtended && isMiddleExtended && !isRingExtended && !isPinkyExtended) {
        return 'peace';
    }

    // 👌 OK - thumb and index form circle, others extended
    const thumbIndexDist = Math.sqrt(
        Math.pow(thumbTip.x - indexTip.x, 2) +
        Math.pow(thumbTip.y - indexTip.y, 2)
    );

    if (thumbIndexDist < 0.1 && isMiddleExtended && isRingExtended && isPinkyExtended) {
        return 'ok';
    }

    return null;
}

function handleGesture(gesture) {
    elements.gestureIndicator.classList.add('active');
    setTimeout(() => elements.gestureIndicator.classList.remove('active'), 300);

    switch (gesture) {
        case 'fist':
            updateGestureIndicator('👊', '圣诞树形态');
            transitionToTree();
            break;

        case 'palm':
            updateGestureIndicator('🖐', '星云形态');
            transitionToNebula();
            break;

        case 'pointing':
            updateGestureIndicator('👉', '展示照片');
            showPhoto();
            break;

        case 'ok':
            updateGestureIndicator('👌', '告白信');
            showLoveLetter();
            break;

        case 'peace':
            updateGestureIndicator('✌️', '切换主题');
            cycleColorTheme();
            break;
    }
}

function updateGestureIndicator(icon, text) {
    elements.gestureIcon.textContent = icon;
    elements.gestureText.textContent = text;
}

function handlePalmMovement() {
    const dx = (state.handPosition.x - state.prevHandPosition.x) * 3;
    const dy = (state.handPosition.y - state.prevHandPosition.y) * 3;

    // Apply rotation based on hand movement
    state.rotationVelocity.y += dx;
    state.rotationVelocity.x += dy;

    // Calculate scale based on hand distance (z position)
    const baseZ = 0.5;
    const zDelta = (baseZ - state.handPosition.z) * 2;
    state.targetScale = Math.max(0.5, Math.min(2, 1 + zDelta));
}

// ===== Mode Transitions =====
function transitionToTree() {
    if (state.currentMode === 'tree') return;
    state.currentMode = 'tree';

    hideModals();

    // Reset rotation state to fix upside-down tree bug
    state.rotationVelocity = { x: 0, y: 0 };
    state.targetRotation = { x: 0, y: 0 };

    const targetPositions = particleSystem.geometry.attributes.targetPosition.array;

    // Use stored initial tree positions (no recalculation)
    for (let i = 0; i < PARTICLE_COUNT * 3; i++) {
        targetPositions[i] = initialTreePositions[i];
    }

    particleSystem.geometry.attributes.targetPosition.needsUpdate = true;

    // Show star
    const star = scene.getObjectByName('star');
    if (star) star.visible = true;
}

function transitionToNebula() {
    if (state.currentMode === 'nebula') return;
    state.currentMode = 'nebula';

    hideModals();

    const targetPositions = particleSystem.geometry.attributes.targetPosition.array;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const nebulaPos = getNebulaPosition();
        targetPositions[i * 3] = nebulaPos.x;
        targetPositions[i * 3 + 1] = nebulaPos.y;
        targetPositions[i * 3 + 2] = nebulaPos.z;
    }

    particleSystem.geometry.attributes.targetPosition.needsUpdate = true;

    // Hide star
    const star = scene.getObjectByName('star');
    if (star) star.visible = false;
}

// ===== Photo & Letter Functions =====
function showPhoto() {
    if (state.isPhotoShown) {
        hidePhoto();
        return;
    }

    state.isPhotoShown = true;
    elements.photoDisplay.src = demoPhotoUrl;
    elements.photoModal.classList.remove('hidden');
}

function hidePhoto() {
    state.isPhotoShown = false;
    elements.photoModal.classList.add('hidden');
}

function showLoveLetter() {
    if (state.isLetterShown) {
        hideLoveLetter();
        return;
    }

    state.isLetterShown = true;
    elements.letterContent.textContent = '';
    elements.letterModal.classList.remove('hidden');

    // Typewriter effect
    let charIndex = 0;
    const typeSpeed = 50;

    function typeNextChar() {
        if (charIndex < loveLetterContent.length && state.isLetterShown) {
            elements.letterContent.textContent += loveLetterContent[charIndex];
            charIndex++;
            setTimeout(typeNextChar, typeSpeed);
        }
    }

    setTimeout(typeNextChar, 300);
}

function hideLoveLetter() {
    state.isLetterShown = false;
    elements.letterModal.classList.add('hidden');
}

function hideModals() {
    hidePhoto();
    hideLoveLetter();
}

// ===== Color Theme =====
function cycleColorTheme() {
    state.currentTheme = (state.currentTheme + 1) % colorThemes.length;
    const theme = colorThemes[state.currentTheme];

    // Update background
    renderer.setClearColor(theme.background);

    // Update particle colors with smooth transition
    const colors = particleSystem.geometry.attributes.customColor.array;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const colorChoice = Math.random();
        let color;
        if (colorChoice < 0.5) {
            color = new THREE.Color(theme.primary);
        } else if (colorChoice < 0.85) {
            color = new THREE.Color(theme.secondary);
        } else {
            color = new THREE.Color(theme.accent);
        }

        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
    }

    particleSystem.geometry.attributes.customColor.needsUpdate = true;

    // Update star colors
    const star = scene.getObjectByName('star');
    if (star) {
        const starColors = star.geometry.attributes.customColor.array;
        const starColor = new THREE.Color(theme.star);
        for (let i = 0; i < starColors.length / 3; i++) {
            starColors[i * 3] = starColor.r;
            starColors[i * 3 + 1] = starColor.g;
            starColors[i * 3 + 2] = starColor.b;
        }
        star.geometry.attributes.customColor.needsUpdate = true;
    }

    // Show theme indicator
    elements.themeName.textContent = theme.name;
    elements.themeIndicator.classList.remove('hidden');

    setTimeout(() => {
        elements.themeIndicator.classList.add('hidden');
    }, 2000);
}

// ===== Resource Preloading =====
function preloadResources() {
    // Preload photo
    const img = new Image();
    img.src = demoPhotoUrl;
    img.onload = () => {
        state.isResourcesLoaded = true;
        elements.loadingOverlay.classList.add('hidden');
    };

    // Fallback if image fails
    img.onerror = () => {
        state.isResourcesLoaded = true;
        elements.loadingOverlay.classList.add('hidden');
    };

    // Timeout fallback
    setTimeout(() => {
        if (!state.isResourcesLoaded) {
            state.isResourcesLoaded = true;
            elements.loadingOverlay.classList.add('hidden');
        }
    }, 3000);
}

// ===== Animation Loop =====
function animate() {
    requestAnimationFrame(animate);

    const time = performance.now() * 0.001;

    // Update shader time
    particleMaterial.uniforms.time.value = time;

    // Smooth particle transitions
    updateParticlePositions();

    // Apply rotation and scale with smoothing
    applyTransformations(time);

    renderer.render(scene, camera);
}

function updateParticlePositions() {
    const positions = particleSystem.geometry.attributes.position.array;
    const targetPositions = particleSystem.geometry.attributes.targetPosition.array;
    const velocities = particleSystem.geometry.attributes.velocity.array;

    const lerpFactor = 0.05;
    const dampingFactor = 0.95;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3;

        // Calculate direction to target
        const dx = targetPositions[i3] - positions[i3];
        const dy = targetPositions[i3 + 1] - positions[i3 + 1];
        const dz = targetPositions[i3 + 2] - positions[i3 + 2];

        // Update velocities with spring-like behavior
        velocities[i3] += dx * lerpFactor;
        velocities[i3 + 1] += dy * lerpFactor;
        velocities[i3 + 2] += dz * lerpFactor;

        // Apply damping
        velocities[i3] *= dampingFactor;
        velocities[i3 + 1] *= dampingFactor;
        velocities[i3 + 2] *= dampingFactor;

        // Update positions
        positions[i3] += velocities[i3];
        positions[i3 + 1] += velocities[i3 + 1];
        positions[i3 + 2] += velocities[i3 + 2];

        // Add subtle floating motion in nebula mode
        if (state.currentMode === 'nebula') {
            const offset = i * 0.01;
            positions[i3] += Math.sin(performance.now() * 0.0005 + offset) * 0.001;
            positions[i3 + 1] += Math.cos(performance.now() * 0.0003 + offset) * 0.001;
        }
    }

    particleSystem.geometry.attributes.position.needsUpdate = true;
}

function applyTransformations(time) {
    // Smooth rotation
    const rotationSmoothing = 0.1;
    state.targetRotation.x += state.rotationVelocity.x;
    state.targetRotation.y += state.rotationVelocity.y;

    // Apply damping to velocity
    state.rotationVelocity.x *= 0.95;
    state.rotationVelocity.y *= 0.95;

    // Apply rotation to particle system
    particleSystem.rotation.x += (state.targetRotation.x - particleSystem.rotation.x) * rotationSmoothing;
    particleSystem.rotation.y += (state.targetRotation.y - particleSystem.rotation.y) * rotationSmoothing;

    // Apply scale
    const scaleSmoothing = 0.1;
    particleSystem.scale.lerp(
        new THREE.Vector3(state.targetScale, state.targetScale, state.targetScale),
        scaleSmoothing
    );

    // Also apply to star
    const star = scene.getObjectByName('star');
    if (star) {
        star.rotation.copy(particleSystem.rotation);
        star.scale.copy(particleSystem.scale);
    }

    // Add gentle auto-rotation in tree mode
    if (state.currentMode === 'tree' && Math.abs(state.rotationVelocity.y) < 0.001) {
        state.targetRotation.y += 0.002;
    }
}

// ===== Touch/Click handlers for modals =====
document.addEventListener('DOMContentLoaded', () => {
    // Close modals on click/touch
    elements.photoModal?.addEventListener('click', hidePhoto);
    elements.letterModal?.addEventListener('click', hideLoveLetter);

    // Prevent propagation on content
    document.getElementById('photo-container')?.addEventListener('click', e => e.stopPropagation());
    document.getElementById('letter-container')?.addEventListener('click', e => e.stopPropagation());
});

// ===== Start Application =====
init().catch(console.error);
