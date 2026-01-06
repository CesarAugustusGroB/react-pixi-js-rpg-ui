---
description: Clear PLAN.md and enter deep planning mode for features
---

# Deep Feature Planning - SHINOBI WAY

**Feature Request:** $ARGUMENTS

Use ultrathink for all analysis and planning.

## Instructions

1. **Clear PLAN.md**: Delete all content in PLAN.md (create if doesn't exist) and start fresh

2. **Identify Main Features**: Parse the arguments to identify the main features/systems being requested

3. **Question Phase (per feature)**:
   For EACH identified feature, ask multiple questions using AskUserQuestion:
   - What is the expected behavior?
   - What systems/files will this interact with?
   - Are there edge cases to consider?
   - Any specific constraints or preferences?

4. **Iterative Planning**: After each answer, update PLAN.md with:
   - Feature description
   - Implementation approach
   - Files to modify/create
   - Dependencies and interactions

5. **Legacy Code Cleanup**: Always include as FINAL section:
   - Identify code that will be replaced by new features
   - List files/functions to remove
   - Document migration path if needed

## PLAN.md Structure

Write to PLAN.md with this structure:

```markdown
# Feature Plan: [Title]

## Features Overview

- Feature 1: [description]
- Feature 2: [description]
...

## Detailed Plans

### Feature 1: [Name]

**Goal:** [what it does]
**Files to modify:** [list]
**Files to create:** [list]
**Implementation steps:**

1. ...
2. ...

### Feature 2: [Name]

...

## Legacy Code Removal

**Files to delete:**

- [file]: [reason]

**Code to remove:**

- [file:function]: [reason]

**Migration notes:**

- [any compatibility concerns]
```

## Critical Rules

- Use ultrathink for ALL reasoning
- Ask questions BEFORE planning each feature
- Keep editing PLAN.md incrementally
- ALWAYS include legacy cleanup section
- Do NOT implement - only plan
