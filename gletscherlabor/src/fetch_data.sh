#!/usr/bin/env bash
# Downloads the input data (OGGM sample data: SRTM DEM, RGI 5.0 outline, HISTALP climate) into ./data
set -euo pipefail
mkdir -p data
B=https://raw.githubusercontent.com/OGGM/oggm-sample-data/master/test-files
curl -fsSL -o data/hef_srtm.tif "$B/hef_srtm.tif"
for e in shp shx dbf prj; do curl -fsSL -o "data/hef.$e" "$B/Hintereisferner_RGI5.$e"; done
curl -fsSL -o data/histalp.nc "$B/histalp_merged_hef.nc"
echo "Daten liegen in $(pwd)/data"
