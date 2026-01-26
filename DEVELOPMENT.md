# Development Guide (Fork-Specific)

This is our fork of [keithah/monarchmoney-ts](https://github.com/keithah/monarchmoney-ts).

## Fork Setup

```bash
# Clone the fork
git clone https://github.com/gserafini/monarchmoney-ts.git
cd monarchmoney-ts

# Add upstream (already configured)
git remote add upstream https://github.com/keithah/monarchmoney-ts.git

# Verify remotes
git remote -v
# origin    https://github.com/gserafini/monarchmoney-ts.git (fetch/push)
# upstream  https://github.com/keithah/monarchmoney-ts.git (fetch/push)
```

## Syncing with Upstream

```bash
# Fetch upstream changes
git fetch upstream

# Check what's new
git log main..upstream/main --oneline

# Merge upstream changes (if any)
git checkout main
git merge upstream/main

# Push to our fork
git push origin main
```

## Our CLI Consumer

The library is consumed by our Monarch CLI at `~/.claude/scripts/monarch-ts/`.

### Updating the CLI's dependency

After making changes to the library:

```bash
# 1. Build the library
npm run build

# 2. Update the CLI's node_modules
cd ~/.claude/scripts/monarch-ts
rm -rf node_modules/monarchmoney
npm install  # Re-installs from GitHub

# Or for local testing without pushing:
cp -r /path/to/monarchmoney-ts/dist node_modules/monarchmoney/dist
```

### CLI package.json reference

```json
{
  "dependencies": {
    "monarchmoney": "github:gserafini/monarchmoney-ts#main"
  }
}
```

## Making Changes

### Workflow

1. Create a feature branch: `git checkout -b feat/my-feature`
2. Make changes and add tests
3. Build: `npm run build`
4. Test locally with CLI if needed
5. Push branch: `git push -u origin feat/my-feature`
6. Create PR on GitHub (auto-runs CI)
7. Merge to main
8. Update CLI: `cd ~/.claude/scripts/monarch-ts && npm install`

### Testing Changes Locally

```bash
# Run unit tests
npm run test:unit

# Build
npm run build

# Quick test with CLI
cd ~/.claude/scripts/monarch-ts
node cli.js test
```

## Key Differences from Upstream

Our fork includes:
- Additional API methods (InvestmentsAPI, ReportsAPI)
- GraphQL schema fixes for Monarch's actual API responses
- Unit tests for client-side filtering logic
- Documentation improvements

## Project Structure

```
src/
├── api/
│   ├── accounts/       # Account management
│   ├── budgets/        # Budget operations
│   ├── categories/     # Category management
│   ├── investments/    # Portfolio & holdings (our addition)
│   ├── reports/        # Reports & exports (our addition)
│   └── transactions/   # Transaction queries
├── client/
│   └── auth/           # Authentication services
└── utils/              # Shared utilities
```

## Environment Variables

For integration testing, create `.env`:

```env
MONARCH_EMAIL=your-email@example.com
MONARCH_PASSWORD=your-password
MONARCH_MFA_SECRET=your-totp-secret  # Optional
```

## Useful Commands

```bash
npm run build          # Build all formats (cjs, esm, types)
npm run test:unit      # Run unit tests
npm run lint           # Check linting
npm run lint:fix       # Auto-fix lint issues
npm run format         # Format with Prettier
```
