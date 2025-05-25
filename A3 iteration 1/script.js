// Audio Visualization Script with Color and Sound Fixes

// Get canvas and context
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const maxRadius = Math.min(canvas.width, canvas.height) * 0.5;
const minRadius = maxRadius * 0.3;
let angle = 0;
let ball = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    colorRGB: [192, 232, 255],        // Current render color
    targetColorRGB: [192, 232, 255]   // Gradient target color
};

// Comprehensive color mapping
const colorMap = {
    'Q': [241, 70, 58],      // 红 (Red)
    'A': [255, 87, 87],      // 粉红 (Pink)
    'Z': [247, 147, 38],     // 橙黄 (Orange-Yellow)
    'W': [247, 207, 38],     // 金黄 (Gold Yellow)
    'S': [246, 238, 58],     // 明黄 (Bright Yellow)
    'X': [255, 250, 146],    // 柔黄 (Soft Yellow)
    'E': [234, 129, 255],    // 紫粉 (Purple Pink)
    'D': [203, 108, 230],    // 紫红 (Purple Red)
    'C': [197, 167, 255],    // 淡紫 (Light Purple)
    'R': [241, 70, 58],      // 深红 (Deep Red)
    'F': [237, 104, 29],     // 橘红 (Orange-Red)
    'V': [255, 144, 89],     // 淡橘色 (Light Orange)
    'T': [246, 47, 47],      // 深红 (Deep Red)
    'G': [247, 57, 38],      // 深红 (Deep Red)
    'B': [255, 138, 129],    // 淡红 (Light Red)
    'Y': [32, 198, 123],     // 绿 (Green)
    'H': [126, 217, 87],     // 黄绿 (Yellow-Green)
    'N': [201, 226, 101],    // 橘色 (Orange)
    'U': [0, 203, 173],      // 青绿 (Cyan-Green)
    'J': [92, 230, 143],     // 绿 (Green)
    'M': [106, 235, 207]     // 蓝色 (Blue)
};

// Sound file paths
const keyToSound = {
    'q': 'sounds/Li_outer.wav',
    'a': 'sounds/Li_inner.wav',
    'z': 'sounds/Li_corer.wav',
    'w': 'sounds/Na_outer.wav',
    's': 'sounds/Na_inner.wav',
    'x': 'sounds/Na_corer.wav',
    'e': 'sounds/K_outer.wav',
    'd': 'sounds/K_inner.wav',
    'c': 'sounds/K_corer.wav',
    'r': 'sounds/Ca_outer.wav',
    'f': 'sounds/Ca_inner.wav',
    'v': 'sounds/Ca_corer.wav',
    't': 'sounds/Sr_outer.wav',
    'g': 'sounds/Sr_inner.wav',
    'b': 'sounds/Sr_corer.wav',
    'y': 'sounds/Ba_outer.wav',
    'h': 'sounds/Ba_inner.wav',
    'n': 'sounds/Ba_corer.wav',
    'u': 'sounds/Cu_outer.wav',
    'j': 'sounds/Cu_inner.wav',
    'm': 'sounds/Cu_corer.wav'
};

// Audio context and buffer management
let audioContext = null;
let audioBuffers = {};
let activeSources = {};

// Initialize audio context
function initAudioContext() {
    try {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    } catch (error) {
        console.error('Error initializing AudioContext:', error);
        alert('Web Audio API is not supported in this browser.');
    }
}

// Load audio buffer
async function loadAudioBuffer(key) {
    if (!keyToSound[key]) {
        console.warn(`No sound mapped for key: ${key}`);
        return null;
    }

    if (audioBuffers[key]) return audioBuffers[key];

    try {
        initAudioContext();

        const response = await fetch(keyToSound[key]);
        if (!response.ok) {
            console.error(`Failed to fetch sound file: ${keyToSound[key]}`);
            return null;
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = await audioContext.decodeAudioData(arrayBuffer);
        
        audioBuffers[key] = buffer;
        return buffer;
    } catch (error) {
        console.error(`Error loading audio for ${key}:`, error);
        return null;
    }
}

// Play sound
async function playSound(key) {
    if (!audioContext) initAudioContext();

    try {
        const buffer = await loadAudioBuffer(key);
        if (!buffer) return;

        stopSound(key);

        const source = audioContext.createBufferSource();
        source.buffer = buffer;

        const gainNode = audioContext.createGain();
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);

        source.start(0);

        activeSources[key] = { source, gainNode };
    } catch (error) {
        console.error(`Error playing sound for ${key}:`, error);
    }
}

// Stop sound
function stopSound(key) {
    if (activeSources[key]) {
        try {
            activeSources[key].source.stop();
            delete activeSources[key];
        } catch (error) {
            console.error(`Error stopping sound for ${key}:`, error);
        }
    }
}

// Color switching event listener
window.addEventListener('keydown', (e) => {
    const key = e.key.toUpperCase();
    
    // Check if the key exists in the colorMap
    if (colorMap[key]) {
        // Set the target color to the mapped color
        ball.targetColorRGB = colorMap[key];
    }
});

// Audio initialization and event listeners
function setupAudioListeners() {
    // Ensure audio context is created on first user interaction
    function handleFirstInteraction() {
        initAudioContext();
        document.removeEventListener('click', handleFirstInteraction);
        document.removeEventListener('keydown', handleFirstInteraction);
    }

    document.addEventListener('click', handleFirstInteraction);
    document.addEventListener('keydown', handleFirstInteraction);

    // Sound playing on keydown
    window.addEventListener('keydown', async (e) => {
        // Ensure audio context is resumed
        if (audioContext && audioContext.state === 'suspended') {
            try {
                await audioContext.resume();
            } catch (error) {
                console.error('Error resuming audio context:', error);
            }
        }

        // Play sound for the pressed key
        const key = e.key.toLowerCase();
        if (keyToSound[key]) {
            await playSound(key);
        }
    });

    // Stop sound on keyup
    window.addEventListener('keyup', (e) => {
        const key = e.key.toLowerCase();
        stopSound(key);
    });
}

// Draw ball function
function drawBall(x, y, radius) {
    const [r, g, b] = ball.colorRGB.map(v => Math.round(v));
    const gradient = ctx.createRadialGradient(
        x - radius * 0.3, y - radius * 0.3, radius * 0.1,
        x, y, radius
    );
    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 1)`);
    gradient.addColorStop(0.7, `rgba(${r}, ${g * 0.6}, ${b * 0.6}, 0.8)`);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.shadowBlur = 80;
    ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.5)`;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.closePath();
    ctx.shadowBlur = 0;
}

// Update animation
function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Color interpolation
    for (let i = 0; i < 3; i++) {
        const current = ball.colorRGB[i];
        const target = ball.targetColorRGB[i];
        ball.colorRGB[i] += (target - current) * 0.08;
    }
    
    const [r, g, b] = ball.colorRGB.map(v => Math.round(v));
    const scale = (Math.sin(angle) + 1) / 2;
    const radius = minRadius + (maxRadius - minRadius) * scale;
    angle += 0.02;
    
    // Rings and particles code
    const ringCount = 3;
    for (let i = 0; i < ringCount; i++) {
        const phaseOffset = i * Math.PI * 0.5;
        const localAngle = angle + phaseOffset;
        const ellipseAngle = localAngle * (1.5 + i * 0.15);
        const pulse = Math.sin(localAngle * 0.5 + i) * 50;

        let ellipseRadiusX = radius * (1.3 + i * 0.25) + pulse;
        let ellipseRadiusY = radius * (0.3 + 0.12 * i) + Math.sin(localAngle * 0.5) * radius * 0.35;

        ellipseRadiusX = Math.max(1, ellipseRadiusX);
        ellipseRadiusY = Math.max(1, ellipseRadiusY);

        const alpha = 0.15 + 0.2 * Math.sin(localAngle);
        const lineWidth = 10 - i;

        ctx.save();
        ctx.translate(ball.x, ball.y);
        ctx.rotate(ellipseAngle);

        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, ellipseRadiusX);
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`);
        gradient.addColorStop(1, `rgba(${b}, ${g}, ${r}, ${alpha.toFixed(2)})`);

        ctx.beginPath();
        ctx.ellipse(0, 0, ellipseRadiusX, ellipseRadiusY, 0, 0, 2 * Math.PI);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = lineWidth;
        ctx.shadowBlur = 50 + i * 10;
        ctx.shadowColor = `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
        ctx.stroke();
        ctx.closePath();

        // Particles
        const particleCount = 30;
        for (let j = 0; j < particleCount; j++) {
            const particleAngle = (localAngle + (Math.PI * 2 / particleCount) * j);
            const particleX = Math.cos(particleAngle) * ellipseRadiusX;
            const particleY = Math.sin(particleAngle) * ellipseRadiusY;

            ctx.beginPath();
            ctx.arc(particleX, particleY, 6, 0, 2 * Math.PI);
            ctx.fillStyle = `rgba(255, 255, 255, 0.8)`;
            ctx.fill();
            ctx.closePath();
        }
        ctx.restore();
    }
    
    drawBall(ball.x, ball.y, radius);
    requestAnimationFrame(update);
}

// Initial setup
function init() {
    setupAudioListeners();
    update();
}

// Start the application
init();