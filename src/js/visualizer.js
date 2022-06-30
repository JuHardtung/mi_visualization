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

//define earthquake color range
var eqColor = d3
  .scaleQuantize()
  .range([
    "#ffffcc",
    "#ffeda0",
    "#fed976",
    "#feb24c",
    "#fd8d3c",
    "#fc4e2a",
    "#e31a1c",
    "#bd0026",
    "#800026",
  ]);

//create elements in DOM
var svg = d3.select("svg").attr("width", WIDTH).attr("height", HEIGHT);
var map = svg
  .append("g")
  .attr("id", "map")
  .call(zoom)
  .call(zoom.transform, d3.zoomIdentity.translate(WIDTH / 2, HEIGHT / 2).scale(0.0793));

//worldmap with earthquakes + strom data
var oceans = map.append("g").attr("id", "oceans");
var countries = map.append("g").attr("id", "countries");
var tecPlates = map.append("g").attr("id", "tectonicPlates");
var eq = map.append("g").attr("id", "earthquakes");

//chart for displaying yearly earthquakes
d3.select("#yearlyEqContainer")
  .attr("width", WIDTH)
  .attr("height", HEIGHT / 3);

var yearlyEQS = d3
  .select("#yearlyEqChart")
  .attr("width", WIDTH)
  .attr("height", HEIGHT / 3);

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
  });
});

//filter earthquake data
//returns only the earthquakes that ocurred between range1 and range2
function getFilteredEqData(data, range1, range2) {
  return d3.filter(data, function (point) {
    return (
      point.DateTime.substring(0, 4) >= range1 && point.DateTime.substring(0, 4) <= range2
    );
  });
}

//enter earthquake circles
function enterEqCircles(data) {
  //set color domain for earthquake circles
  eqColor.domain([d3.min(data, (d) => d.Magnitude), d3.max(data, (d) => d.Magnitude)]);

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
    .attr("fill", (d) => eqColor(d.Magnitude))
    .on("mouseover", function (event, d) {
      //get information for tooltip
      var magnitude = d3.select(this).attr("magnitude");
      var latitude = Math.round(d3.select(this).attr("lat") * 100, 2) / 100;
      var longitude = Math.round(d3.select(this).attr("long") * 100, 2) / 100;

      //get x and y of circle for tooltip
      var eqCx = parseInt(d3.select(this).attr("cx"));
      var eqCy = parseInt(d3.select(this).attr("cy"));

      //setup earthquake tooltip
      d3.select("#earthquakeTooltip")
        .style("left", eqCx + 100 + "px")
        .style("top", eqCy + 30 + "px")
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
        .attr("fill", (d) => eqColor(d.Magnitude))
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
  //set color domain for earthquake circles
  eqColor.domain([d3.min(data, (d) => d.Magnitude), d3.max(data, (d) => d.Magnitude)]);

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
    .attr("fill", (d) => eqColor(d.Magnitude));
}

//render the chart of yearly earthquakes
function renderYearlyEarthquakes(earthquakes) {
  var yearlyEq = [];
  var parseTime = d3.timeParse("%Y");

  //calculate the amount of earthquakes for each year
  for (var i = 0; i < earthquakes.length; i++) {
    var year = earthquakes[i].DateTime.substring(0, 4);
    if (yearlyEq.length == 0) {
      yearlyEq.push({
        year: year,
        count: 1,
      });
    }

    var notExisting = true;
    for (var j = 0; j < yearlyEq.length; j++) {
      if (yearlyEq[j].year == year) {
        yearlyEq[j].count += 1;
        notExisting = false;
      }
    }
    if (notExisting) {
      yearlyEq.push({
        year: year,
        count: 1,
      });
    }
  }

  //parse years from Int to Time
  yearlyEq.forEach(function (d) {
    d.year = parseTime(d.year);
  });

  //define xScale
  var xScale = d3
    .scaleTime()
    .domain([d3.min(yearlyEq, (d) => d.year), d3.max(yearlyEq, (d) => d.year)])
    .range([MARGIN, WIDTH - 15]);

  //define yScale
  var yScale = d3
    .scaleLinear()
    .domain([0, d3.max(yearlyEq, (d) => d.count) + 10])
    .range([HEIGHT / 3 - MARGIN, 0]);

  //create X axis
  var xAxis = yearlyEQS
    .append("g")
    .attr("class", "x axis")
    .attr("transform", `translate(2.5,${HEIGHT / 3 - MARGIN})`)
    .call(d3.axisBottom(xScale).ticks(15));

  //create Y axis
  yearlyEQS
    .append("g")
    .attr("class", "y axis")
    .attr("transform", "translate(" + MARGIN + ",0)")
    .call(d3.axisLeft(yScale).ticks(5));

  //offset for ticks so they don't get obstructed by range slider
  xAxis.selectAll(".tick line").attr("y2", 10);
  xAxis.selectAll(".tick text").attr("y", 13);

  //display the yearly amount of earthquakes
  yearlyEQS
    .append("g")
    .attr("class", "bars")
    .selectAll("rect")
    .data(yearlyEq, (d) => d.count)
    .enter()
    .append("rect")
    .attr("x", (d) => xScale(d.year))
    .attr("y", (d) => yScale(d.count))
    .attr("width", 5)
    .attr("height", (d) => HEIGHT / 3 - MARGIN - yScale(d.count));

  //init rangeSlider for filtering yearly earthquakes
  //default range -> 1999-2002
  var slider = createD3RangeSlider(1970, 2014, "#yearlyEqContainer");
  slider.range(START_YEAR, END_YEAR);

  //onChange listener for the range slider
  slider.onChange(function (newRange) {
    var groupData = getFilteredEqData(earthquakes, newRange.begin, newRange.end);

    updateEqCircles(groupData);
    enterEqCircles(groupData);
    exitEqCircles(groupData);
  });
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

//resets the map zoom and translation to the default values
function resetView() {
  map.call(
    zoom.transform,
    d3.zoomIdentity.translate(WIDTH / 2, HEIGHT / 2).scale(0.0793)
  );
}
