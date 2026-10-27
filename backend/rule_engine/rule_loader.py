import os

PREMISES = os.getenv("PREMISES_TYPE", "company").lower()

def load_rules():
    if PREMISES == "mall":
        from .templates.mall_rules import MALL_RULES
        return MALL_RULES
    if PREMISES == "hospital":
        from .templates.hospital_rules import HOSPITAL_RULES
        return HOSPITAL_RULES
    if PREMISES == "company":
        from .templates.company_rules import COMPANY_RULES
        return COMPANY_RULES
    from .rules import RULES
    return RULES
