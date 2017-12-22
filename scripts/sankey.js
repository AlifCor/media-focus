// We take the most representative countries and put the rest into "others"
const COUNTRIES_TRUNCATE = 8;

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
    return d3.nest().key(f).entries(array);
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
                let self = this;
                function hoverShowMap(callback){
                    d3.select(self).attr(
                        "stroke", "blue",
                    );
                    let filterFun;

                    if(d.source.name.split("_").length === 2){
                        // Is a selected country -> event type link
                        filterFun = row => row[SOURCE_COUNTRY_COL] === selectedCountry &&
                            row[QUAD_CLASS_COL] === d.target.name;
                    } else if(d.target.name.split("_").length === 2){
                        // Is a event type -> selected country link
                        filterFun = row => row[QUAD_CLASS_COL] === d.source.name &&
                            row[EVENT_COUNTRY_COL] === selectedCountry;
                    } else if(!isNaN(d.source.name)){
                        // Is a event type -> country link
                        let filterTargetCountry;
                        if(d.target.name === "other"){
                            filterTargetCountry = row =>
                                currentSankeyGraph.mostRepresentativeCountries.indexOf(row[EVENT_COUNTRY_COL]) === -1;
                        } else {
                            filterTargetCountry = row => row[EVENT_COUNTRY_COL] === d.target.name;
                        }
                        filterFun = row => row[QUAD_CLASS_COL] === d.source.name &&
                            row[SOURCE_COUNTRY_COL] === selectedCountry &&
                            filterTargetCountry(row);

                    } else {
                        // Is a country -> event type link
                        let filterSourceCountry;
                        if(d.source.name === "other"){
                            filterSourceCountry = row =>
                                currentSankeyGraph.mostRepresentativeCountries.indexOf(row[SOURCE_COUNTRY_COL]) === -1
                        } else {
                            filterSourceCountry = row => row[SOURCE_COUNTRY_COL] === d.source.name;
                        }
                        filterFun = row => row[QUAD_CLASS_COL] === d.target.name &&
                            row[EVENT_COUNTRY_COL] === selectedCountry &&
                            filterSourceCountry(row);
                    }
                    renderOverCanvas(filterFun, callback);
                }

                queueHovering.defer(hoverShowMap);
            }

            function handleMouseOutLink(d) {
                let self = this;
                function removeOverCanvas(callback){
                    d3.select(self).attr(
                        "stroke", "#000",
                    );
                    overCanvas.removeFrom(map);
                    callback(null);
                }
                queueHovering.defer(removeOverCanvas);
            }

            function handleMouseOverNode(d){
                let self = this;
                function hoverShowMap(callback){
                    d3.select(self).style(
                        "fill", "blue",
                    );
                    let filterFun = row => false;

                    if(currentSankeyGraph.type === "target"){
                        // Upper graph node is hovered
                        if(isNaN(d.name) && d.name.split("_").length === 1){
                            // Country node is hovered
                            if(d.name === "other"){
                                filterFun = row =>
                                    currentSankeyGraph.mostRepresentativeCountries.indexOf(row[SOURCE_COUNTRY_COL]) === -1 &&
                                    row[EVENT_COUNTRY_COL] === selectedCountry;
                            } else {
                                filterFun = row => row[SOURCE_COUNTRY_COL] === d.name
                                    && row[EVENT_COUNTRY_COL] === selectedCountry;
                            }

                        } else if(!isNaN(d.name)){
                            // Quad Class node is hovered
                            filterFun = row => row[QUAD_CLASS_COL] === d.name &&
                                row[EVENT_COUNTRY_COL] === selectedCountry;
                        }
                    } else {
                        // Lower (source) graph is hovered
                        if(isNaN(d.name) && d.name.split("_").length === 1){
                            // Country node is hovered
                            if(d.name === "other"){
                                filterFun = row =>
                                    currentSankeyGraph.mostRepresentativeCountries.indexOf(row[EVENT_COUNTRY_COL]) === -1 &&
                                    row[SOURCE_COUNTRY_COL] === selectedCountry;
                            } else {
                                filterFun = row => row[EVENT_COUNTRY_COL] === d.name &&
                                    row[SOURCE_COUNTRY_COL] === selectedCountry;
                            }

                        } else if(!isNaN(d.name)){
                            // Quand Class node is hovered
                            filterFun = row => row[QUAD_CLASS_COL] === d.name &&
                                row[SOURCE_COUNTRY_COL] === selectedCountry;
                        }
                    }
                    renderOverCanvas(filterFun, callback);
                }

                queueHovering.defer(hoverShowMap);
            }

            function handleMouseOutNode(d){
                let self = this;
                function removeOverCanvas(callback){
                    console.log("out")
                    d3.select(self).style(
                        "fill", color(d.humanName)
                    );

                    overCanvas.removeFrom(map);
                    callback(null);
                }
                queueHovering.defer(removeOverCanvas);
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
                    // REC = Root Event Code
                    const groupedByREC = d3.nest().key(row => row[EVENT_CODE_TYPE]).rollup(group => group.length).entries(d.data);
                    const cameoDict = cameoData
                        .filter(row => row["CAMEOEVENTCODE"].length === 2)
                        .map(row => row["EVENTDESCRIPTION"]);
                    function getRECName(index){
                        return index in cameoDict ? cameoDict[index] : "Unclassified";
                    }
                    const info = groupedByREC.map(RECGroup => getRECName(RECGroup.key) + ": " + format(RECGroup.value)).join("\n");
                    return d.source.humanName + " → " + d.target.humanName + "\n" + format(d.data.length) + " in total" + "\n" + info;
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
                .on("mouseover", handleMouseOverNode)
                .on("mouseout", handleMouseOutNode);

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
    getFilteredEvents(data => {
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
            const filteredData = data.filter(d => d[selectedCountryCol] === selectedCountry).slice();

            // This part is for detecting which countries are the most representative

            mostRepresentativeCountries = groupByGetCount(filteredData, d => d[countriesCol])
                .sort((a, b) => b.values.length - a.values.length)
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

            console.log(grouped_bis)

            let grouped_2_bis = groupByGetCount(adaptedData, d => d[QUAD_CLASS_COL]);

            console.log(grouped_2_bis)

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

            const linksCountriesEvents = grouped_bis.map(link => {
                const pair = link.key.split("#");
                return {
                    source: nodesMapping[pair[0]],
                    target: nodesMapping[pair[1]],
                    value: link.values.length,
                    data: link.values,
                };
            });

            const linksCountry = grouped_2_bis.map(link => {
                const quadClass = link.key;
                if (which === "target") {
                    return {
                        source: nodesMapping[quadClass],
                        target: nodesMapping[selectedCountry + "_target"],
                        value: link.values.length,
                        data: link.values,
                    };
                } else {
                    return {
                        source: nodesMapping[selectedCountry + "_source"],
                        target: nodesMapping[quadClass],
                        value: link.values.length,
                        data: link.values,
                    }
                }
            });

            const linksAll = linksCountriesEvents.concat(linksCountry);

            return {
                nodes: nodesAll,
                links: linksAll,
                mostRepresentativeCountries: mostRepresentativeCountries,
                type: which,
            };
        }

        currentSankeyTargetGraph = getSankeyGraph("target");
        currentSankeySourceGraph = getSankeyGraph("source");

        updateSankey(currentSankeyTargetGraph);
        updateSankey(currentSankeySourceGraph);
    })
}

$(window).resize(() => updateSankey());
