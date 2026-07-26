function normalizeDate(date) {

    return date.replace("-", "/");

}


function normalizeTime(time) {

    return time.replace(".", ":");

}


module.exports = {
    normalizeDate,
    normalizeTime
};