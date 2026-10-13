"""Class ids used across the rule-engine layer (additive)."""

PERSON = 0
MASK_OK = 1
NO_MASK = 2
WEAPON = 3
FALLEN = 4
BACKPACK = 5
PHONE_IN_HAND = 6
FIRE = 7
SMOKE = 8

CLASS_NAMES = {
    PERSON: "person",
    MASK_OK: "mask_ok",
    NO_MASK: "no_mask",
    WEAPON: "weapon",
    FALLEN: "fallen",
    BACKPACK: "backpack",
    PHONE_IN_HAND: "phone_in_hand",
    FIRE: "fire",
    SMOKE: "smoke",
}

DETECT_PERSON_ONLY = [PERSON]