#!/usr/bin/env python3
"""
GitHub Projects ↔️ Markdown Tracker Sync Script

This script synchronizes between:
1. GitHub Projects (via GraphQL API)
2. Local jira-progress-tracker.md file

AI agents can use this to keep both systems in sync.
"""

import os
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

import requests


class ProjectSync:
    """Synchronizes GitHub Projects with local markdown tracker"""
    
    def __init__(self, github_token: Optional[str] = None):
        self.token = github_token or os.getenv('GITHUB_TOKEN')
        if not self.token:
            raise ValueError("GITHUB_TOKEN environment variable required")
        
        self.api_url = "https://api.github.com/graphql"
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        
        # Get repo info from git or environment
        self.owner = os.getenv('GITHUB_REPOSITORY_OWNER', 'aouichou')
        self.repo = os.getenv('GITHUB_REPOSITORY', 'My-Portfolio').split('/')[-1]
        
        # Paths
        self.tracker_path = Path(__file__).parent.parent.parent / 'docs' / 'jira-progress-tracker.md'
    
    def graphql_query(self, query: str, variables: Dict = None) -> Dict:
        """Execute GraphQL query against GitHub API"""
        payload = {"query": query}
        if variables:
            payload["variables"] = variables
        
        response = requests.post(self.api_url, json=payload, headers=self.headers)
        response.raise_for_status()
        
        data = response.json()
        if "errors" in data:
            raise Exception(f"GraphQL errors: {data['errors']}")
        
        return data["data"]
    
    def get_project_id(self, project_number: int) -> Optional[str]:
        """Get project ID from project number"""
        query = """
        query($owner: String!, $repo: String!, $number: Int!) {
          repository(owner: $owner, name: $repo) {
            projectV2(number: $number) {
              id
              title
            }
          }
        }
        """
        
        try:
            data = self.graphql_query(query, {
                "owner": self.owner,
                "repo": self.repo,
                "number": project_number
            })
            return data["repository"]["projectV2"]["id"]
        except Exception:
            return None
    
    def list_project_items(self, project_id: str) -> List[Dict]:
        """List all items in a GitHub Project"""
        query = """
        query($projectId: ID!, $cursor: String) {
          node(id: $projectId) {
            ... on ProjectV2 {
              items(first: 100, after: $cursor) {
                pageInfo {
                  hasNextPage
                  endCursor
                }
                nodes {
                  id
                  type
                  content {
                    ... on Issue {
                      number
                      title
                      state
                      url
                    }
                    ... on PullRequest {
                      number
                      title
                      state
                      url
                    }
                    ... on DraftIssue {
                      title
                      body
                    }
                  }
                  fieldValues(first: 20) {
                    nodes {
                      ... on ProjectV2ItemFieldSingleSelectValue {
                        name
                        field {
                          ... on ProjectV2SingleSelectField {
                            name
                          }
                        }
                      }
                      ... on ProjectV2ItemFieldTextValue {
                        text
                        field {
                          ... on ProjectV2Field {
                            name
                          }
                        }
                      }
                      ... on ProjectV2ItemFieldNumberValue {
                        number
                        field {
                          ... on ProjectV2Field {
                            name
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        """
        
        items = []
        cursor = None
        
        while True:
            data = self.graphql_query(query, {
                "projectId": project_id,
                "cursor": cursor
            })
            
            project_data = data["node"]["items"]
            items.extend(project_data["nodes"])
            
            if not project_data["pageInfo"]["hasNextPage"]:
                break
            
            cursor = project_data["pageInfo"]["endCursor"]
        
        return items
    
    def update_item_status(self, project_id: str, item_id: str, 
                          field_id: str, option_id: str) -> bool:
        """Update an item's status field"""
        mutation = """
        mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $value: ProjectV2FieldValue!) {
          updateProjectV2ItemFieldValue(input: {
            projectId: $projectId
            itemId: $itemId
            fieldId: $fieldId
            value: $value
          }) {
            projectV2Item {
              id
            }
          }
        }
        """
        
        try:
            self.graphql_query(mutation, {
                "projectId": project_id,
                "itemId": item_id,
                "fieldId": field_id,
                "value": {"singleSelectOptionId": option_id}
            })
            return True
        except Exception as e:
            print(f"Error updating item: {e}")
            return False
    
    def parse_markdown_tracker(self) -> Dict[str, List[Dict]]:
        """Parse the markdown tracker file"""
        if not self.tracker_path.exists():
            return {}
        
        content = self.tracker_path.read_text()
        
        # Parse sections
        sections = {
            "To Do": [],
            "In Progress": [],
            "Review": [],
            "Blocked": [],
            "Done": []
        }
        
        current_section = None
        
        for line in content.split('\n'):
            # Detect section headers
            for section in sections.keys():
                if section.lower() in line.lower() and line.strip().startswith('#'):
                    current_section = section
                    break
            
            # Parse task items: - [ ] #123 Task title
            if current_section and line.strip().startswith('- ['):
                match = re.match(r'- \[([ x])\] #(\d+) (.+)', line.strip())
                if match:
                    checked, issue_num, title = match.groups()
                    sections[current_section].append({
                        "number": int(issue_num),
                        "title": title.strip(),
                        "completed": checked == 'x'
                    })
        
        return sections
    
    def update_markdown_tracker(self, issues: List[Dict], status_map: Dict[int, str]):
        """Update the markdown tracker with current issue states"""
        
        # Group issues by status (map Kanban statuses to our sections)
        sections = {
            "To Do": [],
            "In Progress": [],
            "Review": [],
            "Blocked": [],
            "Done": []
        }
        
        # Map Kanban status names to our sections
        status_mapping = {
            "Backlog": "To Do",
            "Todo": "To Do",
            "To Do": "To Do",
            "In progress": "In Progress",
            "In Progress": "In Progress",
            "In review": "Review",
            "In Review": "Review",
            "Review": "Review",
            "Blocked": "Blocked",
            "Done": "Done",
            "Completed": "Done"
        }
        
        for issue in issues:
            kanban_status = status_map.get(issue['number'], 'To Do')
            # Map to our standard sections
            status = status_mapping.get(kanban_status, 'To Do')
            if status in sections:
                sections[status].append(issue)
        
        # Generate markdown
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        markdown = f"""# Project Progress Tracker

**Last Updated:** {now} (Auto-synced with GitHub Projects)

## 🎯 Current Sprint

### 📋 To Do
"""
        
        for issue in sections["To Do"]:
            if issue.get('is_draft'):
                markdown += f"- [ ] 🔒 DRAFT: {issue['title']}\n"
                if issue.get('body'):
                    # Add description indented under the draft issue
                    body_lines = issue['body'].strip().split('\n')
                    for line in body_lines[:3]:  # First 3 lines of description
                        if line.strip():
                            markdown += f"  > {line.strip()}\n"
            else:
                markdown += f"- [ ] #{issue['number']} {issue['title']}\n"
        
        markdown += "\n### 🔄 In Progress\n"
        for issue in sections["In Progress"]:
            if issue.get('is_draft'):
                markdown += f"- [ ] 🔒 DRAFT: {issue['title']}\n"
                if issue.get('body'):
                    body_lines = issue['body'].strip().split('\n')
                    for line in body_lines[:3]:
                        if line.strip():
                            markdown += f"  > {line.strip()}\n"
            else:
                markdown += f"- [ ] #{issue['number']} {issue['title']}\n"
        
        markdown += "\n### 👀 Review\n"
        for issue in sections["Review"]:
            if issue.get('is_draft'):
                markdown += f"- [ ] 🔒 DRAFT: {issue['title']}\n"
                if issue.get('body'):
                    body_lines = issue['body'].strip().split('\n')
                    for line in body_lines[:3]:
                        if line.strip():
                            markdown += f"  > {line.strip()}\n"
            else:
                markdown += f"- [ ] #{issue['number']} {issue['title']}\n"
        
        markdown += "\n### 🚫 Blocked\n"
        for issue in sections["Blocked"]:
            if issue.get('is_draft'):
                markdown += f"- [ ] 🔒 DRAFT: {issue['title']}\n"
                if issue.get('body'):
                    body_lines = issue['body'].strip().split('\n')
                    for line in body_lines[:3]:
                        if line.strip():
                            markdown += f"  > {line.strip()}\n"
            else:
                markdown += f"- [ ] #{issue['number']} {issue['title']}\n"
        
        markdown += "\n### ✅ Done\n"
        for issue in sections["Done"]:
            if issue.get('is_draft'):
                markdown += f"- [x] 🔒 DRAFT: {issue['title']}\n"
                if issue.get('body'):
                    body_lines = issue['body'].strip().split('\n')
                    for line in body_lines[:3]:
                        if line.strip():
                            markdown += f"  > {line.strip()}\n"
            else:
                markdown += f"- [x] #{issue['number']} {issue['title']}\n"
        
        # Calculate metrics
        draft_count = sum(1 for i in issues if i.get('is_draft'))
        regular_count = len(issues) - draft_count
        
        markdown += f"""
---

## 📊 Sprint Metrics

**Total Items:** {len(issues)} ({regular_count} issues, {draft_count} drafts)
**Completed:** {len(sections['Done'])}
**In Progress:** {len(sections['In Progress'])}
**Blocked:** {len(sections['Blocked'])}
**Completion Rate:** {len(sections['Done']) / len(issues) * 100 if issues else 0:.1f}%

---

*This file is auto-synced with GitHub Projects. Manual edits may be overwritten.*
*🔒 DRAFT items are private and only visible in the GitHub Project board.*
"""
        
        # Ensure directory exists
        self.tracker_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Write updated content
        self.tracker_path.write_text(markdown)
        print(f"✅ Updated {self.tracker_path}")
    
    def sync_github_to_markdown(self, project_number: int = 1):
        """Sync GitHub Projects → Markdown"""
        print(f"🔄 Syncing GitHub Project #{project_number} → Markdown...")
        
        project_id = self.get_project_id(project_number)
        if not project_id:
            print(f"❌ Project #{project_number} not found")
            return False
        
        items = self.list_project_items(project_id)
        
        # Extract issue data and status
        issues = []
        status_map = {}
        draft_counter = 1
        
        for item in items:
            item_type = item.get("type", "")
            content = item.get("content")
            
            if not content:
                continue
            
            # Handle regular Issues and Pull Requests (have issue numbers)
            if "number" in content:
                number = content["number"]
                issues.append({
                    "number": number,
                    "title": content.get("title", ""),
                    "url": content.get("url", ""),
                    "state": content.get("state", ""),
                    "is_draft": False
                })
                
                # Extract status from field values
                status = "To Do"
                for field_value in item.get("fieldValues", {}).get("nodes", []):
                    if field_value.get("field", {}).get("name") == "Status":
                        status = field_value.get("name", "To Do")
                        break
                
                status_map[number] = status
            
            # Handle DraftIssues (no issue number, use negative IDs)
            elif item_type == "DRAFT_ISSUE":
                draft_id = -(draft_counter)  # Use negative numbers for drafts
                draft_counter += 1
                
                issues.append({
                    "number": draft_id,
                    "title": content.get("title", "Untitled Draft"),
                    "body": content.get("body", ""),
                    "url": "",
                    "state": "DRAFT",
                    "is_draft": True
                })
                
                # Extract status from field values
                status = "To Do"
                for field_value in item.get("fieldValues", {}).get("nodes", []):
                    if field_value.get("field", {}).get("name") == "Status":
                        status = field_value.get("name", "To Do")
                        break
                
                status_map[draft_id] = status
        
        self.update_markdown_tracker(issues, status_map)
        print(f"✅ Synced {len(issues)} issues to markdown ({sum(1 for i in issues if i['is_draft'])} drafts)")
        return True
    
    def sync_markdown_to_github(self, project_number: int = 1):
        """Sync Markdown → GitHub Projects"""
        print(f"🔄 Syncing Markdown → GitHub Project #{project_number}...")
        
        project_id = self.get_project_id(project_number)
        if not project_id:
            print(f"❌ Project #{project_number} not found")
            return False
        
        # Parse markdown
        # md_sections = self.parse_markdown_tracker()
        
        # Get current GitHub state
        # gh_items = self.list_project_items(project_id)
        
        # TODO: Implement sync logic
        # This would update GitHub Projects based on markdown changes
        # For now, we prioritize GitHub → Markdown sync
        
        print("⚠️  Markdown → GitHub sync not yet implemented")
        print("    (Use GitHub Projects as source of truth)")
        return False


def main():
    """Main CLI entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Sync GitHub Projects with Markdown tracker')
    parser.add_argument('--direction', choices=['to-md', 'to-gh', 'both'], 
                       default='to-md',
                       help='Sync direction (default: to-md)')
    parser.add_argument('--project', type=int, default=1,
                       help='GitHub Project number (default: 1)')
    parser.add_argument('--token', help='GitHub token (or use GITHUB_TOKEN env var)')
    
    args = parser.parse_args()
    
    try:
        syncer = ProjectSync(github_token=args.token)
        
        if args.direction in ['to-md', 'both']:
            syncer.sync_github_to_markdown(args.project)
        
        if args.direction in ['to-gh', 'both']:
            syncer.sync_markdown_to_github(args.project)
        
        print("✅ Sync complete!")
        return 0
        
    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
