
let currentSankeyCountriesGraph = {
    nodes: [],
    links: [],
};

let currentSankeyEventsGraph = {
    nodes: [],
    links: [],
};

function groupBy(array, f)
{
  var groups = {};
  array.forEach( function( o )
  {
    var group = JSON.stringify( f(o) );
    groups[group] = groups[group] || [];
    groups[group].push( o );
  });
  return Object.keys(groups).map( function( group )
  {
    return groups[group];
  })
}

function updateSankey() {
    let selectionSankeyContainer = d3.select("#container_sankey_countries");
    selectionSankeyContainer.selectAll("svg > *").remove();
    let bboxSankeyContainer = selectionSankeyContainer.node().getBoundingClientRect();

    let svg = d3.select("svg"),
        width = bboxSankeyContainer.width,
        height = bboxSankeyContainer.height;

    svg.attr("width", width)
        .attr("height", height);

    let formatNumber = d3.format(",.0f"),
        format = function (d) {
            return formatNumber(d) + " News";
        },
        color = d3.scaleOrdinal(d3.schemeCategory10);

    let sankey = d3.sankey()
        .nodeWidth(15)
        .nodePadding(10)
        .extent([[1, 1], [width - 1, height - 6]]);

    function handleMouseOverLink(d) {
        d3.select(this).attr(
            "stroke", "blue",
        );
        renderOverCanvas(row => row[SOURCE_COUNTRY_COL] === d.source.name &&
            row[EVENT_COUNTRY_COL] === d.target.name);
    }

    function handleMouseOutLink(d) {
        d3.select(this).attr(
            "stroke", "#000",
        );
        overCanvas.removeFrom(map);
    }

    function handleClickLink(d) {
        let country = d.target.name;
        map.fitBounds(boundingCountries[country]);
    }

    let link = svg.append("g")
        .attr("class", "links")
        .attr("fill", "none")
        .attr("stroke", "#000")
        .attr("stroke-opacity", 0.2)
        .attr("border", "2px solid red")
        .selectAll("path")

    let node = svg.append("g")
        .attr("class", "nodes")
        .attr("font-family", "sans-serif")
        .attr("font-size", 10)
        .selectAll("g");

    sankey(currentSankeyCountriesGraph);

    link = link
        .data(currentSankeyCountriesGraph.links)
        .enter().append("path")
        .attr("d", d3.sankeyLinkHorizontal())
        .attr("stroke-width", function (d) {
            return Math.max(1, d.width);
        })
        .on("mouseover", handleMouseOverLink)
        .on("mouseout", handleMouseOutLink)
        .on("click", handleClickLink);

    link.append("title")
        .text(function (d) {
            return d.source.name + " → " + d.target.name + "\n" + format(d.value);
        });

    node = node
        .data(currentSankeyCountriesGraph.nodes)
        .enter().append("g");

    node.append("rect")
        .attr("x", function (d) {
            return d.x0;
        })
        .attr("y", function (d) {
            return d.y0;
        })
        .attr("height", function (d) {
            return d.y1 - d.y0;
        })
        .attr("width", function (d) {
            return d.x1 - d.x0;
        })

        .attr("stroke", "#000");

    node.append("text")
        .attr("x", function (d) {
            return d.x0 - 6;
        })
        .attr("y", function (d) {
            return (d.y1 + d.y0) / 2;
        })
        .attr("dy", "0.35em")
        .attr("text-anchor", "end")
        .text(function (d) {
            return d.name;
        })
        .filter(function (d) {
            return d.x0 < width / 2;
        })
        .attr("x", function (d) {
            return d.x1 + 6;
        })
        .attr("text-anchor", "start");

    node.append("title")
        .text(function (d) {
            return d.name + "\n" + format(d.value);
        });
}

function renderSankey() {
    getFilteredEvents(data => {
        /*
        var node_names = []
        var nodes = []
        var link_values = []

        var filteredData = data.filter(d => d[EVENT_COUNTRY_COL] === selectedCountry);
        var grouped = groupBy(filteredData, elem => elem[QUAD_CLASS_COL] + '#' + elem[SOURCE_COUNTRY_COL]);
        var grouped2 = groupBy(filteredData, elem => elem[QUAD_CLASS_COL]);
        grouped.forEach((group) => {
          const val = group.length
          const source = group[0][SOURCE_COUNTRY_COL]
          const type = group[0][QUAD_CLASS_COL] + " "

          if (!(source in node_names)){
            node_names.push(source)
            nodes.push({id: node_names.length - 1, name: source})
          }
          if (!(type in node_names)){
            node_names.push(type)
            nodes.push({id: node_names.length - 1, name: type})
          }
          source_id = node_names.indexOf(source)
          type_id = node_names.indexOf(type)
          link_values.push({source: source_id, target: type_id, value: val})

        });
        grouped2.forEach((group) => {
            const val = group.length
            const source = group[0][QUAD_CLASS_COL] + " "
            const type = selectedCountry+" "

            if (!(source in node_names)){
              node_names.push(source)
              nodes.push({id: node_names.length - 1, name: source})
            }
            if (!(type in node_names)){
              node_names.push(type)
              nodes.push({id: node_names.length - 1, name: type})
            }
            source_id = node_names.indexOf(source)

            type_id = node_names.indexOf(type)
            link_values.push({source: source_id, target: type_id, value: val})

          });
        let links = link_values;
        */

        grouped_bis = d3.nest()
            .key(d => d[SOURCE_COUNTRY_COL] + "#" + d[QUAD_CLASS_COL])
            .rollup(group => group.length)
            .entries(filteredData);

        grouped_2_bis = d3.nest()
            .key(d => d[QUAD_CLASS_COL])
            .rollup(group => group.length)
            .entries(filteredData);

        // NOTE Seems nasty, but it is just a function to remove duplicates from an array:
        // See https://stackoverflow.com/questions/9229645/remove-duplicate-values-from-js-array
        let uniq = a => [...new Set(a)];

        const nodesSourceCountries = uniq(grouped_bis.map(link => link.key.split("#")[0]));

        const nodesSourceEvents = uniq(grouped_bis.map(link => link.key.split("#")[1]));

        // We add this one because we need one special node for the selected country
        const finalNode = [selectedCountry + "_target"];

        const nodesAll = nodesSourceCountries.concat(nodesSourceEvents).concat(finalNode)
            .map(val => ({name: val}));

        const nodesMapping = nodesAll.reduce((mapping, entry, index) => {
            mapping[entry.name] = index;
            return mapping;
        }, {});

        const linksSourceCountriesToEvents = grouped_bis.map(link => {
            const pair = link.key.split("#");
            return {
                source: nodesMapping[pair[0]],
                target: nodesMapping[pair[1]],
                value: link.value
            };
        });

        const linksEventsCountries = grouped_2_bis.map(link => {
            const quadClass = link.key;
            return {
                source: nodesMapping[quadClass],
                target: nodesMapping[selectedCountry + "_target"],
                value: link.value,
            };
        });

        const linksAll = linksSourceCountriesToEvents.concat(linksEventsCountries);

        currentSankeyCountriesGraph = {
            nodes: nodesAll,
            links: linksAll,
        };

        updateSankey(currentSankeyCountriesGraph);
    })
}

$(window).resize(() => updateSankey());
