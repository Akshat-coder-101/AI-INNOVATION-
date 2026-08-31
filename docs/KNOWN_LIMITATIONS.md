# Known Limitations & Hackathon Roadmap

1. **Third-Party API Quotas:** D-ID/HeyGen and ElevenLabs APIs require funded external API keys; our platform provides smart zero-cost fallbacks with browser speech synthesis and animated teaching canvas to guarantee uninterrupted hackathon evaluation.
2. **Sandbox Execution Isolation:** Currently Python execution runs in a timeout-capped local subprocess; production deployments will leverage Dockerized microVMs (e.g. gVisor or Firecracker).
3. **Complex Mathematical Proofs:** Multi-page step solvers currently render the primary 4 derivations; extended LaTeX proofs are split across lesson segments.
