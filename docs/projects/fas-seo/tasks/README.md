# Task Management System

A lightweight, file-based task system that lives alongside project docs. No external services required.

## Structure

```
tasks/
├── README.md          ← This file
├── template.md        ← Frontmatter template for new tasks
├── phase-1/           ← Phase 1 tasks (Instrument and Measure)
├── phase-2/           ← Phase 2 tasks (Know the Customer)
└── phase-3/           ← Phase 3 tasks (Optimize and Predict)
```

## Task File Format

Each task is a markdown file with YAML frontmatter:

```yaml
---
id: P1-001
title: Short task title
phase: 1
status: todo          # todo | in-progress | done | blocked
priority: high        # high | medium | low
assignee: ""
depends_on: []        # Array of task IDs
definition_of_done: |
  Clear criteria for when this task is complete.
verification_steps:
  - Step to verify the work is correct
  - Another verification step
created: 2026-03-22
updated: 2026-03-22
---

## Description

Detailed description of the task.

## Notes

Implementation notes, decisions, and references.
```

## CLI Usage

The task management script is at `scripts/tasks.cjs`.

### Create a new task

```bash
node docs/projects/fas-seo/scripts/tasks.cjs new \
  --phase 1 \
  --title "Implement view_item event" \
  --priority high
```

### List tasks by status

```bash
# All tasks
node docs/projects/fas-seo/scripts/tasks.cjs list

# Filter by status
node docs/projects/fas-seo/scripts/tasks.cjs list --status todo
node docs/projects/fas-seo/scripts/tasks.cjs list --status in-progress
node docs/projects/fas-seo/scripts/tasks.cjs list --status done
```

### Show tasks by phase

```bash
node docs/projects/fas-seo/scripts/tasks.cjs list --phase 1
node docs/projects/fas-seo/scripts/tasks.cjs list --phase 2
node docs/projects/fas-seo/scripts/tasks.cjs list --phase 3
```

### Update task status

```bash
node docs/projects/fas-seo/scripts/tasks.cjs update-status P1-001 in-progress
node docs/projects/fas-seo/scripts/tasks.cjs update-status P1-001 done
```

## Conventions

- **ID format:** `P{phase}-{number}` (e.g., `P1-001`, `P2-003`)
- **File naming:** `{id}-{slug}.md` (e.g., `P1-001-gtm-container-setup.md`)
- **One task per file** — keeps diffs clean and enables per-task history
- **Update `updated` date** when changing status or content
