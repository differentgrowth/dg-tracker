# Ultracite Code Standards

This project uses Ultracite for automated formatting and linting. Before finishing code changes, run:

- `npx ultracite check` to check for issues.
- `npx ultracite fix` to format and auto-fix safe issues.
- `npx ultracite doctor` to diagnose setup issues.

Write code that is accessible, performant, type-safe, and maintainable. Prefer clear names, explicit intent, semantic HTML, Server Components by default in Next.js, and `unknown` over `any` for genuinely unknown values. Do not add formatter-specific style preferences here; the repository linter owns formatting decisions.
