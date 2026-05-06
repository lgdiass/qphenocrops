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
* **Aggregation method** (Mean or Median)
* **Smoothing method** (DMA3, DMA5 or Savitzky-Golay)

---

## How to Use

1. Download the Jupyter Notebook
   [Access notebook](https://github.com/lgdiass/qphenocrops/blob/main/jupyter-notebook/phenocrops-API.ipynb)
   
2. Open:
   ```bash
   phenocrops-API.ipynb
   ```
3. Update parameters (date range, aggregation method and smoothing mode)
4. Run all cells sequentially

---

## Recommended Environment

We recommend using Anaconda to run this notebook, as it provides an integrated environment with pre-installed libraries and simplified dependency management. The Jupyter Notebook included in Anaconda allows users to easily edit parameters, execute cells step by step, and visualize results interactively. This setup helps ensure compatibility and reduces potential issues related to package installation and environment configuration.

---

## Output

* NDVI time series plots
* Phenological metrics table
* Exported figures (600 DPI)

---

## 📌 Notes

* No raster input is required
* All data processing is handled programmatically
