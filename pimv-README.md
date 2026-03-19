# **PIMV – Privacy Identity Management Vault**

## **Abstract**

PIMV (Privacy Identity Management Vault) is a hybrid decentralized identity management system that combines blockchain-based identity anchoring with off-chain storage and database-backed audit mechanisms. It is designed to ensure user sovereignty, privacy, and regulatory compliance through consent-driven data sharing, verifiable credentials, and auditable disclosure tracking.

---

## **Overview**

PIMV adopts a **hybrid architecture** that integrates:

* **On-chain components** for identity ownership and integrity
* **Off-chain decentralized storage (IPFS)** for scalable and privacy-preserving data
* **Relational database (PostgreSQL)** for consent management, authentication, and audit logs

This design balances decentralization with performance, usability, and legal compliance (e.g., GDPR).

---

## **Architecture**

### **1. Blockchain Layer**

* Smart contracts for identity registration and claim anchoring
* ERC-2771 meta-transaction support (gasless interactions)
* Minimal ERC-725-inspired identity model

### **2. Off-Chain Storage Layer**

* IPFS-based storage for profiles and verifiable credentials
* Integration with pinning services (e.g., nft.storage, Pinata)
* Client-side encryption for sensitive data

### **3. Backend & Database Layer (Hybrid Core)**

* PostgreSQL schema for:

  * **Authentication (SIWE-based users)**
  * **Consent registry (context-aware, revocable)**
  * **Disclosure audit logs (GDPR accountability)**
  * **Nonce management (replay protection)**
* REST API for DID resolution, VC issuance, and verification

### **4. Frontend Layer**

* Angular-based application
* Wallet-based authentication (Sign-In with Ethereum)
* Role-aware UI (User, Verifier, Admin)
* Secure local storage with encryption

---

## **Key Features**

* **Hybrid Identity Model:** Combines blockchain immutability with database efficiency
* **Self-Sovereign Identity (SSI):** Users control their identity and claims
* **Verifiable Credentials (VCs):** Issuance, validation, and storage workflows
* **Contextual Identity:** Multiple identity views (e.g., medical, professional, social)
* **Consent Management:** Fine-grained, revocable, context-based permissions
* **Disclosure Auditability:** Full traceability of data sharing events
* **Meta-Transactions:** Gas abstraction for improved UX
* **GDPR Alignment:** Consent, audit logs, and right-to-erasure support

---

## **Database Design (Hybrid Layer)**

The PostgreSQL schema plays a critical role in PIMV:

* **Users (SIWE identities):** Ethereum addresses as primary identifiers
* **Profiles:** Context-aware, extensible user data
* **Consents:** Fine-grained permissions indexed by subject, claim, and context
* **Disclosures:** Immutable audit trail of data sharing events
* **Nonces:** Secure authentication challenge storage
* **Login Audit (optional):** Session-level role tracking

> **Important:** Authorization is derived from **JWT session roles**, not persisted database roles, ensuring flexible and secure access control.

---

## **Technology Stack**

* **Smart Contracts:** Solidity (Base Sepolia)
* **Frontend:** Angular (signals, standalone architecture)
* **Backend:** Node.js (REST API)
* **Database:** PostgreSQL (hybrid trust layer)
* **Storage:** IPFS (nft.storage / Pinata)
* **Authentication:** SIWE (Sign-In with Ethereum)
* **Deployment:** Docker + Fly.io

---

## **Research Context**

PIMV contributes to research in:

* Hybrid decentralized identity architectures
* Privacy-preserving data management
* Blockchain-based consent systems
* GDPR-compliant auditability in SSI systems

It demonstrates how **purely decentralized models can be augmented with structured off-chain systems** to achieve real-world applicability.

---

## **Future Work**

* Integration with W3C DID and Verifiable Credential standards
* Zero-knowledge proofs for selective disclosure
* Cross-chain identity interoperability
* Policy-based and attribute-based access control (ABAC)

---

## **License**

MIT License

---
