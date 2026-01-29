#!/bin/bash
#
# Download star catalog source data
#
# Downloads:
#   - HYG Database v4.2 (star positions, properties)
#   - NASA Exoplanet Archive (confirmed exoplanets)
#
# Files are saved to ./tmp/ directory

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
TMP_DIR="$PROJECT_DIR/tmp"

mkdir -p "$TMP_DIR"

echo "Downloading star catalog data to $TMP_DIR..."
echo ""

# HYG Database
HYG_URL="https://github.com/astronexus/HYG-Database/raw/main/hyg/v4/hyg_v42.csv"
HYG_FILE="$TMP_DIR/hyg_v42.csv"

if [ -f "$HYG_FILE" ]; then
    echo "HYG database already exists: $HYG_FILE"
else
    echo "Downloading HYG Database v4.2..."
    curl -L -o "$HYG_FILE" "$HYG_URL"
    echo "Downloaded: $HYG_FILE ($(du -h "$HYG_FILE" | cut -f1))"
fi

# NASA Exoplanet Archive
# Query for confirmed planets with key properties
EXOPLANET_URL="https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=SELECT+pl_name,hostname,sy_snum,sy_pnum,pl_orbper,pl_rade,pl_bmasse,pl_orbsmax,pl_eqt,st_spectype,st_teff,st_rad,st_mass,st_lum,st_age,sy_dist+FROM+ps+WHERE+default_flag=1&format=csv"
EXOPLANET_FILE="$TMP_DIR/exoplanets.csv"

echo ""
echo "Downloading NASA Exoplanet Archive data..."
curl -s -o "$EXOPLANET_FILE" "$EXOPLANET_URL"
PLANET_COUNT=$(wc -l < "$EXOPLANET_FILE")
echo "Downloaded: $EXOPLANET_FILE ($((PLANET_COUNT - 1)) planets)"

# IAU Catalog of Star Names
# Official star names approved by the International Astronomical Union
IAU_URL="https://www.pas.rochester.edu/~emamajek/WGSN/IAU-CSN.txt"
IAU_FILE="$TMP_DIR/iau-csn.txt"

echo ""
echo "Downloading IAU Catalog of Star Names..."
curl -s -o "$IAU_FILE" "$IAU_URL"
IAU_COUNT=$(grep -v "^#" "$IAU_FILE" | grep -v "^$" | wc -l)
echo "Downloaded: $IAU_FILE ($IAU_COUNT star names)"

echo ""
echo "Done! Run 'php bin/generate-star-catalog.php' to build the catalog."
