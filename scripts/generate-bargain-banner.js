const { createCanvas } = require('canvas');
const fs = require('fs');

// Create a canvas with a 3:1 aspect ratio
const width = 1200;
const height = 400;
const canvas = createCanvas(width, height);
const ctx = canvas.getContext('2d');

// Create gradient background
const gradient = ctx.createLinearGradient(0, 0, width, height);
gradient.addColorStop(0, '#2a2a2a');  // custom-charcoal
gradient.addColorStop(0.5, '#3a3a3a'); // slightly lighter
gradient.addColorStop(1, '#2a2a2a');   // back to custom-charcoal
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, width, height);

// Add some modern geometric shapes
ctx.beginPath();
ctx.moveTo(0, height * 0.7);
ctx.lineTo(width * 0.3, height);
ctx.lineTo(width * 0.5, height * 0.8);
ctx.lineTo(width * 0.7, height);
ctx.lineTo(width, height * 0.6);
ctx.lineTo(width, height);
ctx.lineTo(0, height);
ctx.closePath();
ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
ctx.fill();

// Add some diagonal lines for a modern look
ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
ctx.lineWidth = 2;
for (let i = 0; i < width; i += 50) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 100, height);
    ctx.stroke();
}

// Add some circles
for (let i = 0; i < 5; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const radius = Math.random() * 50 + 20;
    
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.05})`;
    ctx.fill();
}

// Convert to WebP and save
const buffer = canvas.toBuffer('image/webp', { quality: 0.9 });
fs.writeFileSync('../public/categories/bargain-box.webp', buffer);
