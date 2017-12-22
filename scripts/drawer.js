function prepareAccordion() {
    const animTime = 300;
    let clickPolice = false;

    const accContent = $('.acc-content');

    $(document).on('touchstart click', '.acc-btn .arrow', function () {
        if (!clickPolice) {
            clickPolice = true;
            const $this = $(this).parent().parent();

            const currIndex = $this.index('.acc-btn'),
                targetHeight = $('.acc-content-inner').eq(currIndex).outerHeight();

            $('.acc-btn h1, .acc-btn label').removeClass('selected');
            $this.find('h1, label').addClass('selected');

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
            const newFilterlingLevel = parseInt($("#filter-level").val());
            if (newFilterlingLevel !== filteringLevel) {
                filteringLevel = newFilterlingLevel;
                buildAccordion();
            }
        }
    )
);

function buildAccordion() {
    const containerEventSelection = $("#acc-elements"), animTime = 300;

    containerEventSelection.animate({opacity: 0}, animTime);

    setTimeout(function () {
        const topEvents = cameoData.filter((cameoElem) => cameoElem.CAMEOEVENTCODE.length === filteringLevel - 1);
        const eventCodes = cameoData.filter((cameoElem) => cameoElem.CAMEOEVENTCODE.length === filteringLevel);

        containerEventSelection.html("");

        topEvents.forEach((cameoElem) => {
            const accBtn = $("<div/>").addClass("acc-btn").appendTo(containerEventSelection);
            //$("<h1/>").text(cameoElem.CAMEOEVENTCODE + ". " + upperFirstLetters(cameoElem.EVENTDESCRIPTION)).appendTo(accBtn);

            const id = "box-" + cameoElem.CAMEOEVENTCODE;
            $("<div/>").addClass("pretty p-default p-smooth p-bigger").append(
                $("<input/>", {
                    "type": "checkbox",
                    "checked": true,
                    "id": id,
                    "class": "top_event_checkbox",
                    "data-code": cameoElem.CAMEOEVENTCODE
                }).change(function () {
                        const parent = $(this).parents(".acc-btn");
                        const currIndex = parent.index(".acc-btn");
                        if (this.checked) {
                            $('.acc-content').eq(currIndex).find("input[type='checkbox']").not(":checked").click();
                        }
                        else {
                            $('.acc-content').eq(currIndex).find("input[type='checkbox']:checked").click();
                        }
                    }
                )
            ).append(
                $("<div/>").addClass("state p-success")
                    .append(
                        $("<label>" + cameoElem.CAMEOEVENTCODE + ". " + upperFirstLetters(cameoElem.EVENTDESCRIPTION) + "</label>").attr({
                            "for": id,
                            "class": "label_event_checkbox"
                        })
                    )
            ).append(
                $("<div/>").addClass("arrow")
            ).appendTo(accBtn);

            const accContent = $("<div/>").addClass("acc-content").appendTo(containerEventSelection);
            $("<div/>").attr("id", "events-" + cameoElem.CAMEOEVENTCODE).addClass("acc-content-inner").appendTo(accContent);
        });

        eventCodes.forEach((cameoElem) => {
            const id = "box-" + cameoElem.CAMEOEVENTCODE;
            const container = $(`#events-${categoryForEvent(cameoElem.CAMEOEVENTCODE)}`);

            $("<div/>").addClass("pretty p-default p-smooth p-bigger").append(
                $("<input/>", {
                    "type": "checkbox",
                    "checked": true,
                    "id": id,
                    "class": "event_checkbox",
                    "data-code": cameoElem.CAMEOEVENTCODE
                }).change(() => {
                    selectedEventCodesChanged = true;
                    $("#pending_changes").show(500);
                })
            ).append(
                $("<div/>").addClass("state p-success").append(
                    $("<label>" + cameoElem.CAMEOEVENTCODE + ". " + upperFirstLetters(cameoElem.EVENTDESCRIPTION) + "</label>").attr({
                        "for": id,
                        "class": "label_event_checkbox"
                    })
                )
            ).appendTo(container);
        });

        containerEventSelection.stop().animate({opacity: 1}, animTime);
        prepareAccordion();
    }, animTime);
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

            containerMap.hover(function () {
                    sideMenu.stop();
                    sideMenu.animate({
                        right: "-" + sideMenu.width() + "px"
                    }, 200);
                    if (selectedEventCodesChanged === true) {
                        $("#pending_changes").hide(500);
                        selectedEventCodesChanged = false;
                        containerEventSelection.trigger("changed", [new Set(containerEventSelection.find('.event_checkbox:checked').map((i, el) => $(el).attr("data-code")).get())]);
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