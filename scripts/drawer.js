function prepareAccordion() {
    let animTime = 300,
        clickPolice = false;

    const accContent = $('.acc-content');

    $(document).on('touchstart click', '.acc-btn', function () {
        if (!clickPolice) {
            clickPolice = true;

            let currIndex = $(this).index('.acc-btn'),
                targetHeight = $('.acc-content-inner').eq(currIndex).outerHeight();

            $('.acc-btn h1').removeClass('selected');
            $(this).find('h1').addClass('selected');

            accContent.stop().animate({height: 0}, animTime);
            accContent.eq(currIndex).stop().animate({height: targetHeight}, animTime);

            setTimeout(function () {
                clickPolice = false;
            }, animTime);
        }

    });
}

function categoryForEvent(cameoEventCode) {
    const size = cameoEventCode.length;
    if (size > 2) {
        return cameoEventCode.substr(0, size - 1);
    }
    else if (size === 2) {
        const intCode = parseInt(cameoEventCode);
        if (intCode <= 5) {
            return "1";
        }
        else if (intCode <= 9) {
            return "2";
        }
        else if (intCode <= 14) {
            return "3";
        }
        else {
            return "4";
        }
    }
}

let selectedEventCodesChanged = false, filteringLevel = 2;

$(() =>
    $("#filter-level").change(() => {
            const newFilterlingLevel = $("#filter-level").val();
            if (newFilterlingLevel !== filteringLevel) {
                filteringLevel = newFilterlingLevel;
                buildAccordion();
            }
        }
    )
);

function buildAccordion() {
    const containerEventSelection = $("#acc-elements");
    containerEventSelection.html("");
    const topEvents = cameoData.filter((cameoElem) => cameoElem.CAMEOEVENTCODE.length === filteringLevel - 1);
    const eventCodes = cameoData.filter((cameoElem) => cameoElem.CAMEOEVENTCODE.length === filteringLevel);

    topEvents.forEach((cameoElem, index) => {
        const accBtn = $("<div/>").addClass("acc-btn").appendTo(containerEventSelection);
        $("<h1/>").text(cameoElem.CAMEOEVENTCODE + ". " + upperFirstLetters(cameoElem.EVENTDESCRIPTION)).appendTo(accBtn);

        const accContent = $("<div/>").addClass("acc-content").appendTo(containerEventSelection);
        $("<div/>").attr("id", "events-" + cameoElem.CAMEOEVENTCODE).addClass("acc-content-inner").appendTo(accContent);
    });

    eventCodes.forEach((cameoElem, index) => {
        const id = "box-" + cameoElem.CAMEOEVENTCODE;
        const container = $(`#events-${categoryForEvent(cameoElem.CAMEOEVENTCODE)}`);

        $("<div/>").addClass("pretty p-default p-smooth p-bigger").append(
            $("<input/>", {
                "type": "checkbox",
                "checked": true,
                "id": id,
                "class": "event_checkbox",
                "data-code": cameoElem.CAMEOEVENTCODE
            }).change(() => selectedEventCodesChanged = true)
        ).append(
            $("<div/>").addClass("state p-success").append(
                $("<label>" + cameoElem.CAMEOEVENTCODE + ". " + upperFirstLetters(cameoElem.EVENTDESCRIPTION) + "</label>").attr({
                    "for": id,
                    "class": "label_event_checkbox"
                })
            )
        ).appendTo(container);
    });
}

let containerMap, sideMenu;
let cameoData;

d3.tsv("CAMEO.eventcodes.txt", function (data) {
        cameoData = data;

        //On document ready, append to DOM
        $(() => {
            const containerEventSelection = $("#accordion");
            containerMap = $("#container_map");
            sideMenu = $("#side_menu");

            buildAccordion();

            prepareAccordion();

            containerMap.hover(() => {
                    sideMenu.stop();
                    sideMenu.animate({
                        right: "-" + sideMenu.width() + "px"
                    }, 200);
                    if (selectedEventCodesChanged === true) {
                        containerEventSelection.trigger("changed", [new Set(containerEventSelection.find('.event_checkbox:checkbox:checked').map((i, el) => $(el).attr("data-code")).get())]);
                        selectedEventCodesChanged = false;
                    }
                }
            );

            sideMenu.hover(() => {
                    sideMenu.stop();
                    sideMenu.animate({
                        right: "0px"
                    }, 200);
                }
            );
        });
    }
);

function startLoadingScreen() {
    $("body").removeClass('loaded');
}

function endLoadingScreen() {
    $("body").addClass('loaded');
}


function switchLoadingScreen() {
    $("body").toggleClass('loaded');
}