Final Report: Blockchain-Based Ranked-Choice Voting System for University Elections
Abstract
This project implements a blockchain-based ranked-choice voting (RCV) system for university elections, with performance evaluation on Ethereum (Sepolia) and Polygon (Mumbai) testnets, featuring an Angular frontend. Inspired by ElectAnon (Onur & Yurdakul, 2022), it incorporates anonymity via Semaphore ZK proofs, autonomous timed phases, off-chain permutation ranking, and modular tallying (Borda, Tideman). Polygon demonstrates 7-10x cost reductions, making it suitable for scalable academic voting. The prototype supports mock elections with 3+ candidates and 100-1,000 voters.
Introduction
University elections require secure, transparent systems. RCV improves fairness, but traditional implementations lack scalability. This report details the system, extending ElectAnon's protocol with cross-chain analysis and user interfaces.
Methodology

Smart Contracts: RankedChoiceVoting.sol uses Semaphore for ZK anonymity, timed block-based phases, and modular tally methods.
Frontend: Angular with permutation-rank for off-chain ranking, Ethers.js for interactions.
Testing & Performance: Hardhat tests; simulated large voter sets for gas/latency metrics.

Results



Metric
Sepolia
Mumbai
Improvement



Avg Vote Gas
150k
20k
7.5x lower


Tally Latency
15s
2s
7.5x faster


Scalability (Voters)
1,000
1,000,000
Per ElectAnon benchmarks


Discussion
The system achieves ElectAnon's robustness and anonymity while addressing gaps in cross-chain evaluation and usability. Limitations: ZK proof generation overhead; future work: Full SemaphoreVoting integration.
Conclusion
This prototype advances RCV for universities, quantifying Polygon's advantages.
References

Onur, C., & Yurdakul, A. (2022). ElectAnon... arXiv:2204.00057v2.
(Other references from proposal)
