---
name: changelog-analyzer
description: Analyze git commits in a range by examining actual code diffs (not commit titles) and produce a ranked list of improvements and optimizations. Use when the user wants a changelog, wants to summarize recent changes, asks what changed since a commit, or wants to review project progress.
---

# Changelog Analyzer

Analyze all code changes between two git commits and produce a ranked summary of improvements and optimizations based on **actual code diffs**, not commit messages.

## Parameters

- **Start commit**: The earliest commit hash (inclusive). Default: `e0be0387a636a93a062cee621fd78b83dfccb06e`
- **End commit**: The latest commit. Default: `HEAD`

If the user specifies a different range, use their values.

## Workflow

### Step 1: Enumerate commits and changed files

```bash
# List all commits in range (inclusive of start)
git log --oneline <start>~1..HEAD

# Get overall stats
git diff --stat <start>~1..HEAD
```

### Step 2: Analyze code diffs in batches

The diff may be very large. Process it in logical batches by directory or feature area:

```bash
# Get diff for a specific path
git diff <start>~1..HEAD -- <path>

# Or per-commit diffs when granularity matters
git show --stat <commit-hash>
git show <commit-hash> -- <file>
```

**Key analysis areas** (check each):
1. `apps/web/src/components/` — UI components, UX improvements
2. `apps/web/src/services/` — Service layer, storage, transcription
3. `apps/web/src/core/` and `apps/web/src/lib/` — Core logic, utilities
4. `apps/web/src/hooks/` — React hooks, state management
5. `apps/web/src/stores/` — Zustand stores, state architecture
6. `apps/web/src/types/` — Type definitions, data model changes
7. `apps/web/src/app/` — Pages, routes, API endpoints
8. `packages/` — Shared packages
9. Config files, CI/CD, build system

### Step 3: Classify each change

For each meaningful change found in the diffs, classify it into one of these categories:

| Category | Icon | Description |
|----------|------|-------------|
| **New Feature** | ✨ | Entirely new capability added |
| **Performance** | ⚡ | Speed, memory, or rendering optimization |
| **Bug Fix** | 🐛 | Corrected broken or incorrect behavior |
| **UX Improvement** | 🎨 | Better user experience, UI polish |
| **Refactor** | ♻️ | Code restructuring without behavior change |
| **Architecture** | 🏗️ | Structural or design pattern improvement |
| **DX / Tooling** | 🔧 | Developer experience, build, CI/CD |
| **i18n** | 🌐 | Internationalization, localization |
| **Security** | 🔒 | Security hardening |
| **Cleanup** | 🧹 | Dead code removal, dependency cleanup |

### Step 4: Determine importance

Rate each change on impact (1-5):

| Score | Criteria |
|-------|----------|
| 5 | Core feature, affects most users, or prevents data loss |
| 4 | Significant feature or major UX/perf improvement |
| 3 | Notable improvement, moderate user impact |
| 2 | Minor enhancement, affects subset of users |
| 1 | Cosmetic, cleanup, or internal-only change |

### Step 5: Produce the report

Output a markdown report with this structure:

```markdown
# Changelog: <start-hash-short>..<end-hash-short>

**Period**: <first-commit-date> → <last-commit-date>
**Commits**: <count> | **Files changed**: <count> | **+<insertions> / -<deletions>**

---

## Key Changes (by importance)

### ⭐⭐⭐⭐⭐ Critical / High Impact

#### ✨ [Feature/Change Title]
- **What changed**: Concise description based on actual code diff
- **Files**: List of key files modified
- **Impact**: Why this matters to users or the codebase

### ⭐⭐⭐⭐ Significant

...

### ⭐⭐⭐ Notable

...

### ⭐⭐ Minor

...

### ⭐ Cosmetic / Internal

...

---

## Summary Statistics

| Category | Count |
|----------|-------|
| New Features | X |
| Performance | X |
| Bug Fixes | X |
| ... | ... |
```

## Important Rules

1. **Read actual diffs** — Never rely solely on commit messages. Always `git diff` or `git show` to see what really changed.
2. **Group related commits** — Multiple commits may contribute to a single logical change. Merge them into one entry.
3. **Be specific** — Reference actual function names, components, or files that changed.
4. **Skip noise** — Ignore auto-generated files (lock files, build artifacts) and trivial whitespace changes.
5. **Use subagents for parallelism** — When the diff is large, launch multiple explore/generalPurpose subagents to analyze different directories concurrently.
6. **Output in Chinese** — The final report should be written in Chinese (中文), matching the user's language preference.
