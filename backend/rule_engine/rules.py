RULES = [
    {"name": "restricted_zone", "severity": "critical", "applies_to": ["staff", "unknown"], "exempt_roles": [], "description": "Restricted zone entry."},
    {"name": "after_hours", "severity": "high", "applies_to": ["staff", "unknown"], "exempt_roles": ["owner", "security"], "description": "After-hours presence."},
    {"name": "tailgating", "severity": "high", "applies_to": ["staff", "unknown"], "exempt_roles": ["owner"], "description": "Tailgating through a door."},
    {"name": "no_mask", "severity": "medium", "applies_to": ["owner", "staff", "unknown"], "exempt_roles": [], "description": "Missing mask."},
    {"name": "fall_detected", "severity": "high", "applies_to": ["owner", "staff", "unknown"], "exempt_roles": [], "description": "Person fallen."},
    {"name": "fight", "severity": "critical", "applies_to": ["owner", "staff", "unknown"], "exempt_roles": [], "description": "Fight detected."},
    {"name": "weapon", "severity": "critical", "applies_to": ["owner", "staff", "unknown"], "exempt_roles": [], "description": "Weapon detected."},
    {"name": "loitering", "severity": "medium", "applies_to": ["unknown"], "exempt_roles": [], "description": "Loitering detected."},
    {"name": "crowd", "severity": "medium", "applies_to": ["owner", "staff", "unknown"], "exempt_roles": [], "description": "Crowd threshold exceeded."},
]