const canvas = document.getElementById('trackCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const liveSpeedUI = document.getElementById('liveSpeed');
const sec1Box = document.getElementById('sec1Box');
const sec2Box = document.getElementById('sec2Box');
const sec3Box = document.getElementById('sec3Box');
const s1Time = document.getElementById('s1Time');
const s2Time = document.getElementById('s2Time');
const s3Time = document.getElementById('s3Time');
const tvLapTime = document.getElementById('tvLapTime');
const s1BestUI = document.getElementById('s1Best');
const s2BestUI = document.getElementById('s2Best');
const s3BestUI = document.getElementById('s3Best');
const lapBestUI = document.getElementById('lapBest');

// Physics Settings
const trackWidth = 55;
const maxSpeedBase = 330; 
const maxGripSpeed = 215; 

//Short Track
const pathOriginal = new Path2D();
pathOriginal.moveTo(150, 530); pathOriginal.lineTo(550, 530); pathOriginal.lineTo(600, 530); pathOriginal.lineTo(620, 490); pathOriginal.lineTo(660, 510); pathOriginal.bezierCurveTo(780, 540, 880, 410, 820, 310); pathOriginal.bezierCurveTo(760, 210, 920, 150, 880, 80); pathOriginal.lineTo(180, 80); pathOriginal.arc(180, 110, 30, -Math.PI / 2, Math.PI / 2, true); pathOriginal.lineTo(350, 140); pathOriginal.bezierCurveTo(500, 140, 650, 100, 600, 250); pathOriginal.quadraticCurveTo(580, 320, 480, 320); pathOriginal.lineTo(430, 320); pathOriginal.lineTo(430, 400); pathOriginal.lineTo(300, 400); pathOriginal.lineTo(260, 400); pathOriginal.bezierCurveTo(260, 240, 120, 240, 120, 420); pathOriginal.lineTo(150, 460); pathOriginal.bezierCurveTo(50, 460, 50, 530, 150, 530);

//Red Bull Ring
const pathRBR = new Path2D();
pathRBR.moveTo(1050, 730); 
pathRBR.lineTo(750, 775); 
pathRBR.bezierCurveTo(670, 790, 650, 770, 660, 730); 
pathRBR.lineTo(400, 330); 
pathRBR.lineTo(190, 180); 
pathRBR.bezierCurveTo(140, 140, 140, 110, 200, 130); 
pathRBR.lineTo(950, 195); 
pathRBR.bezierCurveTo(1040, 210, 850, 350, 700, 310); 
pathRBR.bezierCurveTo(550, 270, 520, 360, 580, 440); 
pathRBR.lineTo(650, 545); 
pathRBR.bezierCurveTo(700, 620, 780, 500, 850, 430); 
pathRBR.lineTo(1380, 430); 
pathRBR.quadraticCurveTo(1450, 430, 1420, 530); 
pathRBR.lineTo(1380, 640); 
pathRBR.quadraticCurveTo(1350, 720, 1200, 720); 
pathRBR.lineTo(1050, 730); 
pathRBR.closePath();

//Spa Francorchamps
const pathSpa = new Path2D();
pathSpa.moveTo(315, 690);
pathSpa.lineTo(30, 820);
pathSpa.lineTo(280, 500);
pathSpa.bezierCurveTo(120, 450, 480, 460, 425, 390);
pathSpa.lineTo(1200, 60);
pathSpa.lineTo(1360, 40); 
pathSpa.bezierCurveTo(1550, 50, 1680, 180, 1540, 260);
pathSpa.bezierCurveTo(1350, 260, 950, 100, 1020, 270);
pathSpa.bezierCurveTo(1060, 400, 900, 460, 1040, 480);
pathSpa.lineTo(1370, 600);
pathSpa.quadraticCurveTo(1480, 700, 1415, 870);
pathSpa.bezierCurveTo(1350, 950, 1150, 750, 1080, 675);
pathSpa.lineTo(830, 525);
pathSpa.quadraticCurveTo(600, 400, 395, 660);
pathSpa.lineTo(380, 610);
pathSpa.lineTo(310, 640);
pathSpa.lineTo(315, 690);
pathSpa.closePath();


//Track Database
function makeGate(x, y, angleDeg) {
    const rad = angleDeg * Math.PI / 180;
    const halfW = trackWidth / 2;
    return {
        x1: x + Math.cos(rad) * halfW,
        y1: y + Math.sin(rad) * halfW,
        x2: x - Math.cos(rad) * halfW,
        y2: y - Math.sin(rad) * halfW
    };
}

const gatesOriginal = {
    finish: makeGate(200, 530, 90),
    s1: makeGate(400, 80, 90),
    s2: makeGate(280, 400, 90)
};

const gatesRBR = {
    finish: makeGate(950, 745, 98), 
    s1: makeGate(515, 137, 85),  
    s2: makeGate(1020, 430, 90)  
};

const gatesSpa = {
    finish: makeGate(250, 720, 65),
    s1: makeGate(850, 210, 67),     
    s2: makeGate(1025, 345, -6)     
};

const tracks = {
    original: {
        path: pathOriginal,
        start: { x: 180, y: 530, angle: 0 },
        targets: { s1: 5.2, s2: 6.4, s3: 4.8 },
        pb: { s1: Infinity, s2: Infinity, s3: Infinity, lap: Infinity },
        checkers: gatesOriginal,
        gates: {
            finish: (x, y, px, py) => px <= 200 && x > 200 && y > 490 && y < 570,
            s1: (x, y, px, py) => px >= 400 && x < 400 && y < 140,
            s2: (x, y, px, py) => px >= 280 && x < 280 && y > 360 && y < 440
        }
    },
    rbr: {
        path: pathRBR,
        start: { x: 990, y: 739, angle: Math.PI + 0.15 }, 
        targets: { s1: 4.8, s2: 5.5, s3: 4.2 },
        pb: { s1: Infinity, s2: Infinity, s3: Infinity, lap: Infinity },
        checkers: gatesRBR,
        gates: {
            finish: (x, y, px, py) => px >= 950 && x < 950 && y > 700 && y < 800, 
            s1: (x, y, px, py) => px <= 515 && x > 515 && y > 80 && y < 200,
            s2: (x, y, px, py) => px <= 1020 && x > 1020 && y > 380 && y < 480
        }
    },
    spa: {
        path: pathSpa,
        start: { x: 280, y: 706, angle: 2.71 }, 
        targets: { s1: 7.5, s2: 10.5, s3: 6.5 },
        pb: { s1: Infinity, s2: Infinity, s3: Infinity, lap: Infinity },
        checkers: gatesSpa,
        gates: {
            finish: (x, y, px, py) => px > 250 && x <= 250 && y > 650 && y < 800,
            s1: (x, y, px, py) => px < 850 && x >= 850 && y > 100 && y < 300,
            s2: (x, y, px, py) => py < 345 && y >= 345 && x > 900 && x < 1150
        }
    }
};

//Cookies save game 
function loadSavedData() {
    for (const trackId in tracks) {
        const savedPB = localStorage.getItem(`gp_pb_${trackId}`);
        if (savedPB) {
            try {
                const parsed = JSON.parse(savedPB);
                tracks[trackId].pb.s1 = parsed.s1 !== undefined ? parsed.s1 : Infinity;
                tracks[trackId].pb.s2 = parsed.s2 !== undefined ? parsed.s2 : Infinity;
                tracks[trackId].pb.s3 = parsed.s3 !== undefined ? parsed.s3 : Infinity;
                tracks[trackId].pb.lap = parsed.lap !== undefined ? parsed.lap : Infinity;
            } catch (e) {
                console.error("Error parsing saved PB data for track: " + trackId, e);
            }
        }
    }
    
    const savedTrackId = localStorage.getItem('gp_active_track');
    if (savedTrackId && tracks[savedTrackId]) {
        currentTrackId = savedTrackId;
    } else {
        currentTrackId = 'spa'; 
    }
}

function saveTrackPB(trackId) {
    const pbData = {
        s1: tracks[trackId].pb.s1,
        s2: tracks[trackId].pb.s2,
        s3: tracks[trackId].pb.s3,
        lap: tracks[trackId].pb.lap
    };
    localStorage.setItem(`gp_pb_${trackId}`, JSON.stringify(pbData));
}

loadSavedData();
let currentTrackData = tracks[currentTrackId];

let car = {
    x: 0, y: 0, angle: 0, speed: 0, 
    acceleration: 3.2, friction: 0.988, grassFriction: 0.80, turnSpeed: 0.038
};

let keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, KeyW: false, KeyS: false, KeyA: false, KeyD: false };
let lapStartTime = 0, sectorStartTime = 0, currentSector = 1, hasCrossedStartLine = false;
let lastS1 = 0, lastS2 = 0, lastS3 = 0;

window.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.code)) keys[e.code] = true;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    
    // Reset car
    if (e.code === 'KeyR') {
        resetCar();
    }
});

window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.code)) keys[e.code] = false;
});

function resetCar() {
    car.x = currentTrackData.start.x;
    car.y = currentTrackData.start.y;
    car.angle = currentTrackData.start.angle;
    car.speed = 0;

    hasCrossedStartLine = false;
    currentSector = 1;
    lapStartTime = 0;
    
    sec1Box.className = "dash-panel"; 
    sec2Box.className = "dash-panel"; 
    sec3Box.className = "dash-panel";
    s1Time.innerText = "--.---"; 
    s2Time.innerText = "--.---"; 
    s3Time.innerText = "--.---"; 
    tvLapTime.innerText = "00.000";
}

// Change the track
window.switchTrack = function(trackId) {
    document.querySelectorAll('.track-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('btn-' + trackId).classList.add('active');

    currentTrackId = trackId;
    currentTrackData = tracks[trackId];
    
    localStorage.setItem('gp_active_track', trackId);

    resetCar();

    s1BestUI.innerText = currentTrackData.pb.s1 === Infinity ? "--.---" : currentTrackData.pb.s1.toFixed(3);
    s2BestUI.innerText = currentTrackData.pb.s2 === Infinity ? "--.---" : currentTrackData.pb.s2.toFixed(3);
    s3BestUI.innerText = currentTrackData.pb.s3 === Infinity ? "--.---" : currentTrackData.pb.s3.toFixed(3);
    lapBestUI.innerText = currentTrackData.pb.lap === Infinity ? "--.---" : currentTrackData.pb.lap.toFixed(3);
};

function drawTrack() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "#444"; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.lineWidth = trackWidth; ctx.stroke(currentTrackData.path);
    ctx.strokeStyle = "#fff"; ctx.lineWidth = trackWidth - 6; ctx.stroke(currentTrackData.path);
    ctx.strokeStyle = "#1e3d1e"; ctx.lineWidth = trackWidth - 10; ctx.stroke(currentTrackData.path);

    ctx.lineWidth = 4; ctx.setLineDash([4, 4]);
    const c = currentTrackData.checkers;
    
    ctx.strokeStyle = '#ffffff'; ctx.beginPath(); 
    ctx.moveTo(c.finish.x1, c.finish.y1); ctx.lineTo(c.finish.x2, c.finish.y2); ctx.stroke();

    ctx.strokeStyle = '#ffff55'; ctx.beginPath(); 
    ctx.moveTo(c.s1.x1, c.s1.y1); ctx.lineTo(c.s1.x2, c.s1.y2); ctx.stroke();

    ctx.strokeStyle = '#d155ff'; ctx.beginPath(); 
    ctx.moveTo(c.s2.x1, c.s2.y1); ctx.lineTo(c.s2.x2, c.s2.y2); ctx.stroke();
    
    ctx.setLineDash([]); 
}

function drawCar() {
    ctx.save();
    ctx.translate(car.x, car.y); 
    ctx.rotate(car.angle);
    
    ctx.fillStyle = "#ff2222"; ctx.fillRect(-8, -4, 16, 8); 
    ctx.fillStyle = "#111111"; ctx.fillRect(2, -5, 3, 10);   
    ctx.fillStyle = "#111111"; ctx.fillRect(-9, -5, 3, 10);  
    ctx.fillStyle = "#ffffff"; ctx.fillRect(4, -1.5, 3, 3);   
    ctx.fillStyle = "#ffff00"; ctx.fillRect(-1, -1, 2, 2);    
    
    ctx.restore(); 
}

function update() {
    if (keys.ArrowUp || keys.KeyW) car.speed += car.acceleration;
    else if (keys.ArrowDown || keys.KeyS) car.speed -= car.acceleration * 2.2; 
    else car.speed *= car.friction; 

    if (car.speed > maxSpeedBase) car.speed = maxSpeedBase;
    if (car.speed < 0) car.speed = 0;

    ctx.lineWidth = trackWidth;
    const onTrack = ctx.isPointInStroke(currentTrackData.path, car.x, car.y);
    if (!onTrack) car.speed *= car.grassFriction; 

    let currentTurnSpeed = car.turnSpeed;
    if (car.speed > maxGripSpeed) {
        const understeerFactor = maxGripSpeed / car.speed;
        currentTurnSpeed *= (understeerFactor * 0.65); 
    }

    if (keys.ArrowLeft || keys.KeyA) car.angle -= currentTurnSpeed;
    if (keys.ArrowRight || keys.KeyD) car.angle += currentTurnSpeed;

    const prevX = car.x;
    const prevY = car.y;

    car.x += Math.cos(car.angle) * (car.speed * 0.015); 
    car.y += Math.sin(car.angle) * (car.speed * 0.015);

    if (hasCrossedStartLine) {
        const totalElapsed = (Date.now() - lapStartTime) / 1000;
        tvLapTime.innerText = totalElapsed.toFixed(3);
        
        const currentSecElapsed = (Date.now() - sectorStartTime) / 1000;
        if (currentSector === 1) s1Time.innerText = currentSecElapsed.toFixed(3);
        if (currentSector === 2) s2Time.innerText = currentSecElapsed.toFixed(3);
        if (currentSector === 3) s3Time.innerText = currentSecElapsed.toFixed(3);
    }

    if (currentTrackData.gates.s1(car.x, car.y, prevX, prevY)) {
        if (currentSector === 1 && hasCrossedStartLine) {
            lastS1 = (Date.now() - sectorStartTime) / 1000;
            s1Time.innerText = lastS1.toFixed(3);
            
            if (lastS1 <= currentTrackData.targets.s1) sec1Box.className = "dash-panel purple";
            else if (lastS1 < currentTrackData.pb.s1) sec1Box.className = "dash-panel green";
            else sec1Box.className = "dash-panel yellow";
            
            if (lastS1 < currentTrackData.pb.s1) { 
                currentTrackData.pb.s1 = lastS1; 
                s1BestUI.innerText = lastS1.toFixed(3); 
                saveTrackPB(currentTrackId);
            }
            currentSector = 2; sectorStartTime = Date.now(); sec2Box.className = "dash-panel active";
        }
    }

    if (currentTrackData.gates.s2(car.x, car.y, prevX, prevY)) {
        if (currentSector === 2 && hasCrossedStartLine) {
            lastS2 = (Date.now() - sectorStartTime) / 1000;
            s2Time.innerText = lastS2.toFixed(3);
            
            if (lastS2 <= currentTrackData.targets.s2) sec2Box.className = "dash-panel purple";
            else if (lastS2 < currentTrackData.pb.s2) sec2Box.className = "dash-panel green";
            else sec2Box.className = "dash-panel yellow";
            
            if (lastS2 < currentTrackData.pb.s2) { 
                currentTrackData.pb.s2 = lastS2; 
                s2BestUI.innerText = lastS2.toFixed(3); 
                saveTrackPB(currentTrackId);
            }
            currentSector = 3; sectorStartTime = Date.now(); sec3Box.className = "dash-panel active";
        }
    }

    if (currentTrackData.gates.finish(car.x, car.y, prevX, prevY)) {
        if (!hasCrossedStartLine) {
            hasCrossedStartLine = true;
            lapStartTime = Date.now(); sectorStartTime = Date.now(); currentSector = 1;
            sec1Box.className = "dash-panel active"; sec2Box.className = "dash-panel"; sec3Box.className = "dash-panel";
            s1Time.innerText = "--.---"; s2Time.innerText = "--.---"; s3Time.innerText = "--.---";
        } else if (currentSector === 3) {
            lastS3 = (Date.now() - sectorStartTime) / 1000;
            s3Time.innerText = lastS3.toFixed(3);
            
            if (lastS3 <= currentTrackData.targets.s3) sec3Box.className = "dash-panel purple";
            else if (lastS3 < currentTrackData.pb.s3) sec3Box.className = "dash-panel green";
            else sec3Box.className = "dash-panel yellow";
            
            if (lastS3 < currentTrackData.pb.s3) { 
                currentTrackData.pb.s3 = lastS3; 
                s3BestUI.innerText = lastS3.toFixed(3); 
            }

            const finalLapTime = lastS1 + lastS2 + lastS3;
            tvLapTime.innerText = finalLapTime.toFixed(3);
            
            if (finalLapTime < currentTrackData.pb.lap) { 
                currentTrackData.pb.lap = finalLapTime; 
                lapBestUI.innerText = finalLapTime.toFixed(3); 
            }
            
            saveTrackPB(currentTrackId);
            
            currentSector = 1; lapStartTime = Date.now(); sectorStartTime = Date.now();
            setTimeout(() => {
                if(currentSector === 1) { 
                    sec1Box.className = "dash-panel active"; sec2Box.className = "dash-panel"; sec3Box.className = "dash-panel";
                    s1Time.innerText = "--.---"; s2Time.innerText = "--.---"; s3Time.innerText = "--.---";
                }
            }, 2500); 
        }
    }

    liveSpeedUI.innerText = Math.round(car.speed);
    liveSpeedUI.style.color = (car.speed > maxGripSpeed && (keys.ArrowLeft || keys.KeyA || keys.ArrowRight || keys.KeyD)) ? "#ffff55" : "#ffffff";

    drawTrack();
    drawCar();

    requestAnimationFrame(update);
}

// Initialize the game
window.switchTrack(currentTrackId);
update();