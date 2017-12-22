$(() => {
    const containerMap = $("#container_map"), bottomMenu = $("#bottom_menu"), slider = $("#slider");
    //TODO change that to current day
    const today = new Date(2017, 11, 19), yesterday = new Date(), past = new Date(2017, 10, 20);
    yesterday.setDate(today.getDate() - 1);

    let lastSelectedMin = yesterday, lastSelectedMax = today;

    slider.bind("valuesChanged", function (e, data) {
        const endDate = new Date(data.values.max);
        let tempDate = new Date(data.values.min);
    }).dateRangeSlider({
        arrows: false,
        wheelMode: "zoom",
        bounds: {
            min: past,
            max: today
        },
        defaultValues: {
            min: yesterday,
            max: today
        },
        range: {
            min: {days: 1},
            max: {days: 3}
        }
    });

    containerMap.hover(function () {
            bottomMenu.stop();
            bottomMenu.animate({
                bottom: "-" + bottomDrawer.height() + "px"
            }, 200);

            const dateValues = slider.dateRangeSlider("values");
            if (!areSameDates(dateValues.min, lastSelectedMin) || !areSameDates(dateValues.max, lastSelectedMax)) {
                lastSelectedMin = dateValues.min;
                lastSelectedMax = dateValues.max;

                slider.trigger("changed", [dateValues]);
            }
        }
    );

    bottomMenu.hover(() => {
            bottomMenu.stop();
            bottomMenu.animate({
                bottom: "0"
            }, 200);
        }
    );
})
;
