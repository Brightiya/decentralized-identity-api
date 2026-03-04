import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-about-pimv-defense',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="defense-wrapper">

      <div class="glass-panel">

        <div class="header fade-in delay-1">
          <h1>Privacy Identity  Management Vault (PIMV)</h1>
          <p class="subtitle">
            A Context-Aware, Privacy-Preserving, Gasless Identity Architecture
          </p>
        </div>

        <div class="divider fade-in delay-2"></div>

        <div class="section fade-in delay-3">
          <h2>Background & Motivation</h2>
          <p>
            Contemporary digital identity systems expose individuals to
            privacy breaches, identity misuse, and limited control over
            personal data. While identity is inherently contextual —
            spanning legal, professional, social, and digital domains —
            most deployed systems treat it as static and monolithic.
          </p>
        </div>

        <div class="section fade-in delay-4">
          <h2>Problem Statement</h2>
          <p>
            Existing centralised, federated, and decentralised identity
            architectures prioritise interoperability and convenience
            over autonomy. Fine-grained disclosure control,
            consent enforcement, regulatory alignment,
            and accessibility barriers such as transaction fees
            remain insufficiently addressed.
          </p>
        </div>

        <div class="section fade-in delay-5">
          <h2>Proposed Solution</h2>
          <p>
            PIMV introduces a vault-based architecture that securely stores
            identity attributes using attribute-level encryption,
            context-sensitive access policies (RBAC/ABAC),
            and consent-driven disclosure mechanisms.
          </p>
          <p>
            To enhance usability and accessibility, PIMV implements
            a gasless meta-transaction framework based on
            EIP-712 typed data signing and ERC-2771 trusted forwarding,
            enabling users to authorise transactions cryptographically
            without directly paying blockchain gas fees.
          </p>
        </div>

        <div class="section fade-in delay-6">
          <h2>Gasless Execution Model</h2>
          <ul>
            <li>Typed structured data signing (EIP-712)</li>
            <li>Nonce-protected request verification</li>
            <li>Forwarder-based signature validation</li>
            <li>Relayer-managed transaction submission</li>
            <li>Sequential execution queue to prevent nonce collisions</li>
          </ul>
          <p>
            This architecture preserves cryptographic authenticity
            while abstracting economic friction from end users,
            improving accessibility without compromising trust guarantees.
          </p>
        </div>

        <div class="section fade-in delay-7">
          <h2>Research Questions</h2>
          <ul>
            <li>RQ1: Does a vault-based model reduce unauthorised identity access?</li>
            <li>RQ2: Can encryption + RBAC/ABAC improve contextual disclosure control?</li>
            <li>RQ3: What is the performance overhead of encryption and meta-transaction relaying?</li>
            <li>RQ4: Does gas abstraction improve usability for non-technical users?</li>
          </ul>
        </div>

        <div class="section fade-in delay-8">
          <h2>Hypotheses</h2>
          <ul class="hypotheses">
            <li><strong>H1:</strong> Vault isolation reduces identity exposure risk.</li>
            <li><strong>H2:</strong> Encryption overhead remains below 20% under load.</li>
            <li><strong>H3:</strong> Gas abstraction significantly improves user satisfaction.</li>
          </ul>
        </div>

        <div class="section fade-in delay-9">
          <h2>Contribution & Significance</h2>
          <p>
            PIMV operationalises privacy-by-design principles within
            a deployable web system that integrates secure storage,
            contextual identity modelling, consent enforcement,
            regulatory alignment, and gasless blockchain interaction.
          </p>
          <p>
            The project bridges theoretical identity governance models
            with practical, user-facing implementation —
            contributing to both academic research
            and applied digital identity engineering.
          </p>
        </div>

      </div>

    </section>
  `,
  styles: [`
    .defense-wrapper {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 80px 20px;
      background: linear-gradient(135deg, #0f172a, #111827);
      color: #f8fafc;
      font-family: 'Inter', sans-serif;
    }

    .glass-panel {
      max-width: 1050px;
      width: 100%;
      padding: 70px;
      border-radius: 24px;
      background: rgba(255,255,255,0.06);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255,255,255,0.12);
      box-shadow: 0 50px 140px rgba(0,0,0,0.7);
    }

    h1 {
      font-size: 2.3rem;
      font-weight: 600;
      margin-bottom: 6px;
    }

    .subtitle {
      font-size: 1.1rem;
      opacity: 0.75;
    }

    .divider {
      height: 1px;
      background: rgba(255,255,255,0.2);
      margin: 40px 0;
    }

    .section {
      margin-bottom: 28px;
    }

    .section h2 {
      font-size: 1.1rem;
      font-weight: 600;
      margin-bottom: 6px;
    }

    .section p, ul {
      font-size: 0.95rem;
      line-height: 1.65;
      opacity: 0.85;
    }

    ul {
      padding-left: 20px;
    }

    .hypotheses li {
      margin-bottom: 6px;
    }

    .fade-in {
      opacity: 0;
      transform: translateY(15px);
      animation: fadeUp 0.8s ease forwards;
    }

    .delay-1 { animation-delay: 0.3s; }
    .delay-2 { animation-delay: 0.6s; }
    .delay-3 { animation-delay: 0.9s; }
    .delay-4 { animation-delay: 1.2s; }
    .delay-5 { animation-delay: 1.5s; }
    .delay-6 { animation-delay: 1.8s; }
    .delay-7 { animation-delay: 2.1s; }
    .delay-8 { animation-delay: 2.4s; }
    .delay-9 { animation-delay: 2.7s; }

    @keyframes fadeUp {
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @media (max-width: 768px) {
      .glass-panel {
        padding: 40px 25px;
      }

      h1 {
        font-size: 1.6rem;
      }
    }
  `]
})
export class AboutPimvDefenseComponent {}