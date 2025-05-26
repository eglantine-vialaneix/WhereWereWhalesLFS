document.addEventListener("DOMContentLoaded", function () {

const toggleRedList = document.querySelector('#toggleRedList');
const toggleAllSpecies = document.querySelector('#toggleallSpecies');
const toggleCR = document.querySelector('#btnCR');
const toggleEN = document.querySelector('#btnEN');
const toggleVU = document.querySelector('#btnVU');
const toggleNT = document.querySelector('#btnNT');

const activeStatuses = new Set();

const svg = d3.select("svg");
const zoomGroup = svg.append("g");
const svgNode = d3.select("#maps").node();
const width = svgNode.clientWidth;
const height = svgNode.clientHeight;
const defs = svg.append("defs");

let rotation = [0, 0];
let scale = Math.min(width, height) / 2.5;
const sensitivity = 5; // Rotation sensitivity

// Map and projection

const projection2D = d3.geoMercator().center([-50, 58])

let projection3D = d3.geoOrthographic()
    .scale(scale)
    .translate([width / 2, height / 2])
    .clipAngle(90)
    .precision(0.5)
    .rotate(rotation);

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

const pattern = defs
    .append("pattern")
    .attr("id", "hashedPattern")
    .attr("patternUnits", "userSpaceOnUse")
    .attr("width", 10)
    .attr("height", 10)
    .append("path")
    .attr("d", "M 0 0 L 10 10 M 0 10 L 10 0") // Create a crossing line pattern
    .attr("stroke", "#333333")
    .attr("stroke-width", 1);

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
    const toggleView = document.getElementById("toggleView");

    let projection = toggleView.checked ? projection3D : projection2D;
    let path = d3.geoPath().projection(projection);

    function isVisible([lon, lat]) {

        const [λ0, φ0] = projection3D.rotate().map(d => d * Math.PI / 180);

        const [x, y, z] = sphericalToCartesian(lon * Math.PI / 180, lat * Math.PI / 180);
        const [cx, cy, cz] = sphericalToCartesian(-λ0, -φ0);  // View direction

        const dot = x * cx + y * cy + z * cz;
        return dot > 0; // in front of the globe
        }

        function sphericalToCartesian(lonRad, latRad) {
        return [
            Math.cos(latRad) * Math.cos(lonRad),
            Math.cos(latRad) * Math.sin(lonRad),
            Math.sin(latRad)
        ];

    }

    let protectedZonesLayer;

    function renderProtectedZones() {
        // Remove existing protected zones if they exist
        zoomGroup.selectAll(".protected-zones-group").remove();
        
        protectedZonesLayer = zoomGroup.append("g")
            .attr("class", "protected-zones-group")
            .selectAll(".protected-zone")
            .data(protectedZones.features)
            .join("path")
            .attr("class", "protected-zone")
            .attr("d", path)
            .attr("fill", "url(#hashedPattern)")
            .attr("stroke", "white")
            .attr("stroke-width", 0)
            .style("opacity", 0.7)
            .style("visibility", checkbox.checked ? "visible" : "hidden");
    }
     
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

    const drag = d3.drag().on("drag", function (event) {
        const dx = event.dx;
        const dy = event.dy;
        rotation[0] += dx / sensitivity;
        rotation[1] -= dy / sensitivity;
        rotation[1] = Math.max(-90, Math.min(90, rotation[1]));
        projection3D.rotate(rotation);
        updateProjection();
        plot_circles(filteredData);
    });

    function updateProjection() {
        path = d3.geoPath().projection(projection);
        zoomGroup.selectAll("path").attr("d", path);
        zoomGroup.selectAll("circle.data-circle")
            .attr("cx", d => projection([+d.longitude, +d.latitude])[0])
            .attr("cy", d => projection([+d.longitude, +d.latitude])[1]);
    }

    function update3DProjection() {
        scale = Math.min(width, height) / 2.5;  // Update scale based on current width and height
        projection3D.scale(scale).translate([width / 2, height / 2]);  // Adjust translation for centering
        projection = projection3D;  // Update projection to 3D
        path = d3.geoPath().projection(projection);
        updateProjection();
    }

      
    function renderMap() {

        zoomGroup.selectAll("*").remove();

        path = d3.geoPath().projection(projection);

        if (projection === projection3D) {

            update3DProjection();

            const gradient = defs.append("radialGradient")
                .attr("id", "globeGradient")
                .attr("cx", "30%")
                .attr("cy", "30%")
                .attr("r", "70%");

            gradient.append("stop").attr("offset", "0%").attr("stop-color", "#E6F7FF");
            gradient.append("stop").attr("offset", "50%").attr("stop-color", "#B3E0FF");
            gradient.append("stop").attr("offset", "100%").attr("stop-color", "#66C2FF");
                
            globe = zoomGroup.append("circle")
                .attr("stroke", "#000")
                .attr("cx", width / 2)
                .attr("cy", height / 2)
                .attr("r", projection.scale())
                .attr("fill", "url(#globeGradient)");
            
            const graticule = d3.geoGraticule();

            graticulePath = zoomGroup.append("path")
                .datum(graticule())
                .attr("d", path)
                .attr("fill", "none")
                .attr("stroke", "#ccc");

            renderProtectedZones();

            zoomGroup.append("g")
                .selectAll("path")
                .data(dataGeo.features)
                .join("path")
                .attr("fill", "#b8b8b8")
                .attr("stroke", "#fff")
                .attr("d", path)
                .style("opacity", .7);
    
            zoomGroup.selectAll("circle.data-circle")
                .data(data.filter(d => isVisible([+d.longitude, +d.latitude])))
                .join("circle")
                .attr("class", "data-circle")
                .data(data.sort((a,b) => +b.individual_count - +a.individual_count))
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
                .on("click", function(event, d) {
                    const encodedSpeciesName = encodeURIComponent(d.scientific_name);
                    window.open(`profiles.html?search=${encodedSpeciesName}`, '_blank');
                    });

            
            svg.call(drag);
            svg.call(zoom);

            updateCircles();
        } else {
            svg.on(".drag", null); // Remove drag behavior in 2D

            renderProtectedZones();

            zoomGroup.append("g")
                .selectAll("path")
                .data(dataGeo.features)
                .join("path")
                .attr("fill", "#b8b8b8")
                .attr("stroke", "#fff")
                .attr("d", path)
                .style("opacity", .7);

            zoomGroup.selectAll("circle.data-circle")
                .data(data)
                .join("circle")
                .attr("class", "data-circle")
                .data(data.sort((a,b) => +b.individual_count - +a.individual_count))
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
                .on("click", function(event, d) {
                    const encodedSpeciesName = encodeURIComponent(d.scientific_name);
                    window.open(`profiles.html?search=${encodedSpeciesName}`, '_blank');
                    });
        }

    }

    const checkbox = document.getElementById("toggleProtectedZones");
    checkbox.addEventListener("change", function() {
        if (protectedZonesLayer) {
            protectedZonesLayer.style("visibility", this.checked ? "visible" : "hidden");
        } else {
            console.warn("Protected zones layer not found");
        }
    });

    // Initial render
    renderMap();

    toggleView.addEventListener("change", () => {
        projection = toggleView.checked ? projection3D : projection2D;
        path = d3.geoPath().projection(projection);
        renderMap();

        function fixInitialHashing() {
            const tempRotation = [...rotation];
            rotation[0] += 0.01; // Tiny change
            projection3D.rotate(rotation);
            updateProjection();
            
            }

            // Call after initial render
        fixInitialHashing();
        // Maintain visibility state after re-render
        if (checkbox.checked) {
            zoomGroup.selectAll(".protected-zone")
                .style("visibility", "visible");
        }
    });

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
    svg
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
    svg
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
    svg
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

    function plot_circles(data) {
        if (projection === projection3D) {
            zoomGroup.selectAll("circle.data-circle")
                .data(data.filter(d => isVisible([+d.longitude, +d.latitude])), d => d.longitude + "_" + d.latitude)  // Apply visibility check here
                .join(
                    enter => enter.append("circle")
                        .attr("class", "data-circle")
                        .attr("cx", d => projection([+d.longitude, +d.latitude])[0])  // For 3D, ensure projection is updated accordingly
                        .attr("cy", d => projection([+d.longitude, +d.latitude])[1])  // Update based on your projection method (2D or 3D)
                        .attr("r", d => size(+d.individual_count))
                        .style("fill", d => color(d.species_name))
                        .attr("stroke", d => +d.individual_count > 2000 ? "black" : "none")
                        .attr("stroke-width", 1)
                        .attr("fill-opacity", .4)
                        .on("mouseover", mouseover)
                        .on("mousemove", mousemove)
                        .on("mouseleave", mouseleave)
                        .on("click", function(event, d) {
                    const encodedSpeciesName = encodeURIComponent(d.scientific_name);
                    window.open(`profiles.html?search=${encodedSpeciesName}`, '_blank');
                    }),
                    update => update,  // In case you want to update anything dynamically
                    exit => exit.remove()  // Remove circles that no longer need to be shown
                );
        } else {
            zoomGroup.selectAll("circle.data-circle")
            .data(data, d => d.longitude + "_" + d.latitude)
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
                .on("mouseleave", mouseleave)
                .on("click", function(event, d) {
                    const encodedSpeciesName = encodeURIComponent(d.scientific_name);
                    window.open(`profiles.html?search=${encodedSpeciesName}`, '_blank');
                    }),
                update => update,
                exit => exit.remove() 
            );
        }
    }
    
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
        plot_circles(filteredData);
    }

    function speciesStatusFilter(d) {
        const status = d.IUCN_Red_List_status;

        // If "Show All Species" is checked, show everything
        if (toggleAllSpecies.checked) return true;

        // Show if this status is currently active
        return activeStatuses.has(status);
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
    
    
    legendItems.on("click", function(event, d) {
        const status = d.IUCN_Red_List_status;

        const inCRMode = activeStatuses.has("CR");
        const inENMode = activeStatuses.has("EN");
        const inVUMode = activeStatuses.has("VU");
        const inNTMode = activeStatuses.has("NT");

        const speciesAllowed =
            (!inCRMode || status === "CR") &&
            (!inENMode || status === "EN") &&
            (!inVUMode || status === "VU") &&
            (!inNTMode || status === "NT");

        // If not in show all mode and species doesn't match current filter, enable show all
        if (!toggleAllSpecies.checked && !speciesAllowed) {
            toggleAllSpecies.checked = true;
            activeStatuses.clear(); // Clear all status filters
            document.querySelectorAll(".status-button").forEach(btn =>
                btn.classList.remove("active")
            );
        }

        const isDoubleClick = event.detail === 2;

        if (isDoubleClick) {
            selectedSpecies.clear();
            selectedSpecies.add(d);
        } else {
            if (selectedSpecies.has(d)) {
                selectedSpecies.delete(d);
            } else {
                selectedSpecies.add(d);
            }
        }

        updateCircles();
        updateLegendOpacity();

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

    function updateSelectionBasedOnStatuses() {
        selectedSpecies.clear();

        data.forEach(d => {
            const status = d.IUCN_Red_List_status;

            if (toggleAllSpecies.checked || activeStatuses.has(status)) {
                selectedSpecies.add(d.species_name);
            }
        });
    }

    function setupStatusButton(button, statusCode) {
        button.addEventListener("click", () => {
            const isActive = button.classList.toggle("active");
            if (isActive) {
                activeStatuses.add(statusCode);
            } else {
                activeStatuses.delete(statusCode);
            }

            // Turn off "Show All" checkbox if filtering by individual status
            if (activeStatuses.size > 0) {
                toggleAllSpecies.checked = false;
            toggleRedList.checked = true;
        } else {
            toggleRedList.checked = false; 
        }
            updateSelectionBasedOnStatuses();
            updateCircles();
            updateLegendOpacity();
        });
    }

    // Attach handlers to each status button
    setupStatusButton(toggleCR, "CR");
    setupStatusButton(toggleEN, "EN");
    setupStatusButton(toggleVU, "VU");
    setupStatusButton(toggleNT, "NT");

    toggleRedList.onchange = () => {
        const buttons = [
            { btn: toggleCR, code: "CR" },
            { btn: toggleEN, code: "EN" },
            { btn: toggleVU, code: "VU" },
            { btn: toggleNT, code: "NT" },
        ];

        if (toggleRedList.checked) {
            // Activate all buttons and add their statuses
            buttons.forEach(({ btn, code }) => {
                btn.classList.add("active");
                activeStatuses.add(code);
            });
            toggleAllSpecies.checked = false;
        } else {
            // Deactivate all buttons and clear statuses
            buttons.forEach(({ btn }) => btn.classList.remove("active"));
            activeStatuses.clear();
        }

        updateSelectionBasedOnStatuses();
        updateCircles();
        updateLegendOpacity();
    };
    
    toggleAllSpecies.onchange = () => {
        if (toggleAllSpecies.checked) {
            activeStatuses.clear();
            document.querySelectorAll(".status-button").forEach(btn => 
                btn.classList.remove("active")
            );
        }
        updateSelectionBasedOnStatuses();
        updateCircles();
        updateLegendOpacity();
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

    svg.on("click", (event) => {
    if (projection !== projection3D) return;

    const [mx, my] = d3.pointer(event);
    const dx = mx - width / 2;
    const dy = my - height / 2;
    const distFromCenter = Math.sqrt(dx * dx + dy * dy);
    const globeRadius = projection.scale();

    if (distFromCenter > globeRadius) {
        // Just re-center on screen, keep rotation
        zoomGroup.transition()
        .duration(500)
        .attr("transform", null); // Resets pan/zoom to original position
    }
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

const infoButton = document.getElementById("info-button");
const infoBox = document.getElementById("info-box");

// Toggle visibility on button click
infoButton.addEventListener("click", (event) => {
  event.stopPropagation(); // Prevent the document click handler from firing
  infoBox.style.display = (infoBox.style.display === "none" || infoBox.style.display === "") ? "block" : "none";
});

// Prevent click inside the box from closing it
infoBox.addEventListener("click", (event) => {
  event.stopPropagation();
});

// Close the box when clicking anywhere else
document.addEventListener("click", () => {
  infoBox.style.display = "none";
});
});
