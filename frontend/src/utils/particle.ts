export class Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  canvasWidth: number;
  canvasHeight: number;
  ctx: CanvasRenderingContext2D;
  readonly MAX_SPEED = 0.5; // ✅ Adjust this to control max speed

  constructor(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) {
    this.ctx = ctx;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.x = Math.random() * canvasWidth;
    this.y = Math.random() * canvasHeight;
    this.size = Math.random() * 3 + 1;

    // ✅ Set initial speed within a slow range
    this.speedX = (Math.random() - 0.5) * 1.5;
    this.speedY = (Math.random() - 0.5) * 1;

    // ✅ Clamp speed immediately to prevent fast movement
    this.speedX = Math.max(-this.MAX_SPEED, Math.min(this.speedX, this.MAX_SPEED));
    this.speedY = Math.max(-this.MAX_SPEED, Math.min(this.speedY, this.MAX_SPEED));
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;

    // ✅ Hard cap speed on every update (prevents acceleration bugs)
    this.speedX = Math.max(-this.MAX_SPEED, Math.min(this.speedX, this.MAX_SPEED));
    this.speedY = Math.max(-this.MAX_SPEED, Math.min(this.speedY, this.MAX_SPEED));

    // ✅ Bounce off walls
    if (this.x <= 0 || this.x >= this.canvasWidth) {
      this.speedX *= -1;
      this.x = Math.max(this.size, Math.min(this.x, this.canvasWidth - this.size));
    }
    if (this.y <= 0 || this.y >= this.canvasHeight) {
      this.speedY *= -1;
      this.y = Math.max(this.size, Math.min(this.y, this.canvasHeight - this.size));
    }
  }

  draw() {
    this.ctx.fillStyle = "rgba(227, 243, 255, 0.7)";
    this.ctx.beginPath();
    this.ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    this.ctx.closePath();
    this.ctx.fill();
  }
}
