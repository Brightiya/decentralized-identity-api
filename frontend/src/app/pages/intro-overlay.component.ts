import { Component, Inject, HostListener } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-intro-overlay',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `

<div class="overlay-container" (click)="backdropClose($event)">

  <div class="video-card">

    <!-- Close button -->
    <button
      mat-icon-button
      class="close-btn"
      (click)="close()"
      aria-label="Close intro">
      <mat-icon>close</mat-icon>
    </button>

    <!-- Video -->
    <iframe
      [src]="safeUrl"
      frameborder="0"
      allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
      allowfullscreen>
    </iframe>

    <!-- Bottom intro text -->
    <div class="intro-text">

      <h2>PIMV</h2>

      <p>
        Privacy Identity  Management Vault
      </p>

      <span class="tagline">
        Secure • Decentralized • Self-Sovereign Identity
      </span>

      <button
        mat-stroked-button
        class="skip-btn"
        (click)="close()">
        Skip Intro
      </button>

    </div>

  </div>

</div>
`,
  styles: [`

/* ---------- BACKDROP ---------- */

.overlay-container {

  position: fixed;
  inset: 0;

  display: flex;
  align-items: center;
  justify-content: center;

  backdrop-filter: blur(35px) saturate(180%);
  -webkit-backdrop-filter: blur(35px) saturate(180%); /* Safari */

  background:
    radial-gradient(circle at 20% 30%, rgba(99,102,241,0.25), transparent 60%),
    radial-gradient(circle at 80% 70%, rgba(167,139,250,0.25), transparent 60%),
    rgba(15, 23, 42, 0.65);

  animation: fadeIn 0.5s ease;
  z-index: 1000;
}


/* ---------- VIDEO CARD ---------- */

.video-card {

  position: relative;

  width: min(1100px, 92vw);

  border-radius: 28px;

  overflow: hidden;

  background: rgba(255,255,255,0.08);

  backdrop-filter: blur(25px);
  -webkit-backdrop-filter: blur(25px); /* Safari */

  border: 1px solid rgba(255,255,255,0.15);

  box-shadow:
    0 40px 120px rgba(0,0,0,0.6),
    inset 0 0 0 1px rgba(255,255,255,0.04);

  animation: scaleIn 0.45s ease;
}


/* ---------- VIDEO ---------- */

iframe {
  width: 100%;
  height: 600px;
  display: block;
  background: black;
}


/* ---------- TEXT AREA ---------- */

.intro-text {

  padding: 28px;

  text-align: center;

  background:
    linear-gradient(
      to top,
      rgba(15,23,42,0.95),
      rgba(15,23,42,0.7),
      transparent
    );

  color: white;
}


.intro-text h2 {

  margin: 0 0 6px;

  font-size: 2.2rem;

  font-weight: 700;

  letter-spacing: 0.02em;
}


.intro-text p {

  margin: 0 0 6px;

  font-size: 1.2rem;

  opacity: 0.9;
}


.tagline {

  font-size: 0.95rem;

  opacity: 0.7;

  display: block;

  margin-bottom: 18px;
}


/* ---------- BUTTONS ---------- */

.skip-btn {

  border-color: rgba(255,255,255,0.35);

  color: white;

  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px); /* Safari */

}


.close-btn {

  position: absolute;

  top: 16px;

  right: 16px;

  z-index: 2;

  background: rgba(0,0,0,0.55);

  color: white;

  transition: 0.25s;
}

.close-btn:hover {
  transform: scale(1.05);
}


/* ---------- ANIMATIONS ---------- */

@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes scaleIn {
  from {
    transform: scale(0.92);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}


/* ---------- RESPONSIVE ---------- */

@media (max-width: 1024px) {

  iframe {
    height: 480px;
  }

}


@media (max-width: 768px) {

  iframe {
    height: 320px;
  }

  .intro-text h2 {
    font-size: 1.6rem;
  }

  .intro-text p {
    font-size: 1rem;
  }

}

`]
})
export class IntroOverlayComponent {

  safeUrl: SafeResourceUrl;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { videoId: string },
    private sanitizer: DomSanitizer,
    private dialogRef: MatDialogRef<IntroOverlayComponent>
  ) {

    this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(

  `https://www.youtube.com/embed/${data.videoId}?` +
  `autoplay=1` +
  `&rel=0` +
  `&modestbranding=1` +
  `&controls=1` +
  `&playsinline=1` +
  `&iv_load_policy=3` +   // hide annotations
  `&disablekb=1` +       // remove keyboard hints
  `&fs=1`

);

  }


  /* ---------- CLOSE METHODS ---------- */

  close() {
    this.dialogRef.close();
  }


  backdropClose(event: MouseEvent) {

    if ((event.target as HTMLElement).classList.contains('overlay-container')) {
      this.close();
    }

  }


  /* ---------- ESC KEY ---------- */

  @HostListener('document:keydown.escape')
  onEscape() {
    this.close();
  }

}