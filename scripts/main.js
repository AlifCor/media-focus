function getFilteredEvents(callback) {
    d3.csv("november_lat_long_eventcode.csv", (data) => callback(data));
}

// Constants:
const SOURCE_COUNTRY_COL = "source_country_name";
const QUAD_CLASS_COL = "QuadClass";
const QUAD_CLASS_KEYS = ["Verbal Cooperation", "Material Cooperation", "Verbal Conflict", "Material Conflict"];
const EVENT_COUNTRY_COL = "country_name";
const EVENT_CODE_TYPE = "EventRootCode";
const LAT_COL = "ActionGeo_Lat";
const LONG_COL = "ActionGeo_Long";

const MAX_ZOOM = 18;
const CLUSTER_DEGREE = 8;
const CLUSTER_STEP = Math.floor(MAX_ZOOM / CLUSTER_DEGREE);
const CIRCLE_RADIUS_FACTOR = 0.04;

let firstLoad = true;

// Here we declare the general DOM references
let sideEventsDrawer, sideCountryDetails, countryCloseBtn, map = undefined;

let mainCanvas = L.canvas();
let currentClusteringLevel = -1;

let geoJSONData = "data/custom.geo.json";
let customStyle = {
    stroke: false,
    //weight: 1.2,
    cursor: "pointer",
};

function clickFeature(e, properties) {
    let layer = e.target;
    showCountryDetails(properties["name"]);
}

let boundingCountries = {};

function onEachFeature(feature, layer) {
    layer.on("click", function (e) {
        clickFeature(e, feature.properties);
    });
    /*
    layer.addEventListener("mouseover", function () {
        console.log("mouseover")
        this.setStyle({
            "fillColor": "black",
        });
    });
    layer.on("mouseout", function () {
        console.log("mouseout");
        this.setStyle({
            "fillColor": "none",
        });
    });
    */
    boundingCountries[feature.properties["name"]] = layer.getBounds();
}

$.get(geoJSONData, function (data) {
    L.geoJson(data, {
        clickable: true,
        style: customStyle,
        onEachFeature: onEachFeature,
    }).addTo(map)

});

$(() => {
    // We create our Leaflet map
    map = L.map('container_map', {zoomControl: false}).setView([39.74739, -105], 4);
    sideEventsDrawer = $("#side_menu");
    sideCountryDetails = $("#side_country_details");
    countryCloseBtn = $("#country_close_btn");

    countryCloseBtn.click(closeCountryDetails);

    L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
        attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
        maxZoom: MAX_ZOOM,
        id: 'mapbox.streets',
        accessToken: 'pk.eyJ1IjoiYWhtZWRrdWxvdmljIiwiYSI6ImNqYTR2Mmp1dTlsbmoycXB5aXkyOXdtMjkifQ.sU3WNVes2qNhTFH-0nAzYA'
    }).addTo(map);

    renderMainCanvas();
    map.on("zoomend", function(){
        renderMainCanvas();
    })
});

function drawData(dataToShow, groupingFunction, canvas, color) {
    function meand3(group, attrib){
        return d3.mean(group.map(d => parseFloat(d[attrib])))
    }
    const grouped = d3.nest()
        .key(d => [groupingFunction(d[LAT_COL]), groupingFunction(d[LONG_COL])])
        .rollup(group => [group.length, d3.nest().key(d => d[SOURCE_COUNTRY_COL]).entries(group),
            d3.nest().key(d => d[SOURCE_COUNTRY_COL]).key(d => d["QuadClass"]).entries(group),
            [meand3(group, LAT_COL), meand3(group, LONG_COL)]])
        .entries(dataToShow);
    const currentZoom = map.getZoom();
    grouped.forEach((data, index) => {
        const meanCoord = data.value[3];
        const latlngArray = data.key.split(",");
        const latlng = new L.LatLng(meanCoord[0], meanCoord[1]);
        let circle = L.circleMarker(latlng, {
            renderer: canvas,
            stroke: false,
            fillColor: color,
            radius: (Math.sqrt(data.value[0]) + 1) * CIRCLE_RADIUS_FACTOR * 2**(CLUSTER_STEP * 0.8 * currentClusteringLevel),
        });
        circle.on('mouseover', function(){
            circle.setStyle({ fillOpacity: 0.5});
        });

        // Un-highlight the marker on hover out
        circle.on('mouseout', function(){
            circle.setStyle({ fillOpacity: 0.2});
        });
        circle.on("click", () => {
            const neededEvents = data.value[1]
                .sort((a, b) => b.values.length - a.values.length)
                .slice(0, 6);
            const eventsNestedQuadClass = neededEvents.map(country => {
                const tempNest = d3.nest()
                    .key(d => d[QUAD_CLASS_COL])
                    .rollup(group => group.length)
                    .entries(country.values)

                //We create an object where the key is the quad class and the value is the number of times it appears
                const valuesQC = tempNest.reduce((prev, curr) => {prev[curr["key"]] = curr["value"]; return prev}, {});
                const total = tempNest.reduce((total, pair) => total + pair["value"], 0);
                let result = {
                    "country": country.key,
                    "total": total,
                };
                QUAD_CLASS_KEYS.forEach((elem, i) => {
                    result[elem] = valuesQC["" + (i + 1)] || 0
                })
                return result;
            })/*.map(country => ({
                "country": country.key,
                "Verbal Cooperation": country.values["1"] || 0,
                "Material Cooperation": country.values["2"] || 0,
                "Verbal Conflict": country.values["3"] || 0,
                "Material Conflict": country.values["4"] || 0,
            }))*/
            let div = document.createElement("div");
            console.log(eventsNestedQuadClass)

            //let div = $("<div style=\"width: 200px; height: 200px;\"><svg width=\"200px\" height=\"200px\"><svg/></div>")[0];
            //let svg = d3.select(div).select("svg");
            let svg = d3.select(div)
                .attr("width", 200)
                .attr("height", 200)
                .append("svg")
                .attr("width", 200)
                .attr("height", 200);
            /*

            let margin = {top: 20, right: 20, bottom: 30, left: 40},
            let width = +svg.attr("width") - margin.left - margin.right,
            let height = +svg.attr("height") - margin.top - margin.bottom,
            let g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");
            let x = d3.scaleBand()
                .rangeRound([0, width])
                .paddingInner(0.05)
                .align(0.1);
            let y = d3.scaleLinear()
                .rangeRound([height, 0]);
            let z = d3.scaleOrdinal()
                .range(["#98abc5", "#8a89a6", "#7b6888", "#6b486b", "#a05d56", "#d0743c", "#ff8c00"]);
            */
            console.log(svg.attr("width"))
            let margin = {top: 20, right: 20, bottom: 30, left: 40};
            let width = +svg.attr("width") - margin.left - margin.right,
                height = +svg.attr("height") - margin.top - margin.bottom;
            let g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");


            let x = d3.scaleBand().rangeRound([0, width]).padding(0.1);
            let y = d3.scaleLinear().rangeRound([height, 0]);
            let z = d3.scaleOrdinal().range(["#98abc5", "#8a89a6", "#7b6888", "#6b486b"]);

            let keys = QUAD_CLASS_KEYS;
            x.domain(eventsNestedQuadClass.map(d => d["country"]));
            y.domain([0, d3.max(eventsNestedQuadClass.map(d => d["total"]))]).nice();
            z.domain(keys);

            g.append("g")
                .selectAll("g")
                .data(d3.stack().keys(keys)(eventsNestedQuadClass))
                .enter().append("g")
                  .attr("fill", function(d) { return z(d.key); })
                .selectAll("rect")
                .data(function(d) { return d; })
                .enter().append("rect")
                  .attr("x", function(d) { return x(d.data.State); })
                  .attr("y", function(d) { return y(d[1]); })
                  .attr("height", function(d) { return y(d[0]) - y(d[1]); })
                  .attr("width", x.bandwidth());

              g.append("g")
                  .attr("class", "axis")
                  .attr("transform", "translate(0," + height + ")")
                  .call(d3.axisBottom(x));

              g.append("g")
                  .attr("class", "axis")
                  .call(d3.axisLeft(y).ticks(null, "s"))
                .append("text")
                  .attr("x", 2)
                  .attr("y", y(y.ticks().pop()) + 0.5)
                  .attr("dy", "0.32em")
                  .attr("fill", "#000")
                  .attr("font-weight", "bold")
                  .attr("text-anchor", "start")
                  .text("Population");
            /*
            let g = svg.append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            x.domain(neededEvents.map(function (d) {
                return d.key;
            }));
            y.domain([0, d3.max(neededEvents, function (d) {
                return d.values.length;
            })]);

            g.append("g")
                .attr("class", "axis axis--x")
                .attr("transform", "translate(0," + height + ")")
                .call(d3.axisBottom(x));

            g.append("g")
                .attr("class", "axis axis--y")
                .call(d3.axisLeft(y).ticks(10, "%"))
                .append("text")
                .attr("transform", "rotate(-90)")
                .attr("y", 6)
                .attr("dy", "0.71em")
                .attr("text-anchor", "end")
                .text("Number of events");

            g.selectAll(".bar")
                .data(neededEvents)
                .enter().append("rect")
                .attr("class", "bar")
                .attr("x", function (d) {
                    return x(d.key);
                })
                .attr("y", function (d) {
                    return y(d.values.length);
                })
                .attr("width", x.bandwidth())
                .attr("height", function (d) {
                    return height - y(d.values.length);
                });
                */
            circle.bindPopup(div);
            circle.openPopup();
        })
        circle.addTo(map);
        //
    })
}

function renderMainCanvas(doBefore = startLoadingScreen, doAfter = endLoadingScreen) {
    function getClusteringLevel(zoomLevel) {
        return Math.floor(zoomLevel / CLUSTER_STEP)
    }

    const currentZoom = map.getZoom();
    const newClusteringLevel = getClusteringLevel(currentZoom);
    console.log(currentClusteringLevel)
    console.log(newClusteringLevel)
    if (newClusteringLevel !== currentClusteringLevel) {
        console.log("Changing")
        if (doBefore !== undefined) {
            doBefore();
        }
        currentClusteringLevel = newClusteringLevel;
        mainCanvas.removeFrom(map);
        mainCanvas = L.canvas();
        let groupingFunction = undefined;
        if(currentClusteringLevel >= CLUSTER_DEGREE){
            groupingFunction = coord => coord;
        } else {
            groupingFunction = coord => round(coord, 1 / (2**currentClusteringLevel));
        }
        getFilteredEvents((filteredEvents) => {
                drawData(filteredEvents, groupingFunction, mainCanvas, "red");
                if (doAfter !== undefined) {
                    doAfter();
                    if (firstLoad) {
                        firstLoad = false;

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

function renderOverCanvas(filterFun) {
    overCanvas.removeFrom(map);
    getFilteredEvents((filteredEvents) => {
        sourceTargetFilteredEvents = filteredEvents.filter(filterFun);
        drawData(sourceTargetFilteredEvents, coord => coord, overCanvas, "blue");
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
// let currentClusteringLevel = -1;

const defaultCountry = "United States";
let selectedCountry = defaultCountry;
