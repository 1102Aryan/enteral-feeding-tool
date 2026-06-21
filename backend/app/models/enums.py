from enum import Enum


class DiabetesType(str, Enum):
    type1 = "type1"
    type2 = "type2"
    type3c = "type3c"
    insulin_deficiency = "insulin_deficiency"


class FeedType(str, Enum):
    continuous = "continuous"
    single = "single"        
    intermittent = "intermittent"
    bolus = "bolus"


class InsulinType(str, Enum):
    rapid_analogue = "rapid_analogue"
    soluble = "soluble"
    isophane = "isophane"
    premixed = "premixed"
    long_acting = "long_acting"
    none = "none"


class BandKey(str, Enum):
    hypo = "hypo"
    looming = "looming"
    target = "target"
    above = "above"