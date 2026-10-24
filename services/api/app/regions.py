"""Country rules on the server (ONB-05), mirroring packages/domain/src/country.js: which
privacy rules a family's consent is given under. Not legal advice; reviewed before launch."""

REGIONS = {
    "KE": "kenya-dpa",
    "UG": "uganda-dppa",
    "TZ": "tanzania-pdpa",
    "NG": "nigeria-ndpa",
    "ZA": "south-africa-popia",
    "GB": "uk-gdpr",
    "US": "us-coppa",
}


def region_for(country: str | None) -> str:
    """Anywhere not listed gets the strictest rules."""
    return REGIONS.get((country or "").upper(), "strict")
