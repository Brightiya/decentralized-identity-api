import { Injectable, inject } from '@angular/core';
// Injectable: marks the service for dependency injection
// inject: function-based dependency injection

import { WalletService } from '../services/wallet.service'; // Your wallet service
// Service used for wallet interactions (e.g., signing messages)

import { MatSnackBar } from '@angular/material/snack-bar';
// Angular Material service for displaying notifications

@Injectable({ providedIn: 'root' })
// Registers the service as a singleton across the application
export class StorageService {

  private dbName = 'PIMVUserSettings';
  // Name of the IndexedDB database

  private storeName = 'settings';
  // Name of the object store inside the database

  private db: IDBDatabase | null = null;
  // Holds the database instance once opened

  // Crypto settings
  private readonly algo = 'AES-GCM';
  // Encryption algorithm used

  private readonly keyLength = 256;
  // Key length in bits

  private readonly ivLength = 12;   // bytes
  // Initialization Vector length (recommended for AES-GCM)

  private readonly saltLength = 16; // bytes for PBKDF2 salt
  // Salt length for key derivation

  private cryptoKey: CryptoKey | null = null;
  // Derived encryption key (kept in memory only)

  private wallet = inject(WalletService);
  // Injects wallet service

  private snackBar = inject(MatSnackBar);
  // Injects snackbar for user feedback

  /**
   * Initialize encryption key from wallet signature (production-ready)
   * Call this once after wallet connects (e.g. in VaultComponent after connect())
   * Returns true if key was successfully derived
   */
  async initEncryption(): Promise<boolean> {

    if (this.cryptoKey) return true;
    // Avoid re-initializing if key already exists

    try {
      if (!this.wallet.address) {
        throw new Error('Wallet not connected');
        // Ensures wallet is connected before deriving key
      }

      // Unique message per user/address (prevents replay attacks)
      const message = `PIMV secure storage key derivation for ${this.wallet.address.toLowerCase()} - ${new Date().toISOString().slice(0,10)}`;
      
      // Request signature (your WalletService must support signMessage)
      const signature = await this.wallet.signMessage(message);
      // Requests cryptographic signature from wallet

      if (!signature) {
        throw new Error('Signature rejected by user');
        // Ensures user approved signing
      }

      const encoder = new TextEncoder();
      // Encoder to convert strings to byte arrays

      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(signature),
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
      );
      // Imports signature as key material for derivation

      // Derive strong encryption key
      this.cryptoKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: encoder.encode('pimv-storage-v1'), 
          iterations: 250000, // Very high - good security vs brute-force
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: this.algo, length: this.keyLength },
        false, // key is not extractable
        ['encrypt', 'decrypt']
      );
      // Derives AES-GCM encryption key from signature

      console.info('Secure storage encryption key initialized from wallet signature');
      // Logs successful initialization

      return true;

    } catch (err: any) {
      console.error('Wallet-based encryption init failed:', err);
      // Logs failure

      this.snackBar.open(
        'Secure storage initialization failed. Using less secure mode. Please reconnect wallet.',
        'Close',
        { duration: 10000, panelClass: ['error-snackbar'] }
      );
      // Displays user warning

      return false;
    }
  }

  private async openDB(): Promise<IDBDatabase> {

    if (this.db) return this.db;
    // Reuse existing database instance if already opened

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      // Opens IndexedDB database

      request.onerror = () => reject(request.error);
      // Rejects on error

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
        // Stores and resolves database instance
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        // Gets database instance during upgrade

        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'key' });
          // Creates object store if it does not exist
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
      // Falls back to plaintext if key is missing
    }

    try {
      const encoder = new TextEncoder();
      // Encodes string into bytes

      const salt = crypto.getRandomValues(new Uint8Array(this.saltLength));
      // Generates random salt

      const iv = crypto.getRandomValues(new Uint8Array(this.ivLength));
      // Generates random initialization vector(IV)

      const encrypted = await crypto.subtle.encrypt(
        { name: this.algo, iv },
        this.cryptoKey,
        encoder.encode(value)
      );
      // Encrypts the value

      // Combine: salt (16) + iv (12) + ciphertext
      const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
      combined.set(salt, 0);
      combined.set(iv, salt.length);
      combined.set(new Uint8Array(encrypted), salt.length + iv.length);
      // Combines all parts into one array

      return btoa(String.fromCharCode(...combined));
      // Encodes combined data into Base64 string

    } catch (err) {
      console.error('Encryption failed:', err);
      return value; // fallback
      // Returns plaintext if encryption fails
    }
  }

  /**
   * Decrypt value
   */
  private async decrypt(encryptedBase64: string): Promise<string | null> {

    if (!this.cryptoKey) {
      console.warn('Decryption key not initialized');
      return encryptedBase64;
      // Returns original value if key is missing
    }

    try {
      const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
      // Decodes Base64 string into byte array

      const salt = combined.slice(0, this.saltLength);
      // Extracts salt

      const iv = combined.slice(this.saltLength, this.saltLength + this.ivLength);
      // Extracts IV

      const ciphertext = combined.slice(this.saltLength + this.ivLength);
      // Extracts encrypted data

      const decrypted = await crypto.subtle.decrypt(
        { name: this.algo, iv },
        this.cryptoKey,
        ciphertext
      );
      // Decrypts ciphertext

      return new TextDecoder().decode(decrypted);
      // Converts decrypted bytes back to string

    } catch (err) {
      console.error('Decryption failed:', err);
      return null;
      // Returns null on failure
    }
  }

  async getItem(key: string): Promise<string | null> {

    const db = await this.openDB();
    // Opens database

    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      // Creates read-only transaction

      const store = tx.objectStore(this.storeName);
      // Accesses object store

      const request = store.get(key);
      // Retrieves stored value

      request.onsuccess = async () => {
        const stored = request.result?.value;
        // Gets stored encrypted value

        if (!stored) return resolve(null);
        // Returns null if not found

        const decrypted = await this.decrypt(stored);
        // Decrypts value

        resolve(decrypted);
      };

      request.onerror = () => reject(request.error);
      // Rejects on error
    });
  }

  async setItem(key: string, value: string): Promise<void> {

    const db = await this.openDB();
    // Opens database

    const encrypted = await this.encrypt(value);
    // Encrypts value before storing

    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      // Creates read-write transaction

      const store = tx.objectStore(this.storeName);
      // Accesses object store

      store.put({ key, value: encrypted });
      // Stores encrypted value

      tx.oncomplete = () => resolve();
      // Resolves when transaction completes

      tx.onerror = () => reject(tx.error);
      // Rejects on error
    });
  }

  async removeItem(key: string): Promise<void> {

    const db = await this.openDB();
    // Opens database

    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      // Creates transaction

      const store = tx.objectStore(this.storeName);
      // Accesses object store

      store.delete(key);
      // Deletes entry by key

      tx.oncomplete = () => resolve();
      // Resolves when done

      tx.onerror = () => reject(tx.error);
      // Rejects on error
    });
  }

  async clear(): Promise<void> {

    const db = await this.openDB();
    // Opens database

    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      // Creates transaction

      const store = tx.objectStore(this.storeName);
      // Accesses object store

      store.clear();
      // Clears all stored entries

      tx.oncomplete = () => resolve();
      // Resolves when complete

      tx.onerror = () => reject(tx.error);
      // Rejects on error
    });
  }
} 