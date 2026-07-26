function validateDate(date) {

    return /^(\d{1,2}[\/-]\d{1,2})$/.test(date);

}


function validateTime(time) {

    return /^(\d{1,2}[:.]\d{2})$/.test(time);

}


module.exports = {
    validateDate,
    validateTime
};