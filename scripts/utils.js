function upperFirstLetters(str) {
    return str
        .toLowerCase()
        .split(' ')
        .map((w) => {
            if (w.length > 2) {
                return w[0].toUpperCase() + w.substr(1);
            }
            else {
                return w;
            }
        })
        .join(' ');
}

function round(value, step) {
    step || (step = 1.0);
    const inv = 1.0 / step;
    return Math.round(value * inv) / inv;
}

function isANumber(number) {
    return !isNaN(number);
}

function areSameDates(date1, date2) {
    return (date1.getFullYear() === date2.getFullYear()) &&
        (date1.getMonth() === date2.getMonth()) &&
        (date1.getDate() === date2.getDate());
}