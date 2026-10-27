// ===============================
// Initial parameters (teste)
// ===============================
// var blkID = "8571";
var blkID = "8346";

var startDate = '2021-05-01'; // Change
var endDate = '2021-12-01';  // Change
var Nimages = 50; 
var cloudThreshold = 10;

var aggregation = "median"; // Change --> "mean" ou "median"
var smoothing = "savgol"; // Change --> "savgol", "dma3", "dma5"

// ===============================
// Standardized parameters
// ===============================

// Outlier filtering
var filterOutliers = true;
var outlierWindow = 5;
var outlierThreshold = 0.12;

// Savitzky-Golay
var savgolWindow = 7;
var savgolPoly = 2;

// Phenological metrics
var minConsecutive = 2;
var positiveDerivThreshold = 0.002;
var negativeDerivThreshold = -0.002;

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
  
  function setDate(image) {
    return image
      .set(
        'date',
        ee.Date(image.get('system:time_start')).format('yyyy-MM-dd')
      )
      .set(
        'timestamp',
        image.get('system:time_start')
      );
  }
  
  var calculateNDVI = function(image) {
    var NDVI = image.normalizedDifference(['B8', 'B4']).rename('NDVI');
    return image.addBands(NDVI)
      .copyProperties(
        image,
        ['system:time_start', 'date', 'timestamp']
      );
  };
  
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
  
    return image
      .set('meanNDVI', result.get('NDVI'))
      .set('date', image.get('date'))
      .set('timestamp', image.get('system:time_start'));
  }
  
  // Sort the collection chronologically before extracting arrays
  var s2WithMeanNDVI = s2Collection
    .map(calculateMeanNDVI)
    .sort('system:time_start');
    
    // ===============================
    // Verify date-NDVI association
    // ===============================
    
    var dateNDVICheck = ee.FeatureCollection(
      s2WithMeanNDVI.map(function(image) {
    
        return ee.Feature(null, {
    
          'system_index':
            image.get('system:index'),
    
          'system_time_start':
            image.get('system:time_start'),
    
          'original_datetime':
            ee.Date(
              image.get('system:time_start')
            ).format('yyyy-MM-dd HH:mm:ss'),
    
          'assigned_date':
            image.get('date'),
    
          'NDVI':
            image.get('meanNDVI'),
    
          'cloud':
            image.get('CLOUDY_PIXEL_PERCENTAGE')
        });
    
      })
    );
    
    print(
      'DATE x NDVI CHECK:',
      dateNDVICheck
    );
  
  // Check the actual Sentinel-2 acquisition dates
  var checkDates = s2WithMeanNDVI
    .sort('system:time_start')
    .map(function(image) {
      return ee.Feature(null, {
        'system_time_start': image.get('system:time_start'),
        'sentinel_date': ee.Date(
          image.get('system:time_start')
        ).format('yyyy-MM-dd HH:mm:ss'),
        'meanNDVI': image.get('meanNDVI')
      });
    });
  
  print('SENTINEL-2 DATES AND NDVI:', checkDates);
  
  // ===============================
  // Build NDVI features directly
  // ===============================
  
  // Remove images without valid NDVI before creating the arrays
  var validS2WithMeanNDVI = s2WithMeanNDVI
    .filter(ee.Filter.notNull([
      'meanNDVI',
      'date',
      'system:time_start'
    ]))
    .sort('system:time_start');
  
  
  // ===============================
  // Select only ONE valid image per date
  // ===============================
  
  // Get all unique dates with valid NDVI
  var uniqueValidDates = ee.List(
    validS2WithMeanNDVI.aggregate_array('date')
  )
  .distinct()
  .sort();
  
  var ndviFeatures = ee.FeatureCollection(
    uniqueValidDates.map(function(date) {
  
      var dailyCollection = validS2WithMeanNDVI
        .filter(ee.Filter.eq('date', date));
  
      var dailyMeanNDVI = dailyCollection
        .aggregate_mean('meanNDVI');
  
      // Timestamp da data de aquisição
      var firstImage = ee.Image(
        dailyCollection.sort('system:time_start').first()
      );
  
      return ee.Feature(null, {
        'date': date,
        'timestamp': firstImage.get('system:time_start'),
        'meanNDVI': dailyMeanNDVI,
        'n_images': dailyCollection.size()
      });
    })
  );

var filteredNDVI = ndviFeatures
  .filter(ee.Filter.notNull(['meanNDVI']))
  .sort('timestamp');

print('DAILY MEAN - QGIS STANDARD:', filteredNDVI);
print('Number of dates:', filteredNDVI.size());
  
  // Ensure chronological order
  var filteredNDVI =
    ndviFeatures.sort('timestamp');
  
  
  // Diagnostic
  print(
    'ONE IMAGE PER DATE:',
    filteredNDVI
  );
  
  print(
    'Number of dates:',
    filteredNDVI.size()
  );
  
  
  // ===============================
  // Check input series
  // ===============================
  
  print(
    'Original Sentinel-2 images:',
    s2WithMeanNDVI.size()
  );
  
  print(
    'Valid NDVI observations:',
    filteredNDVI.size()
  );
  
  print(
    'First input date:',
    filteredNDVI.first().get('date')
  );
  
  print(
    'Last input date:',
    filteredNDVI
      .sort('timestamp', false)
      .first()
      .get('date')
  );
  
  // Ensure chronological order before sending data to the client
  filteredNDVI = filteredNDVI.sort('timestamp');
  
  print(
    'First input date:',
    filteredNDVI.first().get('date')
  );
  
  print(
    'Last input date:',
    filteredNDVI
      .sort('timestamp', false)
      .first()
      .get('date')
  );
  
  print(
    'Number of input observations:',
    filteredNDVI.size()
  );
  
// ===================================================
  // Function to generate chart and phenological metrics
  // ===================================================
  function generateChartAndPhenology(filteredNDVI, title) {
    filteredNDVI.aggregate_array('date').getInfo(function(dateArray) {
      filteredNDVI.aggregate_array('meanNDVI').getInfo(function(ndviArray) {
  
        // ===============================
        // Remove invalid observations
        // BEFORE smoothing
        // ===============================
        
        var validDates = [];
        var validNDVI = [];
        
        var safeLength = Math.min(
          dateArray.length,
          ndviArray.length
        );
        
        for (var i = 0; i < safeLength; i++) {
        
          var currentDate = dateArray[i];
          var currentValue = ndviArray[i];
        
          if (
            currentDate !== undefined &&
            currentDate !== null &&
            currentValue !== undefined &&
            currentValue !== null &&
            isFinite(Number(currentValue))
          ) {
        
            validDates.push(currentDate);
            validNDVI.push(Number(currentValue));
          }
        }
        
        
        // ===============================
        // Group observations by date
        // ===============================
        
        var groupedByDate = {};
        
        for (var i = 0; i < validDates.length; i++) {
        
          var date = validDates[i];
          var value = validNDVI[i];
        
          if (!groupedByDate[date]) {
            groupedByDate[date] = [];
          }
        
          groupedByDate[date].push(value);
        }
        
        
        // Sort dates chronologically
        var uniqueDates = Object.keys(groupedByDate).sort();
        
        var groupedDates = [];
        var groupedNDVI = [];
        
        for (var i = 0; i < uniqueDates.length; i++) {
        
          var date = uniqueDates[i];
          var values = groupedByDate[date];
        
          var sum = 0;
        
          for (var j = 0; j < values.length; j++) {
            sum += values[j];
          }
        
          var meanValue = sum / values.length;
        
          groupedDates.push(date);
          groupedNDVI.push(meanValue);
        }
        
        
        // Replace original arrays with daily grouped series
        dateArray = groupedDates;
        ndviArray = groupedNDVI;
        
        
        // ===============================
        // Standardized outlier filtering
        // ===============================
        
        if (filterOutliers) {
        
          var filteredDates = [];
          var filteredValues = [];
        
          var halfOutlierWindow = Math.floor(outlierWindow / 2);
        
          for (var i = 0; i < ndviArray.length; i++) {
        
            var start = Math.max(0, i - halfOutlierWindow);
            var end = Math.min(ndviArray.length, i + halfOutlierWindow + 1);
        
            var localValues = [];
        
            for (var j = start; j < end; j++) {
              if (ndviArray[j] !== null && !isNaN(ndviArray[j])) {
                localValues.push(ndviArray[j]);
              }
            }
        
            // Same minimum number of observations used in Pandas
            if (localValues.length < 3) {
              filteredDates.push(dateArray[i]);
              filteredValues.push(ndviArray[i]);
              continue;
            }
        
            localValues.sort(function(a, b) {
              return a - b;
            });
        
            var middle = Math.floor(localValues.length / 2);
            var localMedian;
        
            if (localValues.length % 2 === 0) {
              localMedian =
                (localValues[middle - 1] + localValues[middle]) / 2;
            } else {
              localMedian = localValues[middle];
            }
        
            var difference = Math.abs(
              ndviArray[i] - localMedian
            );
        
            if (difference <= outlierThreshold) {
        
              filteredDates.push(dateArray[i]);
              filteredValues.push(ndviArray[i]);
        
            } else {
        
              print(
                "Outlier removed:",
                dateArray[i],
                "NDVI:",
                ndviArray[i],
                "Local median:",
                localMedian,
                "Difference:",
                difference
              );
            }
          }
        
          dateArray = filteredDates;
          ndviArray = filteredValues;
        }
        
        
        var smoothedNDVI = [];

      // ===============================
      // 1. Standardized smoothing
      // ===============================
      
      if (smoothing === "savgol") {
      
        // Equivalent to scipy.signal.savgol_filter(
        //   ndviArray,
        //   window_length = 7,
        //   polyorder = 2,
        //   mode = 'interp'
        // )
      
        if (savgolWindow !== 7 || savgolPoly !== 2) {
          throw new Error(
            "Current SavGol implementation requires window=7 and poly=2."
          );
        }
      
        if (ndviArray.length < 7) {
          throw new Error(
            "SavGol window=7 requires at least 7 observations."
          );
        }
      
        smoothedNDVI = new Array(ndviArray.length);
      
      
        // ==========================================
        // Helper: quadratic least-squares fit
        // for x = 0,1,2,3,4,5,6
        // ==========================================
      
        function quadraticFit7(values) {
      
          var Sy = 0;
          var Sxy = 0;
          var Sx2y = 0;
      
          for (var k = 0; k < 7; k++) {
      
            var y = Number(values[k]);
      
            Sy += y;
            Sxy += k * y;
            Sx2y += k * k * y;
          }
      
      
          var A = [
            [7, 21, 91, Sy],
            [21, 91, 441, Sxy],
            [91, 441, 2275, Sx2y]
          ];
      
      
          // Gaussian elimination
          for (var col = 0; col < 3; col++) {
      
            var pivotRow = col;
      
            for (var row = col + 1; row < 3; row++) {
      
              if (
                Math.abs(A[row][col]) >
                Math.abs(A[pivotRow][col])
              ) {
                pivotRow = row;
              }
            }
      
      
            var temp = A[col];
            A[col] = A[pivotRow];
            A[pivotRow] = temp;
      
      
            var pivot = A[col][col];
      
            for (var j = col; j < 4; j++) {
              A[col][j] /= pivot;
            }
      
      
            for (var row = 0; row < 3; row++) {
      
              if (row === col) {
                continue;
              }
      
              var factor = A[row][col];
      
              for (var j = col; j < 4; j++) {
                A[row][j] -= factor * A[col][j];
              }
            }
          }
      
      
          return [
            A[0][3],
            A[1][3],
            A[2][3]
          ];
        }
      
      
        function quadraticValue(coeffs, x) {
      
          return (
            coeffs[0] +
            coeffs[1] * x +
            coeffs[2] * x * x
          );
        }
      
      
        // ==========================================
        // INTERIOR
        // SavGol window=7, poly=2
        //
        // coefficients:
        // [-2, 3, 6, 7, 6, 3, -2] / 21
        // ==========================================
      
        for (
          var i = 3;
          i < ndviArray.length - 3;
          i++
        ) {
      
          smoothedNDVI[i] =
            (
              -2 * ndviArray[i - 3] +
               3 * ndviArray[i - 2] +
               6 * ndviArray[i - 1] +
               7 * ndviArray[i] +
               6 * ndviArray[i + 1] +
               3 * ndviArray[i + 2] -
               2 * ndviArray[i + 3]
            ) / 21;
        }
      
      
        // ==========================================
        // LEFT EDGE
        // scipy mode='interp'
        // ==========================================
      
        var leftValues =
          ndviArray.slice(0, 7);
      
        var leftCoeffs =
          quadraticFit7(leftValues);
      
      
        smoothedNDVI[0] =
          quadraticValue(leftCoeffs, 0);
      
        smoothedNDVI[1] =
          quadraticValue(leftCoeffs, 1);
      
        smoothedNDVI[2] =
          quadraticValue(leftCoeffs, 2);
      
      
        // ==========================================
        // RIGHT EDGE
        // scipy mode='interp'
        // ==========================================
      
        var rightStart =
          ndviArray.length - 7;
      
        var rightValues =
          ndviArray.slice(rightStart);
      
        var rightCoeffs =
          quadraticFit7(rightValues);
      
      
        smoothedNDVI[ndviArray.length - 3] =
          quadraticValue(rightCoeffs, 4);
      
        smoothedNDVI[ndviArray.length - 2] =
          quadraticValue(rightCoeffs, 5);
      
        smoothedNDVI[ndviArray.length - 1] =
          quadraticValue(rightCoeffs, 6);
      
      
      } else if (smoothing === "dma3") {
      
        smoothedNDVI =
          movingAverage(ndviArray, 3);
      
      } else if (smoothing === "dma5") {
      
        smoothedNDVI =
          movingAverage(ndviArray, 5);
      }
      


        // 2. Extração de Métricas Padronizada (Derivada Temporal Real)
        function extractMetrics(dates, values) {
          var n = values.length;
          if (n < 5) return null;

          // Converter datas para contagem real de dias corridos
          var baseMetricTime =
            Date.parse(dates[0] + 'T00:00:00Z');
          
          var days = dates.map(function(d) {
          
            var currentMetricTime =
              Date.parse(d + 'T00:00:00Z');
          
            return (
              currentMetricTime - baseMetricTime
            ) / (1000 * 60 * 60 * 24);
          });

          // Real temporal derivative equivalent to numpy.gradient
          // for irregular temporal spacing
          var derivative = [];
          
          for (var i = 0; i < n; i++) {
          
            if (i === 0) {
          
              derivative.push(
                (values[1] - values[0]) /
                (days[1] - days[0])
              );
          
            } else if (i === n - 1) {
          
              derivative.push(
                (values[n - 1] - values[n - 2]) /
                (days[n - 1] - days[n - 2])
              );
          
            } else {
          
              var h1 = days[i] - days[i - 1];
              var h2 = days[i + 1] - days[i];
          
              var a = -h2 / (h1 * (h1 + h2));
              var b = (h2 - h1) / (h1 * h2);
              var c = h1 / (h2 * (h1 + h2));
          
              derivative.push(
                a * values[i - 1] +
                b * values[i] +
                c * values[i + 1]
              );
            }
          }

          // A. POS (Pico global na série suavizada)
          var maxVal = -Infinity;
          var posIdx = 0;
          for (var i = 0; i < n; i++) {
            if (values[i] > maxVal) {
              maxVal = values[i];
              posIdx = i;
            }
          }

          // B. SOS (First point of sustained pre-peak growth)
          var sosIdx = null;
          var consecutiveGrowth = 0;
          
          for (var i = 0; i < posIdx; i++) {
          
            if (derivative[i] > positiveDerivThreshold) {
          
              consecutiveGrowth++;
          
              if (consecutiveGrowth >= minConsecutive) {
          
                // First point of sustained growth
                sosIdx = Math.max(
                  0,
                  i - minConsecutive + 1
                );
          
                break;
              }
          
            } else {
          
              consecutiveGrowth = 0;
            }
          }

          if (sosIdx === null) {
            var minPre = values[0];
            sosIdx = 0;
            for (var i = 0; i < posIdx; i++) {
              if (values[i] < minPre) {
                minPre = values[i];
                sosIdx = i;
              }
            }
          }

          // C. EOS (Pós-pico: queda < -0.002 até estabilização com derivada >= 0)
          var eosIdx = null;
          var consecutiveDecline = 0;
          var foundDecline = false;
          for (var i = posIdx; i < n; i++) {
            if (derivative[i] < negativeDerivThreshold) {
              consecutiveDecline++;
            
              if (consecutiveDecline >= minConsecutive) {
                foundDecline = true;
              }
            }
            if (foundDecline && derivative[i] >= 0) {
              eosIdx = i;
              break;
            }
          }

          if (eosIdx === null) {
            var minPost = values[posIdx];
            eosIdx = posIdx;
            for (var i = posIdx; i < n; i++) {
              if (values[i] <= minPost) {
                minPost = values[i];
                eosIdx = i;
              }
            }
          }

          var amp = values[posIdx] - values[sosIdx];
          var dur = Math.round(days[eosIdx] - days[sosIdx]);

          return {
            SOS: sosIdx,
            POS: posIdx,
            EOS: eosIdx,
            AMP: amp,
            DUR: dur,
            MAX: maxVal
          };
        }
  
        var metrics = extractMetrics(dateArray, smoothedNDVI);
        if (!metrics) {
          print("Unable to extract metrics: time series too short.");
          return;
        }
  
        print(title + ' - Phenological Metrics:');
        print('SOS:', dateArray[metrics.SOS], smoothedNDVI[metrics.SOS].toFixed(4));
        print('POS:', dateArray[metrics.POS], smoothedNDVI[metrics.POS].toFixed(4));
        print('EOS:', dateArray[metrics.EOS], smoothedNDVI[metrics.EOS].toFixed(4));
        print('Amplitude:', metrics.AMP.toFixed(4));
        print('Duration (days):', metrics.DUR);
        print('MAX NDVI:', metrics.MAX.toFixed(4));
  
        var metricsFeature = ee.Feature(null, {
          'SOS_date': dateArray[metrics.SOS],
          'POS_date': dateArray[metrics.POS],
          'EOS_date': dateArray[metrics.EOS],
          'SOS_ndvi': smoothedNDVI[metrics.SOS],
          'POS_ndvi': smoothedNDVI[metrics.POS],
          'EOS_ndvi': smoothedNDVI[metrics.EOS],
          'Amplitude': metrics.AMP,
          'Duration': metrics.DUR,
          'MAX_NDVI': metrics.MAX
        });
        
        var metricsFC = ee.FeatureCollection([metricsFeature]);

        Export.table.toDrive({
          collection: metricsFC,
          description: 'ndvi_metrics',
          folder: 'phenoCrops',
          fileFormat: 'CSV'
        });
  
        var chartData = [];
        
        // Build chart data using numeric timestamps
        for (var i = 0; i < dateArray.length; i++) {
        
          var timestamp =
            Date.parse(dateArray[i] + 'T00:00:00Z');
        
          chartData.push({
            time: timestamp,
            date: dateArray[i],
            NDVI_original: ndviArray[i],
            NDVI_smoothed: smoothedNDVI[i]
          });
        }
        
        
        // ===============================
        // Export NDVI time series
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
        
        Export.table.toDrive({
          collection: exportFC,
          description: 'NDVI_series',
          folder: 'phenoCrops',
          fileFormat: 'CSV'
        });
        
        
        // ===============================
        // Build chart with phenological metrics
        // ===============================
        
        // Create numeric series
        var xValues = [];
        var originalValues = [];
        var smoothedValues = [];
        var sosValues = [];
        var posValues = [];
        var eosValues = [];
        
        for (var i = 0; i < dateArray.length; i++) {
        
          xValues.push(i);
          originalValues.push(Number(ndviArray[i]));
          smoothedValues.push(Number(smoothedNDVI[i]));
        
          // Use the smoothed curve as a hidden baseline.
          // Only the phenological position will be highlighted later.
          sosValues.push(Number(smoothedNDVI[i]));
          posValues.push(Number(smoothedNDVI[i]));
          eosValues.push(Number(smoothedNDVI[i]));
        }
        
        
        // ===============================
        // Build explicit date ticks
        // ===============================
        
        var ticks = [];
        var numberOfTicks = 8;
        
        var tickStep = Math.max(
          1,
          Math.floor(
            (dateArray.length - 1) /
            (numberOfTicks - 1)
          )
        );
        
        for (
          var i = 0;
          i < dateArray.length;
          i += tickStep
        ) {
        
          var parts = dateArray[i].split('-');
        
          ticks.push({
            v: i,
            f:
              parts[2] + '/' +
              parts[1] + '/' +
              parts[0]
          });
        }
        
        
        // Always include the last date
        var lastIndex = dateArray.length - 1;
        
        if (
          ticks.length === 0 ||
          ticks[ticks.length - 1].v !== lastIndex
        ) {
        
          var lastParts =
            dateArray[lastIndex].split('-');
        
          ticks.push({
            v: lastIndex,
            f:
              lastParts[2] + '/' +
              lastParts[1] + '/' +
              lastParts[0]
          });
        }
        
        
        // ===============================
        // Create main chart features
        // ===============================
        
        var chartFeatures = [];
        
        for (var i = 0; i < dateArray.length; i++) {
        
          chartFeatures.push(
            ee.Feature(null, {
              'x': i,
              'Original': Number(ndviArray[i]),
              'Smoothed': Number(smoothedNDVI[i])
            })
          );
        }
        
        var chartFC = ee.FeatureCollection(chartFeatures);
        
        
        // ===============================
        // Chart data
        // ===============================
        
        var chartFeatures = [];
        
        // Original NDVI
        for (var i = 0; i < dateArray.length; i++) {
        
          chartFeatures.push(
            ee.Feature(null, {
              'x': i,
              'NDVI': Number(ndviArray[i]),
              'series': 'Real NDVI'
            })
          );
        }
        
        // Smoothed NDVI
        for (var i = 0; i < dateArray.length; i++) {
        
          chartFeatures.push(
            ee.Feature(null, {
              'x': i,
              'NDVI': Number(smoothedNDVI[i]),
              'series': 'Smoothed'
            })
          );
        }
        
        
        // ===============================
        // Phenological points
        // ===============================
        
        chartFeatures.push(
          ee.Feature(null, {
            'x': metrics.SOS,
            'NDVI': Number(smoothedNDVI[metrics.SOS]),
            'series': 'SOS'
          })
        );
        
        chartFeatures.push(
          ee.Feature(null, {
            'x': metrics.POS,
            'NDVI': Number(smoothedNDVI[metrics.POS]),
            'series': 'POS'
          })
        );
        
        chartFeatures.push(
          ee.Feature(null, {
            'x': metrics.EOS,
            'NDVI': Number(smoothedNDVI[metrics.EOS]),
            'series': 'EOS'
          })
        );
        
        var chartFC = ee.FeatureCollection(chartFeatures);
        
        
        // ===============================
        // BUILD CHART USING REAL TIMESTAMPS
        // ===============================
        
        var chartFeatures = [];
        
        for (var i = 0; i < dateArray.length; i++) {
        
          var timestamp = Date.parse(
            dateArray[i] + 'T00:00:00Z'
          );
        
          // Original NDVI
          chartFeatures.push(
            ee.Feature(null, {
              'time': timestamp,
              'NDVI': Number(ndviArray[i]),
              'series': 'Real NDVI'
            })
          );
        
          // Smoothed NDVI
          chartFeatures.push(
            ee.Feature(null, {
              'time': timestamp,
              'NDVI': Number(smoothedNDVI[i]),
              'series': 'Smoothed'
            })
          );
        }
        
        
        // SOS
        chartFeatures.push(
          ee.Feature(null, {
            'time': Date.parse(
              dateArray[metrics.SOS] + 'T00:00:00Z'
            ),
            'NDVI': Number(smoothedNDVI[metrics.SOS]),
            'series': 'SOS'
          })
        );
        
        
        // POS
        chartFeatures.push(
          ee.Feature(null, {
            'time': Date.parse(
              dateArray[metrics.POS] + 'T00:00:00Z'
            ),
            'NDVI': Number(smoothedNDVI[metrics.POS]),
            'series': 'POS'
          })
        );
        
        
        // EOS
        chartFeatures.push(
          ee.Feature(null, {
            'time': Date.parse(
              dateArray[metrics.EOS] + 'T00:00:00Z'
            ),
            'NDVI': Number(smoothedNDVI[metrics.EOS]),
            'series': 'EOS'
          })
        );
        
        
        var chartFC = ee.FeatureCollection(chartFeatures);
        
        
        var chart = ui.Chart.feature.groups(
          chartFC,
          'time',
          'NDVI',
          'series'
        )
        .setChartType('LineChart')
        .setOptions({
        
          title:
            title +
            ' (' +
            aggregation +
            ' and ' +
            smoothing +
            ')',
        
          hAxis: {
            title: 'Date',
            format: 'dd/MM/yyyy',
            slantedText: true,
            slantedTextAngle: 45
          },
        
          vAxis: {
            title: 'NDVI (' + aggregation + ')',
            viewWindow: {
              min: 0,
              max: 1
            }
          },
        
          pointSize: 0,
        
          series: {
        
            0: {
              color: 'black',
              lineWidth: 0,
              pointSize: 4
            },
        
            1: {
              color: 'gray',
              lineWidth: 2,
              pointSize: 0
            },
        
            2: {
              color: 'yellow',
              lineWidth: 0,
              pointSize: 7
            },
        
            3: {
              color: 'green',
              lineWidth: 0,
              pointSize: 7
            },
        
            4: {
              color: 'purple',
              lineWidth: 0,
              pointSize: 7
            }
          },
        
          legend: {
            position: 'bottom'
          }
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
  
  Export.table.toDrive({
  collection: samples,
  description: 'GEE_drawn_sample',
  folder: 'phenoCrops',
  fileNamePrefix: 'GEE_drawn_sample',
  fileFormat: 'SHP'
});
}
