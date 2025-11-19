# Spotease Scripts

Utility scripts for managing the Spotease project.

## 📋 create-github-issues

Automatically creates GitHub issues from the `USER_STORIES.md` file. Available in both Bash and Python versions.

### Prerequisites

1. **Install GitHub CLI**
   ```bash
   # macOS
   brew install gh

   # Linux
   sudo apt install gh   # Debian/Ubuntu
   sudo dnf install gh   # Fedora/RHEL

   # Windows
   winget install GitHub.cli

   # Or download from: https://cli.github.com/
   ```

2. **Authenticate with GitHub**
   ```bash
   gh auth login
   ```

   Follow the prompts to authenticate with your GitHub account.

3. **Navigate to project directory**
   ```bash
   cd /path/to/Spotease
   ```

4. **Create GitHub labels first** (Important!)
   ```bash
   ./scripts/create-github-labels.sh
   ```

   This creates all 16 labels needed for the issues. Without this step, issue creation may fail or create labels inconsistently.

### Usage

#### Bash Script

```bash
# Dry run (see what would be created without creating issues)
./scripts/create-github-issues.sh --dry-run

# Create ALL 47 user stories as GitHub issues
./scripts/create-github-issues.sh

# Create only MVP (Must Have) stories (~35 issues)
./scripts/create-github-issues.sh --mvp-only

# Dry run for MVP only
./scripts/create-github-issues.sh --dry-run --mvp-only
```

#### Python Script

```bash
# Dry run
python scripts/create-github-issues.py --dry-run

# Create all issues
python scripts/create-github-issues.py

# Create only MVP stories
python scripts/create-github-issues.py --mvp-only

# Make it executable and run directly
chmod +x scripts/create-github-issues.py
./scripts/create-github-issues.py --dry-run
```

### What It Does

The script will:

1. **Parse** `USER_STORIES.md` and extract all user stories
2. **Create GitHub issues** with:
   - Title: Story name (e.g., "Initialize Project Repository")
   - Body: Full story content (As a... I want... So that..., Acceptance Criteria, Priority, Effort)
   - Labels:
     - Epic label (e.g., `epic: project-setup-and-infrastructure`)
     - Priority label (e.g., `priority: must-have`)
     - Effort label (e.g., `effort: 3sp`)
     - Type label: `story`

3. **Output** progress in terminal with colored formatting
4. **Add delays** between issues to avoid rate limiting

### Example Output

```
============================================
Spotease GitHub Issue Creator
============================================

User Stories File: /path/to/USER_STORIES.md
Dry Run: false
MVP Only: false

Parsing user stories...

📦 EPIC: Project Setup & Infrastructure
───────────────────────────────────────────
  ✅ Creating: Initialize Project Repository
     Created: #123
  ✅ Creating: Configure Development Environment
     Created: #124
  ...

📦 EPIC: User Authentication
───────────────────────────────────────────
  ✅ Creating: Implement Spotify OAuth Flow
     Created: #125
  ...

============================================
Summary
============================================
Total stories: 47
Created: 47 issues

Done! 🎉
```

### Labels Created

The script will create issues with the following labels:

**Epic Labels:**
- `epic: project-setup-and-infrastructure`
- `epic: user-authentication`
- `epic: playlist-discovery-and-management`
- `epic: playlist-linking`
- `epic: track-synchronization-and-matching`
- `epic: user-experience-and-interface`
- `epic: security-performance-and-reliability`

**Priority Labels:**
- `priority: must-have` (MVP - 35 stories)
- `priority: should-have` (Post-MVP - 10 stories)
- `priority: could-have` (Nice to have - 2 stories)

**Effort Labels:**
- `effort: 1sp` through `effort: 8sp`

**Type Label:**
- `story`

### Tips

1. **Start with a dry run** to see what will be created:
   ```bash
   ./scripts/create-github-issues.sh --dry-run
   ```

2. **Create MVP first** to get started quickly:
   ```bash
   ./scripts/create-github-issues.sh --mvp-only
   ```

3. **Labels are created automatically** by the label script:
   ```bash
   # Run this first (creates all 16 labels)
   ./scripts/create-github-labels.sh
   ```

4. **Review issues** after creation:
   ```bash
   gh issue list --label "story"
   ```

5. **Add to GitHub Project** (if you have one):
   ```bash
   # After creating issues, bulk add them to a project
   gh project item-add <PROJECT-NUMBER> --owner <OWNER> --url <ISSUE-URL>
   ```

### Troubleshooting

**"gh: command not found"**
- Install GitHub CLI (see Prerequisites above)

**"Error: Not authenticated"**
- Run `gh auth login` and follow the prompts

**"Failed to create issue"**
- Check your GitHub permissions for the repository
- Ensure you have write access to create issues
- Check rate limiting: `gh api rate_limit`

**Issues created with wrong repo**
- Make sure you're in the correct directory
- Check current repo: `gh repo view`

**Script hangs or is slow**
- Normal! There's a 0.5s delay between issues to avoid rate limiting
- 47 issues will take ~25 seconds to create

### Advanced Usage

#### Filter by Epic

Want to create only stories from a specific epic?

```bash
# Modify the script or use grep to filter
grep -A 50 "## EPIC 2: User Authentication" USER_STORIES.md | \
  python scripts/create-github-issues.py --dry-run
```

#### Update Existing Issues

The script doesn't update existing issues. To update:

```bash
# List issues
gh issue list --label "story"

# Edit an issue
gh issue edit 123 --body "New description"
```

#### Delete All Created Issues (if needed)

```bash
# List all story issues
gh issue list --label "story" --state all --limit 100 --json number -q '.[].number' | \
  xargs -I {} gh issue close {} --reason "not planned"
```

### Next Steps After Creating Issues

1. **Review the issues** in GitHub
2. **Add to a Project Board** for sprint planning
3. **Assign to milestones** (e.g., "MVP", "v1.0", "v2.0")
4. **Assign to team members** as work begins
5. **Break down large stories** (8sp) into subtasks if needed
6. **Start development** following the user stories!

---

## Need Help?

- GitHub CLI docs: https://cli.github.com/manual/
- Issues with the script: Check the [main README](../README.md)
- Questions about user stories: See [USER_STORIES.md](../USER_STORIES.md)
