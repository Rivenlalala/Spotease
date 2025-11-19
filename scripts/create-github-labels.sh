#!/bin/bash

# Spotease - Create GitHub labels for user stories
# Run this BEFORE creating issues to ensure all labels exist

set -e

echo "============================================"
echo "Creating GitHub Labels for Spotease"
echo "============================================"
echo ""

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

# Function to create label (ignores if already exists)
create_label() {
    local name="$1"
    local color="$2"
    local description="$3"

    if gh label list | grep -q "^${name}"; then
        echo "  ⏭️  Already exists: $name"
    else
        gh label create "$name" --color "$color" --description "$description" 2>/dev/null && \
            echo "  ✅ Created: $name" || \
            echo "  ⚠️  Failed: $name"
    fi
}

echo "Creating Epic Labels (7)..."
create_label "epic: project-setup-and-infrastructure" "0052CC" "Epic 1: Project setup and infrastructure tasks"
create_label "epic: user-authentication" "0052CC" "Epic 2: User authentication features"
create_label "epic: playlist-discovery-and-management" "0052CC" "Epic 3: Playlist discovery and management"
create_label "epic: playlist-linking" "0052CC" "Epic 4: Playlist linking features"
create_label "epic: track-synchronization-and-matching" "0052CC" "Epic 5: Track sync and matching"
create_label "epic: user-experience-and-interface" "0052CC" "Epic 6: User experience and interface"
create_label "epic: security-performance-and-reliability" "0052CC" "Epic 7: Security, performance, and reliability"

echo ""
echo "Creating Priority Labels (3)..."
create_label "priority: must-have" "D73A4A" "Must have for MVP"
create_label "priority: should-have" "FBCA04" "Should have post-MVP"
create_label "priority: could-have" "0E8A16" "Nice to have feature"

echo ""
echo "Creating Effort Labels (5)..."
create_label "effort: 1sp" "E4E669" "1 story point"
create_label "effort: 2sp" "BFD4F2" "2 story points"
create_label "effort: 3sp" "84B6EB" "3 story points"
create_label "effort: 5sp" "5319E7" "5 story points"
create_label "effort: 8sp" "3B0764" "8 story points"

echo ""
echo "Creating Type Label (1)..."
create_label "story" "FBCA04" "User story"

echo ""
echo "============================================"
echo "Total Labels: 16"
echo "============================================"
echo ""
echo "Labels created successfully! ✅"
echo "You can now run: ./scripts/create-github-issues.sh"
echo ""
