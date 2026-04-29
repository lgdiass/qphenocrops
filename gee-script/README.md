# Google Earth Engine Implementation

This module provides a cloud-based workflow for NDVI time series analysis and phenological metrics extraction.

---

## Overview

The script performs:

* Sentinel-2 filtering
* NDVI calculation
* Time series construction
* Smoothing
* Phenological metrics extraction
* Visualization

---

## Required Inputs

The script requires the following input:

### 🔹 Cerrado Grid (Required)

A spatial grid is required to define the analysis blocks.

You must:

1. Download the grid available in this repository:

   ```
   qphenocrops/gee-script/data/
   ```

2. Upload the file to your GEE Assets

3. Update the path in the script:

```javascript
var blocks = ee.FeatureCollection('YOUR/ASSET/PATH/gridcerrado');
```

This grid is used as the spatial reference for selecting analysis areas (`blkID`).

[How to upload the grid to GEE Assets](../docs/gee_upload_guide.md)

---

## Important Requirement

* The user must **draw a polygon manually in the GEE interface**

### 🔸 First execution

* When running the script for the first time:

  * The analysis will **not run**
  * A Sentinel-2 image of the selected block will be displayed
  * This allows the user to visually identify the area of interest

### 🔸 After drawing the polygon

* Draw a polygon over the desired area (e.g., crop field)
* Run the script again

The script will then:

* Extract NDVI from the drawn polygon
* Apply smoothing
* Compute phenological metrics

---

## How to Use

1. Open Google Earth Engine Code Editor
2. Create a new script
3. Paste `qphenocrops_gee.js`
4. Upload the Cerrado grid to your Assets and update the path
5. Run the script (first execution → preview)
6. Draw a polygon
7. Run again (analysis will be performed)

---

## Parameters

At the beginning of the script, you can modify the following parameters:

```javascript
var blkID = "8346";              // Block ID (from the Cerrado grid)
var startDate = '2021-05-01';    // Start date of analysis
var endDate = '2021-11-30';      // End date of analysis

var aggregation = "mean";        // "mean" or "median"
var smoothing = "savgol";        // "savgol", "dma3", "dma5"
```

### Parameter Description

* **blkID**
  Identifier of the grid block to be analyzed. Must correspond to the uploaded Cerrado grid.

* **startDate / endDate**
  Define the temporal range used to filter Sentinel-2 images.

* **aggregation**
  Method used to aggregate NDVI values:

  * `"mean"` → average NDVI
  * `"median"` → median NDVI

* **smoothing**
  Method used to smooth the NDVI time series:

  * `"savgol"` → Savitzky-Golay filter
  * `"dma3"` → moving average (3 points)
  * `"dma5"` → moving average (5 points)

---

Other parameters exist in the script but are predefined and should not be modified unless you are familiar with the implementation.

---

## Output

* NDVI time series
* Phenological metrics (SOS, POS, EOS, AMP, DUR)
* Charts and maps

---

## 📌 Notes

* The grid is mandatory and must be uploaded before running the script
* The drawn polygon defines the area from which metrics are extracted
* Designed for large-scale analysis using predefined spatial blocks
