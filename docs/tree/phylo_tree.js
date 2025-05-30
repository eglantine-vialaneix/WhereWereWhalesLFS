

    function countDescendants(node) {
      if (!node.children || node.children.length === 0) {
        node.size = 1;
      } else {
        node.size = node.children.reduce((sum, child) => {
          return sum + countDescendants(child);
        }, 0);
      }
      return node.size;
    }


    // Initialize the node positions recursively
    function setInitialPositions(node, centerX, centerY, radiusStep = 100, angleStart = 0, angleEnd = 2 * Math.PI) {
      const radius = node.depth * radiusStep;
      const angle = (angleStart + angleEnd) / 2;

      node.x = centerX + radius * Math.cos(angle);
      node.y = centerY + radius * Math.sin(angle);

      if (node.children && node.children.length > 0) {
        let total = node.children.reduce((sum, c) => sum + c.size, 0);
        let currentAngle = angleStart;

        for (const child of node.children) {
          const angleSpan = (angleEnd - angleStart) * (child.size / total);
          const childAngleStart = currentAngle;
          const childAngleEnd = currentAngle + angleSpan;

          setInitialPositions(child, centerX, centerY, radiusStep, childAngleStart, childAngleEnd);

          currentAngle += angleSpan;
        }
      }
    }





    function createChart(data) {
      const width = 928;
      const height = 800;
      const color = "blue";

      const root = d3.hierarchy(data);
      const links = root.links();
      const nodes = root.descendants();

      const centerX = width / 2;
      const centerY = height / 2;

      const r_image = 30;


      countDescendants(root); 
      setInitialPositions(root, 0, 0);

      const simulation = d3.forceSimulation(nodes)
        .alpha(0.01)
        .force("link", d3.forceLink(links).id(d => d.data.name).distance(50))
        .force("charge", d3.forceManyBody().strength(-100))
        .force("x", d3.forceX().strength(0.06))
        .force("y", d3.forceY().strength(0.1))
        .alphaTarget(0.2)
        .restart();

      const svg = d3.select("#tree")
        .attr("width", "100%")
        .attr("height", height)
        .attr("viewBox", [-width / 2, -height / 2, width, height])
        .attr("preserveAspectRatio", "xMidYMid meet");

      const g = svg.append("g"); 

      const zoom = d3.zoom()
        .scaleExtent([0.3, 6])  // Zoom out to 0.3x, in to 6x
        .on("zoom", (event) => {
          g.attr("transform", event.transform);
        });

      svg.call(zoom);  


      const families = Array.from(new Set(
        nodes.map(d => d.data.family).filter(f => f)
        ));

      const geni = Array.from(new Set(
        nodes.map(d => d.data.genus).filter(f => f)
        ));


      const familyColor = d3.scaleOrdinal()
        .domain(families)
        .range(d3.schemeCategory10.concat(d3.schemeSet3));

 
      const genusColor = d3.scaleOrdinal()
        .domain(geni)
        .range(d3.schemeCategory10.concat(d3.schemeSet3));

      const link = g.append("g")
        .attr("stroke-opacity", 0.6)
        .attr("stroke-width", 5)
        .selectAll("line")
        .data(links)
        .join("line")
        .attr("stroke", d => {
          const family = d.target.data.family;
          return family ? familyColor(family) : "#999"; // default gray
        });

      const nodeGroup = g.append("g")
        .attr("fill", "#fff")
        .attr("stroke", "#000")
        .attr("stroke-width", 1.5)
        .selectAll("g")
        .data(nodes)
        .join("g");


      // Append circles only for nodes with children
      nodeGroup.filter(d => d.children)
        .append("circle")
        .attr("fill", "#fff") 
        .attr("stroke", d => d.depth === 0 ? "red" : "none")
        .attr("stroke", d => d.data.family ? familyColor(d.data.family) : "#999") 
        .attr("r", 4.5);
      
      //root node bigger and all red
      nodeGroup.filter(d => d.depth === 0)
        .append("circle")
        .attr("fill", "red")
        .attr("stroke", "red")
        .attr("r", 6);
      
      // root node info display on hover
      nodeGroup.filter(d=> d.depth === 0)
        .on("mouseover", function(event, d) {
          Tooltip.style("opacity", 1);
        })
        .on("mousemove", function(event, d) {
          //const circleColor = familyColor(d.data.family);  
          Tooltip
            .html(
              `<strong>${"Crown Cetacea"}</strong><br>
              Oldest common ancester of all Cetaceans`
            )
            .style("left", (event.pageX - 130) + "px")
            .style("top", (event.pageY + 20) + "px")
            .style("background-color", d3.color("red").copy({ opacity: 0.6 }).formatRgb());
        })
        .on("mouseleave", function(event, d) {
          Tooltip.style("opacity", 0)
        
        })
        .on("click", function(event, d) {
          window.open(`profiles.html?search=${"https://en.wikipedia.org/wiki/Cetacea"}`, '_blank'); // https://en.wikipedia.org/wiki/Cetacea
        });

      // Define a circular clipPath once for reuse
      svg.append("defs").append("clipPath")
        .attr("id", "circleClip")
        .append("circle")
        .attr("r", r_image)
        .attr("cx", 0)
        .attr("cy", 0);

      // Leaf nodes (no children): circular image with border
      const leafNodes = nodeGroup.filter(d => !d.children);

      leafNodes.append("circle")
        .attr("r", r_image)
        .attr("fill", "#fff") // d => familyColor(d.data.family)
        .attr("stroke", "none");

      leafNodes.append("image")
        .attr("href", d => d.data.image)
        .attr("x", -r_image)
        .attr("y", -r_image)
        .attr("width", 2 * r_image)
        .attr("height", 2 * r_image)
        .attr("clip-path", "url(#circleClip)");
      
      leafNodes.append("circle")
        .attr("r", r_image)
        .attr("stroke", d => familyColor(d.data.family))
        .attr("fill", "none")
        .attr("stroke-width", 2.5);

      
      // Displaying infos on hover
      const Tooltip = d3.select("body")
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

          const mouseover = function(event, d) {
        Tooltip.style("opacity", 1)
      }
    
    const mousemove = function(event, d) {
      const circleColor = familyColor(d.target.data.family);
    
      Tooltip
          .html(`
          <strong>${d.data.common_name}</strong><br>
          ${d.data.scientific_name}<br>
          Family: ${d.data.family}
          Genus: ${d.data.genus}
        `)
        .style("left", (event.pageX + 3 * r_image) + "px")
        .style("top", (event.pageY + 3 * r_image) + "px")
        .style("background-color", d3.color(circleColor).copy({ opacity: 0.4 }).formatRgb());
    };
    var mouseleave = function(event, d) {
      Tooltip.style("opacity", 0)
    }


    leafNodes
      .on("mouseover", function(event, d) {
        Tooltip.style("opacity", 1);
      })
      .on("mousemove", function(event, d) {
        const circleColor = familyColor(d.data.family);  
        Tooltip
          .html(
            `<strong>${d.data.common_name || "Unknown"}</strong><br>
            <em>${d.data.scientific_name || ""}</em><br>
            <strong>Family:</strong> ${d.data.family || "N/A"}<br>
            <strong>Genus:</strong> ${d.data.genus || "N/A"}`
          )
          .style("left", (event.pageX + r_image) + "px")
          .style("top", (event.pageY  - 2 * r_image) + "px")
          .style("background-color", d3.color(circleColor).copy({ opacity: 0.6 }).formatRgb());
      })
      .on("mouseleave", function(event, d) {
        Tooltip.style("opacity", 0)
      
      })
      .on("click", function(event, d) {
        const encodedSpeciesName = encodeURIComponent(d.data.common_name);
        window.open(`profiles.html?search=${encodedSpeciesName}`, '_blank');
      });



      simulation.on("tick", () => {
        link
          .attr("x1", d => d.source.x)
          .attr("y1", d => d.source.y)
          .attr("x2", d => d.target.x)
          .attr("y2", d => d.target.y);


        nodeGroup.attr("transform", d => `translate(${d.x},${d.y})`);
      });
    }

    // Load data and call createChart
    d3.json("data/PhylogeneticTree/hierarchical_tree.json").then(data => {
      createChart(data);
    });


