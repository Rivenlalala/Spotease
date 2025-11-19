# GitHub Labels for Spotease User Stories

This document lists all 16 labels that will be created by `create-github-labels.sh`.

## Quick Setup

```bash
# Create all 16 labels at once
./scripts/create-github-labels.sh
```

---

## Label Categories

### Epic Labels (7 labels)

Labels to organize stories by epic/theme.

| Label | Color | Description |
|-------|-------|-------------|
| `epic: project-setup-and-infrastructure` | ![#0052CC](https://via.placeholder.com/15/0052CC/0052CC.png) `#0052CC` | Epic 1: Project setup and infrastructure tasks |
| `epic: user-authentication` | ![#0052CC](https://via.placeholder.com/15/0052CC/0052CC.png) `#0052CC` | Epic 2: User authentication features |
| `epic: playlist-discovery-and-management` | ![#0052CC](https://via.placeholder.com/15/0052CC/0052CC.png) `#0052CC` | Epic 3: Playlist discovery and management |
| `epic: playlist-linking` | ![#0052CC](https://via.placeholder.com/15/0052CC/0052CC.png) `#0052CC` | Epic 4: Playlist linking features |
| `epic: track-synchronization-and-matching` | ![#0052CC](https://via.placeholder.com/15/0052CC/0052CC.png) `#0052CC` | Epic 5: Track sync and matching |
| `epic: user-experience-and-interface` | ![#0052CC](https://via.placeholder.com/15/0052CC/0052CC.png) `#0052CC` | Epic 6: User experience and interface |
| `epic: security-performance-and-reliability` | ![#0052CC](https://via.placeholder.com/15/0052CC/0052CC.png) `#0052CC` | Epic 7: Security, performance, and reliability |

**Color rationale:** Blue (#0052CC) - commonly used for epic/feature grouping

---

### Priority Labels (3 labels)

Labels to indicate priority level for sprint planning.

| Label | Color | Description | Story Count |
|-------|-------|-------------|-------------|
| `priority: must-have` | ![#D73A4A](https://via.placeholder.com/15/D73A4A/D73A4A.png) `#D73A4A` | Must have for MVP | ~35 stories |
| `priority: should-have` | ![#FBCA04](https://via.placeholder.com/15/FBCA04/FBCA04.png) `#FBCA04` | Should have post-MVP | ~10 stories |
| `priority: could-have` | ![#0E8A16](https://via.placeholder.com/15/0E8A16/0E8A16.png) `#0E8A16` | Nice to have feature | ~2 stories |

**Color rationale:**
- Red (#D73A4A) - high priority/critical
- Yellow (#FBCA04) - medium priority
- Green (#0E8A16) - low priority/nice to have

---

### Effort Labels (5 labels)

Labels to indicate story point estimates.

| Label | Color | Description |
|-------|-------|-------------|
| `effort: 1sp` | ![#E4E669](https://via.placeholder.com/15/E4E669/E4E669.png) `#E4E669` | 1 story point |
| `effort: 2sp` | ![#BFD4F2](https://via.placeholder.com/15/BFD4F2/BFD4F2.png) `#BFD4F2` | 2 story points |
| `effort: 3sp` | ![#84B6EB](https://via.placeholder.com/15/84B6EB/84B6EB.png) `#84B6EB` | 3 story points |
| `effort: 5sp` | ![#5319E7](https://via.placeholder.com/15/5319E7/5319E7.png) `#5319E7` | 5 story points |
| `effort: 8sp` | ![#3B0764](https://via.placeholder.com/15/3B0764/3B0764.png) `#3B0764` | 8 story points |

**Color rationale:** Gradient from light (low effort) to dark (high effort)

**Story point distribution:**
- 1sp: 3 stories
- 2sp: 9 stories
- 3sp: 12 stories
- 5sp: 18 stories
- 8sp: 2 stories

---

### Type Label (1 label)

Label to identify user stories vs other issue types.

| Label | Color | Description |
|-------|-------|-------------|
| `story` | ![#FBCA04](https://via.placeholder.com/15/FBCA04/FBCA04.png) `#FBCA04` | User story |

**Color rationale:** Yellow (#FBCA04) - GitHub's default feature color

---

## Total: 16 Labels

- 7 Epic labels
- 3 Priority labels
- 5 Effort labels
- 1 Type label

---

## Label Usage Examples

### Filtering Issues

```bash
# View all MVP stories
gh issue list --label "priority: must-have"

# View all authentication stories
gh issue list --label "epic: user-authentication"

# View all high-effort stories
gh issue list --label "effort: 8sp"

# View MVP authentication stories
gh issue list --label "priority: must-have" --label "epic: user-authentication"

# View all user stories
gh issue list --label "story"
```

### Sprint Planning

```bash
# Find small, high-priority stories for quick wins
gh issue list --label "priority: must-have" --label "effort: 1sp"

# Find stories ready for sprint (3-5sp range)
gh issue list --label "priority: must-have" --label "effort: 3sp,effort: 5sp"
```

### Burndown Tracking

```bash
# Count remaining MVP stories
gh issue list --label "priority: must-have" --state open --json number | jq length

# Count completed stories by epic
gh issue list --label "epic: user-authentication" --state closed --json number | jq length
```

---

## Customizing Labels

If you want to customize colors or add new labels:

1. **Edit the script:**
   ```bash
   vim scripts/create-github-labels.sh
   ```

2. **Modify the create_label calls:**
   ```bash
   create_label "my-custom-label" "FF5733" "My custom description"
   ```

3. **Re-run the script:**
   ```bash
   ./scripts/create-github-labels.sh
   ```

The script will skip labels that already exist and only create new ones.

---

## Deleting All Labels

If you need to reset and delete all labels:

```bash
# List all labels
gh label list

# Delete a specific label
gh label delete "story" --yes

# Delete all Spotease labels (careful!)
for label in \
  "epic: project-setup-and-infrastructure" \
  "epic: user-authentication" \
  "epic: playlist-discovery-and-management" \
  "epic: playlist-linking" \
  "epic: track-synchronization-and-matching" \
  "epic: user-experience-and-interface" \
  "epic: security-performance-and-reliability" \
  "priority: must-have" \
  "priority: should-have" \
  "priority: could-have" \
  "effort: 1sp" \
  "effort: 2sp" \
  "effort: 3sp" \
  "effort: 5sp" \
  "effort: 8sp" \
  "story"
do
  gh label delete "$label" --yes
done
```

---

## Best Practices

1. **Create labels before issues** - Run `create-github-labels.sh` first
2. **Use consistent naming** - All labels use lowercase with hyphens
3. **Use label prefixes** - Groups related labels (e.g., `epic:`, `priority:`)
4. **Keep colors meaningful** - Color gradients indicate priority/effort levels
5. **Don't overuse labels** - Each issue should have 3-5 labels max

---

## See Also

- [create-github-labels.sh](create-github-labels.sh) - Script to create all labels
- [create-github-issues.sh](create-github-issues.sh) - Script to create issues with labels
- [README.md](README.md) - Full documentation for all scripts
