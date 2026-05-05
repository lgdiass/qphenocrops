# Uploading the Cerrado Grid and Updating the Script Path

This tutorial explains how to upload the **Cerrado grid** to your Google Earth Engine Assets and update the path in the `qphenocrops_gee.js` script.

> **Important:**  
> The Cerrado grid is used to **select and load a specific block** based on a `pol_id` defined in the script.  
> This means the analysis will be performed **only for the selected block**, not the entire dataset.

---

## Step 1 — Open Google Earth Engine

1. Open the **Google Earth Engine Code Editor**  
2. In the left panel, locate the **Assets** tab  

<img width="1503" height="844" alt="Step 1" src="https://github.com/user-attachments/assets/e8a56c3d-a1d0-4a3f-ad47-f9ad0298c2ea" />

---

## Step 2 — Upload the Cerrado Grid

1. Click **“NEW” → “Table upload”**  
2. Select your Cerrado grid file (e.g., `.shp`, `.geojson`, `.zip`)  
3. Wait for the upload and processing to complete (*Status: Completed*)  

> ⚠️ Upload time may vary depending on file size.

<img width="1659" height="987" alt="Step 2" src="https://github.com/user-attachments/assets/1f3f3795-967b-4f68-b088-5779957a2140" />

---

## Step 3 — Copy the Asset Path

After the upload:

1. Click on the uploaded file in the **Assets** tab  
2. Copy the Asset path, for example:

    projects/your-username/assets/gridcerrado

<img width="2453" height="925" alt="Step 3" src="https://github.com/user-attachments/assets/4ca44c01-3986-4c1d-b7ce-f6293fa1417b" />

---

## Step 4 — Update the Script

Open `qphenocrops_gee.js` and go to **line 13**:

    var blocks = ee.FeatureCollection('projects/ee-lgdiass/assets/gridcerrado');

Replace it with your Asset path:

    var blocks = ee.FeatureCollection('projects/your-username/assets/gridcerrado');

---


## Step 5 — Select the Block to Analyze

In the script, define the block ID:

    var blkID = "8346";

> 🔎 The script will filter the grid using this value:
>
>     blocks.filter(ee.Filter.eq('pol_id', blkID))

> **About the block ID (`pol_id`):**  
> The Cerrado grid shapefile already contains an attribute table with a field called `pol_id`.  
> Each polygon (grid cell) has a unique `pol_id` value.  
>
>  You can open the shapefile in **QGIS** or any GIS software.  
> Simply use the **Identify Features** tool and click on a block — the corresponding `pol_id` will appear in the panel on the right.

<img width="1484" height="859" alt="Design sem nome (5)" src="https://github.com/user-attachments/assets/18101aaf-947a-40ca-8e72-3eb627a15828" />

---

## Step 6 — Run the Script

1. Click **Run**  
2. The selected block will be loaded on the map  
3. The analysis will be performed based on:
   - the selected block (`blkID`)
   - and your drawn samples (if provided)

---

## Tips

- Ensure your dataset contains the attribute `pol_id` (required for filtering)  
- Avoid spaces in file names  
- Refresh the page if the Asset does not appear  
- Use valid `pol_id` values present in your grid  

---

## Done!

Your script is now connected to your Cerrado grid and ready to analyze specific blocks 
