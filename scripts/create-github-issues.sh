#!/bin/bash

# Spotease - Automatically create GitHub issues from USER_STORIES.md
# Usage: ./scripts/create-github-issues.sh [--dry-run] [--mvp-only]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
USER_STORIES_FILE="$PROJECT_ROOT/USER_STORIES.md"

DRY_RUN=false
MVP_ONLY=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --mvp-only)
      MVP_ONLY=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--dry-run] [--mvp-only]"
      exit 1
      ;;
  esac
done

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "Error: GitHub CLI (gh) is not installed."
    echo "Install it from: https://cli.github.com/"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "Error: Not authenticated with GitHub CLI."
    echo "Run: gh auth login"
    exit 1
fi

# Check if file exists
if [ ! -f "$USER_STORIES_FILE" ]; then
    echo "Error: USER_STORIES.md not found at $USER_STORIES_FILE"
    exit 1
fi

echo "============================================"
echo "Spotease GitHub Issue Creator"
echo "============================================"
echo ""
echo "User Stories File: $USER_STORIES_FILE"
echo "Dry Run: $DRY_RUN"
echo "MVP Only: $MVP_ONLY"
echo ""

# Story counter
TOTAL_STORIES=0
CREATED_STORIES=0
SKIPPED_STORIES=0

# Function to create a GitHub issue
create_issue() {
    local title="$1"
    local body="$2"
    local epic_label="$3"
    local priority_label="$4"
    local effort="$5"

    TOTAL_STORIES=$((TOTAL_STORIES + 1))

    # Skip non-MVP stories if --mvp-only flag is set
    if [ "$MVP_ONLY" = true ] && [ "$priority_label" != "priority: must-have" ]; then
        echo "  ⏭️  SKIPPED (not MVP): $title"
        SKIPPED_STORIES=$((SKIPPED_STORIES + 1))
        return
    fi

    if [ "$DRY_RUN" = true ]; then
        echo "  🔍 DRY RUN: Would create issue"
        echo "     Title: $title"
        echo "     Epic: $epic_label"
        echo "     Priority: $priority_label"
        echo "     Effort: $effort"
        CREATED_STORIES=$((CREATED_STORIES + 1))
    else
        # Create the issue
        local labels="$epic_label,$priority_label,story"

        # Add effort as a label if provided
        if [ -n "$effort" ]; then
            labels="$labels,effort: $effort"
        fi

        echo "  ✅ Creating: $title"

        gh issue create \
            --title "$title" \
            --body "$body" \
            --label "$labels" \
            2>&1 | grep -o "#[0-9]*" || echo "  ⚠️  Failed to create issue"

        CREATED_STORIES=$((CREATED_STORIES + 1))

        # Small delay to avoid rate limiting
        sleep 0.5
    fi
}

# Function to extract priority label
get_priority_label() {
    local priority="$1"
    case "$priority" in
        "Must Have")
            echo "priority: must-have"
            ;;
        "Should Have")
            echo "priority: should-have"
            ;;
        "Could Have")
            echo "priority: could-have"
            ;;
        *)
            echo "priority: unspecified"
            ;;
    esac
}

echo "Parsing user stories..."
echo ""

# Parse the markdown file
current_epic=""
current_epic_label=""
story_number=""
story_title=""
story_body=""
story_priority=""
story_effort=""
in_story=false

while IFS= read -r line; do
    # Detect Epic headers
    if [[ "$line" =~ ^##\ EPIC\ ([0-9]+):\ (.+)$ ]]; then
        current_epic="${BASH_REMATCH[2]}"
        # Create epic label (lowercase, hyphenated)
        current_epic_label=$(echo "$current_epic" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr '&' 'and')
        current_epic_label="epic: $current_epic_label"
        echo ""
        echo "📦 EPIC: $current_epic"
        echo "───────────────────────────────────────────"
        continue
    fi

    # Detect Story headers
    if [[ "$line" =~ ^###\ Story\ ([0-9.]+):\ (.+)$ ]]; then
        # If we were processing a previous story, create it
        if [ "$in_story" = true ] && [ -n "$story_title" ]; then
            priority_label=$(get_priority_label "$story_priority")
            create_issue "$story_title" "$story_body" "$current_epic_label" "$priority_label" "$story_effort"
        fi

        # Start new story
        story_number="${BASH_REMATCH[1]}"
        story_title="${BASH_REMATCH[2]}"
        story_body=""
        story_priority=""
        story_effort=""
        in_story=true
        continue
    fi

    # Skip separator lines
    if [[ "$line" =~ ^---+$ ]]; then
        continue
    fi

    # If we're in a story, collect the content
    if [ "$in_story" = true ]; then
        # Extract priority
        if [[ "$line" =~ ^\*\*Priority:\*\*\ (.+)$ ]]; then
            story_priority="${BASH_REMATCH[1]}"
            story_body="$story_body\n$line"
            continue
        fi

        # Extract effort
        if [[ "$line" =~ ^\*\*Estimated\ Effort:\*\*\ ([0-9]+)\ story\ point ]]; then
            story_effort="${BASH_REMATCH[1]}sp"
            story_body="$story_body\n$line"
            continue
        fi

        # Stop at next epic or additional considerations
        if [[ "$line" =~ ^##\ Additional\ Considerations ]] || \
           [[ "$line" =~ ^##\ Future\ Enhancements ]] || \
           [[ "$line" =~ ^##\ Story\ Prioritization ]]; then
            # Create the last story
            if [ -n "$story_title" ]; then
                priority_label=$(get_priority_label "$story_priority")
                create_issue "$story_title" "$story_body" "$current_epic_label" "$priority_label" "$story_effort"
            fi
            break
        fi

        # Add line to body
        story_body="$story_body\n$line"
    fi
done < "$USER_STORIES_FILE"

# Create the last story if we haven't already
if [ "$in_story" = true ] && [ -n "$story_title" ]; then
    priority_label=$(get_priority_label "$story_priority")
    create_issue "$story_title" "$story_body" "$current_epic_label" "$priority_label" "$story_effort"
fi

echo ""
echo "============================================"
echo "Summary"
echo "============================================"
echo "Total stories: $TOTAL_STORIES"
if [ "$DRY_RUN" = true ]; then
    echo "Would create: $CREATED_STORIES issues"
else
    echo "Created: $CREATED_STORIES issues"
fi
if [ "$SKIPPED_STORIES" -gt 0 ]; then
    echo "Skipped: $SKIPPED_STORIES issues (non-MVP)"
fi
echo ""
echo "Done! 🎉"
echo ""

if [ "$DRY_RUN" = true ]; then
    echo "This was a dry run. Run without --dry-run to create issues."
fi

if [ "$MVP_ONLY" = true ]; then
    echo "Note: Only MVP (Must Have) stories were processed."
    echo "Remove --mvp-only flag to create all stories."
fi
