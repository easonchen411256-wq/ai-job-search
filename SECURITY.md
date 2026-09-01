# Security Policy

## Reporting a vulnerability

Please report security findings privately through [this repository's GitHub security page](https://github.com/easonchen411256-wq/ai-job-search/security) rather than publishing sensitive details in an issue. Include the affected file, reproduction steps, and impact.

If the private form is unavailable, open a public issue that describes the *class* of problem without a working recipe, and note that you have details to share privately.

## Threat model, honestly stated

This is an agentic workflow: an LLM with file access reads untrusted web content (job postings) alongside your personal data (CV, profile, application history). That combination is the main risk surface, and it cannot be fully eliminated - only narrowed. What the framework does about it:

- **Untrusted-input rules**: `/apply` and `/rank` treat posting text as data, never instructions - agents are told not to follow directions embedded in postings and not to fetch URLs found inside posting text (the user-supplied posting URL is the one exception). Reviewer research starts from the company identity the user confirmed, never from links in the posting body.
- **Permission allowlist**: `.claude/settings.json` pre-approves only the specific commands the workflow needs; the `security-guards` CI job fails any PR that widens it, adds package-manifest lifecycle scripts, or weakens the personal-data gitignore rules. Note the allowlist governs Bash commands - the model's native WebFetch/WebSearch tools are outside its reach, which is exactly why the instruction-level rules above exist.
- **Personal data boundaries**: your populated profile, tracker, salary data, and application archive are gitignored; documents never leave the machine by design (`/notion-sync` syncs filenames only; nothing uploads document content anywhere).

Instruction-level defenses raise the bar; they are not a sandbox. If you run this workflow against job boards you do not trust at all, review what the agent fetched and wrote before sending anything out.

## Scope notes

- Portal CLI skills make live requests only when you run them; CI never does.
- Third-party skills copied into this workspace are **not** covered by this policy. Review their source and network destinations before enabling them.
