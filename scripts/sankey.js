// We take the most representative countries and put the rest into "others"
const COUNTRIES_TRUNCATE = 8;

// We want to remember the types of sankey links
const sankeyLinkEnum = {
    COUNTRY_TO_EVENT: 0,
    EVENT_TO_COUNTRY: 1,
    SEL_COUNTRY_TO_EVENT: 2,
    EVENT_TO_SEL_COUNTRY: 3,
}

let currentSankeyTargetGraph = {
    nodes: [],
    links: [],
};

let currentSankeySourceGraph = {
    nodes: [],
    links: [],
};

// This is for avoinding deadlocks for the hovering part of the sankey links.
let queueHovering = d3.queue(1);

function getNameFromCode(code) {
    if (code == 'INT') {
        return 'International'
    } else if (code in mapping_cc) {
        return mapping_cc[code]
    } else if (!isNaN(code)) {
        return QUAD_CLASS_KEYS[parseInt(code) - 1];
    } else {
        return code
    }
}


// We define a general color palette so that each country has one attributed color
// in the sankey diagram
// (even if two countries can have the same color)
let color = d3.scaleOrdinal(d3.schemeCategory20);

function groupByGetCount(array, f) {
    return d3.nest().key(f).rollup(group => group.length).entries(array);
}

function updateSankey() {
    function updateSankeyDiagram(idContainer, which) {
        let currentSankeyGraph;
        switch (which) {
            case "source":
                currentSankeyGraph = currentSankeySourceGraph;
                break;
            case "target":
                currentSankeyGraph = currentSankeyTargetGraph;
                break;
        }

        let selectionSankeyContainer = d3.select(idContainer);
        selectionSankeyContainer.selectAll("svg > *").remove();

        if(currentSankeyGraph.nodes.length > 1){
            let bboxSankeyContainer = selectionSankeyContainer.node().getBoundingClientRect();

            let width = bboxSankeyContainer.width,
                height = bboxSankeyContainer.height;

            selectionSankeyContainer.attr("width", width)
                .attr("height", height);

            let formatNumber = d3.format(",.0f"),
                format = function (d) {
                    return formatNumber(d) + " News";
                };

            let sankey = d3.sankey()
                .nodeWidth(15)
                .nodePadding(10)
                .extent([[1, 1], [width - 1, height - 6]]);

            function handleMouseOverLink(d) {
                d3.select(this).attr(
                    "stroke", "blue",
                );
                function hoverShowMap(sourceCol, targetCol, callback){
                    renderOverCanvas(row => row[sourceCol] === d.source.name &&
                        row[targetCol] == d.target.name, callback);
                }
                if(d.type === sankeyLinkEnum.COUNTRY_TO_EVENT){
                    queueHovering.defer(hoverShowMap, SOURCE_COUNTRY_COL, QUAD_CLASS_COL);
                }
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

            let link = selectionSankeyContainer.append("g")
                .attr("class", "links")
                .attr("fill", "none")
                .attr("stroke", "#000")
                .attr("stroke-opacity", 0.2)
                .attr("border", "2px solid red")
                .selectAll("path")

            let node = selectionSankeyContainer.append("g")
                .attr("class", "nodes")
                .attr("font-family", "sans-serif")
                .attr("font-size", 10)
                .selectAll("g");

            sankey(currentSankeyGraph);

            link = link
                .data(currentSankeyGraph.links)
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
                    return d.source.humanName + " → " + d.target.humanName + "\n" + format(d.value);
                });

            node = node
                // We split because of the _target or _source suffixes
                .data(currentSankeyGraph.nodes.map(elem => {
                    elem["humanName"] = getNameFromCode(elem["name"].split("_")[0]);
                    return elem;
                }))
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

                .style("stroke", "#000")
                .style("fill", function(d) {
    		        return color(d.humanName); })

            node.append("text")
                .attr("x", function (d) {
                    return d.x0 - 6;
                })
                .attr("y", function (d) {
                    return (d.y1 + d.y0) / 2;
                })
                .attr("dy", "0.35em")
                .attr("text-anchor", "end")
                .attr("fill", "white")
                .text(function (d) {
                    return d.humanName;
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
                    return d.humanName + "\n" + format(d.value);
                });
        }

    }

    updateSankeyDiagram("#container_sankey_countries", "target");
    updateSankeyDiagram("#container_sankey_events", "source");
}

function renderSankey() {
    mapping_cc = []
    getMapping(data => {
        data.map(country => {
            mapping_cc[country.Code] = country.Name.trim()
        });
    });
    getFilteredEvents(data => {
        selectedCountryEvents = data.filter(d => d[EVENT_COUNTRY_COL] === selectedCountry ||
            d[SOURCE_COUNTRY_COL] === selectedCountry);
        function getSankeyGraph(which) {
            let selectedCountryCol, countriesCol;
            switch (which) {
                case "target":
                    selectedCountryCol = EVENT_COUNTRY_COL;
                    countriesCol = SOURCE_COUNTRY_COL;
                    break;
                case "source":
                    selectedCountryCol = SOURCE_COUNTRY_COL;
                    countriesCol = EVENT_COUNTRY_COL;
                    break;
            }
            const filteredData = selectedCountryEvents.filter(d => d[selectedCountryCol] === selectedCountry);

            // This part is for detecting which countries are the most representative

            mostRepresentativeCountries = groupByGetCount(filteredData, d => d[countriesCol])
                .sort((a, b) => b.value - a.value)
                .map(group => group.key)
                .slice(0, COUNTRIES_TRUNCATE);

            const adaptedData = filteredData.map(row => {
                if (mostRepresentativeCountries.indexOf(row[countriesCol]) >= 0) {
                    return row;
                } else {
                    row[countriesCol] = "other";
                    return row;
                }
            });

            // Now that we have the adapted data where all the insignificant countries
            // are put to "others" we can proceed with drawing

            let grouped_bis;
            switch (which) {
                case "target":
                    grouped_bis = groupByGetCount(adaptedData, d => d[SOURCE_COUNTRY_COL] + "#" + d[QUAD_CLASS_COL]);
                    break;
                case "source":
                    grouped_bis = groupByGetCount(adaptedData, d => d[QUAD_CLASS_COL] + "#" + d[EVENT_COUNTRY_COL]);
                    break;
            }

            let grouped_2_bis = groupByGetCount(adaptedData, d => d[QUAD_CLASS_COL]);

            // NOTE Seems nasty, but it is just a function to remove duplicates from an array:
            // See https://stackoverflow.com/questions/9229645/remove-duplicate-values-from-js-array
            let uniq = a => [...new Set(a)];

            const nodesCountries = uniq(grouped_bis.map(link => link.key.split("#")[1]));

            const nodesEvents = uniq(grouped_bis.map(link => link.key.split("#")[0]))

            // We add this one because we need one special node for the selected country
            const finalNode = [selectedCountry + "_" + which];

            let nodesAll = nodesCountries.concat(nodesEvents).concat(finalNode)
                .map(val => ({name: val}));

            const nodesMapping = nodesAll.reduce((mapping, entry, index) => {
                mapping[entry.name] = index;
                return mapping;
            }, {});

            //nodesAll = nodesCountries.concat(nodesEvents).concat(finalNode)
            //    .map(val => ({name: getNameFromCode(val.split("_")[0].trim()) }));

            const linksCountriesEvents = grouped_bis.map(link => {
                const pair = link.key.split("#");
                return {
                    source: nodesMapping[pair[0]],
                    target: nodesMapping[pair[1]],
                    value: link.value,
                    type: which === "target" ? sankeyLinkEnum.COUNTRY_TO_EVENT : sankeyLinkEnum.EVENT_TO_COUNTRY,
                };
            });

            const linksCountry = grouped_2_bis.map(link => {
                const quadClass = link.key;
                if (which === "target") {
                    return {
                        source: nodesMapping[quadClass],
                        target: nodesMapping[selectedCountry + "_target"],
                        value: link.value,
                        type: sankeyLinkEnum.EVENT_TO_SEL_COUNTRY,
                    };
                } else {
                    return {
                        source: nodesMapping[selectedCountry + "_source"],
                        target: nodesMapping[quadClass],
                        value: link.value,
                        type: sankeyLinkEnum.SEL_COUNTRY_TO_EVENT,
                    }
                }
            });

            const linksAll = linksCountriesEvents.concat(linksCountry);

            return {
                nodes: nodesAll,
                links: linksAll,
            };
        }

        currentSankeyTargetGraph = getSankeyGraph("target");
        currentSankeySourceGraph = getSankeyGraph("source");

        updateSankey(currentSankeyTargetGraph);
        updateSankey(currentSankeySourceGraph);

        /*
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

    })
}

$(window).resize(() => updateSankey());
