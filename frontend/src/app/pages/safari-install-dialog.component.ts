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
/**
 * SafariInstallDialogComponent
 *
 * Angular Material dialog shown to Safari users when MetaMask
 * is not detected in the browser.
 *
 * Purpose:
 * - Inform the user that MetaMask is required for wallet interaction.
 * - Provide installation links for:
 *   • MetaMask Mobile (App Store)
 *   • MetaMask browser download page
 *
 * The dialog receives installation URLs via MAT_DIALOG_DATA so the
 * component remains reusable and environment-independent.
 */
export class SafariInstallDialogComponent {

  constructor(

    /**
     * Reference to the currently opened Angular Material dialog.
     *
     * Allows the component to:
     * - Close the dialog programmatically
     * - Return data to the caller if needed
     */
    public dialogRef: MatDialogRef<SafariInstallDialogComponent>,

    /**
     * Data injected when the dialog is opened.
     *
     * Contains external URLs used by the dialog buttons:
     *
     * appStoreUrl
     * → Link to MetaMask Mobile on the Apple App Store.
     *
     * metamaskDownloadUrl
     * → Official MetaMask website download page.
     */
    @Inject(MAT_DIALOG_DATA)
    public data: {
      appStoreUrl: string;
      metamaskDownloadUrl: string;
    }

  ) {}

}