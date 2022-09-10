//Original from https://github.com/RasmusFonseca/d3RangeSlider
//with modifications for usage within a bar chart
//slider handles now snap to center of each bar

/**
 * Create a d3 range slider that selects ranges between `rangeMin` and `rangeMax`, and add it to the
 * `containerSelector`. The contents of the container is laid out as follows
 * <code>
 * <div class="drag">
 *     <div class="handle WW"></div>
 *     <div class="handle EE"></div>
 * </div>
 * </code>
 * The appearance can be changed with CSS, but the `position` must be `relative`, and the width of `.slider` should be
 * left unaltered.
 *
 * @param rangeMin Minimum value of the range
 * @param rangeMax Maximum value of the range
 * @param containerSelector A CSS selection indicating exactly one element in the document
 * @returns {{range: function(number, number), onChange: function(function)}}
 */
function createD3RangeSlider(rangeMin, rangeMax, containerSelector) {

  var minWidth = 10;
  var sliderRange = { begin: rangeMin, end: rangeMin };
  var changeListeners = [];
  var touchEndListeners = [];
  var container = d3.select(containerSelector);
  var containerHeight = 20;

  var sliderWidth = getSliderWidth();
  var sliderOffsetL = getLeftOffset();
  var sliderTopOffset = getTopOffset();

  var sliderBox = container
    .append("div")
    .style("position", "relative")
    .style("height", containerHeight + "px")
    .style("width", getSliderWidth() + "px")
    .style("left", getLeftOffset() + "px")
    .style("top", getTopOffset() + "px")
    .attr("id", "slider-container");
  
    window.addEventListener("resize", function(event) {
      var slider = document.getElementById("slider-container");
      sliderWidth = getSliderWidth();
      sliderOffsetL = getLeftOffset();
      sliderTopOffset = getTopOffset();

      slider.style.width = sliderWidth + "px";
      slider.style.left = sliderOffsetL + "px";
      slider.style.top = sliderTopOffset + "px";
    });

  //Create elements in container
  var slider = sliderBox.append("div").attr("class", "slider");
  var handleW = slider.append("div").attr("class", "handle WW");
  var handleE = slider.append("div").attr("class", "handle EE");

  /** Update the `left` and `width` attributes of `slider` based on `sliderRange` */
  function updateUIFromRange() {
    var conW = sliderBox.node().clientWidth;
    var rangeW = sliderRange.end - sliderRange.begin;
    var slope = conW / (rangeMax - rangeMin);
    var uiRangeW = rangeW * slope;
    var uiRangeL = (sliderRange.begin - rangeMin) * slope;

    slider.style("left", uiRangeL + "px").style("width", uiRangeW + "px");
  }

  /** Update the `sliderRange` based on the `left` and `width` attributes of `slider` */
  function updateRangeFromUI() {
    var uiRangeL = parseFloat(slider.style("left"));
    var uiRangeW = parseFloat(slider.style("width"));
    var conW = sliderBox.node().clientWidth;
    var slope = conW / (rangeMax - rangeMin);
    var rangeW = uiRangeW / slope;

    var yearBegin = rangeMin + uiRangeL / slope;
    var yearEnd = yearBegin + rangeW;

    sliderRange.begin = Math.round(yearBegin);
    sliderRange.end = Math.round(yearEnd);

    //Fire change listeners
    changeListeners.forEach(function (callback) {
      callback({ begin: sliderRange.begin, end: sliderRange.end });
    });
  }

  // configure drag behavior for handles and slider
  //RIGHT HANDLE
  var dragResizeE = d3
    .drag()
    .on("start", function (event) {
      event.sourceEvent.stopPropagation();
    })
    .on("end", function () {
      touchEndListeners.forEach(function (callback) {
        callback({ begin: sliderRange.begin, end: sliderRange.end });
      });

      var conW = sliderBox.node().clientWidth; 
      var yearGap = sliderRange.end - sliderRange.begin;
      var oneYearWidth = conW / (rangeMax - rangeMin);  //940 / (2013 - 1970) = ~21.86 px
      var yearGapWidth = yearGap * oneYearWidth;        //3 * 21.84 = ~65.58 px

      slider.style("width", yearGapWidth + "px");
      updateRangeFromUI();
    })
    .on("drag", function (event) {
      var dx = event.dx;
      if (dx == 0) return;
      var conWidth = sliderBox.node().clientWidth;
      var newLeft = parseInt(slider.style("left"));
      var newWidth = parseFloat(slider.style("width")) + dx;

      newWidth = Math.max(newWidth, minWidth);
      newWidth = Math.min(newWidth, conWidth - newLeft);
      slider.style("width", newWidth + "px");
      updateRangeFromUI();
    });


  //LEFT HANDLE
  var dragResizeW = d3
    .drag()
    .on("start", function (event) {
      this.startX = event.x;
      event.sourceEvent.stopPropagation();
    })
    .on("end", function () {
      touchEndListeners.forEach(function (callback) {
        callback({ begin: sliderRange.begin, end: sliderRange.end });
      });

      var conW = sliderBox.node().clientWidth;        //940 px
      var curLeft = parseFloat(slider.style("left")); //633.954 px
      
      var yearGap = sliderRange.end - sliderRange.begin;//2002 - 1999 = 3 years
      var oneYearWidth = conW / (rangeMax - rangeMin);  //940 / (2013 - 1970) = ~21.86 px
      var yearGapWidth = yearGap * oneYearWidth;        //3 * 21.84 = ~65.58 px
      
      var newLeftOffset = Math.round(curLeft / oneYearWidth); //29 years
      var newLeft = newLeftOffset * oneYearWidth;             // 632.727 px

      slider.style("left", newLeft + "px");
      slider.style("width", yearGapWidth + "px");
      updateRangeFromUI();
    })
    .on("drag", function (event) {
      var dx = event.x - this.startX;
      if (dx == 0) return;
      var newLeft = parseFloat(slider.style("left")) + dx;
      var newWidth = parseFloat(slider.style("width")) - dx;

      if (newLeft < 0) {
        newWidth += newLeft;
        newLeft = 0;
      }
      if (newWidth < minWidth) {
        newLeft -= minWidth - newWidth;
        newWidth = minWidth;
      }

      slider.style("left", newLeft + "px");
      slider.style("width", newWidth + "px");
      updateRangeFromUI();
    });

    //dragging the whole bar
  var dragMove = d3
    .drag()
    .on("start", function (event) {
      event.sourceEvent.stopPropagation();
    })
    .on("end", function () {
      touchEndListeners.forEach(function (callback) {
        callback({ begin: sliderRange.begin, end: sliderRange.end });
      });

      var conW = sliderBox.node().clientWidth;          //940 px
      var curLeft = parseFloat(slider.style("left"));   //633.954 px
      
      var oneYearWidth = conW / (rangeMax - rangeMin);  //940 / (2013 - 1970) = ~21.86 px
      
      var newLeftOffset = Math.round(curLeft / oneYearWidth); //29 years
      var newLeft = newLeftOffset * oneYearWidth;             // 632.727 px

      slider.style("left", newLeft + "px");
    })
    .on("drag", function (event) {
      var dx = event.dx;
      var conW = sliderBox.node().clientWidth;
      var newLeft = parseFloat(slider.style("left")) + dx;
      var newWidth = parseFloat(slider.style("width"));

      newLeft = Math.max(newLeft, 0);
      newLeft = Math.min(newLeft, conW - newWidth);

      slider.style("left", newLeft + "px");

      updateRangeFromUI();
    });

  handleE.call(dragResizeE);
  handleW.call(dragResizeW);
  slider.call(dragMove);

  //Click on bar (center rangeBar on clickPos)
  sliderBox.on("mousedown", function (event) {
    var x = event.layerX;
    var props = {};
    var sliderWidth = parseFloat(slider.style("width"));
    var conWidth = sliderBox.node().clientWidth;
    props.left = Math.min(
      conWidth - sliderWidth,
      Math.max(x - sliderWidth / 2, 0)
    );
    props.left = Math.round(props.left);
    props.width = Math.round(props.width);
    slider.style("left", props.left + "px").style("width", props.width + "px");
    updateRangeFromUI();
  });

  //Reposition slider on window resize
  window.addEventListener("resize", function () {
    updateUIFromRange();
  });

  function onChange(callback) {
    changeListeners.push(callback);
    return this;
  }

  function onTouchEnd(callback) {
    touchEndListeners.push(callback);
    return this;
  }

  function setRange(b, e) {
    sliderRange.begin = b;
    sliderRange.end = e;

    updateUIFromRange();

    //Fire change listeners
    changeListeners.forEach(function (callback) {
      callback({ begin: sliderRange.begin, end: sliderRange.end });
    });
  }

  /**
   * Returns or sets the range depending on arguments.
   * If `b` and `e` are both numbers then the range is set to span from `b` to `e`.
   * If `b` is a number and `e` is undefined the beginning of the slider is moved to `b`.
   * If both `b` and `e` are undefined the currently set range is returned as an object with `begin` and `end`
   * attributes.
   * If any arguments cause the range to be outside of the `rangeMin` and `rangeMax` specified on slider creation
   * then a warning is printed and the range correspondingly clamped.
   * @param b beginning of range
   * @param e end of range
   * @returns {{begin: number, end: number}}
   */
  function range(b, e) {
    var rLower;
    var rUpper;

    if (typeof b === "number" && typeof e === "number") {
      rLower = Math.min(b, e);
      rUpper = Math.max(b, e);

      //Check that lower and upper range are within their bounds
      if (rLower < rangeMin || rUpper > rangeMax) {
        console.log("Warning: trying to set range (" + rLower + "," + rUpper + 
                    ") which is outside of bounds (" + rangeMin + "," + rangeMax + "). ");
        rLower = Math.max(rLower, rangeMin);
        rUpper = Math.min(rUpper, rangeMax);
      }

      //Set the range
      setRange(rLower, rUpper);
    } else if (typeof b === "number") {
      rLower = b;
      var dif = sliderRange.end - sliderRange.begin;
      rUpper = rLower + dif;

      if (rLower < rangeMin) {
        console.log("Warning: trying to set range (" + rLower + "," + rUpper +
                    ") which is outside of bounds (" + rangeMin + "," + rangeMax + "). ");
        rLower = rangeMin;
      }
      if (rUpper > rangeMax) {
        console.log("Warning: trying to set range (" + rLower + "," + rUpper + 
                    ") which is outside of bounds (" + rangeMin + "," + rangeMax + "). ");
        rLower = rangeMax - dif;
        rUpper = rangeMax;
      }
      setRange(rLower, rUpper);
    }
    return { begin: sliderRange.begin, end: sliderRange.end };
  }

  setRange(sliderRange.begin, sliderRange.end);

  return {
    range: range,
    onChange: onChange,
    onTouchEnd: onTouchEnd,
    updateUIFromRange: updateUIFromRange,
  };
}

function getSliderWidth() {
  var sliderW =  65 + ((window.innerWidth-100)/100) * 75;
  
  return sliderW;
}

//calculates the left slider offset for dynamic screen sizes
function getLeftOffset() {
  return 1 + window.innerWidth/100*0.3;
}

//calculates the slider top offset for dynamic screen sizes
function getTopOffset() {
  var offset = -25 - window.innerWidth/100 *2;

  if (offset < -40 ) {
    return -40;
  }
  return offset;
}