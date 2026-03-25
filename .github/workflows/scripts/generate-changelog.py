#!/usr/bin/env python3
"""
Generate changelog entry from conventional commits since last version tag.
Parses git log, groups by commit type (feat/fix/docs/refactor etc),
maps to iconName + section title, inserts into changelog-data.js.
"""
import subprocess
import re
import os
from datetime import datetime

# Icon + section mapping for conventional commits
TYPE_MAP = {
    'feat': {
        'iconName': 'Sparkles',
        'title': 'Neue Features',
        'prefix': 'Neu:'
    },
    'fix': {
        'iconName': 'Bug',
        'title': 'Bugfixes',
        'prefix': 'Fix:'
    },
    'refactor': {
        'iconName': 'Zap',
        'title': 'Verbesserungen',
        'prefix': ''
    },
    'perf': {
        'iconName': 'Rocket',
        'title': 'Performance',
        'prefix': 'Perf:'
    },
    'docs': {
        'iconName': 'FileText',
        'title': 'Dokumentation',
        'prefix': 'Docs:'
    },
    'chore': {
        'iconName': 'Zap',
        'title': 'Verbesserungen',
        'prefix': ''
    },
    'ci': {
        'iconName': 'Rocket',
        'title': 'Backend',
        'prefix': ''
    },
}

# Translate technical commit descriptions to human-readable German
# Order matters: more specific patterns first
TRANSLATIONS = [
    # Settings / UI Refactoring
    (r'split Settings\.jsx into .+', 'Einstellungen aufgeräumt und schneller'),
    (r'merge WorkModelSettings into DataSettings', 'Einstellungen vereinfacht'),
    (r'extract useApp(Data|Actions) from App\.jsx', 'App-Code organisiert'),
    (r'extract useFormState hook', 'Formular-Code aufgeräumt'),
    (r'extract useExport hook', 'Export-Funktion verbessert'),
    (r'combine settings cards into unified', 'Einstellungen übersichtlicher'),
    (r'Settings\.jsx into \w+Settings\.jsx', 'Einstellungen in einzelne Teile aufgeteilt'),
    (r'extract \w+ hook', 'Code in wiederverwendbare Teile aufgeteilt'),

    # Icon / UI fixes
    (r'normalize icon sizes for (\w+) and (\w+)', r'Icons bei \1 und \2 optimiert'),
    (r'normalize icon sizes', 'Icons optimiert'),
    (r'fix: enable edge-to-edge display', 'Edge-to-Edge Anzeige für Android 15+'),
    (r'icon sizes', 'Icons verbessert'),
    (r'increase icon size in (\w+)', r'Icons in \1 vergrößert'),

    # Data / Settings fixes
    (r'unguarded userData', 'Daten werden sicherer geladen'),
    (r'safeUserData guard', 'App startet stabiler'),
    (r'guard against JSON\.parse', 'App startet robuster'),
    (r'recursive component reference', 'App stürzt nicht mehr ab'),
    (r'Settings crash', 'Einstellungen funktionieren wieder'),
    (r'export/import includes work codes', 'Export sichert jetzt auch Tätigkeitscodes'),
    (r'workDays guard', 'Arbeitstage werden richtig gespeichert'),

    # Changelog / Docs
    (r'人有 changelog entries', 'Changelog aufgeräumt'),
    (r'deduplicate changelog', 'Changelog aufgeräumt'),
    (r'rewrite changelog entries to human', 'Changelog verbessert'),

    # GDrive / Cloud
    (r'guard initGoogleAuth behind cloudEnabled', 'Google Drive funktioniert auf älteren Android-Versionen'),

    # Error handling
    (r'make error message copyable', 'Fehlermeldungen können jetzt kopiert werden'),
    (r'show actual error message', 'Fehler-Details werden richtig angezeigt'),

    # Backup
    (r'add manual backup button', 'Manueller Backup-Button hinzugefügt'),
    (r'add last backup display', 'Letztes Backup wird angezeigt'),
    (r'offline warning', 'Warnung wenn kein Backup vorhanden'),

    # Onboarding / Demo
    (r'add Demo-Daten option', 'Demo-Daten zum Ausprobieren'),
    (r'demo data toggle', 'Demo-Daten in den Einstellungen'),

    # Time input
    (r'minute precision toggle', 'Minütige Zeiteingabe umschaltbar'),
    (r'add minute-level time input', 'Minütige Zeiteingabe optional'),

    # Misc technical (map to generic human messages)
    (r'remove dead code', 'Internes aufgeräumt'),
    (r'deduplicate', 'Code verschlankt'),
    (r'extract \w+ to constants', 'Einstellungen organisiert'),
    (r'eliminate magic numbers', 'Internes verbessert'),
    (r'refactor: .+', lambda m: m.group(0)[10:50] + '...' if len(m.group(0)) > 50 else m.group(0)[10:]),
]

def humanize_description(desc):
    """Translate technical description to human-readable German."""
    for pattern, replacement in TRANSLATIONS:
        if callable(replacement):
            new_desc, count = re.subn(pattern, replacement, desc, flags=re.IGNORECASE)
        else:
            new_desc, count = re.subn(pattern, replacement, desc, flags=re.IGNORECASE)
        if count > 0:
            return new_desc.strip()
    return desc

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(SCRIPT_DIR)))  # .github/workflows/scripts/ -> repo root

def get_last_version_tag():
    """Get the most recent version tag matching vX.Y format (ignoring debug/ci tags)."""
    try:
        # Get all tags sorted by version
        result = subprocess.run(
            ['git', 'tag', '--sort=-version:refname'],
            capture_output=True, text=True, cwd=REPO_ROOT
        )
        if result.returncode == 0:
            for tag in result.stdout.strip().split('\n'):
                tag = tag.strip()
                if not tag:
                    continue
                # Match vMAJOR.MINOR or vMAJOR.MINOR.PATCH
                if re.match(r'^v\d+\.\d+(\.\d+)?$', tag):
                    return tag.lstrip('v')
    except Exception:
        pass
    return None

def get_commits_since_tag(tag):
    """Get conventional commits since the given tag."""
    if not tag:
        # No tag found, get last 20 commits as fallback
        range_spec = '-20'
    else:
        range_spec = f'v{tag}..HEAD'

    try:
        result = subprocess.run(
            ['git', 'log', range_spec, '--pretty=format:%s', '--no-merges'],
            capture_output=True, text=True,
            cwd=REPO_ROOT
        )
        return result.stdout.strip().split('\n') if result.stdout.strip() else []
    except Exception:
        return []

def parse_conventional_commit(msg):
    """Parse a conventional commit message. Returns (type, description) or None."""
    pattern = r'^(feat|fix|refactor|perf|docs|chore|ci)(\([^)]+\))?!?:\s*(.+)$'
    match = re.match(pattern, msg.strip())
    if match:
        commit_type = match.group(1)
        description = match.group(3).strip()
        
        # Filter out internal/technical commits that shouldn't appear in changelog
        lower_desc = description.lower()
        
        # Skip chore commits about version bumps, sync, etc.
        if commit_type == 'chore':
            skip_keywords = ['bump', 'version', 'sync', 'update changelog', 'deploy', 'add changelog']
            if any(keyword in lower_desc for keyword in skip_keywords):
                return None, None  # Skip this commit
        
        # Skip fix commits about internal workflow details
        if commit_type == 'fix':
            skip_keywords = ['grep regex', 'step id', 'versioncode', 'versionname', 
                           'sync app_version', 'escape quotes', 'constants.js']
            if any(keyword in lower_desc for keyword in skip_keywords):
                return None, None
        
        # Skip ci commits (internal workflow)
        if commit_type == 'ci':
            return None, None
        
        # Skip docs commits about changelog updates
        if commit_type == 'docs' and 'changelog' in lower_desc:
            return None, None
            
        return commit_type, description
    return None, msg.strip()

def generate_changelog_entry(version_name, commits):
    """Generate a changelog entry dict from commits."""
    sections = {}  # iconName -> {title, items}

    for commit in commits:
        commit_type, description = parse_conventional_commit(commit)
        if not commit_type or commit_type not in TYPE_MAP:
            continue  # Skip non-conventional commits like "Merge branch..."

        info = TYPE_MAP[commit_type]
        icon = info['iconName']

        if icon not in sections:
            sections[icon] = {'title': info['title'], 'items': []}

        # Humanize the technical description
        human_desc = humanize_description(description)
        prefix = info['prefix']
        if prefix:
            item_text = f"{prefix} {human_desc}"
        else:
            item_text = human_desc

        sections[icon]['items'].append(item_text)

    if not sections:
        print("No conventional commits found for changelog.")
        return None

    today = datetime.now().strftime('%d.%m.%Y')

    entry = {
        'version': version_name,
        'date': today,
        'sections': []
    }

    # Title based on types present
    has_feats = 'Sparkles' in sections
    has_fixes = 'Bug' in sections
    if has_feats and has_fixes:
        entry['title'] = 'Neue Features & Bugfixes 🛠️'
    elif has_feats:
        entry['title'] = 'Neue Features ✨'
    elif has_fixes:
        entry['title'] = 'Bugfixes 🔧'
    else:
        entry['title'] = 'Updates 🔄'

    # Build sections list
    for icon, data in sections.items():
        entry['sections'].append({
            'iconName': icon,
            'title': data['title'],
            'items': data['items']
        })

    return entry

def format_changelog_entry(entry):
    """Format a changelog entry as JS code string."""
    lines = ['  {']
    lines.append(f'  version: "{entry["version"]}",')
    lines.append(f'  date: "{entry["date"]}",')
    lines.append(f'  title: "{entry["title"]}",')
    lines.append('  isMajor: false,')
    lines.append('  sections: [')

    for i, section in enumerate(entry['sections']):
        comma = ',' if i < len(entry['sections']) - 1 else ''
        lines.append(f'    {{')
        lines.append(f'      iconName: \'{section["iconName"]}\',')
        lines.append(f'      title: "{section["title"]}",')
        lines.append(f'      items: [')
        for j, item in enumerate(section['items']):
            item_comma = ',' if j < len(section['items']) - 1 else ''
            # Escape quotes in item text
            safe_item = item.replace('"', "'")
            lines.append(f'        "{safe_item}"{item_comma}')
        lines.append(f'      ]')
        lines.append(f'    }}{comma}')
    lines.append('  ]')
    lines.append('  },')

    return '\n'.join(lines)

def update_changelog_data(entry):
    """Insert the new changelog entry into changelog-data.js."""
    changelog_path = os.path.join(REPO_ROOT, 'src', 'data', 'changelog-data.js')

    if not os.path.exists(changelog_path):
        print(f"changelog-data.js not found at {changelog_path}")
        return False

    with open(changelog_path, 'r') as f:
        content = f.read()

    formatted_entry = format_changelog_entry(entry)

    # Find the first { after CHANGELOG_DATA = and insert after it
    pattern = r'(export const CHANGELOG_DATA = \[)\s*(\n)'
    match = re.search(pattern, content)
    if match:
        insert_pos = match.end()
        new_content = content[:insert_pos] + '\n' + formatted_entry + '\n' + content[insert_pos:]
    else:
        print("Could not find CHANGELOG_DATA insertion point")
        return False

    with open(changelog_path, 'w') as f:
        f.write(new_content)

    print(f"Changelog updated with v{entry['version']} entry")
    return True

def main():
    last_tag = get_last_version_tag()
    print(f"Last version tag: {last_tag or 'none'}")

    commits = get_commits_since_tag(last_tag)
    print(f"Found {len(commits)} commits since last tag")

    if not commits:
        print("No commits to generate changelog from.")
        return

    # Get the new version name from build.gradle (set by bump_version step)
    build_gradle = os.path.join(REPO_ROOT, 'android', 'app', 'build.gradle')
    version_name = None
    with open(build_gradle, 'r') as f:
        for line in f:
            match = re.search(r'versionName\s+"([^"]+)"', line)
            if match:
                version_name = match.group(1)
                break

    if not version_name:
        print("Could not find new versionName in build.gradle")
        return

    print(f"Generating changelog for v{version_name}")

    entry = generate_changelog_entry(version_name, commits)
    if entry:
        if update_changelog_data(entry):
            print("Done! Changelog entry generated and inserted.")
        else:
            print("Failed to update changelog-data.js")
    else:
        print("No changelog entry generated.")

if __name__ == '__main__':
    main()
