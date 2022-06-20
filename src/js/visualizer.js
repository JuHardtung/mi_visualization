var WIDTH = 1000;
var HEIGHT = 500;

//define projection and path generator
var projection = d3.geoEquirectangular().translate([WIDTH/2, HEIGHT/2]);
var path = d3.geoPath().projection(projection);

//define the changes when panning/zooming
var zooming = function (event) {
  var offset = [event.transform.x, event.transform.y];
  var newScale = event.transform.k * 2000;

  projection.translate(offset).scale(newScale);

  //update all country/ocean paths
  svg.selectAll("path").attr("d", path);
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

//create elements in dom
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

//load .geojson-files of oceans and countries
d3.json("./../data/world_data_110m.geojson").then(function (countriesJSON) {
  d3.json("./../data/oceans.geojson").then(function (oceansJSON) {
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
  });
});

//resets the map zoom and translation to the default values
function resetView() {
  map.call(
    zoom.transform,
    d3.zoomIdentity.translate(WIDTH / 2, HEIGHT / 2).scale(0.0793)
  );
}
