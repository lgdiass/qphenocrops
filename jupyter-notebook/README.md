# Jupyter Notebook Implementation

This module provides a reproducible workflow for NDVI time series analysis and phenological metrics extraction using Python.

---

## Overview

The notebook performs the following steps:

1. Access Sentinel-2 imagery via STAC
2. Clip raster data using a user-defined shapefile
3. Compute NDVI (B04 and B08)
4. Build the NDVI time series
5. Apply smoothing (Savitzky-Golay, DMA3, DMA5)
6. Extract phenological metrics (SOS, POS, EOS, AMP, DUR)
7. Visualize and export results

---

## Required Inputs

* **Shapefile (mandatory):** must represent the agricultural field (plot) used as the area of interest for NDVI time series extraction and phenological analysis.

---

## User Configuration

The user must manually edit parameters in the code:

* **Date range**
* **Aggregation method** (mean or median)
* **Smoothing method** (savgol, dma3, dma5)

---

## How to Use

1. Open:

   ```bash
   QPhenoCrops.ipynb
   ```
2. Update parameters (date range, aggregation method and smoothing mode)
3. Run all cells sequentially

---

## Output

* NDVI time series plots
* Phenological metrics table
* Exported figures (600 DPI)

---

## 📌 Notes

* No raster input is required
* All data processing is handled programmatically
