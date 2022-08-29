function toogleEarthquakeFilter() {
    var x = document.getElementById("magnitudeFilter");
    if (x.style.display === "none") {
      x.style.display = "flex";
    } else {
      x.style.display = "none";
    }
  }