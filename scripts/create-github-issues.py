#!/usr/bin/env python3

"""
Spotease - Automatically create GitHub issues from USER_STORIES.md
Usage: python scripts/create-github-issues.py [--dry-run] [--mvp-only]
"""

import argparse
import re
import subprocess
import sys
import time
from pathlib import Path
from typing import Optional, Tuple


class Colors:
    """ANSI color codes for terminal output"""
    BLUE = '\033[94m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'


class IssueCreator:
    def __init__(self, dry_run: bool = False, mvp_only: bool = False):
        self.dry_run = dry_run
        self.mvp_only = mvp_only
        self.total_stories = 0
        self.created_stories = 0
        self.skipped_stories = 0

        # Get project root
        script_dir = Path(__file__).parent
        self.project_root = script_dir.parent
        self.user_stories_file = self.project_root / "USER_STORIES.md"

    def check_prerequisites(self) -> bool:
        """Check if gh CLI is installed and authenticated"""
        # Check if gh is installed
        try:
            subprocess.run(
                ["gh", "--version"],
                capture_output=True,
                check=True
            )
        except (subprocess.CalledProcessError, FileNotFoundError):
            print(f"{Colors.RED}Error: GitHub CLI (gh) is not installed.{Colors.ENDC}")
            print("Install it from: https://cli.github.com/")
            return False

        # Check if authenticated
        try:
            subprocess.run(
                ["gh", "auth", "status"],
                capture_output=True,
                check=True
            )
        except subprocess.CalledProcessError:
            print(f"{Colors.RED}Error: Not authenticated with GitHub CLI.{Colors.ENDC}")
            print("Run: gh auth login")
            return False

        # Check if file exists
        if not self.user_stories_file.exists():
            print(f"{Colors.RED}Error: USER_STORIES.md not found at {self.user_stories_file}{Colors.ENDC}")
            return False

        return True

    def get_priority_label(self, priority: str) -> str:
        """Convert priority text to label"""
        priority_map = {
            "Must Have": "priority: must-have",
            "Should Have": "priority: should-have",
            "Could Have": "priority: could-have",
        }
        return priority_map.get(priority, "priority: unspecified")

    def create_issue(
        self,
        title: str,
        body: str,
        epic_label: str,
        priority_label: str,
        effort: Optional[str] = None
    ) -> bool:
        """Create a GitHub issue"""
        self.total_stories += 1

        # Skip non-MVP stories if --mvp-only flag is set
        if self.mvp_only and priority_label != "priority: must-have":
            print(f"  ⏭️  SKIPPED (not MVP): {title}")
            self.skipped_stories += 1
            return False

        # Build labels list
        labels = [epic_label, priority_label, "user-story"]
        if effort:
            labels.append(f"effort: {effort}")

        if self.dry_run:
            print(f"  🔍 DRY RUN: Would create issue")
            print(f"     Title: {title}")
            print(f"     Epic: {epic_label}")
            print(f"     Priority: {priority_label}")
            if effort:
                print(f"     Effort: {effort}")
            self.created_stories += 1
            return True

        # Create the issue using gh CLI
        try:
            print(f"  ✅ Creating: {title}")

            result = subprocess.run(
                [
                    "gh", "issue", "create",
                    "--title", title,
                    "--body", body,
                    "--label", ",".join(labels)
                ],
                capture_output=True,
                text=True,
                check=True
            )

            # Extract issue number from output
            issue_match = re.search(r'#(\d+)', result.stdout)
            if issue_match:
                print(f"     Created: #{issue_match.group(1)}")

            self.created_stories += 1

            # Small delay to avoid rate limiting
            time.sleep(0.5)

            return True

        except subprocess.CalledProcessError as e:
            print(f"  ⚠️  Failed to create issue: {e}")
            return False

    def parse_and_create_issues(self) -> None:
        """Parse USER_STORIES.md and create GitHub issues"""
        print(f"\n{Colors.BOLD}Parsing user stories...{Colors.ENDC}\n")

        content = self.user_stories_file.read_text()
        lines = content.split('\n')

        current_epic = ""
        current_epic_label = ""
        story_title = ""
        story_body = []
        story_priority = ""
        story_effort = ""
        in_story = False

        for line in lines:
            # Detect Epic headers
            epic_match = re.match(r'^## EPIC (\d+): (.+)$', line)
            if epic_match:
                current_epic = epic_match.group(2)
                # Create epic label (lowercase, hyphenated)
                current_epic_label = "epic: " + current_epic.lower().replace(' ', '-').replace('&', 'and')
                print(f"\n{Colors.BLUE}📦 EPIC: {current_epic}{Colors.ENDC}")
                print("─" * 50)
                continue

            # Detect Story headers
            story_match = re.match(r'^### Story ([\d.]+): (.+)$', line)
            if story_match:
                # Create previous story if exists
                if in_story and story_title:
                    priority_label = self.get_priority_label(story_priority)
                    self.create_issue(
                        story_title,
                        '\n'.join(story_body),
                        current_epic_label,
                        priority_label,
                        story_effort
                    )

                # Start new story
                story_title = story_match.group(2)
                story_body = []
                story_priority = ""
                story_effort = ""
                in_story = True
                continue

            # Skip separator lines
            if re.match(r'^---+$', line):
                continue

            # If we're in a story, collect content
            if in_story:
                # Extract priority
                priority_match = re.match(r'^\*\*Priority:\*\* (.+)$', line)
                if priority_match:
                    story_priority = priority_match.group(1)
                    story_body.append(line)
                    continue

                # Extract effort
                effort_match = re.match(r'^\*\*Estimated Effort:\*\* (\d+) story point', line)
                if effort_match:
                    story_effort = effort_match.group(1) + "sp"
                    story_body.append(line)
                    continue

                # Stop at additional sections
                if re.match(r'^## (Additional Considerations|Future Enhancements|Story Prioritization)', line):
                    # Create the last story
                    if story_title:
                        priority_label = self.get_priority_label(story_priority)
                        self.create_issue(
                            story_title,
                            '\n'.join(story_body),
                            current_epic_label,
                            priority_label,
                            story_effort
                        )
                    break

                # Add line to body
                story_body.append(line)

        # Create the last story if we haven't already
        if in_story and story_title:
            priority_label = self.get_priority_label(story_priority)
            self.create_issue(
                story_title,
                '\n'.join(story_body),
                current_epic_label,
                priority_label,
                story_effort
            )

    def print_summary(self) -> None:
        """Print summary of created issues"""
        print(f"\n{Colors.BOLD}{'=' * 50}{Colors.ENDC}")
        print(f"{Colors.BOLD}Summary{Colors.ENDC}")
        print(f"{Colors.BOLD}{'=' * 50}{Colors.ENDC}")
        print(f"Total stories: {self.total_stories}")

        if self.dry_run:
            print(f"{Colors.YELLOW}Would create: {self.created_stories} issues{Colors.ENDC}")
        else:
            print(f"{Colors.GREEN}Created: {self.created_stories} issues{Colors.ENDC}")

        if self.skipped_stories > 0:
            print(f"Skipped: {self.skipped_stories} issues (non-MVP)")

        print(f"\n{Colors.GREEN}Done! 🎉{Colors.ENDC}\n")

        if self.dry_run:
            print("This was a dry run. Run without --dry-run to create issues.")

        if self.mvp_only:
            print("Note: Only MVP (Must Have) stories were processed.")
            print("Remove --mvp-only flag to create all stories.")

    def run(self) -> int:
        """Main execution"""
        print(f"{Colors.BOLD}{'=' * 50}{Colors.ENDC}")
        print(f"{Colors.BOLD}Spotease GitHub Issue Creator{Colors.ENDC}")
        print(f"{Colors.BOLD}{'=' * 50}{Colors.ENDC}")
        print(f"\nUser Stories File: {self.user_stories_file}")
        print(f"Dry Run: {self.dry_run}")
        print(f"MVP Only: {self.mvp_only}\n")

        if not self.check_prerequisites():
            return 1

        try:
            self.parse_and_create_issues()
            self.print_summary()
            return 0
        except Exception as e:
            print(f"\n{Colors.RED}Error: {e}{Colors.ENDC}")
            return 1


def main():
    parser = argparse.ArgumentParser(
        description="Create GitHub issues from USER_STORIES.md"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be created without actually creating issues"
    )
    parser.add_argument(
        "--mvp-only",
        action="store_true",
        help="Only create 'Must Have' (MVP) stories"
    )

    args = parser.parse_args()

    creator = IssueCreator(dry_run=args.dry_run, mvp_only=args.mvp_only)
    sys.exit(creator.run())


if __name__ == "__main__":
    main()
