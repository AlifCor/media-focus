function getFilteredEvents(callback) {
    d3.csv("november_lat_long_eventcode.csv", (data) => callback(data));
}

// Constants:
const SOURCE_COUNTRY_COL = "source_country_name";
const EVENT_COUNTRY_COL = "country_name";
const EVENT_CODE_TYPE = "EventRootCode";
const LAT_COL = "ActionGeo_Lat";
const LONG_COL = "ActionGeo_Long";

let firstLoad = true;

// Here we declare the general DOM references
let sideEventsDrawer, sideCountryDetails, countryCloseBtn, map = undefined;

let mainCanvas = L.canvas();
let currentClusteringLevel = -1;

$(() => {
    // We create our Leaflet map
    map = L.map('container_map', {zoomControl: false}).setView([39.74739, -105], 4);
    sideEventsDrawer = $("#side_menu");
    sideCountryDetails = $("#side_country_details");
    countryCloseBtn = $("#country_close_btn");
    
    countryCloseBtn.click(closeCountryDetails);

    L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
        attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
        maxZoom: 18,
        id: 'mapbox.streets',
        accessToken: 'pk.eyJ1IjoiYWhtZWRrdWxvdmljIiwiYSI6ImNqYTR2Mmp1dTlsbmoycXB5aXkyOXdtMjkifQ.sU3WNVes2qNhTFH-0nAzYA'
    }).addTo(map);

    renderMainCanvas();
});

function drawData(dataToShow, groupingFunction, canvas, color) {
    const grouped = d3.nest()
        .key(d => [groupingFunction(d[LAT_COL]), groupingFunction(d[LONG_COL])])
        .rollup(group => [group.length, d3.nest().key(d => d[SOURCE_COUNTRY_COL]).entries(group), d3.nest().key(d => d[SOURCE_COUNTRY_COL]).key(d => d["QuadClass"]).entries(group)])
        .entries(dataToShow);
    grouped.forEach((data, index) => {
        const latlngArray = data.key.split(",");
        const latlng = new L.LatLng(latlngArray[0], latlngArray[1]);
        let circle = L.circleMarker(latlng, {
            renderer: canvas,
            stroke: false,
            fillColor: color,
            radius: Math.sqrt(data.value[0]) + 1,
        });
        circle.on("click", () => {
            const neededEvents = data.value[1]
                .sort((a, b) => b.values.length - a.values.length)
                .slice(0, 6);
            let div = document.createElement("div");
            console.log(data.value[2])
            console.log(neededEvents)
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

            console.log(width)

            let x = d3.scaleBand().rangeRound([0, width]).padding(0.1),
                y = d3.scaleLinear().rangeRound([height, 0]);

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

            circle.bindPopup(div);
            circle.openPopup();
        })
        circle.addTo(map);
    })
}

function renderMainCanvas(doBefore = startLoadingScreen, doAfter = endLoadingScreen) {
    if (doBefore !== undefined) {
        doBefore();
    }

    function getClusteringLevel(zoomLevel) {
        if (zoomLevel >= 0 && zoomLevel < 6) {
            return 0;
        } else if (zoomLevel >= 6) {
            return 1;
        }
    }

    const currentZoom = map.getZoom();
    const newClusteringLevel = getClusteringLevel(currentZoom);
    if (newClusteringLevel !== currentClusteringLevel) {
        mainCanvas.removeFrom(map);
        let groupingFunction = (coord) => coord;
        switch (currentClusteringLevel) {
            case 0:
                groupingFunction = (coord) => (Math.round(coord));
                break;
            case 1:
                groupingFunction = (coord) => coord;
                break;
            default:
                break;
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
    currentClusteringLevel = newClusteringLevel;
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
    zIndex: 2,
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
    boundingCountries[feature.properties["name"]] = layer.getBounds();
}

$.get(geoJSONData, function (data) {

    L.geoJson(data, {
        clickable: true,
        style: customStyle,
        onEachFeature: onEachFeature,
    }).addTo(map);
});

const defaultCountry = "United States";
let selectedCountry = defaultCountry;

//preprocessMentions();