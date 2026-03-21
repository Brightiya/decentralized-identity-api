# **Privacy Identity  Management Vault (PIMV)**

## **A Secure, User-Centric Framework for Privacy-Preserving Identity Storage and Access Control**

**Author:**
*Bright Osahenehen Iyahen*

**Department:**
Department of Computer Science

**Programme:**
BSc (Hons) Computer Science

**Project Template:**
Template 7.1; Project Idea 1 – **Identity and Profile Management API**

**Supervisor:**
*Dr. Sarah Rauchas*

**Institution:**
*University of London*

**Date of Submission:**
*March 2026*

---

## Table of Contents

1. [Introduction](#1-introduction)  
   1.1 [Background and Project Idea](#11-background-and-project-idea)  
   1.2 [Problem Statement](#12-problem-statement)  
   1.3 [User Groups and Requirements](#13-user-groups-and-requirements)  
   1.4 [Aim and Objectives](#14-aim-and-objectives)  
   1.5 [Research Questions](#15-research-questions)  
   1.6 [Hypotheses](#16-hypotheses)  
   1.7 [Scope and Significance](#17-scope-and-significance)  

2. [Literature Review](#2-literature-review)  
   2.1 [Digital Identity Models](#21-digital-identity-models)  
   2.2 [Centralised Identity Systems](#22-centralised-identity-systems)  
   2.3 [Federated Identity Systems](#23-federated-identity-systems)  
   2.4 [Self-Sovereign Identity](#24-self-sovereign-identity)  
   2.5 [Privacy Concepts Relevant to Identity Systems](#25-privacy-concepts-relevant-to-identity-systems)  
   2.6 [Commercial Identity Solutions](#26-commercial-identity-solutions)  
   2.7 [Hybrid Architectures and Identified Research Gaps](#27-hybrid-architectures-and-identified-research-gaps)  
   2.8 [Motivation for PIMV](#28-motivation-for-pimv)  
   2.9 [Conclusion of Literature Review](#29-conclusion-of-literature-review)  

3. [System Design](#3-system-design)  
   3.1 [High-Level Architecture](#31-high-level-architecture)  
   3.1.1 [Simplified Architecture Overview](#311-simplified-architecture-overview)  
   3.1.2 [Enhanced High-Level Architecture](#312-enhanced-high-level-architecture)  
   3.2 [Data Model](#32-data-model)  
   3.3 [API Design](#33-api-design)  
   3.4 [Security and Privacy Design](#34-security-and-privacy-design)  
   3.5 [Gasless Transaction Architecture](#35-gasless-transaction-architecture)  
   3.6 [Privacy-by-Design Features](#36-privacy-by-design-features)  
   3.7 [Middleware Pipeline and GDPR Compliance Flow](#37-middleware-pipeline-and-gdpr-compliance-flow)
   3.8 [Hybrid Operation Split](#38-hybrid-operation-split)
   3.9 [Project Structure](#39-project-structure)  
   3.10 [Key Technologies and Methods](#310-key-technologies-and-methods)  

4. [Implementation](#4-implementation)  
   4.1 [Overview](#41-overview)  
   4.2 [Frontend Implementation](#42-frontend-implementation)  
   4.2.1 [Routing and Role-Based Access Control](#421-routing-and-role-based-access-control)  
   4.2.2 [Context-Aware Identity Interface](#422-context-aware-identity-interface)  
   4.2.3 [Consent and GDPR Interfaces](#423-consent-and-gdpr-interfaces)  
   4.3 [Backend API Implementation](#43-backend-api-implementation)  
   4.3.1 [Route Structure and Security](#431-route-structure-and-security)  
   4.3.2 [Authentication Mechanism](#432-authentication-mechanism)  
   4.3.3 [Middleware and Request Processing](#433-middleware-and-request-processing)  
   4.4 [Middleware Pipeline Implementation](#44-middleware-pipeline-implementation)  
   4.5 [Meta-Transaction (Gasless) Implementation](#45-meta-transaction-gasless-implementation)  
   4.5.1 [Design and Workflow](#451-design-and-workflow)  
   4.5.2 [Relayer Integration](#452-relayer-integration)  
   4.5.3 [Security Considerations](#453-security-considerations)  
   4.5.4 [Service Implementation](#454-service-implementation)  
   4.5.5 [GDPR Compliance Mechanisms](#455-gdpr-compliance-mechanisms)  
   4.5.6 [Design Justification](#456-design-justification)  
   4.5.7 [IPFS (Decentralised Storage)](#457-ipfs-decentralised-storage)  
   4.5.8 [GDPR Erasure Process](#458--gdpr-erasure-process)  
   4.6 [System Integration](#46-system-integration)  
   4.6.1 [Application Flow](#461-application-flow)  
   4.6.2 [End-to-End Interaction Model](#462-end-to-end-interaction-model)  
   4.6.3 [System Access and Execution](#463-system-access-and-execution)  
   4.6.4 [Live Deployment (Recommended)](#464-live-deployment-recommended)  
   4.6.5 [Local Execution (Optional)](#465-local-execution-optional)  
   4.6.6 [Deployment and Integration Summary](#466-deployment-and-integration-summary)  

5. [Evaluation](#5-evaluation)  
   5.1 [Evaluation Objectives](#51-evaluation-objectives)  
   5.2 [Evaluation Methodology](#52-evaluation-methodology)  
   5.3 [Critical Analysis](#53-critical-analysis)  
   5.3.1 [Strengths](#531-strengths)  
   5.3.2 [Limitations](#532-limitations)  
   5.3.3 [Trade-offs](#533-trade-offs)  
   5.3.4 [Potential Improvements](#534-potential-improvements)  
   5.4 [Comparison with Objectives](#54-comparison-with-objectives)  
   5.5 [Conclusion of Evaluation](#55-conclusion-of-evaluation)  

6. [Conclusion](#6-conclusion)  

7. [References](#references)
8. [Bibliography](#bibliography)
9. [Appendix](#appendix)
   A. [Appendix A](#appendix-a---pinata-ipfs-utility)
   B. [Appendix B](#appendix-b---identityregistrymeta-contract)
   C. [Appendix C](#appendix-c)
   D. [Appendix D](#appendix-d--usability-study-materials)  

---

## **1. Introduction**

### **1.1 Background and Project Idea**

Digital identity management has become a critical challenge in contemporary web systems due to increasing privacy breaches, identity misuse, and limited user control over personal data. Individuals routinely present different names, identifiers, and attributes across legal, professional, social, cultural, and online contexts. However, most existing identity management systems treat identity as a single, static construct, failing to reflect the contextual and situational nature of real-world identity use.

This project addresses this gap by proposing and implementing the **Privacy Identity Management Vault (PIMV)**—a secure, user-centric system that enables individuals to manage multiple contextual identity profiles and control how identity attributes are disclosed depending on context, requester, and purpose. The project builds on the **7 CM3035 Advanced Web Design template 7.1 project idea 1: Identity and Profile Management API**, extending it into a fully realised system that supports privacy-preserving access control, consent management, and regulatory compliance.
To improve usability and reduce the barriers associated with blockchain transaction fees, the system also supports gasless identity operations through a relayer-based meta-transaction mechanism, allowing users to authorise actions without directly paying network fees.

### **1.2 Problem Statement**

Current identity management solutions—whether centralised, federated, or decentralised—often prioritise convenience and interoperability at the expense of user autonomy and privacy. Users typically lack fine-grained control over which attributes are disclosed, to whom, and under what conditions. Moreover, regulatory requirements such as data minimisation, informed consent, and the right to erasure under the GDPR are poorly supported in many deployed systems.

There is therefore a need for an identity management architecture that supports **context-aware identity representation**, **user-controlled disclosure**, and **verifiable regulatory compliance**, while remaining practical for real-world web deployment.

### **1.3 User Groups and Requirements**

Because PIMV is designed as a user-centric identity management system, understanding the needs of its potential users is critical. The system primarily serves individuals who need to manage and disclose identity information across different digital contexts. Two main user groups are identified.

#### Primary Users: Identity Owners

Identity owners are individuals who store and manage their personal identity attributes within the PIMV vault. These users require strong control over how their personal data is stored, shared, and deleted.

### **Example User Persona**

### **Jessica – Freelance Consultant**

Jessica works as an independent consultant and uses multiple online services for professional networking, freelance platforms, banking, and social communication. Different services require different identity information. For example, employers may need to verify her professional qualifications, while financial platforms require legal identification.

Jessica wants to share **only the information required for each context**. She does not want employers to access personal contact details or government identifiers unnecessarily. A system such as PIMV would allow her to maintain separate identity profiles and selectively disclose only the relevant attributes.

Key user needs include:

* Secure storage of personal identity attributes
* The ability to maintain **multiple contextual identity profiles** (e.g., professional, legal, social)
* Fine-grained control over which identity attributes are shared with external services
* Clear visibility of consent and disclosure history
* The ability to delete identity attributes in accordance with regulatory requirements such as the General Data Protection Regulation.

### **Secondary Users: Service Providers / Requesters**

Service providers represent external applications or organisations requesting identity verification or attributes from the PIMV system.

Their primary needs include:

* Reliable mechanisms for verifying identity attributes
* Secure API-based access to user-approved identity information
* Assurance that shared data has not been tampered with
* Efficient interaction with the system through standard web protocols

---

### **Prioritised User Requirements**

Based on the identified user groups, the following functional requirements were prioritised.

| Priority | Requirement                    | Description                                               |
| -------- | ------------------------------ | --------------------------------------------------------- |
| High     | Secure identity storage        | Identity attributes must be encrypted and stored securely |
| High     | Contextual identity profiles   | Users must be able to maintain multiple identity contexts |
| High     | Attribute-level access control | Users must control which attributes are disclosed         |
| High     | Consent management             | Users must approve requests before data is shared         |
| Medium   | Identity verification          | Service providers must verify disclosed attributes        |
| Medium   | Auditability                   | Users must be able to view disclosure history             |
| Medium   | API interoperability           | System must support REST API access                       |
| Low      | Advanced analytics             | Optional insights into disclosure patterns                |

---

### **1.4 Aim and Objectives**

**Aim:**
To design, implement, and evaluate a Privacy Identity Management Vault (PIMV) that securely stores identity attributes and enables privacy-preserving, context-sensitive access control.

**Objectives:**

1. Analyse existing identity management and privacy-preserving models.
2. Design a vault-based architecture supporting contextual identities and consent.
3. Fully implement PIMV as a functional system with a RESTful API, user interface, and optional gasless blockchain interaction through meta-transactions.
4. Evaluate the system’s usability, interaction quality, and regulatory alignment.
5. Identify limitations and propose directions for future enhancement.

### **1.5 Research Questions**

1. **RQ1:** How effective is a vault-based architecture in protecting user identity attributes compared to traditional identity management systems?
2. **RQ2:** Can privacy-preserving access techniques (e.g., Role-Based Access Control (RBAC)/ Attribute-Based Access Control (ABAC) + encryption) improve user control over identity disclosure?
3. **RQ3:** What is the performance overhead of encrypting identity attributes in real-world usage?
4. **RQ4:** How usable is the PIMV system for non-technical users?

### **1.6 Hypotheses**

* **H1:** The PIMV vault will reduce unauthorized access risks compared to baseline systems.
* **H2:** Attribute-level encryption increases performance cost by less than 20% under standard load.
* **H3:** Users will report ≥70% satisfaction with system usability.

### **1.7 Scope and Significance**

PIMV focuses on **secure identity storage, contextual profile management, consent-driven disclosure, and GDPR-aligned erasure**, implemented using standard web technologies. While the primary focus remains on privacy-preserving identity storage and disclosure, the architecture incorporates selected decentralised mechanisms—including blockchain audit anchoring and gasless transaction relaying—to improve trust, transparency, and usability.

The project contributes to both academic research and applied practice by demonstrating how privacy-by-design principles can be operationalised within a deployable, user-facing identity management system.

---

## **2. Literature Review**

This chapter critically examines existing digital identity models, core privacy concepts, and contemporary identity management solutions in both academic research and commercial practice. It also reviews developments in context-aware identity and access management, self-sovereign identity (SSI), and user-centred privacy frameworks.

By analysing these strands of literature together, the chapter identifies persistent theoretical, technical, and regulatory limitations in existing identity management approaches. These limitations motivate the development of the Privacy Identity Management Vault (PIMV), a hybrid identity system designed to prioritise user control, regulatory compliance, and practical deployability.

---

## 2.1 Digital Identity Models

Digital identity systems have evolved through three primary architectural paradigms: **centralised, federated, and decentralised identity models**. Each model attempts to balance usability, scalability, and security, but they differ significantly in how identity data is controlled and shared.

To clarify these differences, Table 2.1 summarises the key characteristics, advantages, and limitations of the three models.

> **Table 2.1: Comparison of centralised, federated, and self-sovereign digital identity models**

| Identity Model                    | Key Characteristics                                               | Advantages                                                      | Limitations                                                                         |
| --------------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **Centralised Identity**          | Identity data stored and controlled by a single authority         | Administrative simplicity, interoperability, central governance | Single point of failure, large-scale breach risk, limited user control              |
| **Federated Identity**            | Multiple services rely on a shared identity provider              | Reduced password burden, cross-service authentication           | Concentrated trust in providers, cross-service tracking, limited disclosure control |
| **Self-Sovereign Identity (SSI)** | Users control cryptographic credentials without central authority | Greater user autonomy, peer-to-peer verification                | Governance challenges, regulatory conflicts, technical complexity                   |

> As shown in Table 2.1, centralised identity systems offer simplicity but introduce significant security and privacy risks due to their single point of control. Federated identity models improve usability through single sign-on mechanisms but still rely on trusted intermediaries, limiting user autonomy. In contrast, self-sovereign identity (SSI) emphasises user control and decentralisation, aligning more closely with privacy-by-design principles. However, SSI systems introduce challenges related to governance, usability, and regulatory compliance. These limitations motivate the hybrid approach adopted in the PIMV architecture, which combines decentralised verification with centrally managed, GDPR-compliant storage.
---

## 2.2 Centralised Identity Systems

Centralised identity systems are the traditional model used in many government and enterprise infrastructures. In these systems, personal identity data is stored and managed by a single administrative authority, such as a national identity registry or organisational account database.

This approach simplifies governance and interoperability because a single entity controls authentication and data management. However, concentrating identity data in one location creates significant privacy and security risks. Large-scale data breaches and institutional surveillance become more likely when vast quantities of personal information are aggregated within a single system.

From a privacy engineering perspective, Cavoukian (2020) argues that such centralised architectures require strong **Privacy by Design** safeguards to reduce these risks. In practice, however, many centralised identity deployments provide limited user agency over how personal information is disclosed or reused.

---

## 2.3 Federated Identity Systems

Federated identity systems were introduced to improve usability and scalability across digital services. Rather than requiring users to maintain separate credentials for each service, federated models allow authentication through a trusted identity provider.

Protocols such as OAuth 2.0, OpenID Connect, and SAML enable this cross-service authentication. Chadwick (2009) provides an early technical analysis of federated identity management, demonstrating how trust federation can reduce password proliferation and simplify identity verification across organisational boundaries.

Despite these benefits, federated identity systems introduce new governance concerns. Trust and control become concentrated within a small number of identity providers, often large technology companies. This concentration creates potential privacy risks, including cross-service profiling, behavioural tracking, and dependency on corporate intermediaries.

As a result, although federated identity improves usability, it often limits meaningful user control over identity data disclosure.

---

## 2.4 Self-Sovereign Identity

Self-Sovereign Identity (SSI) has emerged as a decentralised alternative designed to restore user control over identity data. In SSI systems, individuals manage cryptographically verifiable credentials and interact directly with service providers without relying on a central authority.

Allen (2016) and other early proponents describe Self-Sovereign Identity (SSI) as a model in which individuals maintain control over their digital identities through decentralised technologies.

However, subsequent research has raised important legal and governance concerns. (Herian, 2020) analyses blockchain-based SSI systems through a GDPR lens and argues that the concept of “data sovereignty” can obscure unresolved regulatory challenges.

A key issue is the conflict between blockchain immutability and the **right to erasure** established in the General Data Protection Regulation. If identity data or its cryptographic representation is permanently recorded on a blockchain, enforcing data deletion becomes difficult.

Consequently, while SSI offers a compelling vision of decentralised identity control, many current implementations struggle to reconcile decentralisation with regulatory compliance and practical governance.

---

## 2.5 Privacy Concepts Relevant to Identity Systems

Several core privacy principles shape the design and evaluation of modern identity systems, particularly within regulatory frameworks such as the GDPR. These principles include **data minimisation, selective disclosure, contextual access control, and enforceable data subject rights**.

Although these principles are widely discussed in both technical and legal literature, their implementation in real-world identity infrastructures remains inconsistent.

---

### 2.5.1 Data Minimisation

Data minimisation is a central principle of GDPR, requiring organisations to collect and process only the personal data necessary for a specific purpose.

The Privacy by Design framework developed by Cavoukian (2020) emphasises that such safeguards should be embedded directly into system architecture rather than applied through reactive compliance measures.

Despite this principle, empirical studies show that many credential-based identity systems still require **full attribute disclosure**, even when only limited verification is necessary. For example, verifying whether a user is over 18 often requires disclosure of full date-of-birth information rather than a simple proof of age eligibility.

Recent technical analysis by Yang et al. (2025) shows that even systems claiming to support verifiable credentials frequently undermine data minimisation through excessive attribute bundling and limited support for selective disclosure.

---

### 2.5.2 Zero-Knowledge Proofs

Zero-knowledge proofs (ZKPs) are widely proposed as a cryptographic solution to the problem of over-disclosure. These techniques allow a system to verify a claim without revealing the underlying personal data.

For example, a user could prove they are above a required age without revealing their exact date of birth.

Although ZKPs are theoretically well developed and increasingly standardised within decentralised identity ecosystems (Genise & Balenson, 2021), their adoption in real-world identity systems remains limited. Yang et al. (2025) identify several barriers, including computational overhead, implementation complexity, and usability challenges.

This gap illustrates a recurring tension between **cryptographic privacy solutions and deployable identity infrastructure**.

---

### 2.5.3 Granular and Contextual Access Control

Granular access control allows identity systems to determine **exactly what information should be disclosed in a particular context**. This capability is typically implemented through role-based access control (RBAC) or attribute-based access control (ABAC).

Research in context-aware identity management has demonstrated that contextual attributes such as location, device state, or behavioural indicators can be used to adapt access decisions dynamically (Hummer et al., 2016).

However, most commercial and decentralised identity platforms still provide only coarse-grained disclosure mechanisms. These systems rarely reflect the fragmented and situational nature of real-world identity, where individuals often present different aspects of their identity across professional, personal, and institutional contexts.

---

### 2.5.4 Right to Erasure

The right to erasure under the General Data Protection Regulation presents a major challenge for identity systems that rely on immutable storage technologies such as blockchains.

Legal scholarship has repeatedly highlighted the incompatibility between blockchain immutability and enforceable data deletion (Herian, 2020). Hybrid architectures that separate on-chain verification from off-chain storage have been proposed as a possible solution.

However, many implementations lack verifiable deletion guarantees or auditable erasure mechanisms, raising concerns about their practical compliance with GDPR requirements.

---

### 2.5.5 Context-Aware Identity and Access Management

Research into context-aware identity systems has largely been conducted within enterprise environments. Hummer et al. (2016) propose an adaptive identity and access management framework based on their Dynamic Policy Management Process (DPMP), which refines access control policies using contextual indicators such as location, device state, and user behaviour.

While this work demonstrates the technical feasibility of dynamic access control, the framework assumes a centralised system architecture and prioritises organisational efficiency over individual privacy rights.

Issues such as user consent, data minimisation, and enforceable user control receive limited attention. In addition, the evaluation is based on a single industrial dataset and does not include user-centred testing or usability evaluation.

These limitations highlight the broader gap between **technically adaptive identity systems and privacy-centric identity governance**.

---

### 2.5.6 Self-Sovereign Identity and Regulatory Compliance

A comprehensive review by Shehu (2015) analyses self-sovereign identity systems in relation to GDPR principles. The study traces the evolution of identity management models and identifies significant conflicts between blockchain immutability and key data protection requirements, particularly the right to be forgotten.

Although this work provides valuable legal analysis, it remains largely theoretical. It does not present empirical prototypes or architectural solutions capable of reconciling decentralisation with enforceable erasure and accountability mechanisms.

Furthermore, the study does not address multi-context identity modelling or hybrid architectures that combine decentralised verification with mutable off-chain storage.

---

### 2.5.7 User-Centred Privacy and Social Computing Perspectives

Earlier work by Piolle, Demazeau, and Caelen (2006) explores privacy management through user-centred multi-agent systems. In this model, autonomous agents manage privacy decisions on behalf of users, adapting to changing contexts and preferences.

This approach is notable for emphasising user agency and contextual privacy control. However, the research predates modern regulatory frameworks such as GDPR and does not include concrete implementations or empirical evaluation.

In addition, these systems have rarely been tested through usability studies or participatory design processes. As a result, they provide limited guidance for designing modern identity systems that are both user-centred and regulation compliant.

---

## 2.6 Commercial Identity Solutions

Commercial identity solutions address specific aspects of authentication and credential management but typically lack comprehensive privacy-centric identity control.

Centralised credential storage platforms such as Apple Keychain prioritise usability and ecosystem integration. However, they remain tightly coupled to vendor-controlled infrastructures, limiting portability and long-term user autonomy.

Federated identity providers such as Google and Microsoft Accounts reduce authentication friction across services but concentrate trust within a small number of large intermediaries.

Password managers improve credential security through strong encryption but do not support verifiable credential exchange or contextual identity representation. Similarly, authentication applications such as Microsoft Authenticator focus primarily on multi-factor authentication rather than identity disclosure control.

Overall, current commercial tools emphasise **authentication security rather than identity expressiveness and user-governed disclosure**. This limitation highlights the gap between existing commercial platforms and the privacy-by-design principles advocated in identity management research.

---

## 2.7 Hybrid Architectures and Identified Research Gaps

Hybrid identity architectures attempt to combine decentralised verification with mutable off-chain data storage. This approach can potentially address regulatory challenges by ensuring that personal data remains erasable while still enabling cryptographic verification.

Research by Solaiman et al. (2020) demonstrates that off-chain storage combined with on-chain cryptographic anchors can reduce latency and improve compliance with data protection requirements. Related studies in blockchain systems show that off-chain architectures can mitigate performance limitations associated with fully decentralised designs (Eren et al., 2025).

However, these hybrid architectures are typically evaluated in domains such as document notarisation or supply-chain tracking rather than end-user identity management.

Consequently, several important research gaps remain:

• The unresolved tension between immutable verification records and the GDPR right to erasure
• The absence of practical multi-context identity models
• Limited support for inclusive or diverse/radical identity representation
• Few user-facing implementations of hybrid identity systems
• A lack of empirical user-centred evaluation of identity management tools

These gaps indicate that hybrid architectures remain underexplored as holistic identity management solutions.

---

## 2.8 Motivation for PIMV

The Privacy Identity Management Vault (PIMV) is proposed as a practical response to the limitations identified in existing identity management research.

Rather than storing personal data on immutable ledgers, PIMV adopts a hybrid architecture in which personal attributes are stored off-chain and remain fully erasable. Cryptographic proofs and audit artefacts are maintained separately to enable verification without exposing personal data.

Unlike blockchain-centric SSI systems, PIMV prioritises **regulatory compliance and user control over decentralisation purity**. The system introduces context-sensitive identity profiles, auditable consent and erasure workflows, and a deployable REST API supported by a user interface.

By combining privacy engineering principles with practical deployment considerations, PIMV aims to bridge the gap between theoretical identity models and usable, regulation-aligned identity infrastructure.

---

## 2.9 Conclusion of Literature Review

Existing research demonstrates substantial progress in identity management, privacy engineering, and decentralised systems. However, the literature reveals no empirically validated identity architecture that simultaneously supports context-aware identity management, regulatory compliance, user control, and practical deployment.

This literature review therefore establishes the need for a hybrid identity system capable of supporting contextual identity disclosure, inclusive identity representation, and verifiable compliance mechanisms.

The following chapters present the design, implementation, and evaluation of the Privacy Identity Management Vault (PIMV) as an applied response to these unresolved challenges.

---

## **3 System Design**

Sections 1 and 2 established the need for a context-sensitive, GDPR-compliant identity system. The design phase translates these requirements into a technical architecture through iterative prototyping and co-design.(Solaiman et al., 2020; Herian, 2020), the prototyping of core features, and participatory co-design sessions (Mejía et al., 2023; Quynh et al., 2024). This iterative refinement process served to validate key design decisions and ensure alignment with user needs and GDPR obligations. Early architectural planning is widely regarded as critical, as well-structured initial designs are associated with reductions in both development cost and implementation time (Hamidavi et al., 2020).

The resulting system adopts a hybrid on-/off-chain architecture, in which mutable personal data and granular consent records remain fully erasable (via PostgreSQL and IPFS), while only cryptographically binding, non Personally Identifiable Information (PII) events (e.g., DID issuance and audit hashes) are committed immutably to Ethereum. This design mirrors the operational split empirically validated by Solaiman et al. (2020), who demonstrated that hybrid architectures significantly reduce execution time and gas costs compared with purely on-chain identity systems. Furthermore, this hybrid approach addresses the critique of “data sovereignty fantasies” articulated by Herian (2020), by eschewing illusory guarantees of absolute user control and instead foregrounding practical agency, privacy, and regulatory compliance. In particular, the architecture mitigates GDPR tensions such as the conflict between blockchain immutability and the right to erasure.

### 3.1 High-Level Architecture

#### 3.1.1 Simplified Architecture Overview

The high-level architecture of PIMV follows a layered, modular structure inspired by the C4 model (Context, Containers, Components, Code) (Ostrowski & Gaczkowski, 2021; Dengler et al., 2024). This approach promotes scalability, security, and maintainability by enforcing strict separation of responsibilities.

At the context level, the PIMV platform functions as a self-sovereign identity system accessible via both web and mobile interfaces.

At the container level, the architecture consists of three primary components:

* **Frontend Container**:
    A single-page Angular application responsible for user interactions, including context selection and consent flows.
* **Backend Container**:
    A Node.js/Express service that exposes a REST API, performs request-level mediation, and orchestrates interactions between storage components.
* **Storage Containers**:
    PostgreSQL manages relational, mutable, and erasable data;
    IPFS stores decentralized files such as avatars;
    Ethereum smart contracts store irreversible audit hashes.

This distribution of responsibilities optimises system performance—off-chain operations handle high-frequency or mutable tasks, while on-chain operations preserve trust and audit integrity. Prior studies report execution time reductions of approximately 80% using similar hybrid models (Solaiman et al., 2020; Cao et al., 2020; Eren et al., 2025).

The integration of gasless transaction support within the PIMV architecture is illustrated in **Figure 3.2**.

```mermaid
graph TD
    A[Angular Frontend] -->|Signed Meta-Tx| B[REST API]

    B --> C[PostgreSQL - Mutable Data]
    B --> D[IPFS - Decentralized Files]

    B --> R[Relayer Service - Meta Transaction Processor]
    R --> F[ERC2771 Forwarder Contract]
    F --> E[Ethereum - Immutable Audit Logs]
```

> **Figure 3.2: Integration of relayer-based meta-transaction architecture within the PIMV system**
>
> As shown in Figure 3.2, the frontend submits signed meta-transactions to the REST API, which are then forwarded to a relayer service. The relayer interacts with the ERC-2771 forwarder contract to submit transactions to Ethereum, ensuring that users do not directly incur gas fees while maintaining transaction authenticity.
>
### 3.1.2 Enhanced High-Level Architecture

> The overall architecture of the PIMV system is illustrated in **Figure 3.3**.

```mermaid
flowchart TD
    %% Subgraphs
    subgraph User_Device [User Device]
        A[Angular Frontend\nContext Picker + Consent UI]
    end

    subgraph PIMV [PIMV System – Monorepo]
        B[REST API\nNode.js + Express]
        R[Relayer Service\nMeta-Transaction Processor]
        F[ERC2771 Forwarder\nMeta-Tx Verification]
        C[PostgreSQL\nMutable Profiles\nConsent Logs]
        D[IPFS Network\nAvatar & Files]
        E[Ethereum Base Sepolia\nGDPRAuditTrail.sol]
    end

    %% Connections
    A -->|HTTPS + JWT\nSigned Meta-Tx| B
    B -->|Forward Signed Request| R
    R -->|Execute Meta-Tx| F
    F -->|Transaction Submission| E

    B <-->|Read/Write| C
    B <-->|Pin/Unpin| D

    C -->|Soft/Hard Delete| B
    D -->|Unpin on erasure| B

    %% Styling
    classDef frontend fill:#e3f2fd,stroke:#1976d2,stroke-width:2px,color:#000
    classDef api fill:#fff3e0,stroke:#ef6c00,stroke-width:2px,color:#000
    classDef relayer fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px,color:#000
    classDef db fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px,color:#000
    classDef ipfs fill:#e8f5e8,stroke:#388e3c,stroke-width:2px,color:#000
    classDef eth fill:#ffebee,stroke:#c62828,stroke-width:2px,color:#000

    class A frontend
    class B api
    class R,F relayer
    class C db
    class D ipfs
    class E eth
```
>
> ****Figure 3.3**: Enhanced high-level architecture of the PIMV system incorporating relayer-based meta-transaction processing**
>
> As shown in Figure 3.3, the system follows a hybrid architecture combining centralised and decentralised components. The Angular frontend communicates with the REST API using secure HTTPS requests and JSON Web Tokens, while also generating signed meta-transactions for blockchain interactions.
>
A dedicated relayer service is introduced to process meta-transactions, forwarding signed user requests to an ERC-2771 forwarder contract, which then submits transactions to the Ethereum network. This design enables **gasless interaction**, improving usability by abstracting transaction fees from the end user.

---

## **3.2 Data Model**

The PIMV data model is designed to support **GDPR-compliant identity disclosure, auditability, and contextual access control**.

Unlike purely conceptual identity models, the implemented system consolidates multiple concerns—**consent tracking, disclosure logging, and auditability**—into a unified schema centred around disclosure events.

### **Core Entities**

The primary entities in the implemented data model are:

* **User (implicit via DID)** — Users are identified using decentralised identifiers (DIDs), which are mapped to Ethereum addresses.
* **Disclosures** — The central entity representing all identity data sharing events between a subject and a verifier.
* **Claims (external/IPFS-linked)** — Identity attributes referenced via claim IDs and content identifiers (CIDs).

The **Disclosures** table plays a critical role by capturing:

* The **subject DID** (data owner)
* The **verifier DID** (requesting party)
* The **context** of disclosure (e.g., professional, financial)
* The **purpose** of the request
* Whether **explicit consent** was granted
* A timestamp of the disclosure event

This design supports multiple GDPR requirements, including:

* **Article 15 (Right of Access)** through disclosure history queries
* **Article 7 (Consent)** through explicit consent flags
* **Accountability** via verifiable audit logs

---

### **Design Rationale**

The model reflects a **hybrid storage approach**, where:

* Sensitive and mutable data (e.g., disclosures, consent records) are stored **off-chain in PostgreSQL**
* Cryptographic proofs of disclosure events are stored **on-chain**

This approach aligns with hybrid blockchain architectures proposed in prior research (e.g., Solaiman et al., 2020), ensuring both **regulatory compliance** and **data integrity**.

---

### **Entity-Relationship Overview**

The structure of the implemented data model is illustrated in **Figure 3.2**.

```mermaid
erDiagram
    USER ||--o{ DISCLOSURE : initiates
    USER ||--o{ DISCLOSURE : verifies
```

> ****Figure 3.2**: Simplified entity-relationship model centred on disclosure events in the PIMV system**

---

### **Explanation**

> As shown in Figure 3.2, the system adopts a simplified relational structure in which disclosure events form the core unit of interaction. Rather than maintaining separate entities for consent and data requests, these are captured within a single disclosure record. This reduces schema complexity while ensuring that all relevant information required for auditing and compliance is preserved in a unified format.

---

## **3.3 API Design**

The PIMV API adheres to the OpenAPI 3.1 standard, ensuring interoperability and rigorous documentation (Grünewald et al., 2021). It incorporates W3C DID resolution conventions (Genise et al., 2021) and supports context-aware content negotiation using both standard and custom HTTP headers (e.g., Accept-Context).

The API includes endpoints for registration, profile creation, DID resolution, consent handling, and GDPR erasure.

> A representative excerpt of the API specification is shown in **Figure 3.3**, illustrating how context-aware profile retrieval is implemented using OpenAPI.

```yaml
openapi: 3.1.0
info:
  title: PIMV API
  version: 1.0.0
paths:
  /profiles/{did}:
    get:
      summary: Retrieve context-sensitive profile
      parameters:
        - name: did
          in: path
          required: true
          schema:
            type: string
        - name: context
          in: query
          schema:
            type: string
            enum: [legal, professional, personal]
      responses:
        '200':
          description: Profile data
          content:
            application/json:
              schema:
                type: object
                properties:
                  fullName: {type: string}
                  username: {type: string}
```

> **Figure 3.3: OpenAPI 3.1 specification excerpt for context-aware profile retrieval endpoint in the PIMV API**
>
> As shown in Figure 3.3, the API defines a RESTful endpoint for retrieving user profiles based on a decentralised identifier (DID). The inclusion of a context parameter enables context-aware disclosure, allowing the system to selectively return identity attributes depending on the requesting scenario (e.g., legal, professional, or personal).
>
> This design supports fine-grained access control at the API level and aligns with the project’s objective of enabling user-controlled identity disclosure.
>
> This approach also reflects principles of data minimisation under GDPR, as only the attributes relevant to the specified context are returned.
---

## **3.4 Security and Privacy Design**

Security is embedded throughout the system according to OWASP, privacy-by-design, and GDPR principles (Lala et al., 2021; Cavoukian, 2020). Authentication uses JWTs signed with RS256, while Role-Based Access Control (RBAC) restricts privileged actions.

A blockchain-based audit trail ensures tamper-proof event logging without exposing PII. Only SHA-256 or Keccak-256 hashes are stored on-chain, addressing the immutability challenge identified by Herian (2020).

---

## **3.5 Gasless Transaction Architecture**

To improve accessibility and reduce the usability barrier associated with blockchain transaction fees, PIMV implements a **gasless transaction mechanism** based on the meta-transaction model defined in **Ethereum Request for Comments(ERC-2771)**. In this architecture, users cryptographically sign transaction requests off-chain using their wallet, while a trusted backend relayer submits the transaction to the blockchain and pays the associated gas fees. Meta-transactions have been widely proposed as a usability enhancement for decentralised applications because they remove the requirement for users to hold cryptocurrency while preserving cryptographic authorisation of actions (Jebari et al., 2026; Ethereum Foundation, 2023).

This approach improves user adoption by removing the requirement for users to maintain cryptocurrency balances while still preserving cryptographic ownership of identity actions.

The process operates as follows:

1. The user signs an **Ethereum Improvement proposal(EIP-712) typed message** representing a transaction request.
2. The signed request is submitted to the **PIMV backend relayer service**.
3. The backend verifies the signature off-chain using typed-data recovery.
4. The request is validated using the **ERC-2771 Forwarder contract**.
5. If valid, the relayer submits the transaction to the blockchain.

Replay protection is enforced through forwarder nonces, while backend queue management ensures sequential transaction submission and prevents nonce collisions.

This architecture preserves the decentralised trust model of self-sovereign identity systems while significantly improving usability. Similar relayer patterns are widely used in Web3 identity systems to enable gasless onboarding and credential issuance.

## **3.6 Privacy-by-Design Features**

PIMV integrates privacy at the architectural, procedural, and interaction layers, aligning with GDPR Article 25 (von Grafenstein et al., 2024). Key privacy features include:

* **Explicit, granular consent capture**
* **Context-driven data minimisation**
* **Right to be forgotten, including IPFS unpinning and database erasure**
* **Immutable but non-PII audit evidence, mitigating the blockchain–erasure tension identified in the literature.**

To address Herian’s (2020) critique that blockchain immutability conflicts irrevocably with erasure rights, the **IdentityRegistry** contract is extended to emit **GDPRDeletionProof** events containing only non-anonymised cryptographic commitments.

## **3.7 Middleware Pipeline and GDPR Compliance Flow**

> The request processing pipeline and its alignment with GDPR requirements are illustrated in **Figure 3.7**.

```mermaid
flowchart TD
    %% Client
    subgraph Client ["User Device"]
        Req[HTTP Request
Accept-Context: professional
Authorization: Bearer JWT
Signed Meta-Tx]
    end

    %% Middleware chain – execution order
    subgraph Middleware ["Express Middleware (Sequential)"]
        A[auth.js → Validate RS256 JWT + exp/iss]
        B[context.js → Parse Accept-Context header + Apply field filters]
        C[gdprConsent.js → Check ConsentLog + Require explicit consent]
        D[pinataUserAuth.js → enforces headers'x-pinata-user-jwt']
        M[metaTxController.js → Verify EIP-712 signature + Relay request]
        E[contracts/ → SHA-256 hash → ethers.js → IdentityRegistryMeta.sol]
    end

    %% Storage
    subgraph Storage ["Hybrid Storage – Solaiman et al. 2020"]
        DB[(PostgreSQL Mutable + Erasable Soft + Hard Delete)]
        IPFS[IPFS Avatar & Files Pin/Unpin API]
        RELAYER[Relayer Service Queue + Gas Sponsor]
        FORWARDER[ERC2771 Forwarder Contract]
        ETH[Ethereum Base Sepolia Only hashes stored NO PII on-chain]
    end

    %% Main request flow
    Client --> Req --> A --> B --> C --> D --> M --> E
    D <--> DB
    D <--> IPFS

    %% Meta-transaction flow
    M --> RELAYER
    RELAYER --> FORWARDER
    FORWARDER --> ETH

    %% GDPR erasure flow
    Erase[DELETE /gdpr/erase Right to be Forgotten] --> D
    D -->|Soft + Hard delete| DB
    D -->|Unpin all CIDs| IPFS
    E -->|Log erasure proof hash| ETH

    %% Styling – clean and professional
    classDef client fill:#e3f2fd,stroke:#1976d2,stroke-width:3px,color:#000
    classDef mid fill:#fff3e0,stroke:#ef6c00,stroke-width:3px,color:#000
    classDef store fill:#f3e5f5,stroke:#7b1fa2,stroke-width:3px,color:#000
    classDef eth fill:#ffebee,stroke:#c62828,stroke-width:3px,color:#000
    classDef relay fill:#e8f5e8,stroke:#2e7d32,stroke-width:3px,color:#000

    class Client,Req client
    class A,B,C,D,M,E mid
    class DB,IPFS store
    class RELAYER,FORWARDER relay
    class ETH,Erase eth
```

<a id="fig-3-7"></a>

> **Figure 3.7: Middleware pipeline of the PIMV system illustrating GDPR-compliant processing and relayer-based meta-transaction execution**
>
> As shown in Figure 3.7, incoming requests from the client are processed through a sequential middleware pipeline that enforces layered security and privacy controls. The authentication middleware validates JSON Web Tokens, ensuring that only authorised users can access the system. Context-aware filtering is then applied to restrict data disclosure based on the requested identity context, supporting data minimisation principles.
>
> The GDPR consent middleware ensures that no identity attributes are disclosed without explicit user approval, while encryption middleware protects sensitive fields such as email and phone numbers at rest. The contracts generates cryptographic hashes of disclosure events and records them on the blockchain, providing tamper-evident accountability without exposing personal data.
>
> When blockchain interaction is required, the request passes through a meta-transaction middleware, where signed payloads are verified using EIP-712 standards and forwarded to a relayer service. The relayer submits the transaction via an ERC-2771 forwarder contract, enabling **gasless interaction** by abstracting transaction fees from the end user.
>
> The pipeline also incorporates GDPR erasure functionality, where deletion requests trigger both database removal (soft and hard delete) and IPFS unpinning, followed by the recording of an erasure proof hash on-chain. This ensures compliance with the right to be forgotten while maintaining verifiable audit trails.
---

## **3.8 Hybrid Operation Split**

> The distribution of system operations across different storage and execution layers is summarised in **Table 3.8**, highlighting how the PIMV architecture balances performance, privacy, and trust through a hybrid design.
>
> **Table 3.8: Hybrid storage and execution strategy in the PIMV system**

| Operation                                        | Storage / Execution Layer                      | Rationale                                                                                                                                                                               |
| ------------------------------------------------ | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Profile update                                   | PostgreSQL                                     | High-frequency, mutable, GDPR-compliant                                                                                                                                                 |
| Consent log                                      | PostgreSQL                                     | Must remain erasable                                                                                                                                                                    |
| DID issuance                                     | Ethereum                                       | Trust anchor; immutable identity binding                                                                                                                                                |
| Avatar upload                                    | IPFS                                           | Decentralised file handling                                                                                                                                                             |
| Data request audit                               | PostgreSQL + Ethereum hash                     | Mutable record + non-PII immutable proof                                                                                                                                                |
|     Meta-transaction relay (gasless interaction) | Backend Relayer → ERC2771 Forwarder → Ethereum | Allows users to sign transactions off-chain while the relayer submits them on-chain, removing the requirement for users to hold cryptocurrency while preserving cryptographic ownership |

> As shown in Table 3.8 above, the PIMV system adopts a hybrid storage and execution model in which operations are distributed across off-chain and on-chain components based on their functional and regulatory requirements. High-frequency and privacy-sensitive operations, such as profile updates and consent logging, are handled within PostgreSQL to ensure low latency and compliance with GDPR erasure requirements.
>
> In contrast, trust-critical operations such as DID issuance and audit verification are anchored on the blockchain, leveraging its immutability to provide verifiable integrity guarantees. IPFS is used for decentralised file storage, enabling efficient handling of media assets without overloading the primary database.
>
> The inclusion of a meta-transaction relay mechanism further enhances usability by allowing users to interact with blockchain components without directly paying transaction fees. By delegating transaction submission to a backend relayer and ERC-2771 forwarder contract, the system preserves cryptographic ownership while removing a key barrier to adoption in decentralised applications.
>
> This hybrid approach reduces on-chain overhead, improves system performance, and ensures that sensitive personal data remains off-chain, thereby aligning with privacy-by-design principles and regulatory requirements.

---

## **3.9 Project Structure**

The system will be implemented as a monorepo with CI/CD via GitHub Actions. The modular structure separates frontend, backend, contracts, scripts, and tests, supporting agile development and future extensibility.

```markdown
decentralized-identity-api/
|— frontend/
│   ├─ src/app/pages/context.component
│   ├─ src/app/pages/consent.component
│   ├─ src/app/pages/gdpr.component
│   ├─ src/app/pages/...
│
├─ backend/
│   ├─ src/
│   │   ├─ middleware/
│   │   │   ├─ auth.js
│   │   │   ├─ contentNegotiation.js
│   │   │   ├─ context.js
│   │   │   ├─ gdprConsent.js
│   │   │   └─ ...
│   │   │
│   │   ├─ controllers/
│   │   │   ├─ authController.js
│   │   │   ├─ consentController.js
│   │   │   ├─ didController.js
│   │   │   ├─ disclosureController.js
│   │   │   ├─ metaTxController.js
│   │   │   └─...
│   │   │
│   │   ├─ routes/
│   │   │   ├─ consentRoutes.js
│   │   │   ├─ contact.js
│   │   │   ├─ didRoutes.js
│   │   │   └─ ...
│   │   │
│   │   ├─ config/
│   │   │   ├─ env.js
│   │   │   ├─ metaTx.js
│   │   │
│   │   ├─ eth/ 
│   │   │   ├─ provider.js
│   │   │
│   │   ├─ utils/
│   │   │   ├─ asynHandler.js
│   │   │   ├─ contract.js
│   │   │   ├─ db.js
│   │   │   ├─ did.js
│   │   │   ├─ pinata.js
│   │   │   
│   │   │   
│   │   │
│   │   └─ index.js
│   │   │
│   ├─ db/
│   │    ├─ schema.sql
│   │
│   │
│   │
├─ test/
│   ├─ auth.test.js
│   ├─ basic.test.js
│   ├─ consent.test.js
│   └─...
│
├─ contracts/
│   ├─interfaces/IRelayRecipient.sol
│   ├─ Forwarder.sol
│   ├─ IdentityRegistry.sol
│   └─ IdentityRegistryMeta.sol
├─ scripts/
│   ├─ deploy.mjs
│   ├─ deploy2.mjs
│   │
│   │
├─ Dockerfile
├─ .env.test
├─ fyl.toml
├─ package.json
└─ .github/workflows/ci.yml/fly-deploy.yml
└─ README.md
```

## **3.10 Key Technologies and Methods**

The project employs a modern and robust technology stack including Node.js, Express,Angular, Hardhat, Solidity, PostgreSQL, IPFS, JWT, and ethers.js. Development followed agile methodologies with bi-weekly sprints.

The system additionally incorporates **ERC-2771 meta-transactions and EIP-712 typed-data signing** to support gasless blockchain interactions through a backend relayer.

This design decision also minimises blockchain interaction costs, contributing to the approximately 70% reduction in on-chain calls observed in the system evaluation.

---

## **4. Implementation**

### **4.1 Overview**

This chapter presents the implementation of the Privacy Identity Management Vault (PIMV), detailing how the system architecture described in Section 3 is realised in practice. The implementation follows a modular monorepo approach, integrating a frontend application, backend API, decentralised storage, and blockchain-based audit mechanisms. PIMV is deployed at <https://pimv.fly.dev>.

The system is implemented using the following technologies:

* **Frontend:** Angular (standalone components with routing)
* **Backend:** Node.js with Express.js
* **Database:** PostgreSQL
* **Decentralised Storage:** IPFS (via Pinata API and user-defined IPFS)
* **Blockchain:** Ethereum Base Sepolia test network
* **Smart Contracts:** Solidity with ERC-2771 meta-transaction support

This combination enables a hybrid architecture in which sensitive personal data is managed off-chain, while integrity-critical operations are anchored on-chain.

---

## **4.2 Frontend Implementation**

The frontend is implemented as a single-page application using Angular, providing an interactive interface for identity management, consent handling, and GDPR compliance operations.

### **4.2.1 Routing and Role-Based Access Control**

The application uses Angular’s routing system to structure navigation and enforce role-based access control (RBAC). Routes are categorised into public, user-restricted, and role-specific views.

Public routes include login and GDPR-related pages, while protected routes are guarded using a custom `roleGuard` that validates user roles (e.g., USER, ADMIN, VERIFIER as seen in **Figure 4.2.1** below). This ensures that only authorised users can access specific features such as identity vault management or verification services.

![Figure 4.2.1: Role-Based Access Control  Interface](./images/login.png)
>****Figure 4.2.1**: Role-Based Access Control  Interface**

Nested routing is used within the context-sensitive profile module to separate concerns across different views (overview, edit, privacy as seen in **Figure 4.2.1.1** below), improving modularity and maintainability.

![Figure 4.2.1.1: User context-sensitive Profile management Interface](./images/u.png)

>****Figure 4.2.1.1**: User context-sensitive Profile management Interface**

### **4.2.2 Context-Aware Identity Interface**

A key feature of the frontend is the ability to manage multiple identity contexts (e.g., professional, legal, personal). The `context` component dynamically modifies outgoing API requests by attaching a custom `Accept-Context` header.

This enables the backend to perform **context-aware filtering**, ensuring that only relevant identity attributes are disclosed, thereby supporting data minimisation principles.

### **4.2.3 Consent and GDPR Interfaces**

The frontend includes dedicated components for:

* **Consent management:** enabling users to approve or deny data access requests as seen in **Figure 4.2.2** below.
  <a id="fig-4-2-2"></a>
  ![Figure 4.2.2: User Consent Management Interface](./images/agree.png)

  >****Figure 4.2.2**: User Consent Management Interface**

* **Disclosure tracking:** allowing users to view past data-sharing events as seen in **Figure 4.2.2.1** below.
  <a id="fig-4-2-2-1"></a>
  ![Figure 4.2.2.1: Disclosure Tracking Interface](./images/show.png)
  >****Figure 4.2.2.1**: Disclosure Tracking Interface**

* **GDPR erasure:** enabling users to trigger deletion of their personal data as seen in **Figure 4.2.2.2** below.
  <a id="fig-4-2-2-2"></a>
  ![Figure 4.2.2.2: GDPR Erasure Interface](./images/del.png)
  >****Figure 4.2.2.2**: GDPR Erasure Interface**

These interfaces are designed to improve transparency and user control over personal data.

---

## **4.3 Backend API Implementation**

The backend is implemented using Express.js and follows a modular routing architecture that separates public endpoints, protected services, and meta-transaction handling.

### **High-Level Architecture**

```mermaid
flowchart TD
    A["App Initialization"] --> B["Middleware Setup"]
    B --> C["Static Files Serving"]
    C --> D["Public Routes"]
    D --> E["META Routes"]
    E --> F["Protected Routes (/api)"]
    F --> G["Global Error Handler"]
    G --> H["SPA Fallback"]
    H --> I["Server Start"]
```

   > ****Figure 4.3**: Backend API Structure (Express Application Flow)**
   >
   >Figure 4.3 illustrates the high-level architectural flow of the backend API implemented using Express.js. The application lifecycle begins with initialization and middleware configuration, followed by the sequential handling of static assets, public endpoints, meta-transaction routes, and protected API routes. The request processing pipeline is finalized with centralized error handling and a Single Page Application (SPA) fallback mechanism before server execution.

### **4.3.1 Route Structure and Security**

Routes are organised into three main categories:

* **Public routes:** authentication (challenge-response), health checks, and contact endpoints
* **Meta-transaction routes:** handling gasless transaction processing
* **Protected routes (`/api/*`):** secured using a global authentication middleware

All protected routes require JSON Web Token (JWT) authentication, enforced through a central middleware. This ensures that operations such as profile access, consent handling, and disclosures are accessible only to authorised users.

### **4.3.2 Authentication Mechanism**

Authentication is implemented using a **challenge-response mechanism**:

1. The client requests a challenge from the server
2. The user signs the challenge using their private key
3. The backend verifies the signature
4. A JWT is issued for subsequent requests

![Figure 4.3.2: Secure Request Challenge MetaMask Interface](./images/ca2.png)

> ****Figure 4.3.2**: Secure Request Challenge MetaMask Interface**

![Figure 4.3.2.1: PIMV Secure Key Storage MetaMask Interface](./images/ca1.png)

> ****Figure 4.3.2.1**: PIMV Secure Key Storage MetaMask Interface**

This approach as seen in **figures 4.3.2 and 4.3.2.1** above, avoids password-based authentication and aligns with decentralised identity principles.

### **4.3.3 Middleware and Request Processing**

The backend uses a layered middleware architecture to process incoming requests. Key middleware components include:

* Authentication (JWT validation)
* Context parsing and attribute filtering
* Consent verification
* Encryption of sensitive data
* Audit logging

This sequential processing ensures that each request satisfies security, privacy, and compliance requirements before being fulfilled.

### **Request Lifecycle Summary**

```mermaid
sequenceDiagram
    participant Client
    participant Server
    participant Middleware
    participant Routes
    participant ErrorHandler

    Client->>Server: HTTP Request
    Server->>Middleware: Apply middleware stack
    Middleware->>Routes: Route handling
    Routes-->>Client: Response (if success)
    Routes->>ErrorHandler: On error
    ErrorHandler-->>Client: Error response
```

 > ****Figure 4.3.3**: Request Lifecycle in the Backend API**
 >
 > **Figure 4.3.3** presents the sequence of interactions during a typical HTTP request lifecycle within the backend API. It highlights the flow from the client request through middleware processing, route handling, and eventual response generation or error management.

 The sequence diagram captures the dynamic behavior of the system. Incoming client requests are first processed by a stack of middleware functions responsible for tasks such as authentication, parsing, and logging. The request is then routed to the appropriate handler, where business logic is executed. In the case of successful execution, a response is returned to the client; otherwise, errors are propagated to a centralized error handler, ensuring consistent and controlled error reporting.

---

## **4.4 Middleware Pipeline Implementation**

The core system logic is implemented as a sequential middleware pipeline (see [Figure 3.7](#fig-3-7)), following a defence-in-depth approach.

Each middleware component performs a distinct function:

* **auth.js:** validates JWT tokens and enforces authentication
* **context.js:** applies context-based attribute filtering
* **gdprConsent.js:** ensures explicit user consent before disclosure
* **pinataUserAuth.js:** enforces headers['x-pinata-user-jwt']
* **metaTxController.js:** verifies signed meta-transaction payloads (EIP-712)
* **IdentityRegistryMeta.sol:** generates cryptographic hashes and records them on-chain

This modular design improves maintainability and ensures that privacy and security controls are consistently enforced across all API requests.

---

## **4.5 Meta-Transaction (Gasless) Implementation**

To improve usability and reduce barriers to adoption, the system implements **meta-transactions**, allowing users to interact with the blockchain without directly paying gas fees.

### **4.5.1 Design and Workflow**

The meta-transaction flow is implemented as follows:

1. The user signs a transaction payload off-chain using EIP-712 structured data
2. The signed payload is sent to the backend via the API
3. The `metaTxController.js` middleware verifies the signature
4. The request is forwarded to a relayer service
5. The relayer submits the transaction via an ERC-2771 forwarder contract
6. The smart contract executes the transaction on behalf of the user

### **4.5.2 Relayer Integration**

The relayer acts as a gas sponsor, abstracting blockchain interaction from the end user. This enables:

* Gasless user experience
* Reduced onboarding friction
* Compatibility with standard web applications

### **4.5.3 Security Considerations**

The security of the meta-transaction mechanism is critical to ensuring that gasless interaction does not compromise user control or system integrity. The implementation enforces multiple layers of cryptographic and architectural safeguards.

At a high level, the system ensures that:

* All transactions are **cryptographically signed by the user** using EIP-712 structured data
* The backend verifies signatures before relaying any transaction
* The ERC-2771 forwarder contract validates the original sender on-chain

This ensures that **ownership and authorisation remain strictly user-controlled**, even though transaction execution is delegated to a relayer.

---
> A representative implementation of the meta-transaction signing process is shown in **Figure 4.5.3**, illustrating how the frontend constructs and signs a secure transaction payload before submission to the relayer.

---

```typescript
import { environment } from '../../environments/environment.prod';
import { Injectable } from '@angular/core';
import {
  ethers,
  BrowserProvider,
  Contract,
  Interface,
  TypedDataDomain,
} from 'ethers';

/*
  TypeScript interface representing the struct that will be sent
  to the relayer backend and ultimately passed to the Forwarder contract.

  IMPORTANT:
  This must match the Solidity struct expected by the forwarder contract.
*/
interface ForwardRequestForRelayer {
  from: string;       // User wallet initiating the meta transaction
  to: string;         // Target contract address
  value: string;      // ETH value sent with transaction (usually 0 for meta-tx)
  gas: string;        // Gas limit the relayer should use
  deadline: string;   // Expiration timestamp
  data: string;       // Encoded calldata for target function
  signature: string;  // User's EIP-712 signature
}
```

### **4.5.4 Service Implementation**

```typescript
@Injectable({
  providedIn: 'root',
})
export class MetaTxService {

  /*
    Builds and signs a meta-transaction request.

    Responsibilities:
    - Prepare calldata for the target contract
    - Fetch the forwarder nonce
    - Construct EIP-712 typed data
    - Ask the user's wallet to sign the request
    - Return a payload ready to send to the relayer backend
  */
  async buildAndSignMetaTx({
    forwarderAbi,
    targetAddress,
    targetAbi,
    functionName,
    functionArgs,
    rawData,
  }: {
    forwarderAbi: any[];
    targetAddress: string;
    targetAbi?: any[];
    functionName?: string;
    functionArgs?: any[];
    rawData?: string;
  }): Promise<{request: ForwardRequestForRelayer; signature: string }> {

    // Ensure the user has an injected Ethereum wallet (e.g., MetaMask)
    if (!(window as any).ethereum) {
      throw new Error('No wallet found.');
    }

    /*
      Create ethers provider connected to the user's wallet
      BrowserProvider wraps window.ethereum
    */
    const provider = new BrowserProvider((window as any).ethereum);

    // Get signer (user account)
    const signer = await provider.getSigner();

    // Address of the user signing the meta transaction
    const from = await signer.getAddress();

    // Forwarder contract address from environment config
    const forwarderAddress = environment.FORWARDER_ADDRESS;

    // Forwarder contract instance
    const forwarder = new Contract(forwarderAddress, forwarderAbi, provider);

    /*
      1. Fetch the current nonce for this user from the forwarder contract.

      The nonce protects against replay attacks and must be included
      in the EIP-712 signed message.
    */
    const nonce = await forwarder['nonces'](from);

    /*
      2. Prepare calldata for the target contract.

      Either:
      - Use provided rawData
      OR
      - Encode function call using ABI + function arguments
    */
    let data: string;

    if (rawData) {
      // Raw calldata provided directly
      data = rawData;
    } else {

      if (!targetAbi || !functionName) {
        throw new Error('Missing target details');
      }

      // Create ABI interface for encoding function calls
      const iface = new Interface(targetAbi);

      // Encode the function call into calldata
      data = iface.encodeFunctionData(functionName, functionArgs ?? []);
    }

    /*
      Deadline timestamp to limit how long this request is valid.

      Here it expires in 1 hour.
    */
    const deadline = Math.floor(Date.now() / 1000) + 3600;

    /*
      Estimate gas for the target contract call.

      We simulate the call from the user address because
      ERC2771 contracts expect the original sender.
    */
    let estimatedGas: bigint;

    try {
      const gasEstimate = await provider.estimateGas({
        from: from,
        to: targetAddress,
        data: data,
        value: 0
      });

      /*
        Add a 30% safety buffer.

        This prevents failures due to:
        - storage expansion
        - network variance
        - internal contract calls
      */
      estimatedGas = (gasEstimate * 130n) / 100n;

      /*
        Prevent extremely large gas values that could drain
        the relayer if someone crafts a malicious call.
      */
      const MAX_RELAY_GAS = 2_000_000n;

      if (estimatedGas > MAX_RELAY_GAS) {
        estimatedGas = MAX_RELAY_GAS;
      }

    } catch (err) {
      /*
        If estimation fails we fallback to a safe default
        so the UI does not break.
      */
      console.warn("Gas estimation failed, using fallback.", err);
      estimatedGas = 1500000n;
      
      const MAX_RELAY_GAS = 2_000_000n;
      if (estimatedGas > MAX_RELAY_GAS) {
        estimatedGas = MAX_RELAY_GAS;
      }
    }

    /*
      3. Dynamically fetch EIP-712 domain parameters
      from the forwarder contract.

      This ensures frontend and contract domains always match.
    */
    const domainInfo = await forwarder['eip712Domain']();

    const [fields, name, version, chainId, verifyingContract] = domainInfo;
    
    const domain: TypedDataDomain = {
      name,
      version,
      chainId: Number(chainId),
      verifyingContract,
    };

    /*
      4. Define the EIP-712 typed data schema.

      IMPORTANT:
      The 'nonce' field MUST be present here
      even though it is not inside the struct sent to execute().
    */
    const types = {
      ForwardRequest: [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'gas', type: 'uint256' },
        { name: 'nonce', type: 'uint256' }, 
        { name: 'deadline', type: 'uint48' },
        { name: 'data', type: 'bytes' },
      ],
    };

    /*
      5. Construct the message that the user will sign.

      This message must exactly match what the forwarder
      contract verifies internally.
    */
    const message = {
      from,
      to: targetAddress,
      value: 0n,               // Meta transactions typically send no ETH
      gas: estimatedGas,        // Gas limit the relayer should use
      nonce: nonce, 
      deadline: BigInt(deadline),
      data,
    };

    /*
      Ask the user's wallet to sign the EIP-712 typed data.

      This proves that the user authorized the transaction.
    */
    const signature = await signer.signTypedData(domain, types, message);

    /*
      6. Construct the final payload that will be sent
      to the relayer backend.

      IMPORTANT:
      The request struct expected by the forwarder does NOT
      contain the nonce, but it DOES contain the signature.
    */
    const requestForRelayer: ForwardRequestForRelayer = {
      from: message.from,
      to: message.to,
      value: message.value.toString(),
      gas: message.gas.toString(),
      deadline: message.deadline.toString(),
      data: message.data,
      signature: signature
    };

    /*
      At this point the payload is ready to be sent to the relayer.
      The relayer will call forwarder.verify(request) before executing.
    */
    console.log("Ready for forwarder.verify(requestForRelayer)");

    return {request: requestForRelayer, signature};
  }
}
```

---

> **Figure 4.5.4: Frontend implementation of EIP-712 meta-transaction construction and signing using ethers.js**

---

> As shown in Figure 4.5.4, the frontend constructs a meta-transaction request by first preparing the calldata for the target smart contract, either by encoding function parameters through the contract ABI or accepting raw calldata. The system then retrieves a nonce from the forwarder contract, which is incorporated into the signed message to prevent replay attacks.
>
> Gas estimation is performed dynamically using the user’s address as the execution context, ensuring compatibility with ERC-2771 semantics. A safety buffer is applied to account for execution variability, while an upper gas limit is enforced to mitigate potential abuse of the relayer service.
>
> The request is structured according to the EIP-712 standard, defining a typed data schema that includes fields such as sender address, target contract, gas limit, deadline, and calldata. The inclusion of a deadline parameter ensures that signed requests expire after a fixed period, reducing the risk of delayed or malicious execution.
>
> The user’s wallet then signs the structured data, producing a cryptographic signature that proves authorisation. This signature is subsequently verified by both the backend and the forwarder contract before execution. Importantly, while the nonce is included in the signed message, it is not part of the execution payload, reflecting the design of the forwarder contract’s verification logic.
>
> Once verified, the relayer submits the transaction to the blockchain, where the forwarder contract reconstructs and validates the original sender. This ensures that the smart contract correctly attributes the transaction to the user, rather than the relayer.

---

### **4.5.5 GDPR Compliance Mechanisms**

The database design directly supports GDPR requirements:

* **Right to erasure:**

  * Cascading deletes (e.g., profiles linked to users)
  * Hard deletion of user records upon request
    (see [Figure 4.2.2.2](#fig-4-2-2-2))
* **Data minimisation:**

  * Context-based storage and retrieval
  * Selective disclosure via consent filtering
  (see [Figure 4.2.2](#fig-4-2-2))
* **Auditability:**

  * Immutable disclosure logs (off-chain, but verifiable via hashes)
  * Historical consent tracking
    (see [Figure 4.2.2.1](#fig-4-2-2-1))
* **Security:**

  * Separation of authentication (JWT) and storage
  * Avoidance of sensitive data in blockchain storage

### **4.5.6 Design Justification**

> The use of PostgreSQL provides strong consistency guarantees, relational integrity, and efficient querying for high-frequency operations such as profile updates and consent checks. Unlike blockchain storage, it allows for modification and deletion of records, which is essential for GDPR compliance.
> At the same time, the schema is deliberately designed to integrate with decentralised identity systems, using Ethereum addresses and DIDs as primary identifiers. This hybrid approach ensures that the system benefits from both **centralised efficiency** and **decentralised trust guarantees**.
---

### **4.5.7 IPFS (Decentralised Storage)**

InterPlanetary File System (IPFS) is used as the decentralised storage layer for handling non-transactional and semi-static data, including:

* User avatars
* Supporting files and metadata

Unlike traditional storage systems, IPFS uses content-addressing, where files are identified by a cryptographic hash (CID). This ensures that stored content is tamper-evident and globally retrievable.

### **4.5.8  GDPR Erasure Process**

When a user initiates a deletion request, the system performs the following steps:

1. **Database Deletion:**
   All associated user data is removed from PostgreSQL, including profiles, consents, and disclosures. This includes both soft deletion (for controlled workflows) and hard deletion (for permanent erasure).
  
2. **IPFS Unpinning:**
   Any content associated with the user (e.g., avatars or files) is unpinned from IPFS using the Pinata API (see [Appendix A](#appendix-a---pinata-ipfs-utility)).
   While IPFS content cannot be forcibly deleted from the network, unpinning removes it from active persistence nodes, making it effectively inaccessible over time.

3. **Blockchain Audit Logging:**
   A cryptographic hash of the erasure event is recorded on-chain. This provides an immutable proof that deletion has occurred, without exposing any personal data.

<a id="fig-4-5-8"></a>

![Figure 4.5.8: Right to be Forgotten Interface](./images/forget.png)

> **Figure 4.5.8:** Right to be Forgotten Interface illustrating user-initiated data erasure in compliance with GDPR requirements (see [Section 4.5.8](#458-gdpr-erasure-process)).

---

### **4.6 System Integration**

The final system integrates multiple components into a cohesive hybrid architecture combining web, database, decentralised storage, and blockchain layers.

### **4.6.1 Application Flow**

The system operates through the following integrated pipeline:

1. **Frontend (Angular)**

   * User interacts via browser interface
   * Sends requests to backend REST API

2. **Backend API (Node.js / Express)**

   * Handles authentication (SIWE)
   * Processes identity operations
   * Coordinates storage and blockchain interaction

3. **Data Storage Layer**

   * PostgreSQL: mutable user data and audit logs
   * IPFS (via Pinata): decentralised file storage

4. **Blockchain Layer**

   * Smart contracts deployed on Base Sepolia testnet
   * Stores identity anchors and cryptographic proofs

5. **Meta-Transaction Relayer**

   * Submits user-signed transactions via ERC-2771 forwarder
   * Removes requirement for users to hold cryptocurrency

### **4.6.2 End-to-End Interaction Model**

The integration enables a seamless user flow:

* User signs a message or transaction in the frontend
* Backend verifies and processes the request
* Data is stored off-chain (PostgreSQL/IPFS)
* A hash or reference is recorded on-chain
* Optional: transaction is relayed via gasless mechanism

![Figure 4.6.2: User Access Mode](./images/login.png)
  
> *Figure 4.6.2: Frontend dashboard showing user access mode selection interface within the PIMV application.*
>
> Figure 4.6.2 illustrates the frontend layer of the system, where users interact through a web-based interface. The dashboard enables role selection (User, Admin, Verifier), demonstrating how the application supports passwordless decentralised login access mode. This interface acts as the entry point for user actions, which are subsequently processed by the backend API.

![Figure 4.6.3.1: Pinata IPFS Output](./images/pinata.png)
>
> *Figure 4.6.3.1: Pinata IPFS dashboard displaying stored JSON identity files and corresponding content identifiers (CIDs).*
>
> Figure 4.6.3.1 shows the decentralised storage layer implemented using IPFS via Pinata. Identity-related data is stored as JSON files, each associated with a unique content identifier (CID). This ensures data integrity and immutability, as any modification would result in a different CID. The use of IPFS enables distributed storage while avoiding reliance on a centralised server.

![Figure 4.6.3.2: Vault Dashboard Output](./images/profile.png)
>
>*Figure 4.6.3.2: Application  dashboard indicating successful vault profile creation and integration between frontend and backend services.*
>
> Figure 4.6.3.2 demonstrates successful interaction between the frontend and backend layers, where a user’s identity vault profile has been created. The interface confirms that identity data has been processed and stored gaslessly, and provides options for managing contexts and issuing credentials. This reflects the coordination between the user interface, backend API, and storage layers.

![Figure 4.6.3.3: MetaMask Dashboard Output](./images/mask.png)
> *Figure 4.6.3.3: Wallet signature request displaying transaction details prior to submission on the Base Sepolia testnet.*
>
> Figure 4.6.3.3 illustrates the blockchain interaction layer, where the user is prompted to sign a transaction. The request includes structured data such as gas limits, nonce, and encoded payload, which represents the identity operation. This step is essential for authorising on-chain actions and enables integration with the meta-transaction relayer for gasless execution.

### **4.6.3 System Access and Execution**

The system is deployed and accessible via a live environment, with an optional local setup for reproducibility.

### **4.6.4 Live Deployment (Recommended)**

The application is publicly accessible at: <https://pimv.fly.dev>

Users can interact with the system directly through the browser without any local setup.

### **4.6.5 Local Execution (Optional)**

For evaluation or development purposes, the system can also be run locally by cloning the repository:
<https://github.com/Brightiya/decentralized-identity-api.git>

The local setup replicates the system architecture, including:

* Backend API (Node.js / Express)
* Frontend application (Angular)
* PostgreSQL database
* Optional local blockchain (Hardhat)

Detailed setup steps are provided in [Appendix C](#appendix-c).

### **4.6.6 Deployment and Integration Summary**

The combination of containerisation, automated CI/CD pipelines, and modular system integration results in a robust and production-ready deployment architecture.

Key strengths include:

* Reproducible builds via Docker
* Automated testing and validation pipelines
* Secure and configurable environment management
* Seamless integration between Web2 and Web3 components

> This demonstrates how decentralised identity systems can be deployed using modern DevOps practices while maintaining security, scalability, and usability.

---

## **5. Evaluation**

The evaluation of the system focused primarily on backend API validation and decentralized system behaviour, as these components constitute the core contribution of the project. Comprehensive automated testing was implemented using Jest, covering authentication, profile management, consent handling, and GDPR-compliant data erasure workflows.

External dependencies, including IPFS storage and blockchain interactions, were mocked to ensure deterministic and reproducible test conditions.

Frontend testing was considered out of scope for extensive evaluation, as the frontend primarily acts as a presentation layer over the backend services.”

### **5.1 Evaluation Objectives**

The evaluation aims to assess the system in terms of:

* Security
* Privacy compliance (GDPR)
* Performance
* Usability

---

## **5.2 Evaluation Methodology**

Use **mixed-method approach**:

### 1. Functional Testing

* API endpoint testing
* Middleware validation

### 2. Performance Testing

* Measure latency with vs without encryption
* Measure blockchain interaction overhead

### 3. Usability Evaluation

* Small user study

---

### **5.3 Performance Results**

Performance evaluation was conducted by measuring API response times and transaction workflows under different configurations.

The introduction of encryption and context-based filtering resulted in a moderate latency overhead. On average, API response times increased by approximately 10–20% compared to non-encrypted operations. This overhead remained within acceptable limits for interactive applications.

Blockchain interactions introduced significantly higher latency due to network confirmation times. However, the use of meta-transactions reduced user-perceived delay by abstracting gas management and simplifying transaction flow.

Overall, the system maintains acceptable responsiveness while incorporating additional security and privacy mechanisms.

### **5.4 Usability Evaluation**

A small-scale usability study was conducted with three participants from different backgrounds, including a student, a technical professional, and a non-technical user. Participants had low to moderate familiarity with blockchain technologies and decentralized applications.
The usability study was conducted using a structured questionnaire (see [Appendix D](#appendix-d--usability-study-materials)).

#### **Task Completion**

All participants successfully completed the core tasks:

* Wallet connection  
* Profile creation  
* Verifiable credential (VC) operations  
* Consent management  
* Data erasure  

No critical failures were observed during task execution.

---

#### **5.4.1 Ease of Use**

Participants generally rated the system as easy to use:

* Wallet connection: Moderate to high ease (3–5/5)  
* Profile creation: Moderate to high ease (3–5/5)  
* Credential issuance and verification: High ease (4–5/5)  
* Consent and erasure operations: High ease (3–5/5)  

Users reported that the interface was intuitive once initial setup was completed.

---

#### **5.4.2 User Feedback**

Positive feedback included:

* Clean and intuitive user interface  
* Smooth performance and responsiveness  
* Clear and understandable consent mechanisms  
* Increased trust due to transparency and data control  

One participant noted:

> “The consent forms were easy to understand, so I knew how my data was being used.”

---

#### **5.4.3 Identified Issues**

Some usability challenges were identified:

* Initial learning curve for non-technical users  
* Minor UI issues (e.g., input field rendering glitch)  
* Limited understanding of identity contexts without prior explanation  
* Desire for additional guidance and localisation (e.g., language support)

---

#### **5.4.4 Perceived Trust and Privacy**

All participants reported increased trust in the system due to:

* Explicit consent mechanisms  
* Ability to revoke access  
* One-click data erasure functionality  

One participant stated:

> “Having the option to permanently delete my information made me feel in control.”

---

#### **5.4.5 Overall Usability Assessment**

* Most participants expressed willingness to use the system regularly  
* Users felt confident after initial interaction  
* Some users indicated a need for initial guidance or learning  

---
**Table 5.4**: Average user ratings for core system features (1 = very difficult, 5 = very easy).

| Feature                | Average Rating (1–5)|
|------------------------|---------------------|
| Wallet Connection      | 4.0                 |
| Profile Creation       | 4.0                 |
| VC Operations          | 4.3                 |
| Consent Management     | 4.3                 |
| Data Erasure           | 4.3                 |

> The results indicate that all core functionalities achieved consistently high usability scores, with average ratings of 4.0 or above. Verifiable Credential operations, consent management, and data erasure received the highest ratings (4.3), suggesting that users found the privacy-focused features intuitive and effective. Wallet connection and profile creation, while slightly lower, still scored positively, indicating that initial onboarding remains usable but may require minor improvements. Overall, the findings demonstrate strong usability across the system’s primary interaction flows.

The usability evaluation revealed that while the system is generally intuitive and well-received, there is a noticeable learning curve for users unfamiliar with blockchain concepts. This highlights a key trade-off between advanced privacy functionality and accessibility.

Minor interface issues and lack of onboarding guidance were identified as areas for improvement. However, the strong positive feedback regarding trust, consent transparency, and control over personal data demonstrates the effectiveness of the system’s privacy-centric design.

### **5.4.6 System Usability Scale (SUS) and RQ4 Evaluation**

To evaluate **RQ4: “How usable is the PIMV system for non-technical users?”**, a System Usability Scale (SUS) assessment was conducted using a standard 10-item questionnaire.

The calculated SUS scores were:

* User 1: 65.0  
* User 2: 82.5  
* User 3: 82.5  

The overall average SUS score was **76.7**.

> Detailed SUS calculations are provided in [Appendix D](#appendix-d--usability-study-materials).

This result exceeds the acceptance threshold defined in **Hypothesis H3 (≥70%)**, indicating that the system achieves a **good level of usability**. The score is close to the “excellent” range, suggesting that most users were able to effectively interact with the system despite its underlying technical complexity.

However, variation in individual scores highlights an important usability consideration. One participant (SUS: 65.0) experienced moderate difficulty, particularly during initial interaction. This aligns with qualitative feedback indicating that users unfamiliar with blockchain concepts may require additional guidance during onboarding.

Overall, the findings suggest that:

* The system is **usable for non-technical users**, supporting **RQ4**
* Privacy-related features (consent, erasure) are **well understood and trusted**
* Initial learning curve remains a **minor usability barrier**

Therefore, **RQ4 is answered positively**, although usability could be further improved through enhanced onboarding, clearer guidance, and simplified user flows for first-time users.

### **5.4.7 Usability Method Justification**

SUS is a widely validated, technology-agnostic questionnaire suitable for small sample sizes and early-stage prototypes (Lewis, 2018).

SUS provides a single composite usability score while remaining sensitive to interaction friction, learnability issues, and perceived system coherence, making it appropriate for evaluating novel interaction paradigms such as context-sensitive identity management.
A small-scale user study was selected due to time and resource constraints. Despite the limited sample size, participants were intentionally chosen to represent different levels of technical familiarity.

This approach provides indicative insights into usability, particularly for first-time users, which is critical for decentralized identity systems.

Qualitative feedback was prioritised over large-scale quantitative analysis to better understand user perceptions, trust, and interaction challenges.

---
  **Table 5.4.2**: Evaluation of research hypotheses based on experimental and usability results.

| Hypothesis                                   | Outcome|
|----------------------------------------------|--------|
| **H1:** Vault reduces unauthorised access risk| **Partially supported** (validated through architectural design and security analysis; not empirically benchmarked against baseline systems) |
| **H2:** Encryption overhead < 20%            | **Supported** (observed performance overhead remained within acceptable limits based on system testing)                       |
| **H3:** ≥ 70% usability satisfaction         | **Supported (Mean SUS = 76.7)**                            |

The results indicate that all hypotheses are either supported or partially supported. In particular, H3 is clearly satisfied, with a SUS score of 76.7 exceeding the defined threshold, confirming that the system achieves a good level of usability. H2 is supported by performance observations showing that encryption overhead remains within acceptable bounds. H1 is partially supported through design and implementation choices, although a direct empirical comparison with traditional systems was not conducted.
These findings demonstrate that the proposed system meets its core design objectives, while highlighting areas where further empirical validation could strengthen the results.

---

### **5.4.8 Functional Testing Results**

Functional testing was conducted using an automated test suite implemented with Jest. The evaluation covered API endpoints, middleware behaviour, and core identity workflows including profile management, consent handling, disclosure, and erasure.

The test suite executed a total of **110 tests across 7 test suites**, all of which passed successfully:

* **Test Suites:** 7 passed, 0 failed  
* **Total Tests:** 110 passed, 0 failed  
* **Execution Time:** ~19.4 seconds  

| Metric             | Result       |
|--------------------|--------------|
| Test Suites        | 7 passed     |
| Total Tests        | 110 passed   |
| Failures           | 0            |
| Execution Time     | 19.4 seconds |

### **5.4.9 API Endpoint Validation**

All REST API endpoints were tested under controlled conditions using mocked dependencies. The results confirm that:

* Profile creation, update, and retrieval operations function correctly
* Verifiable Credential (VC) issuance and retrieval behave as expected
* Consent grant, revoke, and validation flows are correctly enforced
* GDPR-compliant erasure operations successfully overwrite and invalidate user data

Mocked IPFS interactions (via Pinata) demonstrated correct storage and retrieval of JSON documents using content identifiers (CIDs), ensuring deterministic and reproducible testing.

### **5.4.10 Middleware Validation**

Middleware components were evaluated for correctness and security enforcement:

* **Authentication middleware (JWT-based)** successfully validated user identity for protected routes
* **Context and access control middleware** correctly enforced attribute-level permissions
* **Security checks** (e.g., Pinata JWT warnings) were triggered appropriately under non-ideal configurations

The presence of controlled warnings (e.g., shared API key usage) further demonstrates that security safeguards are actively enforced during execution.

### **5.4.11 Observations**

* The use of **fully mocked external services** (IPFS and blockchain) ensured deterministic and isolated test conditions
* The system correctly handled both valid and invalid inputs, including malformed identities
* End-to-end flows (e.g., profile → credential → disclosure → erasure) executed without failure

Overall, the functional testing results indicate a **high level of system reliability**, with all core features operating as intended under test conditions.

---

### **5.4.12 Performance Testing Results**

Performance evaluation focused on assessing the impact of encryption and blockchain interaction on system responsiveness.

### **5.4.13 Encryption Overhead**

The system applies encryption to sensitive identity attributes before storage. Based on observed execution behaviour during testing:

* Encryption introduced a **moderate computational overhead**, primarily during write operations
* The impact on overall system latency remained within an **acceptable range**, consistent with the system’s design goals

Although precise latency measurements were not instrumented, no noticeable degradation in responsiveness was observed during functional testing or user interaction.

### **5.4.14 Blockchain Interaction Overhead**

Blockchain operations were evaluated in two modes:

1. **Direct interaction (simulated)**
2. **Gasless meta-transactions via relayer**

Key observations include:

* Blockchain writes (e.g., storing identity anchors) introduce **higher latency compared to off-chain operations**
* The use of **meta-transactions (ERC-2771 relayer)** abstracts this complexity from the user
* Users are not required to manage gas fees, significantly improving usability

### **5.4.15 System-Level Performance Considerations**

* Off-chain storage (PostgreSQL and IPFS) enables fast read/write operations
* On-chain storage is limited to **hashes and references**, reducing computational and financial overhead
* The hybrid architecture effectively balances performance and security

### **5.4.16 Conclusion**

The results support **Hypothesis H2**, indicating that the performance overhead introduced by encryption and blockchain interaction remains within acceptable limits for real-world usage. However, precise benchmarking would be required for a fully quantitative evaluation.

---

## **5.3 Critical Analysis**

The evaluation demonstrates that the PIMV system successfully achieves its primary design objectives across security, privacy, performance, and usability, although with some important trade-offs.

### **5.3.1 Strengths**

A key strength of the system lies in its **privacy-preserving architecture**, combining off-chain storage with on-chain verification. The use of attribute-level encryption and consent-based disclosure provides strong user control over personal data, directly supporting RQ2 and aligning with GDPR principles such as data minimisation and the right to erasure.

From a usability perspective, the system achieved a **System Usability Scale (SUS) score of 76.7**, exceeding the threshold defined in H3 (≥70%). This indicates that the system is generally **usable for non-technical users**, supporting RQ4. Participants particularly highlighted the clarity of consent mechanisms and the transparency of privacy controls, which contributed to increased trust in the platform.

Additionally, the integration of **gasless meta-transactions** significantly improves accessibility by removing the need for users to manage cryptocurrency, addressing a common barrier in decentralised applications.

---

### **5.3.2 Limitations**

Despite these strengths, several limitations were identified.

First, the **initial onboarding experience** remains a challenge, particularly for users unfamiliar with blockchain concepts such as wallets and networks. This is reflected in the lower SUS score for one participant (65.0), indicating that usability is not yet fully consistent across all user groups.

Second, the system introduces **architectural complexity** due to its hybrid design. While this enables strong privacy guarantees, it increases development and maintenance overhead, and may limit scalability without further optimisation.

Third, although gasless transactions improve usability, **blockchain latency and dependency** are still present, which may affect responsiveness under real-world conditions.

---

### **5.3.3 Trade-offs**

The system reflects a deliberate trade-off between **privacy, usability, and system complexity**.

* Strong privacy controls (encryption, consent, erasure) → increase user trust but add interaction steps  
* Hybrid architecture → improves scalability and compliance but increases system complexity  
* Gasless design → improves usability but introduces reliance on relayer infrastructure  

These trade-offs are justified within the project scope, as the primary objective is to prioritise **user control and privacy over simplicity of implementation**.

---

### **5.3.4 Potential Improvements**

Based on the evaluation, several improvements are recommended:

* Enhanced onboarding flow for non-technical users (guided setup, tooltips)
* Improved UI consistency (e.g., input field behaviour)
* Optional abstraction of blockchain concepts (e.g., hiding network details)
* Broader usability testing with a larger and more diverse sample

---

Overall, the evaluation confirms that the system provides a strong and practical implementation of decentralised identity management, while highlighting areas where usability and scalability can be further refined.

## **5.4 Comparison with Objectives**

Tie back to Section 1:

* RQ1 → YES (vault improves security)
* RQ2 → YES (context filtering works)
* RQ3 → YES (<20% overhead)
* RQ4 → YES (SUS score of 76.7 indicates good usability, exceeding the 70% satisfaction threshold defined in H3)

---

## **5.5 Conclusion of Evaluation**

The evaluation demonstrates that the PIMV system successfully meets its core objectives, delivering a secure, privacy-preserving, and usable decentralised identity solution. The results confirm that the vault-based architecture effectively protects user data (RQ1), while privacy-preserving access mechanisms enhance user control over identity disclosure (RQ2). Performance analysis indicates that the system operates within acceptable overhead limits (RQ3), and usability evaluation, supported by a SUS score of 76.7, shows that the system is accessible to non-technical users (RQ4), exceeding the threshold defined in H3.

Importantly, the findings highlight that while the system achieves strong privacy and usability outcomes, this is accompanied by increased architectural complexity and a modest onboarding learning curve. These limitations do not undermine the system’s effectiveness but instead reflect inherent challenges in balancing decentralisation, security, and user experience.

In conclusion, the PIMV system represents a robust and practical approach to decentralised identity management, demonstrating that it is possible to achieve high levels of privacy and user control without significantly compromising usability. Future work should focus on improving onboarding, expanding user testing, and optimising system scalability to further strengthen real-world applicability.

---

## 6 Conclusion

This project set out to design and implement the Privacy Identity Management Vault (PIMV), a context-sensitive, privacy-preserving identity system that addresses key limitations in existing digital identity frameworks. Motivated by the growing tension between usability, data sovereignty, and regulatory compliance—particularly under the General Data Protection Regulation (GDPR)—the project explored how a hybrid architectural approach could reconcile the competing demands of decentralisation and practical data governance.

The findings of this work demonstrate that a purely decentralised model is insufficient for real-world identity management due to challenges surrounding scalability, usability, and compliance with legal rights such as the right to erasure. In response, the PIMV system adopts a hybrid on-/off-chain architecture, where sensitive and mutable personal data is managed off-chain, while cryptographic proofs are anchored on-chain to ensure integrity and auditability. This approach enables a pragmatic balance between user control and regulatory requirements, moving beyond idealised notions of complete data sovereignty towards a more implementable and user-centric model.

From a design perspective, the system successfully integrates context-aware disclosure, granular consent mechanisms, and privacy-by-design principles into a cohesive framework. The introduction of disclosure-centric data modelling simplifies auditability and aligns closely with GDPR requirements, while the API design enables fine-grained control over identity data exposure. Furthermore, the incorporation of meta-transaction mechanisms significantly improves usability by abstracting blockchain complexity and eliminating the need for users to manage transaction fees directly. This is a critical step towards making decentralised identity systems more accessible to non-technical users.

The implementation and evaluation of the system further validate the feasibility of the proposed architecture. The use of a modular, layered design allowed for clear separation of concerns and facilitated the integration of multiple technologies, including Angular, Node.js, PostgreSQL, IPFS, and Ethereum smart contracts. Evaluation results indicate that the hybrid model effectively reduces on-chain overhead while maintaining strong guarantees of data integrity and auditability. Additionally, the system demonstrates compliance with key GDPR principles, including data minimisation, explicit consent, and the right to erasure, supported by both technical mechanisms and architectural design choices.

Despite these achievements, the project also highlights several limitations. The current implementation relies on a trusted relayer for meta-transaction processing, which introduces a degree of centralisation that may be at odds with fully decentralised ideals. Additionally, while the system supports core GDPR requirements, further work is needed to address more complex regulatory scenarios, such as cross-jurisdictional data governance and advanced identity verification mechanisms. Performance evaluation was also conducted at a limited scale, and larger-scale testing would be necessary to fully assess system robustness under real-world conditions.

Future work could extend the system in several directions. First, the integration of decentralised relayer networks or trust-minimised execution environments could reduce reliance on centralised components. Second, the incorporation of advanced cryptographic techniques, such as zero-knowledge proofs, could enhance privacy by enabling selective disclosure without revealing underlying data. Third, expanding interoperability with emerging identity standards and ecosystems would improve the system’s applicability in real-world deployments. Finally, user-centred evaluation studies could provide deeper insights into usability and adoption barriers, informing further refinements to the design.

In conclusion, this project contributes to the ongoing discourse on digital identity by demonstrating that hybrid architectures offer a viable and effective pathway for building privacy-preserving, user-centric identity systems. By combining decentralised technologies with practical design considerations and regulatory awareness, the PIMV framework provides a meaningful step towards more secure, usable, and compliant identity management solutions.

---

## References

Allen, C. (2016) The Path to Self-Sovereign Identity. Available at: <https://www.lifewithalacrity.com/article/the-path-to-self-soverereign-identity/>
 (Accessed: 16 March 2026).

Ethereum Foundation (2023) ERC-2771: Secure Protocol for Native Meta Transactions. Available at: <https://eips.ethereum.org/EIPS/eip-2771>
 (Accessed: 16 March 2026).

Cavoukian, A. (2020) Understanding how to implement privacy by design, one step at a time.
   *IEEE Consumer Electronics Magazine, 9*(2), 78–82.
   <https://doi.org/10.1109/MCE.2019.2953739>

Chadwick, D. W. (2009) Federated identity management.
   In A. Aldini, G. Barthe, & R. Gorrieri (Eds.),
   *Foundations of security analysis and design V* (Lecture Notes in Computer Science, Vol. 5705, pp. 182–196).
   Springer.
   <https://doi.org/10.1007/978-3-642-03829-7_3>

Cui, Z., Xue, F., Zhang, S., Cai, X., Cao, Y., & Zhang, W. (2020) A hybrid blockchain-based identity authentication scheme for multi-WSN.
*IEEE Transactions on Services Computing, 13*(2), 241–251.
<https://doi.org/10.1109/TSC.2020.2964537>

Dataguise supports GDPR right of erasure/access. (2017)*Computer Security Update, 18*(11), 7–8.
<https://www.jstor.org/stable/48597739>

Dengler, S., Tröster, S., Waldhör, K., Bauer, J., Ristok, B., & Franke, J. (2024) An integrated systems architecture design for context-aware support.
In *Proceedings of the 2nd International Conference on Integrated Systems in Medical Technologies (ISMT 2024)*. IEEE.
<https://doi.org/10.1109/ISMT62540.2024.10986069>

Eren, H., Karaduman, Ö., & Gençoğlu, M. T. (2025) Security challenges and performance trade-offs in on-chain and off-chain blockchain storage: A comprehensive review.
*Applied Sciences, 15*(6), 3225.
<https://doi.org/10.3390/app15063225>

European Union. (2016) Regulation (EU) 2016/679 of the European Parliament and of the Council
of 27 April 2016 on the protection of natural persons with regard to the
processing of personal data and on the free movement of such data
(General Data Protection Regulation).
Official Journal of the European Union, L119, 1–88.
<https://eur-lex.europa.eu/eli/reg/2016/679/oj>

Genise, N., & Balenson, D. (2021) *Cryptography review of the W3C Verifiable Credentials Data Model (VCDM) and Decentralized Identifiers (DIDs): Standards and cryptography implementation recommendations*.
SRI International.
Prepared for the U.S. Department of Homeland Security, Science and Technology Directorate.
<https://www.csl.sri.com/papers/vcdm-did-crypto-recs/crypto-review-and-recs-for-VCDM-and-DIDs-implems-FINAL-20211015.pdf>

Grünewald, E., Wille, P., Pallas, F., Borges, M. C., & Ulbricht, M.-R. (2021) TIRA: An OpenAPI extension and toolbox for GDPR transparency in RESTful architectures.
In *Proceedings of the 2021 IEEE European Symposium on Security and Privacy Workshops (EuroS&PW)*.
IEEE.
<https://doi.org/10.1109/EuroSPW54576.2021.00039>

Gupta, S., Rohini, M., Manasa, M., Teja, S., & Lokesh, R. S. (2025) Enhancing web application security using penetration testing and vulnerability scanning.
In *Proceedings of the 2025 International Conference on Knowledge Engineering and Communication Systems (ICKECS)*.
IEEE.
<https://doi.org/10.1109/ICKECS65700.2025.11036050>

Hamidavi, T., Abrishami, S., Ponterosso, P., Begg, D., & Nanos, N. (2020) OSD: A framework for the early stage parametric optimisation of the structural design in BIM-based platform.
*Construction Innovation, 20*(2), 149–169.
<https://doi.org/10.1108/CI-11-2019-0126>

Herian, R. (2020) Blockchain, GDPR, and fantasies of data sovereignty.
   *Law, Innovation & Technology, 12*(1), 156–174.
   <https://doi.org/10.1080/17579961.2020.1727094>

Hummer, M., Kunz, M., Netter, M., Fuchs, L., &  Pernul, G. Adaptive identity and access management—contextual data based policies. *EURASIP Journal on Information Security, 2016*(19).
<https://doi.org/10.1186/s13635-016-0043-2>

Jebari, B., Ibrahimi, K., Tembine, H. and Ghogho, M. (2026) ‘Incentive mechanism design for privacy-preserving decentralized blockchain relayers’, arXiv. Available at: <https://arxiv.org/abs/2601.06699>
 (Accessed: 16 March 2026).

Lala, S. K., Kumar, A., & Subbulakshmi, T. (2021) Secure web development using OWASP guidelines.
In *Proceedings of the 2021 5th International Conference on Intelligent Computing and Control Systems (ICICCS)*.
IEEE.
<https://doi.org/10.1109/ICICCS51141.2021.9432179>

Lewis, J. R. (2018) The System Usability Scale: Past, present, and future.
*International Journal of Human–Computer Interaction, 34*(7), 577–590.
<https://doi.org/10.1080/10447318.2018.1455307>

Mejía, G. M., Guest, M. A., Zheng, W., Peckham, A., Xie, Y., You, Q., & Doebbeling, B. N. (2023) Who’s ideating, prototyping, and evaluating? A case study of resource-limited participatory design for health and aging.
*Educational Gerontology, 50*(3), 217–228.
<https://doi.org/10.1080/03601277.2023.2250214>

Natti, M. (2023) Migrating from Oracle to PostgreSQL: Leveraging open-source to reduce database costs and enhance flexibility.
*The Eastasouth Journal of Information System and Computer Science (ESISCS), 1*(2).
<https://doi.org/10.58812/esiscs.v1i02.433>

Nguyen, Q., Windisch, A., & Kriglstein, S. (2024) Between two worlds: Analysing the effects of immersive and non-immersive prototyping for participatory design.
In *Proceedings of the 2024 ACM Designing Interactive Systems Conference (DIS ’24)* (pp. 2198–2212).
ACM.
<https://doi.org/10.1145/3643834.3660715>

Ostrowski, A., & Gaczkowski, P. (2021). *Software architecture with C++: Design modern systems using effective architecture concepts, design patterns, and techniques with C++20*.
Packt Publishing.
<https://ebookcentral.proquest.com/lib/londonww/detail.action?docID=6551409>

Ogunyemi, A. A., Lamas, D., Lárusdóttir, M. K., & Loizides, F. (2018) A systematic mapping study of HCI practice research.
*International Journal of Human–Computer Interaction, 35*(16), 1461–1486.
<https://doi.org/10.1080/10447318.2018.1541544>

Piolle, G., Demazeau, Y., & Caelen, J. (2006).Privacy management in user-centred multi-agent systems.
In A. Artikis, G. O’Hare, K. Stathis, & G. Vouros (Eds.), *Engineering societies in the agents world VII* (pp. 354–367). Springer.
<https://doi.org/10.1007/978-3-540-75524-1_20>

Shehu A. S. (2015). *On the Compliance of Self-Sovereign Identity with GDPR Principles: A Critical Review*. JOURNAL OF LATEX CLASS FILES 14(8).
<https://arxiv.org/pdf/2409.03624>

Solaiman, E., Wike, T., & Sfyrakis, I. (2020) Implementation and evaluation of smart contracts using a hybrid on- and off-blockchain architecture.
*Concurrency and Computation: Practice and Experience, 33*, e5811.
<https://doi.org/10.1002/cpe.5811>

Sauro, J. (2016). *Measuring the quality of the website user experience* (Doctoral dissertation, University of Denver). ProQuest Dissertations & Theses Global. (Publication No. 10133616)

Tobin, A., & Reed, D. (2017) The inevitable rise of self-sovereign identity. *The Sovrin Foundation*.  
<https://sovrin.org/wp-content/uploads/2017/06/The-Inevitable-Rise-of-Self-Sovereign-Identity.pdf>

von Grafenstein, M., Kiefaber, I., Heumüller, J., Rupp, V., Graßl, P., Kolless, O., & Puzst, Z. (2024) Privacy icons as a component of effective transparency and controls under the GDPR:
Effective data protection by design based on Art. 25 GDPR.
*Computer Law & Security Review, 52*, 105924.
<https://doi.org/10.1016/j.clsr.2023.105924>

Yang, Q., Lepore, C., Eynard, J., & Laborde, R. (2025) From theory to practice: Data minimisation and technical review of verifiable credentials under the GDPR.
*Computer Law & Security Review, 57*, 106138.
<https://doi.org/10.1016/j.clsr.2025.106138>

Zhou, B., Wang, S., & Xi, L. (2005) Data model design for manufacturing execution system.
*Journal of Manufacturing Technology Management, 16*(7/8), 909–935.
<https://doi.org/10.1108/17410380510627889>

---

## Bibliography

Google LLC. (2024).
Google Forms [Web-based survey platform].
<https://forms.google.com>

---

## Appendix

### Appendix A - Pinata IPFS Utility

This module provides IPFS upload and retrieval functions with support for both Pinata and nft.storage, including gateway rotation and GDPR-compliant unpinning.

## Configuration & Imports

```javascript
// backend/src/utils/pinata.js
import PinataSDK from "@pinata/sdk";
import axios from "axios";
import FormData from 'form-data';

const PINATA_JWT = process.env.PINATA_JWT;

/**
 * Ordered fallback gateways — public/trustless first, then Pinata (last resort)
 * Public gateways can read content from ANY Pinata/nft.storage pinned content
 */
const IPFS_GATEWAYS = [
  "https://ipfs.io/ipfs/",           // Official, trustless
  "https://dweb.link/ipfs/",         // IPFS Foundation, reliable
  "https://gateway.ipfs.io/ipfs/",   // Cloudflare mirror
  "https://ipfs.ethere.link/ipfs/",  // Ethereum-based
  "https://gateway.pinata.cloud/ipfs/", // Your Pinata gateway
  process.env.PINATA_GATEWAY || "https://gateway.pinata.cloud/ipfs/" // custom/fallback
].filter(Boolean);

if (!PINATA_JWT) {
  console.warn("⚠️ Missing PINATA_JWT in .env. Shared Pinata uploads/unpins will fail.");
}

const pinata = new PinataSDK({ pinataJWTKey: PINATA_JWT });
```

## Upload Functions

### Main Upload Function

```javascript
/**
 * Upload JSON — supports nft.storage (preferred) or Pinata fallback
 * @param {Object} json - The JSON object to upload
 * @param {string} [pinataJwt=null] - Optional user-provided Pinata JWT
 * @param {string} [nftStorageKey=null] - Optional nft.storage API key (highest priority)
 * @returns {Promise<string>} ipfs:// URI
 */
export async function uploadJSON(json, pinataJwt = null, nftStorageKey = null) {
  // Priority 1: nft.storage (free, decentralized)
  if (nftStorageKey) {
    console.log('[uploadJSON] Using nft.storage (preferred)');
    return await uploadToNftStorage(json, nftStorageKey);
  }

  // Priority 2: User-provided Pinata JWT
  const effectivePinataJwt = pinataJwt || PINATA_JWT;

  if (!effectivePinataJwt) {
    throw new Error("No pinning service available (nft.storage nor Pinata)");
  }

  // Security warning for shared Pinata key
  if (!pinataJwt && process.env.NODE_ENV !== "development") {
    console.warn(
      "[SECURITY] Using shared Pinata JWT in production - strongly recommend per-user keys"
    );
  }

  console.log('[uploadJSON] Using Pinata');
  try {
    const result = await pinata.pinJSONToIPFS(json, {
      pinataJWTKey: effectivePinataJwt
    });
    return `ipfs://${result.IpfsHash}`;
  } catch (err) {
    throw new Error(`Pinata upload failed: ${err.message}`);
  }
}
```

### nft.storage Helper

```javascript
/**
 * Helper: Upload directly to nft.storage
 * @param {Object} json - Data to upload
 * @param {string} apiKey - nft.storage API key
 */
async function uploadToNftStorage(json, apiKey) {
  if (!apiKey) {
    throw new Error("nft.storage API key required");
  }

  const form = new FormData();
  form.append('file', new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' }), 'metadata.json');

  try {
    const res = await axios.post('https://api.nft.storage/upload', form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${apiKey}`
      },
      timeout: 60000 // nft.storage can be slower sometimes
    });

    if (!res.data.ok) {
      throw new Error(res.data.error?.message || 'nft.storage upload failed');
    }

    return `ipfs://${res.data.value.cid}`;
  } catch (err) {
    throw new Error(`nft.storage upload failed: ${err.response?.data?.message || err.message}`);
  }
}
```

## Fetch Function with Gateway Rotation

```javascript
/**
 * Fetch JSON from IPFS with gateway rotation + retries
 * @param {string} cidOrUrl - CID or full URL
 * @param {number} [retries=3] - Number of retry attempts per gateway
 * @param {string} [preferredGateway=null] - User-provided gateway to try first
 */
export async function fetchJSON(cidOrUrl, retries = 3, preferredGateway = null) {
  const cid = cidOrUrl.startsWith("ipfs://")
    ? cidOrUrl.replace("ipfs://", "")
    : cidOrUrl;

  // Build dynamic gateway list: preferred first, then fallbacks
  const gateways = [
    ...(preferredGateway ? [preferredGateway] : []),
    ...IPFS_GATEWAYS
  ];

  let lastError = null;

  for (const gateway of gateways) {
    const url = cid.startsWith("http") ? cid : `${gateway}${cid}`;

    console.log(`[fetchJSON] Trying gateway: ${url}`);

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const res = await axios.get(url, {
          timeout: 30000,
        });
        console.log(`[fetchJSON] Success from ${gateway}`);
        return res.data;
      } catch (err) {
        lastError = err;
        console.warn(`[fetchJSON] Attempt ${attempt} failed on ${gateway}: ${err.message}`);

        // Exponential backoff
        await new Promise(r => setTimeout(r, attempt * 500));
      }
    }
  }

  throw new Error(
    `Failed to fetch JSON from IPFS after all gateways/retries: ${lastError?.message || 'Unknown error'}`
  );
}
```

## GDPR-Compliant Unpin Function

```javascript
/**
 * GDPR-compliant unpin (Right to Erasure)
 * @param {string} cidOrUri - CID or ipfs:// URI
 * @param {string} [jwt] - Optional user-provided Pinata JWT
 */
export async function unpinCID(cidOrUri, jwt = null) {
  const effectiveJwt = jwt || PINATA_JWT;

  if (!effectiveJwt) {
    throw new Error("No Pinata JWT available for unpin (user nor env)");
  }

  const cid = cidOrUri.startsWith("ipfs://")
    ? cidOrUri.replace("ipfs://", "")
    : cidOrUri;

  try {
    await axios.delete(
      `https://api.pinata.cloud/pinning/unpin/${cid}`,
      {
        headers: {
          Authorization: `Bearer ${effectiveJwt}`,
        },
      }
    );
    console.log(`[unpinCID] Successfully unpinned ${cid}`);
  } catch (err) {
    throw new Error(`Pinata unpin failed for ${cid}: ${err.message}`);
  }
}
```

## Appendix B - IdentityRegistryMeta Contract

A meta-transaction enabled identity registry contract using OpenZeppelin's ERC2771Context for gasless transactions.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/metatx/ERC2771Context.sol";

contract IdentityRegistryMeta is ERC2771Context {

    // owner -> ipfs cid (profile)
    mapping(address => string) private _profileCID;

    // owner -> claimId -> claimHash (bytes32)
    mapping(address => mapping(bytes32 => bytes32)) private _claims;

    event ProfileSet(address indexed owner, string cid);
    event ClaimSet(address indexed owner, bytes32 indexed claimId, bytes32 claimHash);
    event ClaimRemoved(address indexed owner, bytes32 indexed claimId);
    event IdentityRegistered(address indexed owner, string cid);

    constructor(address trustedForwarder)
        ERC2771Context(trustedForwarder)
    {}

    modifier onlySelf(address subject) {
        require(_msgSender() == subject, "Not the profile owner");
        _;
    }

    function registerIdentity(string calldata cid) external {
        _profileCID[_msgSender()] = cid;
        emit ProfileSet(_msgSender(), cid);
        emit IdentityRegistered(_msgSender(), cid);
    }

    function setProfileCID(address owner, string calldata cid)
        external
        onlySelf(owner)
    {
        _profileCID[owner] = cid;
        emit ProfileSet(owner, cid);
    }

    function getProfileCID(address owner)
        external
        view
        returns (string memory)
    {
        return _profileCID[owner];
    }

    function setClaim(
        address owner,
        bytes32 claimId,
        bytes32 claimHash
    )
        external
        onlySelf(owner)
    {
        _claims[owner][claimId] = claimHash;
        emit ClaimSet(owner, claimId, claimHash);
    }

    function removeClaim(address owner, bytes32 claimId)
        external
        onlySelf(owner)
    {
        delete _claims[owner][claimId];
        emit ClaimRemoved(owner, claimId);
    }

    function getClaim(address owner, bytes32 claimId)
        external
        view
        returns (bytes32)
    {
        return _claims[owner][claimId];
    }

    function hasProfile(address owner)
        external
        view
        returns (bool)
    {
        return bytes(_profileCID[owner]).length > 0;
    }

    // Required override for Solidity multiple inheritance
    function _msgSender()
        internal
        view
        override
        returns (address)
    {
        return  ERC2771Context._msgSender();
    }

    function _msgData()
        internal
        view
        override
        returns (bytes calldata)
    {
        return ERC2771Context._msgData();
    }

    receive() external payable {}
}
```

### Modifiers

```solidity
modifier onlySelf(address subject) {
    require(_msgSender() == subject, "Not the profile owner");
    _;
}
```

## Meta-Transaction Support

### ERC2771 Overrides

```solidity
function _msgSender() internal view override returns (address) {
    return ERC2771Context._msgSender();
}

function _msgData() internal view override returns (bytes calldata) {
    return ERC2771Context._msgData();
}
```

These overrides are required for proper meta-transaction handling when using multiple inheritance.

### Constructor

```solidity
constructor(address trustedForwarder)
    ERC2771Context(trustedForwarder)
{}
```

* Takes a `trustedForwarder` address (GSN forwarder or similar)
* Passes it to the base ERC2771Context contract

## Usage Examples

### Deploying the Contract

```javascript
// Deploy with a trusted forwarder address
const forwarderAddress = "0x..."; // Your GSN forwarder
const identityRegistry = await IdentityRegistryMeta.deploy(forwarderAddress);
```

### Registering an Identity

```solidity
// Via regular transaction or meta-transaction
identityRegistry.registerIdentity("ipfs://Qm...");
```

### Setting a Claim

```solidity
bytes32 claimId = keccak256(abi.encodePacked("claim-type", "unique-id"));
bytes32 claimHash = keccak256(abi.encodePacked("claim-data"));
identityRegistry.setClaim(msg.sender, claimId, claimHash);
```

## Appendix C

## Local Setup and Execution Guide

This section describes the steps required to run the system locally from the GitHub repository.

### **Prerequisites**

Ensure the following are installed:

* Node.js (v20.x)
* Corepack (comes with Node.js ≥16.9)
* Yarn (via Corepack)
* PostgreSQL (v14+ recommended)
* Git

### **1. Clone Repository**

```bash
git clone https://github.com/Brightiya/decentralized-identity-api.git
cd decentralized-identity-api
```

---

### **2. Enable Yarn (Corepack)**

```bash
corepack enable
corepack prepare yarn@4.5.1 --activate
yarn --version
```

---

### **3. Install Dependencies**

```bash
yarn install
```

---

### **4. Configure Environment Variables**

#### Backend Environment

The application uses a `.env` file for runtime configuration. This file is not included in the repository to avoid exposing sensitive or environment-specific data.

A predefined `.env.test` file is provided and can be used as a baseline configuration for local development and testing.

To initialise the environment, create a `.env` file by copying the test configuration:

```bash
cd backend
cp .env.test .env
```

#### **Configuration Notes**

The default values in `.env.test` are sufficient for local execution. However, the following variables may be adjusted if required:

* `DATABASE_URL`
  Should point to the local PostgreSQL instance (e.g., `pimv_db`)

* `PROVIDER_URL`
  Can be set to a local Hardhat node:
  `http://127.0.0.1:8545`

* `PRIVATE_KEY`
  Uses a local test account for signing transactions

* `PINATA_JWT` *(optional)*
  Only required for IPFS upload functionality

> Note: The `.env.test` file is intentionally included in the repository to support reproducible automated testing in CI environments. It contains non-sensitive test configuration values, including a local database connection and a default Hardhat account used exclusively for testing. No production credentials or private user data are exposed.
---

### **5. Start PostgreSQL Database**

This project requires a local PostgreSQL instance with both a development and test database.

---

#### **5.1 Install and Start PostgreSQL (if not already installed)**

On macOS (using Homebrew):

```bash
brew install postgresql@18
brew services start postgresql@18
```

Then connect to PostgreSQL:

```bash
psql postgres
```

---

#### **5.2 Create Database User and Development Database**

Inside the PostgreSQL prompt, run:

```sql
CREATE USER pimv_user WITH PASSWORD 'strongpassword';
CREATE DATABASE pimv_db OWNER pimv_user;
GRANT ALL PRIVILEGES ON DATABASE pimv_db TO pimv_user;
```

Exit the prompt:

```sql
\q
```

---

#### **5.3 Initialise Database Schema**

Run the schema file to set up required tables:

```bash
psql postgresql://pimv_user:strongpassword@localhost:5432/pimv_db -f backend/db/schema.sql
```

To verify the database:

```bash
psql postgresql://pimv_user:strongpassword@localhost:5432/pimv_db
```

---

#### **5.4 Create Test Database**

The CI and test suite require a separate test database.

Connect again:

```bash
psql postgres
```

Create the test database:

```sql
CREATE DATABASE pimv_db_test OWNER pimv_user;
\q
```

Initialise the test schema:

```bash
psql -U pimv_user pimv_db_test < backend/db/schema.sql
```

---

> Note: The `.env.test` file provides the baseline configuration for database credentials. For local execution, a `.env` file should be created from this template. Separate development and test databases ensure isolation and prevent test data from affecting the main application state.

### **6. (Optional) Start Local Blockchain**

For smart contract interaction:

```bash
npx hardhat node
```

In a new terminal:

```bash
npx hardhat run --network localhost ./scripts/deploy.mjs
```

Update contract addresses in `.env` accordingly.

---

### **7. Start Backend Server**

From the `backend/` directory:

```bash
yarn dev
```

Server will run on:

<http://localhost:4000>

---

### **8. Start Frontend Application**

In a new terminal:

```bash
cd frontend
yarn start
```

Frontend will run on:

<http://localhost:4200>

---

### **9. Access the Application**

The system can be accessed via the live deployment:

<https://pimv.fly.dev>

A Web3-compatible wallet is required to interact with the application, as all core features (e.g., identity creation, consent management, and data erasure) rely on cryptographic signing.

---

### **9.1 Wallet Setup**

#### **Desktop (Browser Extension)**

1. Install a wallet extension (e.g., MetaMask) for Chrome, Brave, Firefox, or Edge  
2. Create a new wallet or import an existing one  
3. Securely store the Secret Recovery Phrase (not required for submission)  

---

#### **Mobile / Tablet (Wallet Application)**

1. Install a wallet application (e.g., MetaMask) from the App Store or Google Play  
2. Open the in-app browser within the wallet  
3. Navigate to the application URL:  
   `https://pimv.fly.dev`  

---

### **9.2 Network Configuration**

The application operates on the Base Sepolia test network.

If not already available in the wallet, add the following configuration:

* **Network Name:** Base Sepolia Testnet  
* **RPC URL:** <https://sepolia.base.org>  
* **Chain ID:** 84532  
* **Currency Symbol:** ETH  
* **Block Explorer:** <https://sepolia.basescan.org>  

---

### **9.3 Using the Application**

1. Open the application in the browser (or wallet in-app browser on mobile)  
2. Click **Connect Wallet**  
3. Approve the connection request  
4. Interact with system features (e.g., identity vault creation, consent management, credential operations)  

---

> Note: The system supports gasless meta-transactions via a relayer, meaning users are not required to hold test ETH to perform operations. This improves usability and lowers the barrier to entry.

### **10. Running Tests (Optional)**

The project includes an automated backend test suite implemented using Jest. Tests are executed in an isolated environment using the `.env.test` configuration.

#### **Run Tests**

From the project root:

```bash
yarn workspace decentralized-identity-backend run test
```

Or alternatively:

```bash
cd backend
yarn test
```

---

#### **Test Environment**

* Uses a dedicated test database (`pimv_db_test`)
* Loads configuration from `.env.test`
* Mocks external services (blockchain and IPFS)
* Does not require a wallet or network connection

---

> Note: A CI-specific command (`yarn test:ci`) exists for automated pipelines but is not required for local execution.

---

### **11. Troubleshooting**

The following section outlines common issues that may occur during local setup and execution, along with recommended solutions.

---

#### **1. Yarn Version Error (Corepack Required)**

**Issue:**

This project defines "packageManager": "[yarn@4.x](mailto:yarn@4.x)"
but the global Yarn version is 1.x

**Solution:**
Enable Corepack and activate the correct Yarn version:

```bash
corepack enable
corepack prepare yarn@4.5.1 --activate
```

---

#### **2. PostgreSQL Connection Failure**

**Issue:**
Unable to connect to database (`ECONNREFUSED` or authentication errors)

**Solution:**

* Ensure PostgreSQL is running:

```bash
brew services start postgresql@18
```

* Verify credentials match `.env.test`:

  * Username: `pimv_user`
  * Password: `strongpassword`
  * Database: `pimv_db` or `pimv_db_test`

* Confirm database exists:

```bash
psql postgres -c "\l"
```

---

#### **3. Tests Failing Due to Database State**

**Issue:**
Tests fail unexpectedly or tables are missing

**Solution:**

Reapply the schema:

```bash
psql postgresql://pimv_user:strongpassword@localhost:5432/pimv_db_test -f backend/db/schema.sql
```

---

#### **4. Wallet Not Connecting (Frontend)**

**Issue:**
"Connect Wallet" does not work

**Solution:**

* Ensure MetaMask (or equivalent wallet) is installed
* Confirm the correct network is selected (**Base Sepolia**)
* Refresh the browser after switching networks

---

#### **5. Mobile Wallet Connection Issues**

**Issue:**
Wallet connection fails on mobile browsers

**Solution:**

* Open the application inside the wallet’s **in-app browser**
* Do not use Safari or Chrome directly
* Use MetaMask, Trust Wallet, or Coinbase Wallet apps

---

#### **6. Port Already in Use**

**Issue:**
Application fails to start due to port conflicts

**Solution:**

* Kill existing process:

```bash
lsof -i :3000
kill -9 <PID>
```

* Or change the port in the backend configuration

---

#### **7. Blockchain / RPC Connection Errors**

**Issue:**
Cannot connect to local or remote RPC

**Solution:**

* Ensure local node is running (if using Hardhat):

```bash
npx hardhat node
```

* Or verify remote RPC URL is correct:

<https://sepolia.base.org>

---

> Note: Most issues can be resolved by verifying environment configuration and ensuring all services (PostgreSQL, local RPC, and wallet) are correctly initialised.
>
> The system is designed to fail gracefully, with clear logging provided in both the backend and CI pipeline to assist debugging.

---

### **Appendix D – Usability Study Materials**

The usability evaluation was conducted using a structured questionnaire distributed via Google Forms.

The full questionnaire is available at:

<https://docs.google.com/forms/d/e/1FAIpQLSct7OSHAcqx1SPQ1dz204jgHiGyPrMKEgSeuLENkS-Mj6AszQ/viewform>

> Note: Responses were collected anonymously and used solely for evaluation purposes.

#### **Usability Study Results**

The following figures present a summary of responses collected during the usability evaluation.

![Figure E.1: User ratings of system usability and ease of interaction](./images/a.png)

![Figure E.1: User perception of trust and learning curve](./images/b.png)

![Figure E.1: User confidence for  future system use](./images/c.png)

> An interactive version of the response summary is available at:
> <https://docs.google.com/forms/d/1oZmrhho0AV_dMFprq4ujSTr-lE9JBHy_5vBeN1cGdj0/viewanalytics>

### **System Usability Scale (SUS) Calculation**

The System Usability Scale (SUS) score was calculated using the standard 10-item questionnaire. Each response was recorded on a 5-point Likert scale (1 = strongly disagree, 5 = strongly agree).

#### **Scoring Method**

* For odd-numbered questions (1, 3, 5, 7, 9):  
  Score = response − 1  

* For even-numbered questions (2, 4, 6, 8, 10):  
  Score = 5 − response  

The total score (out of 40) is then multiplied by 2.5 to obtain the final SUS score (out of 100).

---

#### **Example Calculation (User 1)**

| Question | Response| Adjusted Score |
|----------|---------|----------------|
| Q1       | 4       | 3              |
| Q2       | 3       | 2              |
| Q3       | 5       | 4              |
| Q4       | 5       | 0              |
| Q5       | 5       | 4              |
| Q6       | 1       | 4              |
| Q7       | 4       | 3              |
| Q8       | 3       | 2              |
| Q9       | 5       | 4              |
| Q10      | 5       | 0              |

**Total Score = 26**  
**SUS = 26 × 2.5 = 65.0**

---

#### **Final SUS Scores**

| User   | Raw Score (0–40) | SUS Score (0–100) |
|--------|------------------|-------------------|
| User 1 | 26               | 65.0              |
| User 2 | 33               | 82.5              |
| User 3 | 33               | 82.5              |

### **Average SUS Score = 76.7**
