# QPhenoCrops: a QGIS Plugin Implementation

This module provides a graphical interface for NDVI time series analysis and phenological metrics extraction within a GIS environment.

## Overview

The plugin allows users to:

* Load raster and vector data
* Compute NDVI from Sentinel-2 imagery
* Generate time series
* Apply smoothing methods (Savitzky-Golay, DMA)
* Extract phenological metrics (SOS, POS, EOS, AMP, DUR)
* Visualize results through interactive plots

---
📥 Data Sources

The plugin supports:

Online mode (STAC catalog)
Local mode (user-provided images)

It also includes a module to download Sentinel-2 images using Copernicus Data Space credentials.

---
📥 Required Inputs
- Shapefile (mandatory in all cases)
- Raster images (only required in Local mode):
- Bands: B04 (Red) and B08 (NIR)

---
## Installation

1. Download the plugin folder

2. Copy it to your QGIS plugins directory:

### 🍎 macOS

```bash
~/Library/Application Support/QGIS/QGIS3/profiles/default/python/plugins/
```

### 🪟 Windows

```bash
C:\Users\YourUser\AppData\Roaming\QGIS\QGIS3\profiles\default\python\plugins\
```

> Replace `YourUser` with your Windows username.

### 🐧 Linux

```bash
~/.local/share/QGIS/QGIS3/profiles/default/python/plugins/
```

3. Open QGIS

4. Go to:

```
Plugins → Manage and Install Plugins
```

5. Enable **QPhenoCrops**

---

### Tip

If the plugin does not appear, restart QGIS after copying the folder.


---

## ⚙️ How to use

1. Select between using an online catalog (STAC) or local data  
2. Set crop information and date range
3. Select processing parameters (Aggregation and Smoothing)
4. Run the analysis
5. Visualize and export results

---

## Output

* NDVI plots
* Phenological metrics table
* Exported high-resolution figures

---

## 📌 Notes

* The user only needs B04 and B08 images if "Local mode" is selected
* Requires a compatible QGIS version
* Input data must be properly formatted
