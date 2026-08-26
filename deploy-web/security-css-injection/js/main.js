// Main Orchestrator and Timeline Controller
import { Camera } from './camera.js';
import { ParticleSystem } from './particles.js';
import { Renderer } from './renderer.js';
import { SCENES } from './scenes.js';
import { SoundEngine } from './sound.js';
import { I18N } from './i18n.js';

class ExplainerApp {
  constructor() {
    this.canvas = document.getElementById('canvas-stage');
    this.ctx = this.canvas.getContext('2d', { alpha: false });

    // Timeline state
    this.currentSceneIndex = 0;
    this.sceneTime = 0;
    this.isPlaying = true;
    this.speed = 1.0;
    this.lastTimestamp = 0;
    this.lang = 'vi'; // Default to Vietnamese for the user, toggleable to English

    // Interactive state
    this.interactiveState = "A"; // "A" or "B"

    // Subsystems
    this.camera = new Camera(window.innerWidth, window.innerHeight);
    this.particles = new ParticleSystem();
    this.sound = new SoundEngine();
    this.renderer = new Renderer(this.canvas, this.ctx);
    this.renderer.lang = this.lang;

    // Ephemeral state passed to scenes
    this.sceneState = {
      particles: this.particles,
      sound: this.sound,
      customState: this.interactiveState
    };

    // UI Elements
    this.btnPlayPause = document.getElementById('btn-play-pause');
    this.btnRestart = document.getElementById('btn-restart');
    this.btnPrev = document.getElementById('btn-prev');
    this.btnNext = document.getElementById('btn-next');
    this.btnSpeed = document.getElementById('btn-speed');
    this.btnSound = document.getElementById('btn-sound');
    this.btnLang = document.getElementById('btn-lang');
    this.iconSoundOff = document.getElementById('icon-sound-off');
    this.iconSoundOn = document.getElementById('icon-sound-on');

    this.dotsTrack = document.getElementById('scene-dots-track');
    this.sceneLabelBadge = document.getElementById('scene-label-badge');
    this.sceneTitleBadge = document.getElementById('scene-title-badge');
    this.scrubberTrack = document.getElementById('scrubber-track-container');
    this.scrubberFill = document.getElementById('scrubber-progress-fill');

    // Top banner text
    this.txtBannerBadge = document.getElementById('txt-banner-badge');
    this.txtBannerTitle = document.getElementById('txt-banner-title');
    this.txtBannerSub = document.getElementById('txt-banner-sub');

    // Hotkey text
    this.txtHotkeyLabel = document.getElementById('txt-hotkey-label');
    this.txtHotkeySpace = document.getElementById('txt-hotkey-space');
    this.txtHotkeyNav = document.getElementById('txt-hotkey-nav');

    this.init();
  }

  init() {
    this.setupResize();
    this.buildDotsTrack();
    this.setupControls();
    this.setupKeyboard();
    this.setupCanvasInteractivity();
    this.applyLanguage();

    // Set initial scene camera
    this.goToScene(0, true);

    // Start loop
    requestAnimationFrame(this.loop.bind(this));
  }

  setupResize() {
    const handleResize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;

      this.canvas.width = w * dpr;
      this.canvas.height = h * dpr;
      this.canvas.style.width = `${w}px`;
      this.canvas.style.height = `${h}px`;

      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.scale(dpr, dpr);

      this.camera.resize(w, h);
    };

    window.addEventListener('resize', handleResize);
    handleResize();
  }

  buildDotsTrack() {
    this.dotsTrack.innerHTML = '';
    const texts = I18N[this.lang] || I18N.vi;

    SCENES.forEach((scene, idx) => {
      const dot = document.createElement('div');
      dot.className = 'scene-dot' + (idx === 0 ? ' active' : '');
      const sceneTitle = texts.scenes[scene.id]?.title || scene.title;
      dot.title = `${scene.id}. ${sceneTitle}`;
      dot.addEventListener('click', () => {
        this.goToScene(idx);
      });
      this.dotsTrack.appendChild(dot);
    });
  }

  setupControls() {
    // Play / Pause
    this.btnPlayPause.addEventListener('click', () => {
      this.togglePlayPause();
    });

    // Restart
    this.btnRestart.addEventListener('click', () => {
      this.goToScene(0);
      this.isPlaying = true;
      this.updatePlayPauseUI();
    });

    // Prev Scene
    this.btnPrev.addEventListener('click', () => {
      if (this.currentSceneIndex > 0) {
        this.goToScene(this.currentSceneIndex - 1);
      }
    });

    // Next Scene
    this.btnNext.addEventListener('click', () => {
      if (this.currentSceneIndex < SCENES.length - 1) {
        this.goToScene(this.currentSceneIndex + 1);
      }
    });

    // Speed Toggle (1x -> 1.5x -> 0.75x -> 1x)
    this.btnSpeed.addEventListener('click', () => {
      if (this.speed === 1.0) {
        this.speed = 1.5;
      } else if (this.speed === 1.5) {
        this.speed = 0.75;
      } else {
        this.speed = 1.0;
      }
      this.btnSpeed.textContent = `${this.speed}x`;
    });

    // Sound Toggle
    this.btnSound.addEventListener('click', () => {
      const isSoundOn = this.sound.toggle();
      this.iconSoundOff.style.display = isSoundOn ? 'none' : 'block';
      this.iconSoundOn.style.display = isSoundOn ? 'block' : 'none';
      this.btnSound.title = isSoundOn ? 'Mute Audio' : 'Unmute Audio';
      if (isSoundOn) {
        this.sound.playSceneTransition();
      }
    });

    // Language Toggle
    this.btnLang.addEventListener('click', () => {
      this.toggleLanguage();
    });

    // Scrubber click & drag
    let isScrubbing = false;
    const handleScrub = (e) => {
      const rect = this.scrubberTrack.getBoundingClientRect();
      const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const overallProgress = clickX / rect.width;

      // Map overall progress across 11 scenes
      const totalScenes = SCENES.length;
      const sceneFraction = 1 / totalScenes;
      const targetSceneIndex = Math.min(totalScenes - 1, Math.floor(overallProgress / sceneFraction));
      const progressInScene = (overallProgress - targetSceneIndex * sceneFraction) / sceneFraction;

      if (targetSceneIndex !== this.currentSceneIndex) {
        this.goToScene(targetSceneIndex);
      }
      const scene = SCENES[this.currentSceneIndex];
      this.sceneTime = progressInScene * scene.duration;
      this.updateScrubber();
    };

    this.scrubberTrack.addEventListener('mousedown', (e) => {
      isScrubbing = true;
      handleScrub(e);
    });

    window.addEventListener('mousemove', (e) => {
      if (isScrubbing) handleScrub(e);
    });

    window.addEventListener('mouseup', () => {
      isScrubbing = false;
    });
  }

  setupKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          this.togglePlayPause();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (this.currentSceneIndex > 0) {
            this.goToScene(this.currentSceneIndex - 1);
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (this.currentSceneIndex < SCENES.length - 1) {
            this.goToScene(this.currentSceneIndex + 1);
          }
          break;
        case 'KeyR':
          e.preventDefault();
          this.goToScene(0);
          this.isPlaying = true;
          this.updatePlayPauseUI();
          break;
        case 'KeyM':
          e.preventDefault();
          this.btnSound.click();
          break;
        case 'KeyL':
          e.preventDefault();
          this.toggleLanguage();
          break;
      }
    });
  }

  // Allow clicking on the canvas during Scene 7 to toggle State A vs State B
  setupCanvasInteractivity() {
    this.canvas.addEventListener('click', (e) => {
      // In Scene 7, toggle private state between 'A' and 'B' for interactive demonstration
      if (this.currentSceneIndex === 6) { // Scene 7
        this.interactiveState = (this.interactiveState === "A") ? "B" : "A";
        this.sceneState.customState = this.interactiveState;
        this.sceneTime = 0.5; // Re-evaluate condition
        this.particles.emitSparks(580, 110, this.interactiveState === "A" ? '#10b981' : '#c084fc', 20);
        if (this.sound.enabled) {
          this.sound.playPacketLaunch();
        }
      }
    });
  }

  toggleLanguage() {
    this.lang = (this.lang === 'vi') ? 'en' : 'vi';
    this.renderer.lang = this.lang;
    this.btnLang.textContent = this.lang.toUpperCase();
    this.applyLanguage();
    this.updateSceneUI();
    this.buildDotsTrack();
  }

  applyLanguage() {
    const t = I18N[this.lang] || I18N.vi;
    this.txtBannerBadge.textContent = t.bannerBadge;
    this.txtBannerTitle.textContent = t.bannerTitle;
    this.txtBannerSub.textContent = t.bannerSubtitle;

    const isVi = this.lang === 'vi';
    this.txtHotkeyLabel.textContent = isVi ? "Phím tắt:" : "Keyboard:";
    this.txtHotkeySpace.textContent = isVi ? "Phát/Dừng" : "Play/Pause";
    this.txtHotkeyNav.textContent = isVi ? "Đổi cảnh" : "Navigate";
  }

  togglePlayPause() {
    this.isPlaying = !this.isPlaying;
    this.updatePlayPauseUI();
  }

  updatePlayPauseUI() {
    const isVi = this.lang === 'vi';
    if (this.isPlaying) {
      this.btnPlayPause.innerHTML = `
        <svg viewBox="0 0 24 24">
          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
        </svg>`;
      this.btnPlayPause.title = isVi ? "Tạm dừng (Space)" : "Pause (Space)";
    } else {
      this.btnPlayPause.innerHTML = `
        <svg viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z"/>
        </svg>`;
      this.btnPlayPause.title = isVi ? "Phát tiếp (Space)" : "Play (Space)";
    }
  }

  goToScene(index, immediateCamera = false) {
    this.currentSceneIndex = Math.max(0, Math.min(SCENES.length - 1, index));
    this.sceneTime = 0;
    this.sceneState = {
      particles: this.particles,
      sound: this.sound,
      customState: this.interactiveState
    };

    const scene = SCENES[this.currentSceneIndex];
    if (scene.camera) {
      this.camera.setTarget(scene.camera.x, scene.camera.y, scene.camera.zoom, immediateCamera);
    }

    if (this.sound && !immediateCamera) {
      this.sound.playSceneTransition();
    }

    this.updateSceneUI();
    this.updateScrubber();
  }

  updateSceneUI() {
    const scene = SCENES[this.currentSceneIndex];
    const texts = I18N[this.lang] || I18N.vi;
    const isVi = this.lang === 'vi';

    const sceneTitle = texts.scenes[scene.id]?.title || scene.title;
    this.sceneLabelBadge.textContent = isVi ? `Cảnh ${scene.id} / ${SCENES.length}` : `Scene ${scene.id} / ${SCENES.length}`;
    this.sceneTitleBadge.textContent = sceneTitle;

    // Update dots track
    const dots = this.dotsTrack.querySelectorAll('.scene-dot');
    dots.forEach((d, idx) => {
      d.classList.toggle('active', idx === this.currentSceneIndex);
      d.classList.toggle('completed', idx < this.currentSceneIndex);
    });
  }

  updateScrubber() {
    const currentScene = SCENES[this.currentSceneIndex];
    const progressInCurrent = Math.min(1, this.sceneTime / currentScene.duration);
    const totalScenes = SCENES.length;
    const overallProgress = (this.currentSceneIndex + progressInCurrent) / totalScenes;
    this.scrubberFill.style.width = `${(overallProgress * 100).toFixed(2)}%`;
  }

  loop(timestamp) {
    if (!this.lastTimestamp) this.lastTimestamp = timestamp;
    const rawDt = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;

    const dt = Math.min(rawDt, 0.1);

    // Update timeline if playing
    if (this.isPlaying) {
      this.sceneTime += dt * this.speed;
      const currentScene = SCENES[this.currentSceneIndex];

      if (this.sceneTime >= currentScene.duration) {
        if (this.currentSceneIndex < SCENES.length - 1) {
          this.goToScene(this.currentSceneIndex + 1);
        } else {
          this.isPlaying = false;
          this.updatePlayPauseUI();
        }
      }
    }

    // Update Scrubber
    this.updateScrubber();

    // Update Camera
    this.camera.update(dt);

    // Update Particles
    this.particles.update(dt, timestamp / 1000);
    this.renderer.time = timestamp / 1000;

    // Render Scene
    this.render();

    requestAnimationFrame(this.loop.bind(this));
  }

  render() {
    const ctx = this.ctx;
    const w = window.innerWidth;
    const h = window.innerHeight;

    // 1. Draw screen-space background
    this.renderer.drawBackground(w, h, this.camera);

    // 2. Begin camera world transformation
    this.camera.apply(ctx);

    // Draw world grid & ambient auras
    this.renderer.drawWorldGrid(ctx, this.camera);
    this.renderer.drawTerritoryAuras(ctx, this.renderer.time);

    // Draw ambient cosmic particles
    this.particles.drawAmbient(ctx);

    // Draw current active scene
    const currentScene = SCENES[this.currentSceneIndex];
    const progress = Math.min(1, this.sceneTime / currentScene.duration);

    currentScene.draw(this.renderer, ctx, progress, this.sceneState);

    // Draw particle sparks & shockwaves
    this.particles.drawShockwaves(ctx);
    this.particles.drawSparks(ctx);

    // 3. Restore camera transform to screen space
    this.camera.restore(ctx);

    // 4. Draw screen-space master concept header
    this.renderer.drawCinematicHeader(w, h, currentScene);
  }
}

// Instantiate on DOM load
window.addEventListener('DOMContentLoaded', () => {
  window.app = new ExplainerApp();
});
