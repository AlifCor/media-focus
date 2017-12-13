function prepareAccordion() {
    let animTime = 300,
        clickPolice = false;

    $(document).on('touchstart click', '.acc-btn', function () {
        if (!clickPolice) {
            clickPolice = true;

            let currIndex = $(this).index('.acc-btn'),
                targetHeight = $('.acc-content-inner').eq(currIndex).outerHeight();

            $('.acc-btn h1').removeClass('selected');
            $(this).find('h1').addClass('selected');

            $('.acc-content').stop().animate({height: 0}, animTime);
            $('.acc-content').eq(currIndex).stop().animate({height: targetHeight}, animTime);

            setTimeout(function () {
                clickPolice = false;
            }, animTime);
        }

    });
}

let selectedEventCodesChanged = false;

d3.tsv("CAMEO.eventcodes.txt", function (data) {
        const eventCodes = data.filter((cameoElem) => cameoElem.CAMEOEVENTCODE.length === 3);

        const topEvents = data.filter((cameoElem) => cameoElem.CAMEOEVENTCODE.length === 2);

        //On document ready, append to DOM
        $(() => {
            const containerEventSelection = $("#accordion"), containerMap = $("#container_map"), sideMenu = $("#side_menu");

            renderMainCanvas(new Set(eventCodes.map(cameoElem => cameoElem.CAMEOEVENTCODE)));

            topEvents.forEach((cameoElem, index) => {
                const accBtn = $("<div/>").addClass("acc-btn").appendTo(containerEventSelection);
                $("<h1/>").text(cameoElem.CAMEOEVENTCODE + ". " + upperFirstLetters(cameoElem.EVENTDESCRIPTION)).addClass(index === 0 ? "selected" : null).appendTo(accBtn);

                const accContent = $("<div/>").addClass("acc-content" + (index === 0 ? " open" : "")).appendTo(containerEventSelection);
                $("<div/>").attr("id", "events-" + cameoElem.CAMEOEVENTCODE).addClass("acc-content-inner").appendTo(accContent);
            });

            eventCodes.forEach((cameoElem, index) => {
                const id = "box-" + cameoElem.CAMEOEVENTCODE;
                const container = $(`#events-${cameoElem.CAMEOEVENTCODE.substr(0, 2)}`);

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
                        $("<label>" + cameoElem.CAMEOEVENTCODE.substr(2) + ". " + upperFirstLetters(cameoElem.EVENTDESCRIPTION) + "</label>").attr({
                            "for": id,
                            "class": "label_event_checkbox"
                        })
                    )
                ).appendTo(container);

                if (index === eventCodes.length - 1) {
                    //We appended everything, add the behaviour of the accordion
                    prepareAccordion();
                }
            });

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