def s(id, title, role, want, so, ac, priority, size, milestone, sprint, screens=(), notes=""):
    return {
        "id": id, "epic": id.split("-")[0], "title": title, "role": role,
        "story": f"As {role}, I want {want}, so that {so}.",
        "want": want, "so": so,
        "ac": [{"given": g, "when": w, "then": t} for g, w, t in ac],
        "priority": priority, "size": size, "milestone": milestone, "sprint": sprint,
        "screens": list(screens), "notes": notes,
    }
