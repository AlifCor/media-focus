$(() => {
    const containerMap = $("#container_map");
    const bottomMenu = $("#bottom_menu");
    const today = new Date(), yesterday = new Date(), past = new Date();
    yesterday.setDate(today.getDate() - 1);
    past.setDate(today.getDate() - 30);

    $("#slider").dateRangeSlider({
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
            max: {days: 7}
        }
    });

    containerMap.hover(function () {
            bottomMenu.stop();
            bottomMenu.animate({
                bottom: "-" + bottomDrawer.height() + "px"
            }, 200);
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