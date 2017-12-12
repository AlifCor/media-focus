function getFilteredEvents(callback) {
    d3.csv("data_cleaned.csv", (data) => callback(data));
}

// Constants:
const SOURCE_COUNTRY_COL = "source_country_code";
const QUAD_CLASS_COL = "QuadClass";
const QUAD_CLASS_KEYS = ["Verbal Cooperation", "Material Cooperation", "Verbal Conflict", "Material Conflict"];
const EVENT_COUNTRY_COL = "country_code_alpha";
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
let paneGeojson = undefined;

let mainCanvas = L.canvas();
let currentClusteringLevel = -1;

$(() => {

    $('#mydiv').focus();

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
            });

            let div = document.createElement("div");

            let widthBarChart = 300;
            let heightBarChart = 36.7 * eventsNestedQuadClass.length + 80;

            let svg = d3.select(div)
                .attr("width", widthBarChart)
                .attr("height", heightBarChart)
                .append("svg")
                .attr("width", widthBarChart)
                .attr("height", heightBarChart);

            let margin = {top: 50, right: 20, bottom: 30, left: 80};
            let width = +svg.attr("width") - margin.left - margin.right,
                height = +svg.attr("height") - margin.top - margin.bottom;
            let g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            let xScale = d3.scaleLinear().rangeRound([0, width]);
            let yScale = d3.scaleBand().rangeRound([height, 0]).padding(0.1);
            let color = d3.scaleOrdinal(d3.schemeCategory20);
            let xAxis = d3.axisBottom(xScale).ticks(5);
            let yAxis = d3.axisLeft(yScale);

            let stack = d3.stack().keys(QUAD_CLASS_KEYS).offset(d3.stackOffsetNone);
            let layers = stack(eventsNestedQuadClass);
            yScale.domain(eventsNestedQuadClass.map(d => d["country"]));
            let maxTotal = d3.max(eventsNestedQuadClass, d => d["total"]);
            xScale.domain([0, maxTotal]).nice();

            console.log(layers)

            let layer = g.selectAll(".layer")
                .data(layers)
                .enter().append("g")
                .attr("class", "layer")
                .style("fill", (d, i) => color(i));

            layer.selectAll("rect")
                .data(d => d)
            .enter().append("rect")
                .attr("y", d => yScale(d.data["country"]))
                .attr("x", d => xScale(d[0]))
                .attr("height", yScale.bandwidth())
                .attr("width", d => xScale(d[1]) - xScale(d[0]))
                .append("title")
                    .text(function(d){
                        console.log(neededEvents)
                        return d.data["country"]
                    })

            g.append("g")
    			.attr("class", "axis axis--x")
    			.attr("transform", "translate(0," + (height+5) + ")")
    			.call(xAxis);

    		g.append("g")
    			.attr("class", "axis axis--y")
    			.attr("transform", "translate(0,0)")
    			.call(yAxis);

            circle.bindPopup(div);
            circle.openPopup();
        })
        circle.addTo(map);
    })
}

function renderMainCanvas(doBefore = startLoadingScreen, doAfter = endLoadingScreen) {
    function getClusteringLevel(zoomLevel) {
        return Math.floor(zoomLevel / CLUSTER_STEP)
    }

    const currentZoom = map.getZoom();
    const newClusteringLevel = getClusteringLevel(currentZoom);
    if (newClusteringLevel !== currentClusteringLevel) {
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

let geoJSONData = "data/custom.geo.json";
let customStyle = {
    stroke: false,
    //weight: 1.2,
    cursor: "pointer",
};

function clickFeature(e, properties) {
    let layer = e.target;
    console.log(properties.name)
    showCountryDetails(properties["su_a3"]);
}

let boundingCountries = {};

function onEachFeature(feature, layer) {
    layer.on("click", function (e) {
        clickFeature(e, feature.properties);
    });
    /*
    layer.addEventListener("mouseover", function () {
        this.setStyle({
            "fillColor": "black",
        });
    });
    layer.on("mouseout", function () {
        this.setStyle({
            "fillColor": "none",
        });
    });
    */
    boundingCountries[feature.properties["name"]] = layer.getBounds();
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

});

$(document).keydown(function(event){
    if(event.key === "Control"){
        paneGeojson.style.zIndex = 390;
    }
})

$(document).keyup(function(event){
    if(event.key === "Control"){
        paneGeojson.style.zIndex = 400;
    }
})

const defaultCountry = "United States";
let selectedCountry = defaultCountry;
