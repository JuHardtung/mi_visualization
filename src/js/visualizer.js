var WIDTH = 1000;
var HEIGHT = 500;
var MARGIN = 25;
var START_YEAR = 1999;
var END_YEAR = 2002;
var NEW_MAP_SCALE;

var EQ_SCALE;

//define projection and path generator
var projection = d3.geoEquirectangular().translate([WIDTH / 2, HEIGHT / 2]);
var path = d3.geoPath().projection(projection);

//define the changes when panning/zooming
var zooming = function (event) {
  var offset = [event.transform.x, event.transform.y];
  NEW_MAP_SCALE = event.transform.k * 2000;

  projection.translate(offset).scale(NEW_MAP_SCALE);

  //update all country/ocean paths
  svg.selectAll("path").attr("d", path);

  //update earthquake circles
  svg
    .selectAll("circle")
    .attr("cx", (d) => projection([d.Longitude, d.Latitude])[0])
    .attr("cy", (d) => projection([d.Longitude, d.Latitude])[1]);

  //update tecPlates
  renderTecPlates();
  svg
    .selectAll("text")
    .attr("x", (d) => path.centroid(d)[0] - d.properties.PlateName.length * 5)
    .attr("y", (d) => path.centroid(d)[1]);
};

//define zoom behaviour
var zoom = d3
  .zoom()
  .scaleExtent([0.0793, 1])
  .translateExtent([
    [-6300, -3145],
    [6300, 3145],
  ])
  .on("zoom", zooming);

//create elements in DOM
var svg = d3.select("svg").attr("width", WIDTH).attr("height", HEIGHT);
var map = svg
  .append("g")
  .attr("id", "map")
  .call(zoom)
  .call(zoom.transform, d3.zoomIdentity.translate(WIDTH / 2, HEIGHT / 2).scale(0.0793));

//worldmap with earthquakes + storm data
var oceans = map.append("g").attr("id", "oceans");
var countries = map.append("g").attr("id", "countries");
var tecPlates = map.append("g").attr("id", "tectonicPlates");
var eq = map.append("g").attr("id", "earthquakes");

//chart for displaying yearly earthquakes
d3.select("#yearlyEqContainer")
  .attr("width", WIDTH)
  .attr("height", HEIGHT / 2);

var yearlyEqSvg = d3
  .select("#yearlyEqChart")
  .attr("width", WIDTH)
  .attr("height", HEIGHT / 2);

//init rangeSlider for filtering yearly earthquakes
//default range -> 1999-2002
var slider = createD3RangeSlider(1970, 2014, "#yearlyEqContainer");
slider.range(START_YEAR, END_YEAR);

//define xScale
var xScale = d3.scaleBand().range([MARGIN, WIDTH - 15]);

//define yScale
var yScale = d3.scaleLinear().range([HEIGHT / 2 - MARGIN, 5]);

//load .geojson-files of countries
d3.json("./../data/ne_110m_admin_0_countries.geojson").then(function (countriesJSON) {
  d3.json("./../data/earthquakes_1970-2014.json").then(function (earthquakes) {
    //Oceans background rectangle
    oceans
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", WIDTH)
      .attr("height", HEIGHT)
      .style("fill", "steelblue");

    //Country paths
    countries
      .selectAll("path")
      .data(countriesJSON.features)
      .enter()
      .append("path")
      .attr("d", path)
      .style("fill", "white") //alternative light grey #e6e8eb
      .style("stroke", "darkgrey")
      .style("stroke-width", "1px");

    //render tectonic plate borders
    renderTecPlates();

    // New select element for allowing the user to select a group!
    var filteredEqData = getFilteredEqData(earthquakes, START_YEAR, END_YEAR);

    //enter initial circles filtered by default year range
    enterEqCircles(filteredEqData);

    //render the yearly earthquakes chart
    renderYearlyEarthquakes(earthquakes);

    //onChange listener for the range slider
    slider.onChange(function (newRange) {
      var filteredData = getFilteredYearlyEqData(earthquakes);
      var groupData = getFilteredEqData(filteredData, newRange.begin, newRange.end);

      updateEqCircles(groupData);
      enterEqCircles(groupData);
      exitEqCircles(groupData);
    });

    var magnFilter = document.querySelector("#magnitudeFilter");

    //onChange listener for the magnitude filter
    magnFilter.addEventListener("change", function (event) {
      var filteredData = getFilteredYearlyEqData(earthquakes);
      var yearlyEq = countYearlyEqs(filteredData);
      var parseTime = d3.timeParse("%Y");

      //parse years from Int to Time
      yearlyEq.forEach(function (d) {
        d.year = parseTime(d.year);
      });

      var stack = d3.stack().keys(["one", "two", "three", "four"]);
      var filteredSeries = stack(yearlyEq);

      //update yScale
      yScale.domain([0, d3.max(yearlyEq, (d) => d.one + d.two + d.three + d.four + 5)]);

      //update Y axis
      yearlyEqSvg
        .select(".yAxis")
        .transition()
        .call(d3.axisLeft(yScale).ticks(5).tickSizeOuter(0));


      updateYearlyEqBars(filteredSeries);
      enterYearlyEqBars(filteredSeries);
      exitYearlyEqBars(filteredSeries);


      var groupData = getFilteredEqData(
        filteredData,
        slider.range().begin,
        slider.range().end
      );

      updateEqCircles(groupData);
      enterEqCircles(groupData);
      exitEqCircles(groupData);
    });

    //Trendline for yearly earthquakes
    var trendlineCB = document.querySelector("#renderTrendline");

    //onChange listener for the trendline checkbox
    trendlineCB.addEventListener("change", function (event) {
      var filteredData = getFilteredYearlyEqData(earthquakes);
      var yearlyEq = countYearlyEqs(filteredData);
      var stack = d3.stack().keys(["one", "two", "three", "four"]);
      var filteredSeries = stack(yearlyEq);

      renderTrendline(filteredSeries);
    });
  });
});

//enter earthquake circles
function enterEqCircles(data) {
  //set radius domain for earthquake circles
  EQ_SCALE = d3
    .scalePow()
    .domain([d3.min(data, (d) => d.Magnitude), d3.max(data, (d) => d.Magnitude)])
    .range([5, 10]);

  //add earthquake circles to DOM
  eq.selectAll("circle")
    .data(data)
    .enter()
    .append("circle")
    .attr("magnitude", (d) => d.Magnitude)
    .attr("lat", (d) => d.Latitude)
    .attr("long", (d) => d.Longitude)
    .attr("cx", (d) => projection([d.Longitude, d.Latitude])[0])
    .attr("cy", (d) => projection([d.Longitude, d.Latitude])[1])
    .attr("r", (d) => EQ_SCALE(d.Magnitude))
    .attr("fill", function (d) {
      return getMagnitudeColor(d.Magnitude);
    })
    .on("mouseover", function (event, d) {
      //get information for tooltip
      var magnitude = d3.select(this).attr("magnitude");
      var latitude = Math.round(d3.select(this).attr("lat") * 100, 2) / 100;
      var longitude = Math.round(d3.select(this).attr("long") * 100, 2) / 100;

      //get x and y of mouse for tooltip
      var mx = parseInt(event.x);
      var my = parseInt(event.y);

      //setup earthquake tooltip
      d3.select("#earthquakeTooltip")
        .style("left", mx + 10 + "px")
        .style("top", my + 10 + "px")
        .select("#magnitude")
        .text(magnitude);

      //set earthquake tooltip data
      d3.select("#earthquakeTooltip").select("#magnitude").text(magnitude);
      d3.select("#earthquakeTooltip").select("#latitude").text(latitude);
      d3.select("#earthquakeTooltip").select("#longitude").text(longitude);
      d3.select("#earthquakeTooltip").classed("hidden", false);

      //resize earthquake circle
      d3.select(this)
        .transition()
        .attr("r", (d) => EQ_SCALE(d.Magnitude) + 5);
    })
    .on("mouseout", function (d) {
      //resize earthquake circle
      d3.select(this)
        .transition()
        .attr("r", (d) => EQ_SCALE(d.Magnitude));

      //hide tooltip
      d3.select("#earthquakeTooltip").classed("hidden", true);
    });
}

//remove circles without data bound to them
function exitEqCircles(data) {
  eq.selectAll("circle").data(data).exit().remove();
}

//update and transition earthquake circles after data updates
function updateEqCircles(data) {

  svg
    .selectAll("circle")
    .data(data)
    .transition()
    .attr("magnitude", (d) => d.Magnitude)
    .attr("lat", (d) => d.Latitude)
    .attr("long", (d) => d.Longitude)
    .attr("cx", (d) => projection([d.Longitude, d.Latitude])[0])
    .attr("cy", (d) => projection([d.Longitude, d.Latitude])[1])
    .attr("r", (d) => EQ_SCALE(d.Magnitude))
    .attr("fill", function (d) {      
      return getMagnitudeColor(d.Magnitude);
    });
}

//render the chart of yearly earthquakes
function renderYearlyEarthquakes(earthquakes) {
  var filteredData = getFilteredYearlyEqData(earthquakes);
  var yearlyEq = countYearlyEqs(filteredData);
  var parseTime = d3.timeParse("%Y");

  //parse years from Int to Time
  yearlyEq.forEach(function (d) {
    d.year = parseTime(d.year);
  });

  //define xScale
  xScale.domain(d3.range(yearlyEq.length));

  //define yScale
  yScale.domain([0, d3.max(yearlyEq, (d) => d.one + d.two + d.three + d.four + 5)]);

  var stack = d3.stack().keys(["one", "two", "three", "four"]);
  var series = stack(yearlyEq);

  enterYearlyEqBars(series);

  //create X axis
  yearlyEqSvg
    .append("g")
    .attr("class", "xAxis")
    .attr("transform", `translate(0,${HEIGHT / 2 - MARGIN})`)
    .call(
      d3.axisBottom(xScale)
      .tickSizeOuter(0)
      .tickFormat(function (d) {
        if (d % 5 == 0) {
          return d + 1970;
        }
      })
    );

  //create Y axis
  yearlyEqSvg
    .append("g")
    .attr("class", "yAxis")
    .attr("transform", "translate(" + MARGIN + ",0)")
    .call(d3.axisLeft(yScale).ticks(5).tickSizeOuter(0));

  //offset for ticks so they don't get obstructed by range slider
  yearlyEqSvg.select(".xAxis").selectAll(".tick line").attr("y2", 13);
  yearlyEqSvg.select(".xAxis").selectAll(".tick text").attr("y", 15);
}

function enterYearlyEqBars(series) {
  // Add a group for each row of data
  var bars = yearlyEqSvg
    .selectAll("g")
    .data(series)
    .enter()
    .append("g")
    .attr("class", "bars")
    .style("fill", function (d, i) {
      if (i == 0) {
        return "#fdfa26";
      } else if (i == 1) {
        return "#ff9e00";
      } else if (i == 2) {
        return "#ff0000";
      } else if (i == 3) {
        return "#380000";
      }
    });

  //display the yearly amount of earthquakes
  bars
    .selectAll("rect")
    .data((d) => d)
    .enter()
    .append("rect")
    .attr("class", function (d) {
      return "eq" + d.data.year.getFullYear();
    })
    .attr("count", (d) => d[1] - d[0])
    .attr("x", function (d, i) {
      return xScale(i) + 7;
    })
    .attr("y", function (d) {
      return yScale(d[1]);
    })
    .attr("width", 8)
    .attr("height", function (d) {
      return yScale(d[0]) - yScale(d[1]);
    })
    .on("mouseover", function (event, d) {

      //get information for tooltip
      var year = d3.select(this).attr("class");

      var barCategories = document.getElementsByClassName(year);
      var eqCat1 = barCategories[0].attributes[1].value;
      var eqCat2 = barCategories[1].attributes[1].value;
      var eqCat3 = barCategories[2].attributes[1].value;
      var eqCat4 = barCategories[3].attributes[1].value;

      //get x and y of mouse for tooltip
      var mx = parseInt(event.clientX);
      var my = parseInt(event.screenY);

      //setup earthquake tooltip
      d3.select("#yearlyEqTooltip")
        .style("left", mx + 10 + "px")
        .style("top", my + "px")
        .select("#eqYear")
        .text(year.substring(2, 6));

      //set earthquake tooltip data
      d3.select("#yearlyEqTooltip").select("#eqCat1").text(eqCat1);
      d3.select("#yearlyEqTooltip").select("#eqCat2").text(eqCat2);
      d3.select("#yearlyEqTooltip").select("#eqCat3").text(eqCat3);
      d3.select("#yearlyEqTooltip").select("#eqCat4").text(eqCat4);
      d3.select("#yearlyEqTooltip").classed("hidden", false);

      //resize earthquake bar
      d3.select("#yearlyEqChart")
        .selectAll("." + year)
        .transition()
        .attr("width", 12);
    })
    .on("mouseout", function (d) {
      var year = d3.select(this).attr("class");

      //resize earthquake bars
      d3.select("#yearlyEqChart")
        .selectAll("." + year)
        .transition()
        .attr("width", 8);

      //hide tooltip
      d3.select("#yearlyEqTooltip").classed("hidden", true);
    });

  renderTrendline(series);
}

//remove circles without data bound to them
function exitYearlyEqBars(series) {
  yearlyEqSvg.selectAll("bar").data(series).exit().remove();
}

//update and transition earthquake circles after data updates
function updateYearlyEqBars(series) {
  // Add a group for each row of data
  var bars = yearlyEqSvg.selectAll("g").data(series);

  //display the yearly amount of earthquakes
  bars
    .selectAll("rect")
    .data(function (d) {
      return d;
    })
    .transition()
    .attr("x", function (d, i) {
      return xScale(i);
    })
    .attr("y", function (d) {
      return yScale(d[1]);
    })
    .attr("width", 8)
    .attr("height", function (d) {
      return yScale(d[0]) - yScale(d[1]);
    });
}


//TODO: update trendline when filtering out certain earthquake magnitudes
function renderTrendline(series) {
  var trendlineCB = document.querySelector("#renderTrendline");

  // get the x and y values for least squares
  var xSeries = d3.range(0, series[3].length);
  var ySeries = [];

  for (var i = 0; i < series[3].length; i++) {
    ySeries.push(series[3][i][1]);
  }

  var leastSquaresCoeff = leastSquares(xSeries, ySeries);

  // apply the reults of the least squares regression
  var x1 = xSeries[0];
  var y1 = leastSquaresCoeff[0] + leastSquaresCoeff[1];
  var x2 = xSeries[xSeries.length - 1];
  var y2 = leastSquaresCoeff[0] * xSeries.length + leastSquaresCoeff[1];
  var trendData = [[x1, y1, x2, y2]];

  var trendline = yearlyEqSvg.selectAll(".trendline").data(trendData);

  if (trendlineCB.checked) {
    trendline
      .enter()
      .append("line")
      .attr("class", "trendline")
      .attr("x1", function (d) {
        return xScale(d[0]);
      })
      .attr("y1", function (d) {
        return yScale(d[1]);
      })
      .attr("x2", function (d) {
        return xScale(d[2]);
      })
      .attr("y2", function (d) {
        return yScale(d[3]);
      })
      .attr("stroke", "black")
      .attr("stroke-width", 1);
  } else {
    yearlyEqSvg.select(".trendline").remove();
  }
}

//filter earthquake data
//returns only the earthquakes that ocurred between range1 and range2
function getFilteredEqData(data, range1, range2) {
  return d3.filter(data, function (point) {
    return (
      point.DateTime.substring(0, 4) >= range1 && point.DateTime.substring(0, 4) <= range2
    );
  });
}

//filter earthquake data
//returns only the earthquakes that ocurred between range1 and range2
function getFilteredYearlyEqData(data) {
  var magn1 = document.querySelector("#magn1");
  var magn2 = document.querySelector("#magn2");
  var magn3 = document.querySelector("#magn3");
  var magn4 = document.querySelector("#magn4");

  return d3.filter(data, function (point) {
    return (
      (magn1.checked && point.Magnitude <= 6.0) ||
      (magn2.checked && point.Magnitude > 6.0 && point.Magnitude <= 7.0) ||
      (magn3.checked && point.Magnitude > 7.0 && point.Magnitude <= 8.0) ||
      (magn4.checked && point.Magnitude > 8.0)
    );
  });
}

//counts how many earthquakes have happened on a given year
function countYearlyEqs(earthquakes) {
  var yearlyEq = [];

  //create one entry for each years
  for (var year = 1970; year <= 2013; year++) {
    yearlyEq.push({one: 0, two: 0, three: 0, four: 0, year: year});
  }

  //count the amount of earthquakes for each year
  for (var i = 0; i < earthquakes.length; i++) {
    var year = earthquakes[i].DateTime.substring(0, 4);
    var cat = checkEqCategorie(earthquakes[i].Magnitude);

    for (var j = 0; j < yearlyEq.length; j++) {
      if (1970 + j == year) {
        if (cat == 1) {
          yearlyEq[j].one += 1;
        } else if (cat == 2) {
          yearlyEq[j].two += 1;
        } else if (cat == 3) {
          yearlyEq[j].three += 1;
        } else if (cat == 4) {
          yearlyEq[j].four += 1;
        }
      }
    }
  }

  return yearlyEq;
}

function checkEqCategorie(magnitude) {
  if (magnitude <= 6.0) {
    return 1;
  } else if (magnitude > 6.0 && magnitude <= 7.0) {
    return 2;
  } else if (magnitude > 7.0 && magnitude <= 8.0) {
    return 3;
  } else if (magnitude > 8.0) {
    return 4;
  }
  console.error("no magnitude categorie found");
}

//render boundaries and labels of tectonic plates
function renderTecPlates() {
  var tecPlatesCB = document.querySelector("#tecPlates");
  var labelTecPlatesCB = document.querySelector("#labelTecPlates");

  d3.json("./../data/PB2002_plates.geojson").then(function (tecPlatesJSON) {
    //render tecPlates boundaries, if the checkbox is checked
    if (tecPlatesCB.checked) {
      tecPlates
        .selectAll("path")
        .data(tecPlatesJSON.features)
        .enter()
        .append("path")
        .attr("d", path)
        .style("fill", "none")
        .style("opacity", "0.2")
        .style("stroke", "black")
        .style("stroke-width", "1px");

      //render tecPlates labels,
      //if checkbox is checked and map is zoomed in
      if (labelTecPlatesCB.checked && NEW_MAP_SCALE > 400) {
        tecPlates
          .selectAll("text")
          .data(tecPlatesJSON.features)
          .enter()
          .append("text")
          .attr("class", "label")
          .attr("x", (d) => path.centroid(d)[0] - d.properties.PlateName.length * 5)
          .attr("y", (d) => path.centroid(d)[1])
          .text((d) => d.properties.PlateName);
      } else {
        tecPlates.selectAll("text").data(tecPlatesJSON).exit().remove();
      }
    } else {
      tecPlates.selectAll("path").data(tecPlatesJSON).exit().remove();
      tecPlates.selectAll("text").data(tecPlatesJSON).exit().remove();
    }
  });
}

function getMagnitudeColor(magnitude) {
  if (magnitude <= 6.0) {
    return "rgb(253, 250, 38, 0.8)";
  } else if (magnitude >= 6.0 && magnitude <= 7.0) {
    return "rgb(254, 125, 19, 0.8)";
  } else if (magnitude >= 7.0 && magnitude <= 8.0) {
    return "rgb(255, 0, 0, 0.8)";
  } else if (magnitude >= 8.0) {
    return "rgb(50, 50, 50, 0.8)";
  }
}

//resets the map zoom and translation to the default values
function resetView() {
  map.call(zoom.transform, d3.zoomIdentity.translate(WIDTH / 2, HEIGHT / 2).scale(0.0793));
}

// returns slope, intercept and r-square of the line
function leastSquares(xSeries, ySeries) {
  var reduceSumFunc = function (prev, cur) {
    return prev + cur;
  };

  var xBar = (xSeries.reduce(reduceSumFunc) * 1.0) / xSeries.length;
  var yBar = (ySeries.reduce(reduceSumFunc) * 1.0) / ySeries.length;

  var ssXX = xSeries
    .map(function (d) {
      return Math.pow(d - xBar, 2);
    })
    .reduce(reduceSumFunc);

  var ssYY = ySeries
    .map(function (d) {
      return Math.pow(d - yBar, 2);
    })
    .reduce(reduceSumFunc);

  var ssXY = xSeries
    .map(function (d, i) {
      return (d - xBar) * (ySeries[i] - yBar);
    })
    .reduce(reduceSumFunc);

  var slope = ssXY / ssXX;
  var intercept = yBar - xBar * slope;
  var rSquare = Math.pow(ssXY, 2) / (ssXX * ssYY);

  return [slope, intercept, rSquare];
}
