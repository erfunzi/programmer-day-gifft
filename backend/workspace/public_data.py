"""Explicit public contracts; never forward authenticated GitHub payloads verbatim."""

USER_TEXT = ('login', 'name', 'avatar_url', 'html_url', 'bio', 'created_at')
REPO_TEXT = ('name', 'html_url', 'description', 'language', 'created_at', 'updated_at', 'pushed_at')

def fields(value, names, kind):
    if not isinstance(value, dict):
        return {}
    return {key: value[key] for key in names if key in value and
            (value[key] is None or type(value[key]) is kind)}

def strings(value):
    return [item for item in value if isinstance(item, str)] if isinstance(value, list) else []

def public_card_payload(source):
    source = source if isinstance(source, dict) else {}
    user = source.get('user', {})
    repos = source.get('repos', [])
    safe_repos = []
    for repo in repos if isinstance(repos, list) else []:
        if not isinstance(repo, dict) or repo.get('private') or repo.get('visibility', 'public') != 'public':
            continue
        safe = fields(repo, REPO_TEXT, str)
        if not safe.get('name'):
            continue
        safe.update(fields(repo, ('stargazers_count',), int))
        safe.update(fields(repo, ('fork', 'archived'), bool))
        if 'topics' in repo:
            safe['topics'] = strings(repo['topics'])
        safe_repos.append(safe)
    return {'user': {**fields(user, USER_TEXT, str), **fields(user, ('id', 'public_repos', 'followers'), int)}, 'repos': safe_repos}

def public_analysis(value):
    if not isinstance(value, dict):
        return None
    def locale(raw):
        raw = raw if isinstance(raw, dict) else {}
        result = fields(raw, ('title', 'summary', 'role', 'sloganLead', 'slogan', 'telegramText'), str)
        for key in ('resume', 'strengths', 'suggestions', 'traits', 'featuredProjects'):
            if key in raw:
                result[key] = strings(raw[key])
        if isinstance(raw.get('skills'), list):
            result['skills'] = [fields(skill, ('name', 'evidence', 'source'), str) for skill in raw['skills'] if isinstance(skill, dict)]
        return result
    result = fields(value, ('schemaVersion', 'generatedAt'), int)
    if isinstance(value.get('locales'), dict):
        result['locales'] = {lang: locale(value['locales'][lang]) for lang in ('fa', 'en') if lang in value['locales']}
    elif value.get('schemaVersion') == 2:
        result.update(locale(value))
    return result
