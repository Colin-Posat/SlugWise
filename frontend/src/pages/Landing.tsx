import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Brain, Share2, Search } from "lucide-react";
import "../styles/Landing.css";
import "../styles/index.css";

class Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  canvasWidth: number;
  canvasHeight: number;
  ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) {
    this.ctx = ctx;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.x = Math.random() * canvasWidth;
    this.y = Math.random() * canvasHeight;
    this.size = Math.random() * 3 + 1;
    this.speedX = (Math.random() - 0.5) * 1.5;
    this.speedY = (Math.random() - 0.5) * 1;
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;

    // Ensure particles bounce properly without slowing down
    if (this.x <= 0 || this.x >= this.canvasWidth) {
      this.speedX *= -1; // Reverse speed direction
      this.x = Math.max(this.size, Math.min(this.x, this.canvasWidth - this.size)); // Prevent sticking
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


const Landing = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  let particlesArray: Particle[] = [];
  let animationFrameId: number;
  let resizeTimeout: ReturnType<typeof setTimeout> | null = null;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const initParticles = () => {
      particlesArray = Array.from({ length: 100 }, () => new Particle(ctx, canvas.width, canvas.height));
    };

    const animateParticles = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particlesArray.forEach((particle) => {
        particle.update();
        particle.draw();
      });
      animationFrameId = requestAnimationFrame(animateParticles);
    };

    const resizeCanvas = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);

      // Fade out particles
      canvas.style.transition = "opacity 0.3s ease-out";
      canvas.style.opacity = "0";

      resizeTimeout = setTimeout(() => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        initParticles();

        // Fade in particles
        canvas.style.transition = "opacity 0.3s ease-in";
        canvas.style.opacity = "1";

        animateParticles();
      }, 50);
    };

    // Initial setup
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.opacity = "1";
    initParticles();
    animateParticles();

    window.addEventListener("resize", resizeCanvas);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="landing-container">
      {/* HEADER */}
      <header className="header">
        <Link to="/" className="logo">
          <img src="/images/fliply_logo.png" alt="Fliply Logo" className="logo-img" />
          <span className="nav-title">Delavora</span>
        </Link>
        <nav className="nav">
          <Link className="about" to="/contact">Contact Us</Link>
          <Link className="login" to="/login">Sign In</Link>
        </nav>
      </header>

      <canvas ref={canvasRef} id="particles"></canvas>

      {/* HERO SECTION */}
      <main>
        <section className="hero">
          <h1>Create, Share, and Study Smarter with Delavora</h1>
          <p>The shortcut to better grades</p>
          <button onClick={() => (window.location.href = "/signup")} className="btn">
            <span className="btn-text">Get Started</span>
          </button>
        </section>

        {/* FEATURES SECTION */}
        <section className="features">
          <div className="card">
            <Brain size={40} className="icon" />
            <h3>AI-Powered Creation</h3>
            <p>
              Simply upload your notes and let our AI transform them into
              comprehensive study sets that you can view as flashcards or as a quiz.
            </p>
          </div>
          <div className="card">
            <Share2 size={40} className="icon" />
            <h3>Share with Peers</h3>
            <p>Post your study sets and help others learn. Collaborate with classmates.</p>
          </div>
          <div className="card">
            <Search size={40} className="icon" />
            <h3>Discover Class Sets</h3>
            <p>Browse study sets created by students to find content similar to past homework, quizzes, and exams.</p>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer>
        <p>© 2024 SlugWise. All rights reserved.</p>
        <nav>
          <Link to="/terms">Terms of Service</Link>
          <Link to="/privacy">Privacy</Link>
        </nav>
      </footer>
    </div>
  );
};

export default Landing;
