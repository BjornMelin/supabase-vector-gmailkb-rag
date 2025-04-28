# Session-Specific Workflow States

This directory contains workflow state files for specific development sessions.

## Naming Convention

Files should follow this naming pattern:
```
YYYY-MM-DD_task-name_workflow_state.mdc
```

Example:
```
2025-04-28_gmail-api-auth_workflow_state.mdc
```

## Usage

1. At the start of a new session/task:
   - Copy the template from `../.cursor/rules/301_workflow_state_template.mdc`
   - Rename according to the convention above
   - Place in this directory

2. During the session:
   - Update the workflow state as the task progresses
   - The file serves as a living document of the session's work

3. At the end of the session:
   - The final state can be used as reference for future sessions
   - Important milestones should be recorded in memory_mcp for cross-session knowledge

## Current Session

The active session's workflow state should be kept as `.cursor/rules/301_workflow_state.mdc` for Cursor to reference during development.
