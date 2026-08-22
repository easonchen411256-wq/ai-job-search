---
framework_version: 1.0.0
---

# China Mainland: Discovery, Parsing, and Human-Controlled Application

This file is the operational companion to the South China Job Search Policy in
`CLAUDE.md`. It governs Guangdong/Guangxi discovery and overrides generic
country-specific assumptions elsewhere in the workspace when the posting is in
China mainland.

## Dual discovery channels

Run both channels; never make one a fallback for the other.

1. **Role-led:** search the configured role families: AI Product, Product,
   UXR / Insight, Management Trainee, and Psychology Teaching (高校/职校/技校
   心理健康专任教师；校招、社招均纳入搜索).
2. **Major-led:** search JDs and official recruitment notices for psychology-major
   wording without restricting the job title. This catches adjacent roles such as
   behavioural research, talent assessment, organisation development, customer
   experience, user strategy, and strategy research.

Official employer career pages and official campus-recruitment notices outrank
aggregator listings. An aggregator may be used to discover a role, but preserve its
URL and try to resolve the employer's own posting before ranking.

## Required JD record

For each fetched role, save only evidence actually present in the posting. Missing
information is `unknown`, never inferred. Store these additive fields in the
`seen_jobs.json` entry or in the job report:

```text
company, company_type, title, province, city, recruitment_type, role_family,
psychology_trigger, psychology_trigger_type, psychology_evidence,
education_requirement, graduation_year_requirement, experience_requirement,
responsibilities, must_have_skills, nice_to_have_skills, salary, deadline,
source, official_url, hard_constraints, evidence_gaps, priority
```

`psychology_trigger_type` is one of `required`, `accepted`, `preferred`, or
`none`. `evidence_gaps` is a short list, not a reason to invent a value.

## Hard filters, then priority

Apply filters before any fit score:

1. Confirm Guangdong or Guangxi location.
2. Exclude closed, expired, duplicate, or clearly incompatible degree/year/
   experience/credential requirements.
3. Apply the SOE policy in `CLAUDE.md`.
4. Identify a major conflict only when the JD explicitly rules the candidate out;
   a missing or broad major requirement is not a conflict.

Then assign exactly one result:

| Result | Meaning |
|---|---|
| `P0` | Direct target role or strong psychology-triggered opportunity, no known hard conflict. |
| `P1` | Relevant adjacent role, or a good role with one material but reviewable gap. |
| `P2` | Plausible opportunity with weak fit, incomplete evidence, or no configured city preference. |
| `Skip` | Fails a hard filter. Record the specific evidence-based reason. |

P0/P1/P2 are human triage bands, not probability claims or fabricated percentage
scores. A city in the candidate's configured city table can raise or lower the
priority within a band; an empty city table must not turn every job into a Skip.

## Chinese application fields

Before any portal-form action, classify every field:

- **Can prefill:** a fact verbatim supported by the candidate profile or registered CV.
- **Needs user:** national ID, hukou, political affiliation, ethnicity, marriage/family,
  health/disability, salary expectation, GPA/rank, certificate ID, exact dates, or
  any fact not already supported.
- **Manual handoff:** login, QR/WeChat/SMS verification, CAPTCHA, 2FA, and final
  submit.

The agent may draft text and show a review checklist. It never guesses, claims a
credential, or clicks the final submit action without the candidate's clear approval.
