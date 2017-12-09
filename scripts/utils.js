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