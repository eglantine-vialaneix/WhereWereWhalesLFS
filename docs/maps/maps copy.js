const svg = d3.select("svg");
const svgNode = d3.select("#maps").node();
const width = svgNode.clientWidth;
const height = svgNode.clientHeight;

// Map and projection
const projection = d3.geoMercator()
    .center([-50,58])              

const colors = [
    // Sample from several interpolators
    ...d3.range(0, 1, 0.1).map(t => d3.interpolateYlOrRd(1 - t)),  // Reverse
    ...d3.range(0.1, 1, 0.1).map(t => d3.interpolateRdPu(t)),
    ...d3.range(0, 0.7, 0.1).map(t => d3.interpolatePurples(1 - t)),
    ...d3.range(0.3, 1, 0.1).map(t => d3.interpolateBlues(t)),
    "#008080",
    ...d3.range(0, 0.9, 0.1).map(t => d3.interpolateGreens(1 - t)),
    ...d3.range(0.6, 1, 0.05).map(t => d3.interpolateBrBG(1-t)),
    ...d3.range(0.1, 1, 0.1).map(t => d3.interpolateGreys(1-t)),
    ];

Promise.all([
    d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson"),
    d3.csv("data/grouped_species.csv"),
    d3.json("data/simplified_marine_data.geojson")
]).then(function (initialize) {

    let dataGeo = initialize[0]
    let data = initialize[1]
    let protectedZones = initialize[2];

    const speciesNames = Array.from(new Set(data.map(d => d.species_name))).sort(d3.ascending);
    const assignedColors = colors.slice(0, speciesNames.length);

    const color = d3.scaleOrdinal()
        .domain(speciesNames)
        .range(assignedColors);

    // Add a scale for bubble size
    const valueExtent = d3.extent(data, d => +d.individual_count)
    const size = d3.scaleSqrt()
        .domain(valueExtent)  // What's in the data
        .range([ 3, 22])  // Size in pixel

    // Draw the map
    const zoomGroup = svg.append("g")

    const pattern = svg.append("defs")
    .append("pattern")
    .attr("id", "hashedPattern")
    .attr("patternUnits", "userSpaceOnUse")
    .attr("width", 10)
    .attr("height", 10)
    .append("path")
    .attr("d", "M 0 0 L 10 10 M 0 10 L 10 0") // Create a crossing line pattern
    .attr("stroke", "#333333")
    .attr("stroke-width", 1);

    const protectedZonesLayer = zoomGroup.append("g")
        .selectAll("path")
        .data(protectedZones.features)
        .join("path")
        .attr("d", d3.geoPath().projection(projection))
        .attr("fill", "url(#hashedPattern)") // Apply the hashed pattern
        .attr("stroke", "white")
        .attr("stroke-width", 0)
        .style("opacity", 0.7);


    // Initially hide protected zones
    protectedZonesLayer.style("visibility", "hidden");

    // Toggle visibility when checkbox is clicked
    const checkbox = document.getElementById("toggleProtectedZones");

    checkbox.addEventListener("change", function () {
    if (checkbox.checked) {
        protectedZonesLayer.style("visibility", "visible");
    } else {
        protectedZonesLayer.style("visibility", "hidden");
    }
    });

    zoomGroup.append("g")
        .selectAll("path")
        .data(dataGeo.features)
        .join("path")
        .attr("fill", "#b8b8b8")
        .attr("d", d3.geoPath()
            .projection(projection)
        )
      .style("stroke", "#fff")
      .style("opacity", .4)


        // ToolTip
    const Tooltip = d3.select("#map-container")
      .append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("opacity", 1)
      .style("background-color", "white")
      .style("border", "solid")
      .style("border-width", "2px")
      .style("border-radius", "5px")
      .style("padding", "5px")
      .style("pointer-events", "none");

    // Three function that change the tooltip when user hover / move / leave a cell
    const mouseover = function(event, d) {
      Tooltip.style("opacity", 1)
    }

    const mousemove = function(event, d) {
        const container = document.getElementById("map-container");
        const bounds = container.getBoundingClientRect();
        const circleColor = color(d.species_name);
      
        Tooltip
            .html(`
            <strong>${d.species_name}</strong><br>
            Date: ${d.event_month}<br>
            Count: ${parseInt(d.individual_count, 10)}
          `)
          .style("left", (event.pageX - bounds.left + 10) + "px")
          .style("top", (event.pageY - bounds.top - 30) + "px")
          .style("background-color", d3.color(circleColor).copy({ opacity: 0.4 }).formatRgb());
      };
    var mouseleave = function(event, d) {
      Tooltip.style("opacity", 0)
    }

    // Add circles:
    zoomGroup
    .selectAll("circle")
    .data(data.sort((a,b) => +b.individual_count - +a.individual_count))
    .join("circle")
        .attr("class", "data-circle") 
      .attr("cx", d => projection([+d.longitude, +d.latitude])[0])
      .attr("cy", d => projection([+d.longitude, +d.latitude])[1])
      .attr("r", d => size(+d.individual_count))
      .style("fill", d => color(d.species_name))
      .attr("stroke", d => +d.individual_count > 2000 ? "black" : "none")
      .attr("stroke-width", 1)
      .attr("fill-opacity", .4)
      .on("mouseover", mouseover)
      .on("mousemove", mousemove)
      .on("mouseleave", mouseleave)

    const zoom = d3.zoom()
      .scaleExtent([1, 8]) // Min and max zoom scale
      .on("zoom", (event) => {
          zoomGroup.attr("transform", event.transform);
      });
  
    svg.call(zoom);

    // Add legend: circles
    const valuesToShow = [10,500,2000]
    const xCircle = 40
    const xLabel = 90
    zoomGroup
        .selectAll("circle.legend-circle")
        .data(valuesToShow)
        .join("circle")
        .attr("class", "legend-circle")
        .attr("cx", xCircle)
        .attr("cy", d => height -50 - size(d))
        .attr("r", d => size(d))
        .style("fill", "none")
        .attr("stroke", "black");

    // Add legend: segments
    zoomGroup
        .selectAll("line.legend-line")
        .data(valuesToShow)
        .join("line")
        .attr("class", "legend-line")
        .attr("x1", d => xCircle + size(d))
        .attr("x2", xLabel)
        .attr("y1", d => height-50 - size(d))
        .attr("y2", d => height-50 - size(d))
        .attr("stroke", "black")
        .style("stroke-dasharray", "2,2");

    // Add legend: labels
    zoomGroup
        .selectAll("text.legend-label")
        .data(valuesToShow)
        .join("text")
        .attr("class", "legend-label")
        .attr("x", xLabel)
        .attr("y", d => height-50 - size(d))
        .text(d => d)
        .style("font-size", 10)
        .attr("alignment-baseline", "middle");
    

    // Unique categories
    const speciesNameToCommonName = new Map();
    data.forEach(d => {
        if (!speciesNameToCommonName.has(d.species_name)) {
            speciesNameToCommonName.set(d.species_name, d.common_name);
        }
    });

    // Use speciesNames to preserve order
    // const allCategories = speciesNames.map(species => speciesNameToCommonName.get(species));
    const allCategories = speciesNames.map(species => speciesNameToCommonName.get(species));
    allCategories.sort((a, b) => a.localeCompare(b));

    const selectedSpecies = new Set(allCategories);
    const legendSvg = d3.select("#legend-svg");

    // Adjusted legend position
    const legendX = 20;
    const legendY = 10;

    // Group container for each legend item
    const legendItems = legendSvg.selectAll(".legend-item")
        .data(allCategories)
        .join("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(${legendX}, ${legendY + i * 25})`)
        .style("cursor", "pointer")
        .on("click", function(event, d) {
    const isDoubleClick = event.detail === 2;

    // Update legend visuals
    d3.select(this).select("circle")
      .style("opacity", selectedSpecies.has(d) ? 0.7 : 0.2);
    d3.select(this).select("text")
      .style("opacity", selectedSpecies.has(d) ? 1 : 0.3);
  });

    // Legend dots
    legendItems.append("circle")
    .attr("cx", 0)
    .attr("cy", 0)
    .attr("r", 6)
    .style("fill", d => color(d))
    .style("opacity", 0.7);

    // Legend labels
    legendItems.append("text")
    .attr("x", 12)
    .attr("y", 0)
    .attr("dy", "0.35em")
    .text(d => d)
    .style("alignment-baseline", "middle")
    .style("font-size", 12);
    
    // Function to filter bubbles based on selected species
    function updateCircles() {

        const yearMin = parseInt(fromInput.value, 10);
        const yearMax = parseInt(toInput.value, 10);

        const filtData = data.filter(speciesStatusFilter);

        if (selectedMonthStart > selectedMonthEnd) {
            // Wrap around from startMonth (e.g., December) to endMonth (e.g., January)
            filteredData = filtData.filter(d => {
                const date = new Date(d.event_month);
                const year = date.getFullYear();
                const month = date.getMonth(); 
        
                return (
                    selectedSpecies.has(d.common_name) &&
                    year >= yearMin && year <= yearMax &&
                    ((month >= selectedMonthStart && month <= 12) || (month >= 1 && month <= selectedMonthEnd))  &&
                    speciesStatusFilter(d)
                );
            });
        } else {
            filteredData = filtData.filter(d => {
                const date = new Date(d.event_month);
                const year = date.getFullYear();
                const month = date.getMonth() + 1;
                return (
                    selectedSpecies.has(d.common_name) &&
                    year >= yearMin && year <= yearMax 
                    &&
                    (selectedMonthStart === null || selectedMonthEnd === null || (month >= selectedMonthStart && month <= selectedMonthEnd)) &&
                    speciesStatusFilter(d)
                  );
            });
        }

        zoomGroup.selectAll("circle.data-circle")
        .data(filteredData, d => d.longitude + "_" + d.latitude)
        .join(
            enter => enter.append("circle")
            .attr("class", "data-circle")
            .attr("cx", d => projection([+d.longitude, +d.latitude])[0])
            .attr("cy", d => projection([+d.longitude, +d.latitude])[1])
            .attr("r", d => size(+d.individual_count))
            .style("fill", d => color(d.species_name))
            .attr("stroke", d => +d.individual_count > 2000 ? "black" : "none")
            .attr("stroke-width", 1)
            .attr("fill-opacity", .4)
            .on("mouseover", mouseover)
            .on("mousemove", mousemove)
            .on("mouseleave", mouseleave),
            update => update,
            exit => exit.remove() 
        );
    }

    function speciesStatusFilter(d) {
        // Check for "true" or "false" as strings in the "endangered" and "vulnerable" columns
        const isEndangered = d.endangered === "True";  // Check if it's the string "true"
        const isVulnerable = d.vulnerable === "True";  // Check if it's the string "true"
      
        // If "Show All Species" is checked, return true to show all species
        if (toggleAllSpecies.checked) return true;
      
        // Filter based on "endangered" or "vulnerable" checkboxes
        return (
          (toggleEndangeredSpecies.checked && isEndangered) ||
          (toggleVulnerableSpecies.checked && isVulnerable)
        );
      }
    
    // Function to update the opacity of the legend based on selected species
    function updateLegendOpacity() {
        legendSvg.selectAll(".legend-item").each(function(d) {
        const item = d3.select(this);
        // Check if the species is selected or not
        if (selectedSpecies.has(d)) {
            item.select("circle").style("opacity", 0.7);  // Set selected item opacity
            item.select("text").style("opacity", 1);  // Set selected item text opacity
        } else {
            item.select("circle").style("opacity", 0.2);  // Set unselected item opacity
            item.select("text").style("opacity", 0.3);  // Set unselected item text opacity
        }
        });
    }
    
    
    // Modify the legend click function
    legendItems.on("click", function(event, d) {
        const isDoubleClick = event.detail === 2;
    
        if (isDoubleClick) {
        // Clear all selections and only keep the clicked species
        selectedSpecies.clear();
        selectedSpecies.add(d);
        } else {
        // Toggle the selection
        if (selectedSpecies.has(d)) {
            selectedSpecies.delete(d);
        } else {
            selectedSpecies.add(d);
        }
        }
    
        // Update map points
        updateCircles();
        updateLegendOpacity();
    
        // Update legend visuals for clicked item
        d3.select(this).select("circle")
        .style("opacity", selectedSpecies.has(d) ? 0.7 : 0.2);
        d3.select(this).select("text")
        .style("opacity", selectedSpecies.has(d) ? 1 : 0.3);
    });

    // Slider
    function controlFromInput(fromSlider, fromInput, toInput, controlSlider) {
        const [from, to] = getParsed(fromInput, toInput);
        fillSlider(fromInput, toInput, '#C6C6C6', '#25daa5', controlSlider);
        if (from > to) {
            fromSlider.value = to;
            fromInput.value = to;
        } else {
            fromSlider.value = from;
        }
    }
        
    function controlToInput(toSlider, fromInput, toInput, controlSlider) {
        const [from, to] = getParsed(fromInput, toInput);
        fillSlider(fromInput, toInput, '#C6C6C6', '#25daa5', controlSlider);
        setToggleAccessible(toInput);
        if (from <= to) {
            toSlider.value = to;
            toInput.value = to;
        } else {
            toInput.value = from;
        }
    }

    function controlFromSlider(fromSlider, toSlider, fromInput) {
    const [from, to] = getParsed(fromSlider, toSlider);
    fillSlider(fromSlider, toSlider, '#C6C6C6', '#25daa5', toSlider);
    if (from > to) {
        fromSlider.value = to;
        fromInput.value = to;
    } else {
        fromInput.value = from;
    }
    }

    function controlToSlider(fromSlider, toSlider, toInput) {
    const [from, to] = getParsed(fromSlider, toSlider);
    fillSlider(fromSlider, toSlider, '#C6C6C6', '#25daa5', toSlider);
    setToggleAccessible(toSlider);
    if (from <= to) {
        toSlider.value = to;
        toInput.value = to;
    } else {
        toInput.value = from;
        toSlider.value = from;
    }
    }

    function getParsed(currentFrom, currentTo) {
    const from = parseInt(currentFrom.value, 10);
    const to = parseInt(currentTo.value, 10);
    return [from, to];
    }

    function fillSlider(from, to, sliderColor, rangeColor, controlSlider) {
        const rangeDistance = to.max-to.min;
        const fromPosition = from.value - to.min;
        const toPosition = to.value - to.min;
        controlSlider.style.background = `linear-gradient(
        to right,
        ${sliderColor} 0%,
        ${sliderColor} ${(fromPosition)/(rangeDistance)*100}%,
        ${rangeColor} ${((fromPosition)/(rangeDistance))*100}%,
        ${rangeColor} ${(toPosition)/(rangeDistance)*100}%, 
        ${sliderColor} ${(toPosition)/(rangeDistance)*100}%, 
        ${sliderColor} 100%)`;
    }

    function setToggleAccessible(currentTarget) {
    const toSlider = document.querySelector('#toSlider');
    if (Number(currentTarget.value) <= 0 ) {
        toSlider.style.zIndex = 2;
    } else {
        toSlider.style.zIndex = 0;
    }
    }

    const fromSlider = document.querySelector('#fromSlider');
    const toSlider = document.querySelector('#toSlider');
    const fromInput = document.querySelector('#fromInput');
    const toInput = document.querySelector('#toInput');
    fillSlider(fromSlider, toSlider, '#C6C6C6', '#25daa5', toSlider);
    setToggleAccessible(toSlider);

    fromSlider.oninput = () => controlFromSlider(fromSlider, toSlider, fromInput);
    toSlider.oninput = () => controlToSlider(fromSlider, toSlider, toInput);
    fromInput.oninput = () => controlFromInput(fromSlider, fromInput, toInput, toSlider);
    toInput.oninput = () => controlToInput(toSlider, fromInput, toInput, toSlider);

    fromSlider.onchange = updateCircles;
    toSlider.onchange = updateCircles;
    fromInput.onchange = updateCircles;
    toInput.onchange = updateCircles;

    const toggleAllSpecies = document.querySelector('#toggleallSpecies');
    const toggleEndangeredSpecies = document.querySelector('#toggleEndengeredSpecies');
    const toggleVulnerableSpecies = document.querySelector('#toggleVulnerableSpecies');
    
    function updateSelectionBasedOnCheckboxes() {
        // Clear selected species before updating based on checkboxes
        selectedSpecies.clear();
    
        // Filter data based on checkboxes and add species to selectedSpecies set
        data.forEach(d => {
            const isEndangered = d.endangered === "True";
            const isVulnerable = d.vulnerable === "True";
    
            // If "Show All Species" is checked, add all species
            if (toggleAllSpecies.checked) {
                selectedSpecies.add(d.species_name); // Or whatever identifier you use for species
            }
    
            // If "Show Endangered Species" is checked, add endangered species
            if (toggleEndangeredSpecies.checked && isEndangered) {
                selectedSpecies.add(d.species_name);
            }
    
            // If "Show Vulnerable Species" is checked, add vulnerable species
            if (toggleVulnerableSpecies.checked && isVulnerable) {
                selectedSpecies.add(d.species_name);
            }
        });
    }
    
    // Add onchange handlers for checkboxes
    toggleAllSpecies.onchange = () => {
        updateSelectionBasedOnCheckboxes();  // Update selection based on checkbox states
        updateCircles();  // Update map points
        updateLegendOpacity();  // Update legend opacity
    };
    
    toggleEndangeredSpecies.onchange = () => {
        updateSelectionBasedOnCheckboxes();  // Update selection based on checkbox states
        updateCircles();  // Update map points
        updateLegendOpacity();  // Update legend opacity
    };
    
    toggleVulnerableSpecies.onchange = () => {
        updateSelectionBasedOnCheckboxes();  // Update selection based on checkbox states
        updateCircles();  // Update map points
        updateLegendOpacity();  // Update legend opacity
    };


    let debounceTimeout = null;
    let selectedMonthStart = 0;
    let selectedMonthEnd = 11;

    
    $(() => {
    
        // Initialize the circle_datepicker plugin
        const picker = $('.circle-datepicker').circle_datepicker({
            // You can pass options here if needed
        });
    
        // Add an event listener for changes to the month
        picker.on('change', function (event, values) {
            const [startMonth, endMonth] = values;  // Assuming values is an array of two months
            selectedMonthStart = startMonth;
            selectedMonthEnd = endMonth;
        });
    
        // Mouse move event listener for debouncing
        $(document).on('mousemove', function () {
            if (debounceTimeout) {
                clearTimeout(debounceTimeout);
            }
    
            debounceTimeout = setTimeout(function () {
                updateCircles(); // Update circles only after stopping the mouse movement
            }, 300);
        });
    });

 
});

function debounce(func, wait) {
    let timeout;
    return function (...args) {
      const context = this;
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(context, args), wait);
    };
  }

// let defs = svg.select("defs");

// defs.append("pattern")
// .attr("id", "diagonalHatch")
// .attr("patternUnits", "userSpaceOnUse")
// .attr("width", 6)
// .attr("height", 6)
// .append("path")
// .attr("d", "M0,0 l6,6")
// .attr("stroke", "#000")
// .attr("stroke-width", 1);

// let protectedZonesLayer;

// d3.json("data/simplified_marine_data2.geojson").then(data => {
//   protectedZonesLayer = svg.append("g")
//     .attr("id", "protectedZones")
//     .style("display", "none"); // hidden by default

//   protectedZonesLayer.selectAll("path")
//     .data(data.features)
//     .enter()
//     .append("path")
//     .attr("d", pathGenerator)  // use your projection/path
//     .attr("fill", "url(#diagonalHatch)")
//     .attr("stroke", "black")
//     .attr("stroke-width", 0.5);
// });

// document.getElementById("toggleProtectedZones").addEventListener("change", function () {
//     if (this.checked) {
//       protectedZonesLayer.style("display", "block");
//     } else {
//       protectedZonesLayer.style("display", "none");
//     }
