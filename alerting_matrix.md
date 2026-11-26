# Alerting Matrix

> **Project:** ShadowRealm 3D — v3.0 Ascendant | **Category:** SRE, DevOps & Operational Discipline | **Last Updated:** 2026-11-25

Routing rules for CI failures, security advisories, and runtime errors.

## Matrix

| Signal | Severity | Route | Response Target |
|---|---|---|---|
| Main branch CI failure | SEV-2 | Maintainers | < 4 hours |
| Critical CVE in dependency | SEV-1 | Security Advisory | < 2 hours |
| Nightly build failure | SEV-3 | Daily triage | < 24 hours |
