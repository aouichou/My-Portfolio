"""F4-05b — insert the four new demo projects into the DEV database.

Run inside the backend container:
    docker exec -i portfolio-backend-dev python manage.py shell < scripts/f405b_demo_inserts.py

Idempotent: update_or_create keyed on slug. Dev-only by design; the PROD
path is the Phase 5 fixture (projects/fixtures/demos_f405b.json) +
Batman's Django admin review, per the flip runbook.
"""
from projects.models import Project

ROWS = [
    {
        'slug': 'ft-ls',
        'title': 'ft_ls',
        'description': (
            'A from-scratch reimplementation of ls in C — long listings, '
            'ACL and xattr columns, sorting, recursion and the classic '
            '-l/-a/-R/-r/-t flag set, on top of my own libft.'),
        'tech_stack': [
            {'name': 'C'}, {'name': 'libft'},
            {'name': 'Unix filesystem APIs'}, {'name': 'ACL / xattr'},
        ],
        'features': [
            'Long listing (-l) with permissions, links, sizes and dates',
            'ACL (+) and extended-attributes (@) column markers',
            'Sort by name, time (-t) and reverse (-r)',
            'Recursive directory listing (-R)',
            'Major/minor device numbers for block and char devices',
        ],
        'code_url': 'https://framagit.org/am/ft_ls',
        'demo_commands': [
            {'label': 'Build & list', 'command': 'make && ./ft_ls -la'},
            {'label': 'Sort by time', 'command': './ft_ls -lat'},
            {'label': 'Recursive', 'command': './ft_ls -R libft'},
        ],
    },
    {
        'slug': 'ft-select',
        'title': 'ft_select',
        'description': (
            'An interactive TUI argument picker in C — renders the argument '
            'list with termcaps, supports live dynamic search, selection '
            'with space, deletion and arrow navigation.'),
        'tech_stack': [
            {'name': 'C'}, {'name': 'libft'}, {'name': 'termcaps'},
            {'name': 'Signals'}, {'name': 'tty raw mode'},
        ],
        'features': [
            'Termcaps-rendered argument list with cursor highlighting',
            'Space to select/deselect, Tab/arrows to move',
            'Dynamic incremental search across arguments',
            'Signal-safe window resize handling',
        ],
        'code_url': 'https://framagit.org/am/ft_select',
        'demo_commands': [
            {'label': 'Build & pick',
             'command': 'make && ./ft_select README.md Makefile'},
        ],
    },
    {
        'slug': 'ft-ping',
        'title': 'ft_ping',
        'description': (
            'A C reimplementation of the ping utility — ICMP echo '
            'requests/replies over raw sockets, DNS resolution, RTT '
            'statistics and the GNU inetutils option surface '
            '(-c, -i, -v, -w, --ttl ...).'),
        'tech_stack': [
            {'name': 'C'}, {'name': 'Raw sockets'}, {'name': 'ICMP'},
            {'name': 'DNS'}, {'name': 'Signals'},
        ],
        'features': [
            'ICMP echo request/reply with checksum validation',
            'DNS hostname resolution',
            'RTT statistics: min/avg/max/mdev',
            'Bonus options: -c, -i, -v, -w, -W, --ttl, -s, -q',
        ],
        'code_url': 'https://github.com/aouichou/ft_ping',
        'demo_commands': [
            {'label': 'Build & help', 'command': 'make && ./ft_ping --help'},
            {'label': 'Usage', 'command': './ft_ping --usage'},
        ],
    },
    {
        'slug': 'ft-linear-regression',
        'title': 'ft_linear_regression',
        'description': (
            'Gradient-descent linear regression from scratch in C — a '
            'hand-rolled matrix layer, dataset normalization, '
            'train/predict/precision programs and theta persistence, '
            'built with AddressSanitizer on.'),
        'tech_stack': [
            {'name': 'C'}, {'name': 'Gradient descent'},
            {'name': 'Matrix library'}, {'name': 'ASAN'},
        ],
        'features': [
            'From-scratch matrix arithmetic (no external math beyond libm)',
            'Gradient descent with learning-rate/iteration/tolerance knobs',
            'theta.txt model persistence between train and predict',
            'R² precision scoring against the dataset',
        ],
        'code_url': 'https://github.com/aouichou/linear_regression',
        'demo_commands': [
            {'label': 'Build & train',
             'command': 'make && ./train 0.1 100000 0.000000001'},
            {'label': 'Predict price', 'command': './predict'},
            {'label': 'Precision (R²)', 'command': './precision'},
        ],
    },
]

for row in ROWS:
    slug = row['slug']
    obj, created = Project.objects.update_or_create(
        slug=slug,
        defaults=dict(
            project_type='school',
            is_featured=False,
            has_demo=True,
            score=None,
            thumbnail=None,
            thumbnail_url=None,
            demo_files_path=f'project-files/{slug}.zip',
            order=0,
            title=row['title'],
            description=row['description'],
            tech_stack=row['tech_stack'],
            features=row['features'],
            code_url=row['code_url'],
            demo_commands=row['demo_commands'],
        ),
    )
    print(f"{'CREATED' if created else 'UPDATED'} {slug} pk={obj.pk} "
          f"demo0={obj.demo_commands[0]['command']!r}")

print('school rows now:',
      Project.objects.filter(project_type='school').count())
