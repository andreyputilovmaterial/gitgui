# User-facing language (UI copy & help text)

Applies to any text a user reads: UI labels, buttons, descriptions, placeholders,
empty states, tooltips, messages, and the help/docs files shown in the app
(`help.md`, README sections rendered to users). Mostly the frontend app, but any
user-visible `.md` counts too.

- **Never assume the tracked content is code.** Git versions files of any kind —
  documents, images, spreadsheets, designs, data, scripts, whatever. Write as
  broadly as possible, as if the user may never write a line of code in their
  life.
- **Avoid programmer-only words for the content being tracked, searched, or
  compared:** "code", "source code", "functions", "program". Prefer neutral,
  file-agnostic words: "file", "files", "content", "changes", "revision",
  "version", "history".
  - Bad: "Search history for code or functions."
  - Good: "Search history." / "Find saved revisions by hash, author or commit
    message."
- **Keep Git's own terms** — "commit", "commit message", "hash", "branch",
  "merge", "gitignore", "repo", "stage" — these are the tool's domain
  vocabulary, not "programmer language" in the harmful sense. Users learn them
  as part of using the app, and dropping them would make the UI less precise.
- **"script" is borderline.** It is currently used in `help.md` ("previous
  versions of your scripts"). Prefer "files" as the broadest term unless a
  specific file type is genuinely meant.
- **This rule is about user-facing text only.** Internal identifiers, code
  comments, developer-facing docs, and the developer's own commit messages can
  use whatever technical language is clearest.
