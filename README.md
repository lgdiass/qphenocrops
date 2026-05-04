# QPhenoCrops

**QPhenoCrops** is a framework for analyzing satellite-derived vegetation time series and extracting phenological metrics from temporary agricultural crops.

It leverages Sentinel-2 imagery and vegetation indices (such as NDVI) to identify key crop development stages based on temporal patterns, enabling consistent and reproducible phenological analysis.

---

## Overview

QPhenoCrops enables the automatic extraction of phenological metrics from vegetation index time series.
By analyzing temporal dynamics, the framework detects key transitions in vegetation growth and senescence.

The following metrics are derived:

* **Start of Season (SOS)** – onset of consistent vegetation growth
* **Peak of Season (POS)** – maximum vegetation development
* **End of Season (EOS)** – transition to senescence
* **Amplitude (AMP)** – difference between peak and initial vegetation state
* **Duration (DUR)** – length of the growing cycle

These metrics provide valuable insights for agricultural monitoring, crop characterization, and decision-making processes.

---

## Applications

QPhenoCrops is designed to support:

* Monitoring of crop development over time
* Phenological analysis of temporary agricultural systems

---

## 🔹 Implementations

This repository provides three complementary implementations:

### 1️⃣ QGIS Plugin

A graphical interface for performing NDVI time series analysis and extracting phenological metrics in a GIS environment.

### 2️⃣ Jupyter Notebook

A reproducible workflow for data access, preprocessing, smoothing, and phenological analysis using Python.

### 3️⃣ Google Earth Engine (GEE)

A cloud-based implementation for large-scale analysis and processing of satellite time series.

---

## Getting Started

Each implementation has its own setup and usage instructions:

* See `qgis-plugin/` for plugin installation and usage
* See `jupyter-notebook/` for running the notebook workflow
* See `gee-script/` for Google Earth Engine implementation

---

## Data Source

* Sentinel-2 Level-2A imagery
* Vegetation indices derived from spectral bands (e.g., NDVI)

---

## 📌 Notes

QPhenoCrops is designed to be flexible and can be applied to different temporary crops and study areas, depending on user-defined parameters and input data.

---

## 🔸 License

This project is open-source and available under the MIT License.
