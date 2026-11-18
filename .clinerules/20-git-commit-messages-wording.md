# Commit messages

These rules only specify a style guide for commit message wording; they are not an encouragement to make commits.

- Keep the first line (subject) short, clear, and informative, emphasizing the intent of the change rather than merely describing implementation details.
- Start the subject with the affected component, feature, or location when applicable, so the scope of the change is immediately clear.
  - for example, the change is entirely in frontend without the need to make changes or restart backend - add `frontend: `. If the change is entirely within some component in frontend, add two levels of location specs, for example `frontend: records-filtering component: `. If the change is entirely within textconv processors,  - add `textconv: ` or `textconv: msmarkitdown: `.
- Use the body to describe what changed in sufficient detail. Include motivation, reasoning, or other context when it adds useful information.
