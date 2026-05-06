// ===============================
// Initial parameters (teste)
// ===============================
var blkID = "8346";
var startDate = '2021-05-01'; // Change
var endDate = '2021-11-30';  // Change
var Nimages = 50; 
var cloudThreshold = 10;

var aggregation = "median"; // Change --> "mean" ou "median"
var smoothing = "dma3"; // Change --> "savgol", "dma3", "dma5"

var blocks = ee.FeatureCollection('projects/ee-lgdiass/assets/gridcerrado');

// ===============================
// Check if user drew geometry
// ===============================

samples.size().evaluate(function(n) {

  if (n === 0) {

    print("Draw a polygon on the map to start the analysis.");

    var selectedBlock = blocks.filter(ee.Filter.eq('pol_id', blkID));

    var preview = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
      .filterBounds(selectedBlock)
      .filterDate(startDate, endDate)
      .filterMetadata('CLOUDY_PIXEL_PERCENTAGE', 'less_than', cloudThreshold)
      .sort('CLOUDY_PIXEL_PERCENTAGE')
      .first()
      .clip(selectedBlock);

    Map.centerObject(selectedBlock, 10);

    Map.addLayer(
      preview,
      {bands: ['B8','B11','B4'], min: 450, max: 5000},
      "Preview Block"
    );

  } else {
    runAnalysis(samples);

  }

});

function runAnalysis(samples) {
  
  // ===============================
  // Helper functions
  // ===============================
  var bufferPolygon = function(blk) {
    return blk.buffer(5000);
  };
  
  function setDate(image){
    return image.set('date', ee.Date(image.get('system:time_start')).format('yyyy-MM-dd'));
  }
  
  var calculateNDVI = function(image) {
    var NDVI = image.normalizedDifference(['B8', 'B4']).rename('NDVI');
    return image.addBands(NDVI).copyProperties(image, ['system:time_start', 'date']);
  };
  
  function linearInterpolation(dates, values) {
  
    var interpolated = [];
    
    for (var i = 0; i < values.length; i++) {
  
      if (values[i] !== null && !isNaN(values[i])) {
        interpolated.push(values[i]);
        continue;
      }
  
      var prev = null;
      var next = null;
      var prevIdx = null;
      var nextIdx = null;
  
      for (var j = i - 1; j >= 0; j--) {
        if (values[j] !== null && !isNaN(values[j])) {
          prev = values[j];
          prevIdx = j;
          break;
        }
      }
  
      for (var j = i + 1; j < values.length; j++) {
        if (values[j] !== null && !isNaN(values[j])) {
          next = values[j];
          nextIdx = j;
          break;
        }
      }
  
      if (prev !== null && next !== null) {
        var ratio = (i - prevIdx) / (nextIdx - prevIdx);
        interpolated.push(prev + ratio * (next - prev));
      } else if (prev !== null) {
        interpolated.push(prev);
      } else if (next !== null) {
        interpolated.push(next);
      } else {
        interpolated.push(null);
      }
    }
  
    return interpolated;
  }
  
  function addSentinel2LayersToMap(startDate, endDate, bufferedPolygon, Nimages, cloudThreshold){
    var s2Collection = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
                        .filterDate(startDate, endDate)
                        .filterBounds(bufferedPolygon)
                        .filterMetadata('CLOUDY_PIXEL_PERCENTAGE', 'less_than', cloudThreshold)
                        .map(setDate);
                    
    var dateList = ee.List(s2Collection.aggregate_array('date')).distinct().sort().slice(0, Nimages);
  
    var count = dateList.size().getInfo();
    if(count > Nimages){count = Nimages;}
  
    for(var i = 0; i < count; i++){
      var dateStr = dateList.get(i).getInfo();
      var img = ee.Image(s2Collection.filterMetadata('date','equals', dateStr).mosaic()).clip(bufferedPolygon);
      Map.addLayer(img, {bands:['B8','B11','B4'], min:450, max:5000}, 'S2_' + dateStr, false);
    }
  }
  
  function movingAverage(values, windowSize) {
    var half = Math.floor(windowSize / 2);
    var result = [];
  
    for (var i = 0; i < values.length; i++) {
      var sum = 0;
      var count = 0;
  
      for (var j = -half; j <= half; j++) {
        var idx = i + j;
  
        if (idx >= 0 && idx < values.length) {
          var val = values[idx];
          if (val !== null && !isNaN(val)) {
            sum += val;
            count++;
          }
        }
      }
  
      result.push(count > 0 ? sum / count : null);
    }
  
    return result;
  }
  
  // ===============================
  // Block selection and buffering
  // ===============================
  var selectedBlock = blocks.filter(ee.Filter.eq('pol_id', blkID));
  print("Selected block " + blkID, selectedBlock);
  
  var bufferedPolygon = selectedBlock.map(bufferPolygon);
  
  // ===============================
  // Sentinel-2 collection with NDVI
  // ===============================
  var s2Collection = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
    .filterBounds(selectedBlock)
    .filterDate(startDate, endDate)
    .filterMetadata('CLOUDY_PIXEL_PERCENTAGE', 'less_than', cloudThreshold)
    .select(['B4','B8','B11'])
    .map(setDate)
    .map(calculateNDVI);
  
  // Example sample (define 'samples' as per your data)
  print('Sample polygons:', samples);
  
  // ===============================
  // Mean NDVI per image
  // ===============================
  function calculateMeanNDVI(image) {
    var ndvi = image.select('NDVI');
  
    var reducer = aggregation === "median"
      ? ee.Reducer.median()
      : ee.Reducer.mean();
  
    var result = ndvi.reduceRegion({
      reducer: reducer,
      geometry: samples.geometry().dissolve(),
      scale: 10,
      maxPixels: 1e13
    });
  
    return image.set('meanNDVI', result.get('NDVI'))
                .set('date', image.get('date'));
  }
  
  var s2WithMeanNDVI = s2Collection.map(calculateMeanNDVI);
  
  var ndviList = s2WithMeanNDVI.aggregate_array('meanNDVI');
  var dateList = s2WithMeanNDVI.aggregate_array('date');
  
  var ndviFeatures = ee.FeatureCollection(
    ee.List.sequence(0, ndviList.size().subtract(1)).map(function(i) {
      return ee.Feature(null, {
        'date': dateList.get(i),
        'meanNDVI': ndviList.get(i)
      });
    })
  );
  
  var filteredNDVI = ndviFeatures
    .filter(ee.Filter.notNull(['meanNDVI']));
  
  // ===============================
  // Function to filter FeatureCollection by months (Earth Engine native)
  // ===============================
  function filterByMonths(fc, months) {
    var datesList = fc.aggregate_array('date').getInfo();
    
    var filteredDates = datesList.filter(function(d) {
      var month = parseInt(d.split('-')[1], 10);
      return months.indexOf(month) !== -1;
    });
    
    return fc.filter(ee.Filter.inList('date', filteredDates));
  }
  
  // ===================================================
  // Function to generate chart and phenological metrics
  // ===================================================
  function generateChartAndPhenology(filteredNDVI, title) {
    filteredNDVI.aggregate_array('date').getInfo(function(dateArray) {
      filteredNDVI.aggregate_array('meanNDVI').getInfo(function(ndviArray) {
  
        function savitzkyGolay(y, windowSize) {
          var halfWindow = Math.floor(windowSize / 2);
          var result = [];
          for (var i = 0; i < y.length; i++) {
            var s = 0, count = 0;
            for (var j = -halfWindow; j <= halfWindow; j++) {
              var idx = i + j;
              if (idx >= 0 && idx < y.length) {
                s += y[idx];
                count++;
              }
            }
            result.push(s / count);
          }
          return result;
        }
  
        // Interpolation
        var interpolatedNDVI = linearInterpolation(dateArray, ndviArray);
        
        // Smoothing
        var smoothedNDVI;
  
        if (smoothing === "savgol") {
          smoothedNDVI = savitzkyGolay(interpolatedNDVI, 5);
        
        } else if (smoothing === "dma3") {
          smoothedNDVI = movingAverage(interpolatedNDVI, 3);
        
        } else if (smoothing === "dma5") {
          smoothedNDVI = movingAverage(interpolatedNDVI, 5);
        }
        function extractMetrics(dates, values) {
          var max = -Infinity, posIdx = 0;
          for (var i = 0; i < values.length; i++) {
            if (values[i] > max) { max = values[i]; posIdx = i; }
          }
  
          var sosIdx = 0;
          for (var i = 1; i < posIdx; i++) {
            if (values[i] - values[i - 1] > 0.01) { sosIdx = i - 1; break; }
          }
  
          var eosIdx = posIdx;
          var minAfterPos = values[posIdx];
          for (var i = posIdx + 1; i < values.length; i++) {
            if (values[i] < minAfterPos) { minAfterPos = values[i]; eosIdx = i; }
          }
  
          var amp = values[posIdx] - values[sosIdx];
          var dur = (new Date(dates[eosIdx]) - new Date(dates[sosIdx])) / (1000*60*60*24);
  
          return { SOS: sosIdx, POS: posIdx, EOS: eosIdx, AMP: amp, DUR: dur, MAX: max };
        }
  
        var metrics = extractMetrics(dateArray, smoothedNDVI);
  
        print(title + ' - Phenological Metrics:');
        print('SOS:', dateArray[metrics.SOS], smoothedNDVI[metrics.SOS]);
        print('POS:', dateArray[metrics.POS], smoothedNDVI[metrics.POS]);
        print('EOS:', dateArray[metrics.EOS], smoothedNDVI[metrics.EOS]);
        print('Amplitude:', metrics.AMP);
        print('Duration (days):', metrics.DUR);
        print('MAX NDVI:', metrics.MAX.toFixed(2));
  
        var metricsFeature = ee.Feature(null, {
          'SOS_date': dateArray[metrics.SOS],
          'POS_date': dateArray[metrics.POS],
          'EOS_date': dateArray[metrics.EOS],
          'SOS_ndvi': smoothedNDVI[metrics.SOS],
          'POS_ndvi': smoothedNDVI[metrics.POS],
          'EOS_ndvi': smoothedNDVI[metrics.EOS],
          'Amplitude': metrics.AMP,
          'Duration': metrics.DUR,
          'MAX_NDVI': metrics.MAX.toFixed(2)
        });
        
        var metricsFC = ee.FeatureCollection([metricsFeature]);
        
        // Use this script to export phenological metrics to drive
        Export.table.toDrive({
          collection: metricsFC,
          description: 'ndvi_metrics',
          folder: 'phenoCrops',
          fileFormat: 'CSV'
        });
  
        var baseDate = new Date(dateArray[0]);
        function daysSinceStart(dateStr) {
          return Math.round((new Date(dateStr) - baseDate) / (1000*60*60*24));
        }
  
        var chartData = [];
        for (var i = 0; i < dateArray.length; i++) {
          chartData.push({
            day: daysSinceStart(dateArray[i]),
            NDVI_original: ndviArray[i],
            NDVI_smoothed: smoothedNDVI[i],
            type: 'Original',
            date: dateArray[i]
          });
        }
        
        // ===============================
        // Exporting time series
        // ===============================
        var exportFC = ee.FeatureCollection(
          chartData.map(function(d) {
            return ee.Feature(null, {
              'date': d.date,
              'NDVI_original': d.NDVI_original,
              'NDVI_smoothed': d.NDVI_smoothed
            });
          })
        );
        
        // Use this script to export ndvi values to drive
        Export.table.toDrive({
          collection: exportFC,
          description: 'NDVI_series',
          folder: 'phenoCrops',
          fileFormat: 'CSV'
        });
  
        var phenologyPoints = [
          {day: daysSinceStart(dateArray[metrics.SOS]), NDVI: smoothedNDVI[metrics.SOS], type: 'SOS'},
          {day: daysSinceStart(dateArray[metrics.POS]), NDVI: smoothedNDVI[metrics.POS], type: 'POS'},
          {day: daysSinceStart(dateArray[metrics.EOS]), NDVI: smoothedNDVI[metrics.EOS], type: 'EOS'}
        ];
  
        var originalFC = ee.FeatureCollection(
          chartData.map(function(d) {
            return ee.Feature(null, {'day': d.day, 'NDVI': d.NDVI_original, 'type': 'Original'});
          })
        );
  
        var smoothedFC = ee.FeatureCollection(
          chartData.map(function(d) {
            return ee.Feature(null, {'day': d.day, 'NDVI': d.NDVI_smoothed, 'type': 'Smoothed'});
          })
        );
  
        var phenologyFC = ee.FeatureCollection(
          phenologyPoints.map(function(p) {
            return ee.Feature(null, {'day': p.day, 'NDVI': p.NDVI, 'type': p.type});
          })
        );
  
        var allFC = originalFC.merge(smoothedFC).merge(phenologyFC);
  
        
        var chart = ui.Chart.feature.groups(allFC, 'day', 'NDVI', 'type')
          .setChartType('LineChart')
          .setOptions({
            title: title + ' with Phenological Metrics (' + aggregation + ' and ' + smoothing + ')',
            hAxis: {title: 'Days since start', gridlines: {count: 10}},
            vAxis: {title: 'NDVI (' + aggregation + ')'},
            pointSize: 4,
            series: {
              0: { color: 'gray', pointShape: 'circle', lineWidth: 0 },   // Original
              1: { color: 'black', pointShape: 'circle', lineWidth: 1 },   // Smoothed
              2: { color: 'green', pointShape: 'circle', lineWidth: 3 },// SOS
              3: { color: 'purple', pointShape: 'circle', lineWidth: 3 },   // POS
              4: { color: 'orange', pointShape: 'circle', lineWidth: 3 } // EOS
            },
            legend: {position: 'bottom'}
          });
  
        print(chart);
      });
    });
  }
  
  // Generate charts
  generateChartAndPhenology(filteredNDVI, 'NDVI Time Series');
  
  // ===============================
  // Visualization
  // ===============================
  var visParams = {bands: ['B11', 'B8', 'B4'], min: 0, max: 3000, gamma: 1.3};
  
  s2Collection.aggregate_array('date').getInfo().slice(0, 10).forEach(function(dateStr) {
    var img = s2Collection.filter(ee.Filter.eq('date', dateStr)).mosaic().clip(selectedBlock);
    Map.addLayer(img, visParams, 'S2 ' + dateStr, false);
  });
  
  var emptyImage = ee.Image().byte();
  var pixelOutlines = emptyImage.paint({featureCollection: selectedBlock, width: 3});
  
  addSentinel2LayersToMap(startDate, endDate, bufferedPolygon, Nimages, cloudThreshold);
  
  Map.addLayer(pixelOutlines, {}, 'Selected Block');
  Map.centerObject(selectedBlock, 10);
  
  /*
  // ===============================
  // Export samples as shp (optional)
  // ===============================
  var mappingRegion = "Cerrado";
  var driveFolder = "MAPPING";
  var blkIDExport = "1063";
  
  var trainingSamples = samples.map(function(feat) {
    return feat.set({'_value': 2, 'block': blkIDExport});
  });
  
  Map.addLayer(trainingSamples, {color: 'green'}, 'Polygons for export');
  Map.centerObject(trainingSamples, 12);
  
  Export.table.toDrive({
    collection: trainingSamples,
    description: "Block_training_" + mappingRegion + "_B" + blkIDExport,
    folder: driveFolder,
    fileNamePrefix: "Block_training_" + mappingRegion + "_B" + blkIDExport,
    fileFormat: "SHP"
  });
  */
}
