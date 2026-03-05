import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-intro-overlay',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="overlay-container">

      <div class="video-card">

        <button mat-icon-button
                class="close-btn"
                (click)="close()">
          <mat-icon>close</mat-icon>
        </button>

        <iframe
          [src]="safeUrl"
          frameborder="0"
          allow="autoplay; encrypted-media; fullscreen"
          allowfullscreen>
        </iframe>

        <div class="intro-text">
          <h2>Welcome to PIMV</h2>
          <p>Secure • Decentralized • Self-Sovereign Identity</p>
        </div>

      </div>

    </div>
  `,
  styles: [`
    .overlay-container {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(30px) saturate(160%);
      background: radial-gradient(circle at 20% 30%, rgba(99,102,241,0.25), transparent 60%),
                  radial-gradient(circle at 80% 70%, rgba(167,139,250,0.2), transparent 60%),
                  rgba(15, 23, 42, 0.55);
      animation: fadeIn 0.4s ease;
    }

    .video-card {
      position: relative;
      width: min(1000px, 90vw);
      border-radius: 28px;
      overflow: hidden;
      background: rgba(255,255,255,0.08);
      backdrop-filter: blur(25px);
      border: 1px solid rgba(255,255,255,0.15);
      box-shadow: 0 40px 120px rgba(0,0,0,0.6);
      animation: scaleIn 0.4s ease;
    }

    iframe {
      width: 100%;
      height: 560px;
      display: block;
    }

    .intro-text {
      padding: 24px;
      text-align: center;
      background: linear-gradient(to top, rgba(15,23,42,0.9), transparent);
      color: white;
    }

    .intro-text h2 {
      margin: 0 0 8px;
      font-size: 2rem;
      font-weight: 700;
    }

    .intro-text p {
      margin: 0;
      opacity: 0.8;
      font-size: 1.1rem;
    }

    .close-btn {
      position: absolute;
      top: 16px;
      right: 16px;
      z-index: 2;
      background: rgba(0,0,0,0.5);
      color: white;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    @keyframes scaleIn {
      from { transform: scale(0.92); opacity: 0; }
      to   { transform: scale(1); opacity: 1; }
    }

    @media (max-width: 768px) {
      iframe {
        height: 300px;
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
      `https://www.youtube.com/embed/${data.videoId}?autoplay=1&rel=0&modestbranding=1`
    );
  }

  close() {
    this.dialogRef.close();
  }
}