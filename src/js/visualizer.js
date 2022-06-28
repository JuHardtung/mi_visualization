var WIDTH = 1000;
var HEIGHT = 500;

//define projection and path generator
var projection = d3.geoEquirectangular().translate([WIDTH / 2, HEIGHT / 2]);
var path = d3.geoPath().projection(projection);

//define the changes when panning/zooming
var zooming = function (event) {
  var offset = [event.transform.x, event.transform.y];
  var newScale = event.transform.k * 2000;

  projection.translate(offset).scale(newScale);

  //update all country/ocean paths
  svg.selectAll("path").attr("d", path);
  //update earthquake circles
  svg
    .selectAll("circle")
    .attr("cx", (d) => projection([d.Longitude, d.Latitude])[0])
    .attr("cy", (d) => projection([d.Longitude, d.Latitude])[1]);
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
  .call(
    zoom.transform,
    d3.zoomIdentity.translate(WIDTH / 2, HEIGHT / 2).scale(0.0793)
  );
var oceans = map.append("g").attr("id", "oceans");
var countries = map.append("g").attr("id", "countries");
var eq = map.append("g").attr("id", "earthquakes");

//load .geojson-files of oceans and countries
d3.json("./../data/ne_110m_admin_0_countries.geojson").then(function (countriesJSON) {
  d3.json("./../data/ne_110m_ocean.geojson").then(function (oceansJSON) {
    //Oceans paths
    oceans
      .selectAll("path")
      .data(oceansJSON.features)
      .enter()
      .append("path")
      .attr("d", path)
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

    //init earthquake circles with default data (year 2000-2002)
    updateEarthquakeData(2000, 2001);
  });
});

//Hide unselected eqCircles after changing the range slider
function updateEarthquakeData(range1Value, range2Value) {
  d3.json("./../data/earthquakes_1970-2014.json").then(function (earthquakes) {
    //filter earthquake data with year range
    var eqData = [];
    for (var i = 0; i < earthquakes.length; i++) {
      var year = earthquakes[i].DateTime.substring(0, 4);
      if (year >= range1Value && year <= range2Value) {
        eqData.push(earthquakes[i]);
      }
    }

    //set color domain for earthquake circles
    eqColor.domain([
      d3.min(eqData, (d) => d.Magnitude),
      d3.max(eqData, (d) => d.Magnitude),
    ]);

    //set radius domain for earthquake circles
    var eqScale = d3
      .scalePow()
      .domain([
        d3.min(eqData, (d) => d.Magnitude),
        d3.max(eqData, (d) => d.Magnitude),
      ])
      .range([5, 10]);

    //earthquake circles
    eq.selectAll("circle")
      .data(eqData)
      .enter()
      .append("circle")
      .attr("magnitude", (d) => d.Magnitude)
      .attr("lat", (d) => d.Latitude)
      .attr("long", (d) => d.Longitude)
      .attr("cx", (d) => projection([d.Longitude, d.Latitude])[0])
      .attr("cy", (d) => projection([d.Longitude, d.Latitude])[1])
      .attr("r", (d) => eqScale(d.Magnitude))
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
          .style("left", eqCx + 70 + "px")
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
          .attr("r", (d) => eqScale(d.Magnitude) + 5);
      })
      .on("mouseout", function (d) {
        //resize earthquake circle
        d3.select(this)
          .transition()
          .attr("fill", (d) => eqColor(d.Magnitude))
          .attr("r", (d) => eqScale(d.Magnitude));

        //hide tooltip
        d3.select("#earthquakeTooltip").classed("hidden", true);
      });

    eq.selectAll("circle").data(eqData).exit().transition().remove();
  });
}

//resets the map zoom and translation to the default values
function resetView() {
  map.call(
    zoom.transform,
    d3.zoomIdentity.translate(WIDTH / 2, HEIGHT / 2).scale(0.0793)
  );
}
