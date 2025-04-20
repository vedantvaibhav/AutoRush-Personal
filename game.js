// Game constants
const BASE_CANVAS_WIDTH = 900;
const BASE_CANVAS_HEIGHT = 500;
const GRAVITY = 1;                     // Keep current gravity
const SLIDE_FORCE = -10;                // Keep current upward force
const BASE_DOWNWARD_SLIDE_FORCE = 0.5;  // Base downward slide force
const BASE_OBSTACLE_WIDTH = 60;          // Keep current obstacle width
const BASE_OBSTACLE_HEIGHT = 70;         // Keep current obstacle height
const BASE_OBSTACLE_SPEED = 11;          // Base obstacle speed
const BASE_OBSTACLE_GAP = 350;           // Base gap between obstacles
const BASE_MIN_OBSTACLE_DISTANCE = 250;  // Base minimum distance
const CORNER_PADDING = 40;
const MAX_PARTICLES = 150;
const PARTICLE_LIFETIME = 40;
const SMOOTH_ACCELERATION = 0.45;        // Keep current acceleration
const MAX_ROTATION = 5;                  // Keep current maximum rotation angle
const ROTATION_SPEED = 0.3;              // Keep current base rotation speed
const UPWARD_ROTATION_SPEED = 0.8;       // Previous upward rotation speed
const UPWARD_MAX_ROTATION = 15;          // Previous upward maximum rotation

// New settings
const SLOPE_ANGLE = 15;                  // Keep current tilt angle
const BASE_MOVEMENT_SPEED = 7;           // Base movement speed
const TREE_GENERATION_INTERVAL = 10;    // Keep current tree generation interval

// Vehicle-specific dimensions
const VEHICLE_DIMENSIONS = {
    'Auto 1': { width: 90, height: 60 },      // Classic Auto
    'Vehicle01': { width: 118, height: 53 },  // SUV
    'Vehicle02': { width: 112, height: 36 },  // Sedan
    'Vehicle09': { width: 119, height: 38 },  // Race Car
    'Vehicle06': { width: 114, height: 37 },  // Sports Car
    'Vehicle05': { width: 112, height: 51 },  // Truck
    'Vehicle12': { width: 113, height: 64 },  // Bus
    'Vehicle13': { width: 143, height: 63 }   // Vintage Car
};

// Check URL parameters for start flag
const urlParams = new URLSearchParams(window.location.search);
const shouldStartImmediately = urlParams.get('start') === 'true';

// Initialize game state
let gameStarted = false;
let gameOver = false;
let isPaused = false;
let score = 0;
let personalBest = parseInt(localStorage.getItem('personalBest')) || 0;
let showStartScreen = !shouldStartImmediately; // Don't show start screen if shouldStartImmediately is true
let allVehiclesUnlocked = localStorage.getItem('allVehiclesUnlocked') === 'true';

// Define valid vehicles with unlock status
const validVehicles = [
    { id: 'Auto 1', name: 'Classic Auto', unlocked: true },
    { id: 'Vehicle01', name: 'SUV', unlocked: allVehiclesUnlocked },
    { id: 'Vehicle02', name: 'Sedan', unlocked: allVehiclesUnlocked },
    { id: 'Vehicle09', name: 'Race Car', unlocked: allVehiclesUnlocked },
    { id: 'Vehicle06', name: 'Sports Car', unlocked: allVehiclesUnlocked },
    { id: 'Vehicle05', name: 'Truck', unlocked: allVehiclesUnlocked },
    { id: 'Vehicle12', name: 'Bus', unlocked: allVehiclesUnlocked },
    { id: 'Vehicle13', name: 'Vintage Car', unlocked: allVehiclesUnlocked }
];

// Get selected vehicle with validation
let selectedVehicle = localStorage.getItem('selectedVehicle');
if (!selectedVehicle || !validVehicles.some(v => v.id === selectedVehicle && v.unlocked)) {
    selectedVehicle = 'Auto 1';
    localStorage.setItem('selectedVehicle', selectedVehicle);
}

// Update personal best display
document.getElementById('personalBest').textContent = personalBest;

// Create vehicle image with error handling
const vehicleImg = new Image();
vehicleImg.src = `assets/${selectedVehicle}.svg`;
vehicleImg.onerror = function() {
    console.error('Failed to load vehicle image:', vehicleImg.src);
    if (selectedVehicle !== 'Auto 1') {
        selectedVehicle = 'Auto 1';
        localStorage.setItem('selectedVehicle', selectedVehicle);
        vehicleImg.src = `assets/${selectedVehicle}.svg`;
    }
};
vehicleImg.onload = function() {
    console.log('Vehicle image loaded successfully:', selectedVehicle);
};

// Load obstacle images with error handling
const obstacleImages = [];
for (let i = 1; i <= 4; i++) {
    const img = new Image();
    img.src = `assets/${encodeURIComponent(`Obstacle ${i}.svg`)}`;
    img.onerror = function() {
        console.error('Failed to load obstacle image:', img.src);
    };
    img.onload = function() {
        console.log('Obstacle image loaded:', img.src);
    };
    obstacleImages.push(img);
}

// Game state
let player = {
    x: 100,
    y: BASE_CANVAS_HEIGHT / 2,
    velocityY: 0,
    width: VEHICLE_DIMENSIONS[selectedVehicle].width,
    height: VEHICLE_DIMENSIONS[selectedVehicle].height,
    isSliding: false,
    rotation: 0
};

let obstacles = [];
let lastObstacleX = BASE_CANVAS_WIDTH;
let lastObstaclePosition = null;  // Track last obstacle position
let scale = 1; // Scale factor for responsive design
let particles = [];

// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d', { alpha: false });
const touchArea = document.getElementById('touchArea');
const pauseButton = document.getElementById('pauseButton');

// Enable image smoothing
ctx.imageSmoothingEnabled = true;
ctx.imageSmoothingQuality = 'high';

// Set initial canvas size
function resizeCanvas() {
    const container = document.getElementById('gameContainer');
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    // Set canvas size to match container but with higher resolution for sharper rendering
    canvas.width = BASE_CANVAS_WIDTH * 2;  // Double the resolution
    canvas.height = BASE_CANVAS_HEIGHT * 2;
    
    // Scale the canvas display size
    canvas.style.width = `${containerWidth}px`;
    canvas.style.height = `${containerHeight}px`;
    
    // Update scale for game calculations
    scale = containerWidth / BASE_CANVAS_WIDTH;
    
    // Scale the context to match the high resolution
    ctx.resetTransform();  // Reset any previous transforms
    ctx.scale(2, 2);
    
    // Reset image smoothing after resize
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
}

// Event listeners
function handleTouchStart(e) {
    e.preventDefault();
    if (showStartScreen) {
        startGame();
        return;
    }
    if (!gameOver && !isPaused) {
        player.isSliding = true;
    }
    if (gameOver) {
        resetGame();
    }
}

function handleTouchEnd(e) {
    e.preventDefault();
    player.isSliding = false;
}

// Add touch event listeners
touchArea.addEventListener('touchstart', handleTouchStart, { passive: false });
touchArea.addEventListener('touchend', handleTouchEnd, { passive: false });
touchArea.addEventListener('touchcancel', handleTouchEnd, { passive: false });

// Add click/tap listeners for non-touch devices and better responsiveness
touchArea.addEventListener('mousedown', (e) => {
    // Only handle mouse events if not a touch device
    if (!('ontouchstart' in window)) {
        handleTouchStart(e);
    }
});

touchArea.addEventListener('mouseup', (e) => {
    // Only handle mouse events if not a touch device
    if (!('ontouchstart' in window)) {
        handleTouchEnd(e);
    }
});

// Prevent default touch behaviors on the game container
document.getElementById('gameContainer').addEventListener('touchmove', (e) => {
    e.preventDefault();
}, { passive: false });

// Add keyboard controls for desktop
document.addEventListener('keydown', (e) => {
    // Prevent default space bar behavior
    if (e.code === 'Space') {
        e.preventDefault();
        if (showStartScreen) {
            startGame();
            return;
        }
        if (!gameOver && !isPaused) {
            player.isSliding = true;
        }
        if (gameOver) {
            resetGame();
        }
    }
    // Use P key exclusively for pause
    if (e.code === 'KeyP') {
        e.preventDefault();
        togglePause();
    }
});

document.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        player.isSliding = false;
    }
});

// Update pause button listener (click only)
pauseButton.addEventListener('click', (e) => {
    e.preventDefault();
    if (!gameOver) { // Only allow pause when game is not over
        togglePause();
    }
});

// Add Play button listener
document.getElementById('playButton').addEventListener('click', () => {
    if (showStartScreen) {
        startGame();
    } else if (gameOver) {
        resetGame();
    }
});

function togglePause() {
    isPaused = !isPaused;
    const pauseButton = document.getElementById('pauseButton');
    if (isPaused) {
        pauseButton.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M6.00468 2.10188C6.01365 2.10786 6.02265 2.11386 6.03167 2.11987L13.9432 7.39424C14.1721 7.54682 14.3844 7.68829 14.5474 7.81976C14.7175 7.95696 14.9181 8.14722 15.0335 8.42555C15.1861 8.79343 15.1861 9.20688 15.0335 9.57475C14.9181 9.85308 14.7175 10.0433 14.5474 10.1805C14.3844 10.312 14.1722 10.4535 13.9433 10.606L6.00471 15.8984C5.7249 16.085 5.47329 16.2527 5.25979 16.3684C5.04614 16.4842 4.75288 16.6165 4.4106 16.5961C3.97279 16.57 3.56834 16.3535 3.30374 16.0037C3.09687 15.7303 3.04429 15.4129 3.02211 15.1709C2.99996 14.9291 2.99998 14.6267 3 14.2904L3 3.74237C3 3.73153 3 3.72071 3 3.70994C2.99998 3.37364 2.99996 3.07124 3.02211 2.82943C3.04429 2.58743 3.09687 2.27004 3.30374 1.99658C3.56834 1.6468 3.97279 1.43035 4.4106 1.4042C4.75288 1.38377 5.04614 1.51608 5.25979 1.63186C5.47328 1.74756 5.72488 1.91532 6.00468 2.10188Z" fill="white"/>
            </svg>`;
    } else {
        pauseButton.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M9 0.75C4.44365 0.75 0.75 4.44365 0.75 9C0.75 13.5563 4.44365 17.25 9 17.25C13.5563 17.25 17.25 13.5563 17.25 9C17.25 4.44365 13.5563 0.75 9 0.75ZM7.875 6.75C7.875 6.33579 7.53921 6 7.125 6C6.71079 6 6.375 6.33579 6.375 6.75V11.25C6.375 11.6642 6.71079 12 7.125 12C7.53921 12 7.875 11.6642 7.875 11.25V6.75ZM11.625 6.75C11.625 6.33579 11.2892 6 10.875 6C10.4608 6 10.125 6.33579 10.125 6.75V11.25C10.125 11.6642 10.4608 12 10.875 12C11.2892 12 11.625 11.6642 11.625 11.25V6.75Z" fill="white"/>
            </svg>`;
    }
}

// Handle window resize
window.addEventListener('resize', resizeCanvas);
resizeCanvas(); // Initial resize

// Game functions
function createObstacle() {
    // Calculate randomness multiplier based on score
    const randomnessMultiplier = 1 + (Math.floor(score / 30) * 0.2);
    
    // Create obstacles in different positions with better vertical spacing
    const positions = [
        { y: CORNER_PADDING, name: 'top' },
        { y: BASE_CANVAS_HEIGHT - CORNER_PADDING - BASE_OBSTACLE_HEIGHT, name: 'bottom' },
        { y: BASE_CANVAS_HEIGHT / 2 - BASE_OBSTACLE_HEIGHT / 2, name: 'middle' }
    ];
    
    // Filter out the last position to avoid consecutive same positions
    let availablePositions = positions;
    if (lastObstaclePosition) {
        availablePositions = positions.filter(pos => pos.name !== lastObstaclePosition);
    }
    
    // Add random variation to position
    const position = availablePositions[Math.floor(Math.random() * availablePositions.length)];
    const randomYVariation = (Math.random() - 0.5) * 50 * randomnessMultiplier;
    const finalY = Math.max(
        CORNER_PADDING,
        Math.min(
            BASE_CANVAS_HEIGHT - CORNER_PADDING - BASE_OBSTACLE_HEIGHT,
            position.y + randomYVariation
        )
    );
    
    lastObstaclePosition = position.name;
    
    obstacles.push({
        x: BASE_CANVAS_WIDTH,
        y: finalY,
        width: BASE_OBSTACLE_WIDTH,
        height: BASE_OBSTACLE_HEIGHT,
        imageIndex: Math.floor(Math.random() * obstacleImages.length)
    });
    lastObstacleX = BASE_CANVAS_WIDTH;
}

class Particle {
    constructor(x, y) {
        this.x = x + player.width * 0.2;
        this.y = y + player.height * 0.7;
        this.width = Math.random() * 4 + 3;
        this.height = Math.random() * 8 + 6;
        this.lifetime = PARTICLE_LIFETIME;
        this.speedY = (Math.random() - 0.5) * 1.5;
        this.speedX = -BASE_OBSTACLE_SPEED * 0.4;
        this.opacity = Math.random() * 0.3 + 0.1;
        this.color = `rgba(34, 93, 49, ${this.opacity})`;
        this.rotation = Math.random() * Math.PI;
        this.rotationSpeed = (Math.random() - 0.5) * 0.1;
        this.blurRadius = Math.random() * 2 + 1;
        this.isCircle = Math.random() > 0.5; // Randomly decide if particle is circle or oval
        this.circleRadius = Math.random() * 3 + 2; // Radius for circle particles
    }

    update() {
        this.lifetime--;
        this.x += this.speedX;
        this.y += this.speedY;
        this.width = Math.max(0, this.width * 0.98);
        this.height = Math.max(0, this.height * 0.98);
        this.circleRadius = Math.max(0, this.circleRadius * 0.98);
        this.rotation += this.rotationSpeed;
        this.opacity = (this.lifetime / PARTICLE_LIFETIME) * this.opacity;
        this.color = `rgba(34, 93, 49, ${this.opacity})`;
        this.blurRadius = Math.max(0, this.blurRadius * 0.99);
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        // Create blur effect by drawing multiple semi-transparent particles
        for (let i = 0; i < 3; i++) {
            const offset = (i - 1) * this.blurRadius;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            
            if (this.isCircle) {
                // Draw circle
                ctx.arc(offset, offset, this.circleRadius, 0, Math.PI * 2);
            } else {
                // Draw oval
                ctx.ellipse(offset, offset, this.width, this.height, 0, 0, Math.PI * 2);
            }
            
            ctx.fill();
        }
        
        ctx.restore();
    }
}

function update() {
    if (gameOver || isPaused) return;

    // Calculate speed multiplier based on score
    const speedMultiplier = 1 + (Math.floor(score / 25) * 0.1);
    const currentObstacleSpeed = BASE_OBSTACLE_SPEED * speedMultiplier;
    const currentMovementSpeed = BASE_MOVEMENT_SPEED * speedMultiplier;
    const currentDownwardSlideForce = BASE_DOWNWARD_SLIDE_FORCE * speedMultiplier;

    // Calculate difficulty multiplier based on score
    const difficultyMultiplier = 1 + (Math.floor(score / 40) * 0.15);
    const currentObstacleGap = BASE_OBSTACLE_GAP / difficultyMultiplier;
    const currentMinDistance = BASE_MIN_OBSTACLE_DISTANCE * difficultyMultiplier;

    // Update player with more responsive upward movement
    if (player.isSliding) {
        // Faster upward acceleration
        player.velocityY = Math.max(player.velocityY - SMOOTH_ACCELERATION, SLIDE_FORCE);
        
        // Quicker rotation for responsive feel (using previous values)
        player.rotation = Math.max(player.rotation - UPWARD_ROTATION_SPEED, -UPWARD_MAX_ROTATION);
        
        // Continuous smoke generation while spacebar is pressed
        if (particles.length < MAX_PARTICLES) {
            for (let i = 0; i < 3; i++) {
                particles.push(new Particle(player.x, player.y));
            }
        }
    } else {
        // Increased falling speed with scaled downward slide force
        player.velocityY = Math.min(player.velocityY + GRAVITY + currentDownwardSlideForce, 2.5 * speedMultiplier);
        
        // Add subtle rotation based on falling speed
        const fallSpeedRatio = Math.abs(player.velocityY) / (2.5 * speedMultiplier);
        const targetRotation = MAX_ROTATION * fallSpeedRatio;
        player.rotation = Math.min(player.rotation + ROTATION_SPEED * fallSpeedRatio, targetRotation);
        
        // Minimal smoke when falling
        if (particles.length < MAX_PARTICLES && Math.random() > 0.9) {
            particles.push(new Particle(player.x, player.y));
        }
    }
    
    player.y += player.velocityY;

    // Update particles
    particles = particles.filter(particle => {
        particle.update();
        return particle.lifetime > 0;
    });

    // Check boundaries with padding
    if (player.y < CORNER_PADDING) {
        player.y = CORNER_PADDING;
        player.velocityY = 0;
    }
    if (player.y > BASE_CANVAS_HEIGHT - player.height - CORNER_PADDING) {
        player.y = BASE_CANVAS_HEIGHT - player.height - CORNER_PADDING;
        player.velocityY = 0;
    }

    // Update obstacles with current speed
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].x -= currentObstacleSpeed;

        // Check collision with improved hitbox
        if (
            player.x + player.width * 0.8 > obstacles[i].x &&
            player.x + player.width * 0.2 < obstacles[i].x + obstacles[i].width &&
            player.y + player.height * 0.8 > obstacles[i].y &&
            player.y + player.height * 0.2 < obstacles[i].y + obstacles[i].height
        ) {
            gameOver = true;
            if (score > personalBest) {
                personalBest = score;
                localStorage.setItem('personalBest', personalBest);
                document.getElementById('personalBest').textContent = personalBest;
            }
        }

        // Remove off-screen obstacles
        if (obstacles[i].x + obstacles[i].width < 0) {
            obstacles.splice(i, 1);
            score++;
        }
    }

    // Generate new obstacles with current spacing and randomness
    const lastObstacle = obstacles[obstacles.length - 1];
    const randomnessMultiplier = 1 + (Math.floor(score / 30) * 0.2);
    const randomDistance = Math.random() * 100 * randomnessMultiplier;
    
    if (!lastObstacle || 
        (BASE_CANVAS_WIDTH - (lastObstacle.x + lastObstacle.width) >= currentMinDistance + randomDistance)) {
        createObstacle();
    }

    // Check for score milestone
    if (score >= 100 && !allVehiclesUnlocked) {
        allVehiclesUnlocked = true;
        localStorage.setItem('allVehiclesUnlocked', 'true');
        validVehicles.forEach(vehicle => vehicle.unlocked = true);
        showToast('All vehicles unlocked!');
    }
}

function draw() {
    // Clear canvas
    ctx.fillStyle = '#8ED4A0';
    ctx.fillRect(0, 0, BASE_CANVAS_WIDTH, BASE_CANVAS_HEIGHT);

    // Save the context state before drawing game elements
    ctx.save();
    
    // Draw with crisp edges for game elements
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Draw start screen
    if (showStartScreen) {
        // Add semi-transparent overlay
        ctx.fillStyle = 'rgba(142, 212, 160, 0.7)';
        ctx.fillRect(0, 0, BASE_CANVAS_WIDTH, BASE_CANVAS_HEIGHT);
        
        // Draw start text
        ctx.fillStyle = '#225D31';
        ctx.font = '36px Neulis';
        const startText = 'Auto Rush';
        const textMetrics = ctx.measureText(startText);
        const x = (BASE_CANVAS_WIDTH - textMetrics.width) / 2;
        const y = BASE_CANVAS_HEIGHT / 2 - 20;
        ctx.fillText(startText, x, y);

        // Draw secondary text
        ctx.fillStyle = '#225D31';
        ctx.font = '500 18px Quicksand';
        const secondaryText = 'press space to start';
        const secondaryMetrics = ctx.measureText(secondaryText);
        const secondaryX = (BASE_CANVAS_WIDTH - secondaryMetrics.width) / 2;
        ctx.fillText(secondaryText, secondaryX, y + 40);

        // Show pick ride button and hide pause button
        document.querySelector('.pick-ride-button').style.display = 'block';
        document.getElementById('pauseButton').style.visibility = 'hidden';
        return; // Exit draw function early
    }

    // Draw particles
    particles.forEach(particle => particle.draw(ctx));

    // Draw player with rotation and error handling
    if (vehicleImg.complete && vehicleImg.naturalWidth !== 0) {
        ctx.save();
        ctx.translate(player.x + player.width/2, player.y + player.height/2);
        ctx.rotate(player.rotation * Math.PI / 180);
        
        // Calculate drawing dimensions based on vehicle type
        const vehicleDimensions = VEHICLE_DIMENSIONS[selectedVehicle];
        ctx.drawImage(
            vehicleImg,
            -vehicleDimensions.width/2,
            -vehicleDimensions.height/2,
            vehicleDimensions.width,
            vehicleDimensions.height
        );
        
        ctx.restore();
    } else {
        ctx.fillStyle = '#225D31';
        ctx.fillRect(player.x, player.y, player.width, player.height);
    }

    // Draw obstacles with error handling
    obstacles.forEach(obstacle => {
        const img = obstacleImages[obstacle.imageIndex];
        if (img && img.complete && img.naturalWidth !== 0) {
            ctx.drawImage(img, obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        } else {
            ctx.fillStyle = '#225D31';
            ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        }
    });

    // Restore the context state
    ctx.restore();

    // Draw score and other UI elements
    ctx.font = '500 18px Quicksand';
    ctx.fillStyle = '#225D31';
    ctx.fillText(`Score: ${score}`, 20, 40);

    // Draw game over with overlay
    if (gameOver) {
        // Add semi-transparent overlay
        ctx.fillStyle = 'rgba(142, 212, 160, 0.7)';
        ctx.fillRect(0, 0, BASE_CANVAS_WIDTH, BASE_CANVAS_HEIGHT);
        
        // Draw game over text
        ctx.fillStyle = '#225D31';
        ctx.font = '36px Neulis';
        const gameOverText = 'Game Over';
        const textMetrics = ctx.measureText(gameOverText);
        const x = (BASE_CANVAS_WIDTH - textMetrics.width) / 2;
        const y = BASE_CANVAS_HEIGHT / 2 - 20;
        ctx.fillText(gameOverText, x, y);

        // Draw secondary text with specified styling
        ctx.fillStyle = '#225D31';
        ctx.font = '500 18px Quicksand';
        const secondaryText = 'hit the space bar to play again!';
        const secondaryMetrics = ctx.measureText(secondaryText);
        const secondaryX = (BASE_CANVAS_WIDTH - secondaryMetrics.width) / 2;
        ctx.fillText(secondaryText, secondaryX, y + 40);

        // Hide pause button and show pick ride button and play button
        document.getElementById('pauseButton').style.visibility = 'hidden';
        document.querySelector('.pick-ride-button').style.display = 'block';
        document.getElementById('playButton').style.display = 'block';
        document.getElementById('playButton').textContent = 'Play Again'; // Change button text
    } else {
        // Show pause button and hide pick ride button and play button when game is not over
        document.getElementById('pauseButton').style.visibility = 'visible';
        document.querySelector('.pick-ride-button').style.display = 'none';
        document.getElementById('playButton').style.display = 'none';
    }

    // Draw pause screen
    if (isPaused && !gameOver) {
        // Add semi-transparent overlay
        ctx.fillStyle = 'rgba(142, 212, 160, 0.7)';
        ctx.fillRect(0, 0, BASE_CANVAS_WIDTH, BASE_CANVAS_HEIGHT);
        
        // Draw pause text
        ctx.fillStyle = '#225D31';
        ctx.font = '36px Neulis';
        const pauseText = 'Paused';
        const textMetrics = ctx.measureText(pauseText);
        const x = (BASE_CANVAS_WIDTH - textMetrics.width) / 2;
        const y = BASE_CANVAS_HEIGHT / 2 - 20;
        ctx.fillText(pauseText, x, y);

        // Draw secondary text with specified styling
        ctx.fillStyle = '#225D31';
        ctx.font = '500 18px Quicksand';
        const secondaryText = 'press P to resume';
        const secondaryMetrics = ctx.measureText(secondaryText);
        const secondaryX = (BASE_CANVAS_WIDTH - secondaryMetrics.width) / 2;
        ctx.fillText(secondaryText, secondaryX, y + 40);
    }
}

function resetGame() {
    player.y = BASE_CANVAS_HEIGHT / 2;
    player.velocityY = 0;
    obstacles = [];
    score = 0;
    gameOver = false;
    isPaused = false;
    showStartScreen = false; // Don't show start screen
    lastObstaclePosition = null;
    particles = []; // Clear particles
    
    // Reset and show pause button
    const pauseButton = document.getElementById('pauseButton');
    pauseButton.style.visibility = 'visible';
    pauseButton.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M9 0.75C4.44365 0.75 0.75 4.44365 0.75 9C0.75 13.5563 4.44365 17.25 9 17.25C13.5563 17.25 17.25 13.5563 17.25 9C17.25 4.44365 13.5563 0.75 9 0.75ZM7.875 6.75C7.875 6.33579 7.53921 6 7.125 6C6.71079 6 6.375 6.33579 6.375 6.75V11.25C6.375 11.6642 6.71079 12 7.125 12C7.53921 12 7.875 11.6642 7.875 11.25V6.75ZM11.625 6.75C11.625 6.33579 11.2892 6 10.875 6C10.4608 6 10.125 6.33579 10.125 6.75V11.25C10.125 11.6642 10.4608 12 10.875 12C11.2892 12 11.625 11.6642 11.625 11.25V6.75Z" fill="white"/>
        </svg>`;
    
    // Hide pick ride button and play button
    document.querySelector('.pick-ride-button').style.display = 'none';
    document.getElementById('playButton').style.display = 'none';
}

function startGame() {
    gameStarted = true;
    gameOver = false;
    isPaused = false;
    showStartScreen = false;
    // Hide pick ride button and play button when game starts
    document.querySelector('.pick-ride-button').style.display = 'none';
    document.getElementById('playButton').style.display = 'none';
}

// Game loop
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Start the game
gameLoop();

// Toast notification function
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.remove('hide');
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
        toast.classList.add('hide');
    }, 3000);
} 