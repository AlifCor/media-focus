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
    var inv = 1.0 / step;
    return Math.round(value * inv) / inv;
}

function isANumber(number){
    return !isNaN(number);
}
