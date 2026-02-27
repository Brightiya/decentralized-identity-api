import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-safari-install-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule
  ],
  template: `
    <h2 mat-dialog-title>Install MetaMask on Safari</h2>
    <mat-dialog-content>
      <p>MetaMask is required to connect your wallet.</p>
      
      <p><strong>Option 1: App Store (Apple Silicon / macOS 12+ required)</strong></p>
      <p>
        <a [href]="data.appStoreUrl" target="_blank" rel="noopener noreferrer">
          Install MetaMask from App Store
        </a>
      </p>

      <p><strong>Option 2: If incompatible with your system, use MetaMask extension in another browser:</strong></p>
      <p>
        <a [href]="data.metamaskDownloadUrl" target="_blank" rel="noopener noreferrer">
          Download MetaMask (Chrome, Firefox, Brave, etc.)
        </a>
      </p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Close</button>
    </mat-dialog-actions>
  `,
  styles: [`
    ul { margin: 8px 0 16px 20px; padding-left: 0; }
    li { margin-bottom: 8px; }
    a { color: #6366f1; text-decoration: underline; }
  `]
})
export class SafariInstallDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<SafariInstallDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { appStoreUrl: string; metamaskDownloadUrl: string }
  ) {}
}