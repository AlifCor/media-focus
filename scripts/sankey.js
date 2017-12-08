
let currentSankeyCountriesGraph = {
    nodes: [],
    links: [],
};

let currentSankeyEventsGraph = {
    nodes: [],
    links: [],
};

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
            return formatNumber(d) + " TWh";
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
        let countriesMentions = {};
        let eventMentions = {};
        let eventMentionsSelCountry = {};

        data.forEach((row) => {
            const sourceCountry = row[SOURCE_COUNTRY_COL];
            const eventCountry = row[EVENT_COUNTRY_COL];

            if (!(sourceCountry in countriesMentions)) {
                countriesMentions[sourceCountry] = {};
            }
            if (!(eventCountry in countriesMentions[sourceCountry])) {
                countriesMentions[sourceCountry][eventCountry] = 0;
            }

            countriesMentions[sourceCountry][eventCountry] += 1;

            const eventType = row[EVENT_CODE_TYPE];
            if (!(eventType in eventMentions)) {
                eventMentions[eventType] = {};
            }

            if (!(eventCountry in eventMentions[eventType])) {
                eventMentions[eventType][eventCountry] = 0;
            }

            eventMentions[eventType][eventCountry] += 1;

            if (sourceCountry === selectedCountry) {
                if (!(eventType in eventMentionsSelCountry)) {
                    eventMentionsSelCountry[eventType] = 0;
                }
                eventMentionsSelCountry[eventType] += 1
            }
        });

        function normalizeMentions(mentions) {
            return Object.keys(mentions).map(source => {
                const currentSTArray = Object.keys(mentions[source]);
                const sumMentions = currentSTArray.reduce((sum, target) => {
                    return sum + mentions[source][target];
                }, 0);
                return [source, currentSTArray.map(country => [country, mentions[source][country] / sumMentions])];
            })
        }

        countriesMentions = normalizeMentions(countriesMentions);
        eventMentions = normalizeMentions(eventMentions);

        // C is for countries, E for events
        let selectedMentionsC = {};
        let reverseSelectedMentionsC = {};

        let selectedMentionsE = {};
        let reverseSelectedMentionsE = {};

        countriesMentions.forEach(sourceTarget => {
            const sourceCountry = sourceTarget[0];
            const targets = sourceTarget[1];
            targets.forEach(target => {
                const targetCountry = target[0];
                const value = target[1];
                if (targetCountry === selectedCountry) {
                    reverseSelectedMentionsC[sourceCountry] = value;
                } else if (sourceCountry === selectedCountry) {
                    selectedMentionsC[targetCountry] = value;
                }
            });
        });

        eventMentions.forEach(sourceTarget => {
            const sourceEvent = sourceTarget[0];
            const targets = sourceTarget[1];
            targets.forEach(target => {
                const targetCountry = target[0];
                const value = target[1];
                if (targetCountry === selectedCountry) {
                    reverseSelectedMentionsE[sourceEvent] = value;
                }
            });
        });


        reverseSelectedMentionsC = Object.entries(reverseSelectedMentionsC).sort((a, b) => b[1] - a[1]).splice(0, 8);
        // Normalizing reverseSelectedMentionsC:
        const sumRSM = reverseSelectedMentionsC.reduce((sum, elem) => sum + elem[1], 0);
        reverseSelectedMentionsC = reverseSelectedMentionsC.map(elem => [elem[0], elem[1] / sumRSM]);
        const reverseNodes = reverseSelectedMentionsC.map(elem => {
            return {name: elem[0]};
        });
        const reverseLinks = reverseSelectedMentionsC.map((elem, index) => {
            return {source: index, target: reverseNodes.length, value: elem[1]};
        });

        selectedMentionsC = Object.entries(selectedMentionsC).sort((a, b) => b[1] - a[1]).splice(0, 8);
        // Normalizing reverseSelectedMentionsC:
        const sumSM = selectedMentionsC.reduce((sum, elem) => sum + elem[1], 0);
        selectedMentionsC = selectedMentionsC.map(elem => [elem[0], elem[1] / sumSM]);
        let rightNodes = selectedMentionsC.map(elem => {
            return {name: elem[0]};
        });
        const rightLinks = selectedMentionsC.map((elem, index) => {
            return {source: reverseNodes.length, target: index + reverseNodes.length + 1, value: elem[1]}
        });

        const nodes = reverseNodes.concat([{name: selectedCountry}]).concat(rightNodes);
        const links = reverseLinks.concat(rightLinks);

        currentSankeyCountriesGraph = {
            nodes: nodes,
            links: links
        };

        updateSankey(currentSankeyCountriesGraph);
    })
}

$(window).resize(() => updateSankey());