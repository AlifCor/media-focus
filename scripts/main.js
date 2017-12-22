let allDates = [new Date(2017, 11, 19)];

// Constants:
const SOURCE_COUNTRY_COL = "source_country_code";
const QUAD_CLASS_COL = "QuadClass";
const QUAD_CLASS_KEYS = ["Verbal Cooperation", "Material Cooperation", "Verbal Conflict", "Material Conflict"];
const EVENT_COUNTRY_COL = "country_code_alpha";
const EVENT_CODE_TYPE = "EventRootCode";
const LAT_COL = "ActionGeo_Lat";
const LONG_COL = "ActionGeo_Long";

const getFilteredEvents = (function () {
    let selectedEvents;
    $(() => $("#accordion").on("changed", (event, selectedCodes) => {
        selectedEvents = selectedCodes;
    }));

    return function (callback) {
        function filenameFromDate(currentDate){
            return "data_processing/data/" +
                currentDate.getFullYear() + "" +
                (currentDate.getMonth() + 1) + "" +
                currentDate.getDate() + ".csv";
        }

        function getAllData(callback){
            let allData = [];
            function loadFile(filename, callback){
                d3.csv(filename, (data) => {
                    allData = allData.concat(data);
                    callback(null);
                });
            }
            let queueDateLoading = d3.queue(1);

            allDates.forEach(date => {
                const filename = filenameFromDate(date);
                queueDateLoading.defer(loadFile, filename);
            })

            queueDateLoading.await(function(error) {
                if(error){
                    throw error;
                }
                callback(allData);
            });
        }

        // This function is used to get the 0-padded event codes out of our
        // integer event codes in our data. For example, if the event code is
        // 034 our data will have only 34 so we want to pad it to be "034"
        function eventCodePadding(eventCode, filteringLevel, rootEventCode){
            let shapedEventCode = eventCode;
            if(parseInt(rootEventCode) < 10){
                shapedEventCode =  "0" + eventCode;
            }
            return shapedEventCode.substr(0, filteringLevel);
        }

        if (selectedEvents !== undefined) {
            if(selectedEvents.size > 0){
                const filteringLevel = selectedEvents.values().next().value.length;
                const selectedEventsNonZero = new Set((Array.from(selectedEvents)).map(code => parseInt(code).toString()));
                getAllData(data =>
                    callback(data.filter(el => selectedEvents.has(eventCodePadding(el["EventCode"], filteringLevel, el[EVENT_CODE_TYPE])))));
            }
        }
        else {
            //The user never changed the selection inside the drawer => return all data
            getAllData(data => callback(data));
        }
    }
}());

function getMapping(callback) {
    d3.csv("mapping_code_name.csv", (data) => callback(data));
}
mapping_cc = []
getMapping(data => {
    data.map(country => {
        mapping_cc[country.Code] = country.Name.trim()
    });
});

const MAX_ZOOM = 18;
const CLUSTER_DEGREE = 8;
const CLUSTER_STEP = Math.floor(MAX_ZOOM / CLUSTER_DEGREE);
const CIRCLE_RADIUS_FACTOR = 0.04;

let firstLoad = true;

// Here we declare the general DOM references
let sideEventsDrawer, bottomDrawer, sideCountryDetails, countryCloseBtn, map, containerEventSelection;
let paneGeojson = undefined;

let mainCanvas = L.canvas();
let currentClusteringLevel = -1;
let countriesLatLng = {};

let selectedCountry = undefined;

$(() => {
    // We create our Leaflet map
    map = L.map('container_map', {zoomControl: false}).setView([39.74739, -105], 4);
    sideEventsDrawer = $("#side_menu");
    bottomDrawer = $("#bottom_menu");
    sideCountryDetails = $("#side_country_details");
    countryCloseBtn = $("#country_close_btn");
    containerEventSelection = $("#accordion");

    countryCloseBtn.click(closeCountryDetails);
    $(document).keydown((e) => {
        if(e.which === 27){
            closeCountryDetails();
        }
    });

    $("#slider").bind("changed", function(e, data){
        const endDate = new Date(data.max);
        let tempDate = new Date(data.min);
        allDates = [];

        while(tempDate.getDate() !== endDate.getDate()){
            allDates.push(new Date(tempDate));
            tempDate.setDate(tempDate.getDate() + 1);
        }

        renderMainCanvas(force = true);
    });

    L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
        attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
        maxZoom: MAX_ZOOM,
        id: 'mapbox.streets',
        accessToken: 'pk.eyJ1IjoiYWhtZWRrdWxvdmljIiwiYSI6ImNqYTR2Mmp1dTlsbmoycXB5aXkyOXdtMjkifQ.sU3WNVes2qNhTFH-0nAzYA'
    }).addTo(map);

    map.on("zoomend", () => renderMainCanvas());
    containerEventSelection.on("changed", () => renderMainCanvas(force = true));
    renderMainCanvas(force = true);

    let tutoContainer = $("#tuto_container");
    let shortcutsContainer = $("#shortcuts_container");

    setTimeout(() => {

        tutoContainer.css("display", "block");
        tutoContainer.animate({opacity: 1}, 1000, () => {
            setTimeout(() => {
                tutoContainer.animate({opacity: 0}, 1000, () => tutoContainer.css("display", "none"));
            }, 5000)

        })
    }, 3000);

    setTimeout(() => {
        shortcutsContainer.css("display", "block");
        shortcutsContainer.animate({opacity: 0.6}, 1000);
    }, 5000);

});

function drawData(dataToShow, groupingFunction, canvas, color, circleClickable) {
    function meand3(group, attrib) {
        return d3.mean(group.map(d => parseFloat(d[attrib])))
    }

    const grouped = d3.nest()
        .key(d => [groupingFunction(d[LAT_COL]), groupingFunction(d[LONG_COL])])
        .entries(dataToShow);
    const currentZoom = map.getZoom();
    grouped.forEach((data, index) => {
        const meanCoord = [meand3(data.values, LAT_COL), meand3(data.values, LONG_COL)];
        const groupedBySourceCountry = d3.nest().key(d => d[SOURCE_COUNTRY_COL]).entries(data.values);
        const latlngArray = data.key.split(",");
        const latlng = new L.LatLng(meanCoord[0], meanCoord[1]);
        const radiusCircle = (Math.sqrt(data.values.length) + 1) * CIRCLE_RADIUS_FACTOR * 2 ** (CLUSTER_STEP * 0.8 * currentClusteringLevel);
        let circle = L.circleMarker(latlng, {
            renderer: canvas,
            stroke: false,
            fillColor: color,
            radius: radiusCircle,
        });
        if(circleClickable){

            circle.on('mouseover', function () {
                circle.setStyle({fillOpacity: 0.5});
            });

            // Un-highlight the marker on hover out
            circle.on('mouseout', function () {
                circle.setStyle({fillOpacity: 0.2});
            });
            circle.on("click", () => {
                const cameoDict = cameoData
                    .filter(row => row["CAMEOEVENTCODE"].length === 2)
                    .map(row => row["EVENTDESCRIPTION"]);
                const neededEvents = groupedBySourceCountry
                    .sort((a, b) => b.values.length - a.values.length)
                    .slice(0, 6);

                const eventsNestedQuadClass = neededEvents.map(country => {
                    const tempNest = d3.nest()
                        .key(d => d[QUAD_CLASS_COL])
                        .rollup(group => group.length)
                        .entries(country.values)

                    //We create an object where the key is the quad class and the value is the number of times it appears
                    const valuesQC = tempNest.reduce((prev, curr) => {
                        prev[curr["key"]] = curr["value"];
                        return prev
                    }, {});
                    const total = tempNest.reduce((total, pair) => total + pair["value"], 0);
                    let result = {
                        "country": country.key,
                        "total": total,
                    };
                    QUAD_CLASS_KEYS.forEach((elem, i) => {
                        result[elem] = valuesQC["" + (i + 1)] || 0
                    })
                    return result;
                });

                let div = document.createElement("div");

                let widthBarChart = 300;
                let heightBarChart = 36.7 * eventsNestedQuadClass.length + 80;

                let svg = d3.select(div)
                    .attr("width", widthBarChart)
                    .attr("height", heightBarChart)
                    .append("svg")
                    .attr("fill", "white")
                    .attr("width", widthBarChart)
                    .attr("height", heightBarChart);

                let margin = {top: 50, right: 20, bottom: 30, left: 30};
                let width = +svg.attr("width") - margin.left - margin.right,
                    height = +svg.attr("height") - margin.top - margin.bottom;
                let g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

                let xScale = d3.scaleLinear().rangeRound([0, width]);
                let yScale = d3.scaleBand().rangeRound([height, 0]).padding(0.1);
                let color = d3.scaleOrdinal(d3.schemeCategory20);
                let maxTotal = d3.max(eventsNestedQuadClass, d => d["total"]);
                let xAxis = d3.axisBottom(xScale).ticks(maxTotal >= 5 ? 5 : maxTotal);
                let yAxis = d3.axisLeft(yScale);

                let stack = d3.stack().keys(QUAD_CLASS_KEYS).offset(d3.stackOffsetNone);
                let layers = stack(eventsNestedQuadClass);
                yScale.domain(eventsNestedQuadClass.map(d => d["country"]));
                xScale.domain([0, maxTotal]).nice();

                let layer = g.selectAll(".layer")
                    .data(layers)
                    .enter().append("g")
                    .attr("class", "layer")
                    .style("fill", (d, i) => color(i))
                    .on("mouseover", mouseOverSBCReact)
                    .on("mouseout", mouseOutSBCReact);

                // SBC = Stacked bar chart
                function mouseOverSBCReact(){
                    d3.select(this)
                        .style("border", "2px solid black");
                }

                function mouseOutSBCReact(){
                    d3.select(this)
                        .style("border", "none");
                }

                layer.selectAll("rect")
                    .data(d => d)
                    .enter().append("rect")
                    .attr("y", d => yScale(d.data["country"]))
                    .attr("x", d => xScale(d[0]))
                    .attr("height", yScale.bandwidth())
                    .attr("width", d => xScale(d[1]) - xScale(d[0]))


                    .append("title")
                    .text(function (d, i) {
                        const quadClassEventsStacked = QUAD_CLASS_KEYS.reduce((stacked, humanQuadClass) => {
                            const toAdd = d.data[humanQuadClass];
                            if(stacked.length > 0){
                                stacked.push(stacked[stacked.length - 1] + toAdd);
                            } else {
                                stacked.push(toAdd);
                            }
                            return stacked;
                        }, []);

                        const quadClass = (quadClassEventsStacked.indexOf(d[1]) + 1).toString();
                        const filteredCountryQC = data.values.filter(row =>
                            row[QUAD_CLASS_COL] === quadClass && row[SOURCE_COUNTRY_COL] === d.data["country"]);
                        const groupedByRootEvent = d3.nest()
                            .key(d => d[EVENT_CODE_TYPE])
                            .rollup(group => group.length)
                            .entries(filteredCountryQC);
                        const info = groupedByRootEvent
                            .sort((a, b) => a.key - b.key)
                            .map(group => cameoDict[group.key] + " : " + group.value + " news")
                            .join("\n");
                        const ctry = d.data["country"];
                        return (ctry in mapping_cc ? mapping_cc[ctry] : ctry) + "-" +
                            QUAD_CLASS_KEYS[quadClass] + "\n" +
                            info;
                    });

                g.append("g")
                    .attr("class", "axis axis--x")
                    .attr("transform", "translate(0," + (height + 5) + ")")
                    .call(xAxis);

                g.append("g")
                    .attr("class", "axis axis--y")
                    .attr("transform", "translate(0,0)")
                    .call(yAxis);

                let legend = svg.append("g")
                    .attr("font-family", "sans-serif")
                    .attr("font-size", 10)
                    .attr("height", 10)

                    .selectAll("g")
                    .data(QUAD_CLASS_KEYS)
                    .enter().append("g")
                    .attr("transform", function (d, i) {
                        return "translate(" + (Math.floor(i / 2) * widthBarChart / 2) + ", " +
                            (i % 2 * 30) + ")";
                    });

                legend.append("rect")
                    .attr("width", 10)
                    .attr("height", 10)
                    .attr("fill", (d, i) => color(i));

                legend.append("text")
                    .attr("height", 10)
                    .attr("y", 8)
                    .attr("x", 15)
                    .text((d, i) => d);

                circle.bindPopup(div);
                circle.openPopup();
            });
        } else {
            groupedBySourceCountry.forEach(sourceCountryGroup => {
                const sourceCountry = sourceCountryGroup.key;
                if(sourceCountry in countriesLatLng){
                    const latlngSource = countriesLatLng[sourceCountry];
                    L.polyline([latlngSource, latlng], {
                        color: color,
                        renderer: canvas,
                        weight: radiusCircle / 2,
                        opacity: 0.2,
                    }).addTo(map);
                }
            })
        }
        circle.addTo(map);
    })
}

function renderMainCanvas(force = false, doBefore = startLoadingScreen, doAfter = endLoadingScreen) {
    function getClusteringLevel(zoomLevel) {
        return Math.floor(zoomLevel / CLUSTER_STEP)
    }

    const currentZoom = map.getZoom();
    const newClusteringLevel = getClusteringLevel(currentZoom);
    if (newClusteringLevel !== currentClusteringLevel || force) {
        if (doBefore !== undefined) {
            doBefore();
        }
        currentClusteringLevel = newClusteringLevel;
        mainCanvas.removeFrom(map);
        mainCanvas = L.canvas();
        let groupingFunction = undefined;
        if (currentClusteringLevel >= CLUSTER_DEGREE) {
            groupingFunction = coord => coord;
        } else {
            groupingFunction = coord => round(coord, 1 / (2 ** currentClusteringLevel));
        }
        getFilteredEvents((filteredEvents) => {
                drawData(filteredEvents, groupingFunction, mainCanvas, "red", true);
                if (doAfter !== undefined) {
                    doAfter();
                    if (firstLoad) {
                        firstLoad = false;

                        setTimeout(() => bottomDrawer.animate({
                            bottom: "0"
                        }, 300), 500);

                        setTimeout(() => bottomDrawer.animate({
                            bottom: "-" + bottomDrawer.height() + "px"
                        }, 200), 1300);

                        setTimeout(() => sideEventsDrawer.animate({
                            right: "-" + sideEventsDrawer.width() / 4 + "px"
                        }, 300), 500);

                        setTimeout(() => sideEventsDrawer.animate({
                            right: "-" + sideEventsDrawer.width() + "px"
                        }, 200), 1300);
                    }
                }
            }
        );
    }
}

// Corresponds to the elements we want to show when we hover on the sankey links
let overCanvas = L.canvas();

function renderOverCanvas(filterFun, callback) {
    overCanvas = L.canvas();
    getFilteredEvents((filteredEvents) => {
        sourceTargetFilteredEvents = filteredEvents.filter(filterFun);
        drawData(sourceTargetFilteredEvents, coord => coord, overCanvas, "blue", false);
        callback(null);
    });
}

function showCountryDetails(countryCode) {
    selectedCountry = countryCode;
    sideCountryDetails.css("margin-left", "0");
    renderSankey();
}

function closeCountryDetails() {
    sideCountryDetails.css("margin-left", "-40%");
}

let svg = d3.select("#container_map").select("svg"),
    g = svg.append("g");

let canvas = L.canvas();
let canvasFilter = L.canvas();

let geoJSONData = "data/custom.geo.json";
let customStyle = {
    stroke: false,
    fillOpacity: 0,
    color: "black",
    cursor: "pointer",
};

function clickFeature(e, properties) {
    let layer = e.target;
    showCountryDetails(properties["iso_a3"]);

}

let boundingCountries = {};

function onEachFeature(feature, layer) {
    layer.on("click", function (e) {
        clickFeature(e, feature.properties);
    });
    layer.on("mouseover", function(e){
        layer.setStyle({fillOpacity: 0.1});
    })
    layer.on("mouseout", function(e){
        layer.setStyle({fillOpacity: 0});
    })
    boundingCountries[feature.properties["iso_a3"]] = layer.getBounds();
}

$.get(geoJSONData, function (data) {
    paneGeojson = map.createPane("geojson");
    paneGeojson.style.zIndex = 400;
    L.geoJson(data, {
        clickable: false,
        style: customStyle,
        onEachFeature: onEachFeature,
        pane: "geojson",
    }).addTo(map)
    d3.json("data/countries_latlng.json", function(data){
        countriesLatLng = data;
    })

});

$(document).keydown(function (event) {
    if (event.key === "Control") {
        paneGeojson.style.zIndex = 390;
    }
})

$(document).keyup(function (event) {
    if (event.key === "Control") {
        paneGeojson.style.zIndex = 400;
    }
})
