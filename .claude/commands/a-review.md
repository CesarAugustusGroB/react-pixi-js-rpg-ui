---
description: Review current branch changes from architectural and clean code perspective
---

Review uncommitted and unpushed changes in the current branch from an architectural and clean code perspective.

## Steps

1. **Fetch latest**: Run `git fetch origin` to ensure remote refs are up to date

2. **Get current branch**: Run `git branch --show-current`

3. **Get the diff**: Run `git diff origin/<current-branch>...HEAD` to see unpushed commits, then `git diff` to see uncommitted changes

4. **Identify changed files**: Run `git diff --name-only origin/<current-branch>...HEAD` for unpushed, `git diff --name-only` for uncommitted

3. **For each significant change, evaluate:**

### Architecture Review
- **Separation of concerns**: Are responsibilities properly divided? Is business logic leaking into controllers/UI?
- **Dependencies**: Do dependencies flow in the right direction? Any circular dependencies introduced?
- **Abstraction levels**: Are layers respected? Is there inappropriate coupling between modules?
- **Single Responsibility**: Does each class/module have one clear purpose?
- **Interface design**: Are public APIs clean and minimal? Are implementation details properly hidden?

### Clean Code Review
- **Naming**: Are names descriptive and consistent? Do they reveal intent?
- **Functions**: Are they small and focused? Do they do one thing well?
- **DRY violations**: Is there duplicated logic that should be extracted?
- **Code smells**: Long methods, large classes, feature envy, data clumps, primitive obsession?
- **Error handling**: Is it consistent and appropriate? Are edge cases covered?
- **Comments**: Is code self-documenting? Are comments explaining "why" not "what"?

### Patterns & Practices
- **SOLID principles**: Any violations introduced?
- **Consistency**: Do changes follow existing patterns in the codebase?
- **Testability**: Is the new code easy to test? Are dependencies injectable?

## Output Format

Provide a structured review with:

1. **Summary**: One paragraph overview of the changes and overall assessment
2. **Architecture concerns**: List any architectural issues (severity: 🔴 critical, 🟡 moderate, 🟢 minor)
3. **Clean code issues**: Specific code quality improvements
4. **Positive patterns**: What's done well (reinforce good practices)
5. **Recommendations**: Prioritized list of suggested changes

Be direct and specific. Reference exact file paths and line numbers where relevant.
