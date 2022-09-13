# mi_visualization
A project for interactive visualization of historic earthquake data with d3.js.


# Data for the Visualisation

## Data Sources

### Country Data

The website *Natural Earth*[^1] offfers public domain map datasets at 1:10m, 1:50m as well as 1:110 million scales. For this project the *ne_110m_admin_0_countries* dataset was chosen to visualize the 258 countries of the world. This data is being offered in `.cpg`, `.dbf`, `.prj`, `.shp` and `.shx` formats, of which the shapefiles in `.shp` format were used.

### Earthquake Data

The Humanitarian Data Exchange offers a dataset of historic earthquakes between 1970-2014[^2]. It is presented in .json format and gives datetime, latidude, longitude, magnitude, magnitude type, as well as the depth of the occured earthquake.

### Tectonic Plates Boundary Data

A dataset for the bounds of earths tectonic plates is used from Hugo Ahlenius [^3], which in turn is a conversion of a dataset originally published in the paper _An updated digital model of plate boundaries_ by Peter Bird[^4]. The conversion by Ahlenius offers the data amongst others in the `.geojson` format and thus doesn't have to be converted anymore. Although the data was still minified in order to decrease file size.



[^1]: https://www.naturalearthdata.com/
[^2]: https://data.humdata.org/dataset/catalog-of-earthquakes1970-2014
[^3]: https://github.com/fraxen/tectonicplates
[^4]: An updated digital model of plate boundaries, Peter Bird, Geochemistry Geophysics Geosystems, 4(3), 1027, [DOI:10.1029/2001GC000252](10.1029/2001GC000252)
