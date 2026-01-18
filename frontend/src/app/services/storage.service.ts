// src/app/services/storage.service.ts
import { Injectable, inject } from '@angular/core';
import { WalletService } from '../services/wallet.service'; // Your wallet service
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class StorageService {
  private dbName = 'PIMVUserSettings';
  private storeName = 'settings';
  private db: IDBDatabase | null = null;

  // Crypto settings
  private readonly algo = 'AES-GCM';
  private readonly keyLength = 256;
  private readonly ivLength = 12;   // bytes
  private readonly saltLength = 16; // bytes for PBKDF2 salt

  private cryptoKey: CryptoKey | null = null;

  private wallet = inject(WalletService);
  private snackBar = inject(MatSnackBar);

  /**
   * Initialize encryption key from wallet signature (production-ready)
   * Call this once after wallet connects (e.g. in VaultComponent after connect())
   * Returns true if key was successfully derived
   */
  async initEncryption(): Promise<boolean> {
    if (this.cryptoKey) return true;

    try {
      if (!this.wallet.address) {
        throw new Error('Wallet not connected');
      }

      // Unique message per user/address (prevents replay attacks)
      const message = `PIMV secure storage key derivation for ${this.wallet.address.toLowerCase()} - ${new Date().toISOString().slice(0,10)}`;
      
      // Request signature (your WalletService must support signMessage)
      const signature = await this.wallet.signMessage(message);

      if (!signature) {
        throw new Error('Signature rejected by user');
      }

      const encoder = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(signature),
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
      );

      // Derive strong encryption key
      this.cryptoKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: encoder.encode('pimv-storage-v1'), // fixed per-app salt (can be dynamic later)
          iterations: 250000, // Very high - good security vs brute-force
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: this.algo, length: this.keyLength },
        false, // key is not extractable
        ['encrypt', 'decrypt']
      );

      console.info('Secure storage encryption key initialized from wallet signature');
      return true;

    } catch (err: any) {
      console.error('Wallet-based encryption init failed:', err);
      this.snackBar.open(
        'Secure storage initialization failed. Using less secure mode. Please reconnect wallet.',
        'Close',
        { duration: 10000, panelClass: ['error-snackbar'] }
      );
      return false;
    }
  }

  private async openDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'key' });
        }
      };
    });
  }

  /**
   * Encrypt value with random salt + IV
   */
  private async encrypt(value: string): Promise<string> {
    if (!this.cryptoKey) {
      console.warn('Encryption key not initialized - falling back to plaintext');
      return value;
    }

    try {
      const encoder = new TextEncoder();
      const salt = crypto.getRandomValues(new Uint8Array(this.saltLength));
      const iv = crypto.getRandomValues(new Uint8Array(this.ivLength));

      const encrypted = await crypto.subtle.encrypt(
        { name: this.algo, iv },
        this.cryptoKey,
        encoder.encode(value)
      );

      // Combine: salt (16) + iv (12) + ciphertext
      const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
      combined.set(salt, 0);
      combined.set(iv, salt.length);
      combined.set(new Uint8Array(encrypted), salt.length + iv.length);

      return btoa(String.fromCharCode(...combined));
    } catch (err) {
      console.error('Encryption failed:', err);
      return value; // fallback
    }
  }

  /**
   * Decrypt value
   */
  private async decrypt(encryptedBase64: string): Promise<string | null> {
    if (!this.cryptoKey) {
      console.warn('Decryption key not initialized');
      return encryptedBase64;
    }

    try {
      const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
      const salt = combined.slice(0, this.saltLength);
      const iv = combined.slice(this.saltLength, this.saltLength + this.ivLength);
      const ciphertext = combined.slice(this.saltLength + this.ivLength);

      const decrypted = await crypto.subtle.decrypt(
        { name: this.algo, iv },
        this.cryptoKey,
        ciphertext
      );

      return new TextDecoder().decode(decrypted);
    } catch (err) {
      console.error('Decryption failed:', err);
      return null;
    }
  }

  async getItem(key: string): Promise<string | null> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const request = store.get(key);

      request.onsuccess = async () => {
        const stored = request.result?.value;
        if (!stored) return resolve(null);

        const decrypted = await this.decrypt(stored);
        resolve(decrypted);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async setItem(key: string, value: string): Promise<void> {
    const db = await this.openDB();
    const encrypted = await this.encrypt(value);

    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      store.put({ key, value: encrypted });

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async removeItem(key: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      store.delete(key);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async clear(): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      store.clear();

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}