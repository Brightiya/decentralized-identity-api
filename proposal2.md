# Decentralized Identity and Profile Management API

## Abstract

This proposal outlines the development of a Decentralized Identity and Profile Management API, leveraging blockchain technology, smart contracts, and decentralized storage to enable self-sovereign identity (SSI) management. The system empowers users to control their digital identities and profiles without relying on centralized authorities, addressing key challenges in privacy, interoperability, and security. Built as a monorepo with a Node.js backend, Angular frontend, and Ethereum-compatible smart contracts, the project integrates Decentralized Identifiers (DIDs), Verifiable Credentials (VCs), and IPFS for secure, tamper-proof storage. By critiquing four key literature papers, we identify shortcomings such as limited practical implementation guidance, gaps in usability studies, focus on trust management without integrated profile APIs, and potential scalability issues in specific DLT integrations, which this API resolves through modular design, API-driven accessibility, and emphasis on user-centric features. Suitable for advanced web development courses and GitHub documentation, the project includes testing, deployment scripts, and CI workflows for robust implementation. The project has progressed with implemented backend controllers, utils, frontend components, services, environments, and smart contract interactions as detailed in the provided code files.

## Introduction

In an era where digital identities are central to online interactions, traditional centralized identity management systems pose significant risks, including data breaches, privacy violations, and single points of failure. Decentralized identity solutions, particularly those based on blockchain, offer a paradigm shift by enabling users to own and manage their identities autonomously. This project, "Decentralized Identity and Profile Management API," aims to create a comprehensive API that facilitates the creation, verification, and management of decentralized identities and profiles.

The system is designed for college-level advanced web development, incorporating full-stack technologies, blockchain integration, and decentralized storage. It builds on self-sovereign identity principles, allowing users to issue and verify claims (e.g., profile attributes like name, email, or qualifications) using VCs. The monorepo structure ensures seamless collaboration and deployment, with backend handling API logic, smart contract interactions, and IPFS pinning via Pinata. The frontend provides an intuitive Angular-based interface for user interactions.

Key objectives include:

- Enabling secure DID registration and resolution.
- Supporting profile management with verifiable claims.
- Ensuring interoperability with standards like W3C DID and VC specifications.
- Addressing real-world adoption barriers through scalable, user-friendly design.

This proposal critiques existing literature to highlight gaps and positions our solution as an advancement. The project has commenced with initial code setup per the provided structure, including backend controllers (claim, profile, vc, did), utils (pinata, fetchJSON, contract), server entry (index.js), contract data, Hardhat config, Angular components (app, claim, profile, did-register, vc-verify), services (api, wallet, claim), environments, and IdentityRegistry.sol, and we will expand from there.

## Literature Review and Critique

To ground our project in existing research, we review and critique four key publications on decentralized identity management using blockchain. These critiques identify shortcomings that our API aims to address, such as theoretical emphasis over practical tools and gaps in usability and full-stack integration.

### Paper 1: "Decentralized and Self-Sovereign Identity: Systematic Mapping Study" by Čučko, Š., & Turkanović, M. (2021). IEEE Access

This paper presents a systematic mapping study (SMS) of decentralized and self-sovereign identity (SSI), analyzing 120 papers published between 2013 and 2021. Key contributions include classifying studies by contribution type (e.g., systems, architectures), domain, IT field (e.g., security, privacy), research type (e.g., validation research), and publication venue. The methodology follows SMS guidelines, providing visualizations of trends, demographics, and gaps. Findings indicate that validation research (47.5%) and solution proposals (30%) dominate, with a focus on general matters, authentication (18.3%), security (18.3%), privacy (13.3%), and trust (15.8%). Gaps include few studies on usability (0%), user experience (0.8%), patterns (0.8%), and good practices.

**Critique and Shortcomings**: As an SMS, it offers a coarse-grained overview and structures the field effectively but lacks in-depth analysis of specific implementations or empirical prototypes. Shortcomings include limitation to two databases (IEEE Xplore, Science Direct), exclusion of non-English papers and those with centralized registration, and no emphasis on web API integrations or practical deployment for profile management in real-world scenarios. While identifying usability gaps, it does not propose solutions. Our project addresses these by providing a deployable monorepo with backend APIs, Angular frontend for enhanced UX, IPFS for decentralized storage, and testing/deployment tools, filling the gap in practical, user-centric implementations.

### Paper 2: "DidTrust: Privacy-Preserving Trust Management for Decentralized Identity" by Yin, J., Xiao, Y., Feng, J., Yang, M., Pei, Q., & Yi, X. (2025). IEEE Transactions on Dependable and Secure Computing

This paper proposes DidTrust, a privacy-preserving trust management protocol for decentralized identity systems that addresses feedback confidentiality and resilience against trust attacks. Key contributions include a feedback data privacy preservation protocol using secure multi-party computation (SMPC) to conceal feedback while enabling statistical analysis, countermeasures against cooperative and individual trust attacks (e.g., Sybil, ballot-stuffing), and a feedback compression module for efficiency in large-scale sparse matrices. The methodology involves system modeling with data parties (holders, issuers, verifiers) and computation parties, formal UC-security proofs under a malicious model, and experiments comparing to baselines like BC-Trust, showing improved detection rates and efficiency. Findings demonstrate robustness against high malicious node ratios (up to 80%) and significant reductions in computation (50x faster) and storage (90%) via compression.

**Critique and Shortcomings**: The protocol advances trust management in DID by balancing privacy and attack resilience, with strong security proofs and empirical validation. However, it focuses primarily on backend trust computation and aggregation, lacking integration with user-facing profile management APIs or frontend interfaces for practical web applications. Shortcomings include reliance on SMPC which may introduce computational overhead in diverse environments, absence of modular full-stack architecture for broader adoption, and no emphasis on usability or interoperability with tools like IPFS for profile storage. Future work mentions blockchain-federated learning integration, but does not address immediate deployment needs. Our project resolves these by offering a comprehensive monorepo API with controllers for DID/profile/VC handling, Angular frontend for user experience, IPFS for scalable storage, and deployment scripts, extending trust mechanisms to holistic identity and profile management.

### Paper 3: "A Trusted Approach for Decentralised and Privacy-Preserving Identity Management" by Torres Moreno, R., García-Rodríguez, J., Bernal Bernabé, J., & Skarmeta, A. (2021). IEEE Access

This paper presents an evolution of the OLYMPUS architecture for decentralized identity management, incorporating distributed ledger technologies (DLT) to enhance trust while preserving privacy. Key contributions include a distributed private attribute-based credential (dP-ABC) system that splits the identity provider (IdP) role to avoid single points of failure, ledger-backed registration for users, service providers (SPs), and IdPs using Hyperledger Fabric, and modifications to OLYMPUS behavior for blockchain integration. The methodology describes the architecture with virtual IdP (vIdP), partial IdPs, SPs, and user clients; implementation in Java/Spring Boot for backend, Android for client; and evaluation on performance metrics like setup times (~1s for IdP), credential issuance (~200ms), and security analysis. Findings show feasibility for real-world deployment, with distributed security resisting attacks unless all partial IdPs are corrupted, and improved trust through auditable ledger records.

**Critique and Shortcomings**: The work advances privacy-preserving IdM by integrating blockchain for trust, demonstrating practical implementation and performance. However, it relies on Hyperledger Fabric, which may limit scalability in public networks and interoperability with other blockchains. Shortcomings include a focus on specific tech stacks (e.g., Fabric, Java), potential overhead in multi-organization setups, and limited emphasis on user experience, frontend interfaces, or off-chain storage for profiles. Future work suggests more pilots and advanced revocation, but lacks modular API design for broader web development. Our project addresses these by using ERC-725-inspired contracts for platform-agnostic governance, IPFS for efficient decentralized storage, Angular frontend for usability, and RESTful APIs in a monorepo, providing a more versatile and deployable solution.

### Paper 4: "FutureDID: A Fully Decentralized Identity System With Multi-Party Verification" by Deng, H., Liang, J., Zhang, C., Liu, X., Zhu, L., & Guo, S. (2024). IEEE Transactions on Computers

This paper proposes FutureDID, a DID system that enables multi-party credential issuance and efficient revocation to address W3C limitations on single point of failure (SPOF) and revocation. Key contributions include a multi-party issuance mechanism using distributed key generation (DKG) to distribute trust across committees, mutual verification via Byzantine consensus, and a chameleon hash-based blockchain for tamper-proof yet editable revocation without extra storage. The methodology includes system models with users, issuers, verifiers, multi-credential committees (MC), and administration committees (AC); workflows for identity registration, claim creation, committee selection, mutual verification, credential issuance, and revocation; formal security proofs for editability, non-editability, unforgeability, and Sybil resistance. Implemented on FISCO BCOS, evaluations show millisecond-level API responses, 3,114 credentials/second issuance, and 60x revocation efficiency over CanDID, with robustness to f < n/3 faults.

**Critique and Shortcomings**: FutureDID enhances decentralization and practicality with multi-party mechanisms and editable blockchain, backed by proofs and FISCO BCOS prototype. However, it is tied to a consortium chain (FISCO BCOS), potentially limiting public interoperability and scalability. Shortcomings include focus on backend issuance/revocation without web APIs, frontend usability, or off-chain profile storage; consensus/DKG overhead for large committees; and no emphasis on user experience beyond core functions. Future work could expand applications, but lacks modular full-stack design. Our project addresses these via ERC-725 contracts for Ethereum compatibility, IPFS for scalable storage, Angular frontend, and RESTful APIs in a monorepo, enabling broader, user-friendly deployment.

By addressing these shortcomings—such as enhancing practical implementation, interoperability, user-centric web tools, and usability—our API advances beyond surveys and protocols to a deployable, full-stack solution.

## Proposed Solution

The proposed system is a full-stack Decentralized Identity and Profile Management API that enables users to:

- Create and manage DIDs using registerDID, which builds a W3C-compliant and EIP-155 compatible DID document, uploads it to IPFS via Pinata, and anchors the CID on-chain using setProfileCID.
- Store and retrieve profiles/claims via IPFS, ensuring decentralization and immutability, with createOrUpdateProfile building profile JSON (id, name, email, credentials), uploading to IPFS, and updating on-chain CID; getProfile fetches CID from chain and retrieves JSON.
- Issue, verify, and revoke VCs for attributes (e.g., education, skills), with issueVC building VC payload, signing with EcdsaSecp256k1, uploading to IPFS, computing keccak256 claimHash, anchoring via setClaim, and automatically updating profile credentials; verifyVC fetches VC, verifies signature, recomputes hash, and checks against on-chain; revocation via removeClaim.
- Interact via secure API endpoints, with frontend visualization for profile viewing/editing using Angular components like ProfileComponent for create/get with MetaMask connect, and ClaimComponent for set/get/remove claims.

This solves literature gaps by prioritizing full SSI (user control without intermediaries), interoperability (W3C-compliant), and scalability (off-chain storage via IPFS). The monorepo structure facilitates development, with scripts for deployment and tests for validation.

## System Architecture

The architecture follows the provided project structure, with implementations as per the code files:

- **Backend (Node.js)**: Handles core logic using Express server (index.js) with CORS, JSON parsing, and routes for /api/identity, /api/vc, /api/claims, /api/profile, /api/did.
  - `src/controllers/`:
    - claimController.js: Manages claim handling using ethers.js for blockchain interactions; includes setClaim (convert to bytes32, tx to registry), getClaim (fetch from registry), removeClaim (tx to registry).
    - profileController.js: createOrUpdateProfile (build profile JSON, upload to IPFS, setProfileCID tx), getProfile (get CID from registry, fetch JSON).
    - vcController.js: issueVC (build VC, sign, upload to IPFS, compute hash, setClaim tx, auto-update profile), verifyVC (fetch VC, verify sig, check on-chain hash).
    - didController.js: registerDID (build DID doc with verification methods, upload to IPFS, setProfileCID tx), resolveDID (get CID, fetch doc), verifyDID (resolve doc, verify EIP-191 sig for ownership).
  - `src/routes/`: Defines API endpoints (e.g., POST /did/register, GET /profile/:address, POST /vc/issue, GET /claims/:owner/:claimId).
  - `src/utils/`: Includes contract.js (load contractData.json, connect to Hardhat node, create contract instance with signer); pinata.js (uploadJSON using PinataSDK, fetchJSON using axios with gateway); fetchJSON.js (axios get with timeout for IPFS).
  - `index.js`: Server entry point with Express.js setup.
  - `contractData.json`: ABI and address for deployed contracts (events: ClaimSet/Removed, ProfileSet; functions: get/set/removeClaim, get/setProfileCID, registerIdentity).
  - `hardhat.config.cjs`: Config for Solidity 0.8.20, networks (hardhat, localhost, sepolia, amoy), gas reporter.

- **Frontend (Angular)**: User interface for identity creation, profile management, and VC interactions. Includes environments for dev/prod configurations.
  - main.ts: Bootstrap with router, HttpClient, FormsModule; routes for home, did/register/resolve/verify, vc/issue/verify, claims, profile.
  - app.component.ts: Root with navigation links.
  - did-register.component.ts: UI for connect wallet (MetaMask), register DID (address, name, email) using ApiService.
  - vc-verify.component.ts: UI for verify VC (cid, claimId, subject) using ApiService.
  - claim.component.ts: UI for connect wallet, set/get/remove claims using ClaimService and WalletService.
  - profile.component.ts: UI for connect wallet, create/get profile using ApiService.
  - api.service.ts: HttpClient service for register/resolve/verifyDID, issue/verifyVC, get/createProfile.
  - environment.ts: backendUrl '<http://localhost:4000>'.

- **Scripts**: `deploy.js` for smart contract deployment via Hardhat.

- **Test**: `api.test.js` for unit/integration tests using Jest/Mocha.

- **Root Files**: `hardhat.config.cjs` for blockchain config, root `package.json` for monorepo scripts (e.g., yarn workspaces), `README.md` for overall docs, `proposal.md` (this document), `report/` for final reporting, and `.github/workflows/ci.yml` for CI/CD pipelines (e.g., linting, testing, deployment).
  - IdentityRegistry.sol: Contract with mappings for profileCID, claims; functions for registerIdentity, set/getProfileCID, set/get/removeClaim; events for ProfileSet, ClaimSet/Removed; onlyOwner modifier.

Data flow: Users interact via frontend (Angular components with wallet connect) → API calls to backend (Express routes to controllers) → Smart contract invocations (ethers.js to IdentityRegistry) for on-chain actions → IPFS (Pinata) for off-chain storage. Security features include cryptographic signatures (EcdsaSecp256k1), keccak256 hashing, and ZKP options for selective disclosure.

## Implementation Plan

Building on the existing code:

1. **Smart Contracts**: IdentityRegistry.sol implemented with mappings, events, and functions; deploy via Hardhat to testnet (e.g., Sepolia, Amoy) using hardhat.config.cjs.
2. **Backend Development**: Controllers (claim, profile, vc, did) and routes implemented. Pinata SDK and fetchJSON integrated for IPFS. Authentication middleware to be added.
3. **Frontend**: Angular components built for app root, did-register, vc-verify, claim, profile with MetaMask wallet integration; api.service.ts for endpoints. Use environment.ts for backendUrl. Expand to did-resolve/verify, vc-issue, home.
4. **Testing**: Expand `api.test.js` for end-to-end coverage, including contract interactions (e.g., claim set/remove, VC issue/verify).
5. **Deployment**: Use `deploy.js` for contracts; host backend on Vercel/Heroku, frontend on Netlify.
6. **Documentation**: Update READMEs with setup, API specs (e.g., Swagger), and usage examples.
7. **Evaluation**: Measure performance (e.g., DID creation time ~200ms for issuance), security (audits), and usability (user testing).

Timeline: 8-12 weeks, aligning with college project cycles. Current status (as of October 18, 2025): Core backend (controllers, utils, server, Hardhat) and frontend (components, services, router, bootstrap) implemented; focus on testing, additional components, and expansions.

## Conclusion

This Decentralized Identity and Profile Management API represents an advanced, practical solution for SSI, directly addressing literature shortcomings through innovative architecture and implementation. By empowering users with control over their identities, it promotes privacy and trust in digital ecosystems. Future extensions could include ZKP integration and multi-chain support.

## References

- Čučko, Š., & Turkanović, M. (2021). "Decentralized and Self-Sovereign Identity: Systematic Mapping Study." IEEE Access, 9, 139009-139027.
- Yin, J., Xiao, Y., Feng, J., Yang, M., Pei, Q., & Yi, X. (2025). "DidTrust: Privacy-Preserving Trust Management for Decentralized Identity." IEEE Transactions on Dependable and Secure Computing, 22(3), 3105-3120.
- Torres Moreno, R., García-Rodríguez, J., Bernal Bernabé, J., & Skarmeta, A. (2021). "A Trusted Approach for Decentralised and Privacy-Preserving Identity Management." IEEE Access, 9, 105788-105804.
- Deng, H., Liang, J., Zhang, C., Liu, X., Zhu, L., & Guo, S. (2024). "FutureDID: A Fully Decentralized Identity System With Multi-Party Verification." IEEE Transactions on Computers, 73(8), 2051-2065
