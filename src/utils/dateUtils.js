const months = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember"
];



function parseDeadline(date, time){

    if(!date || !time)
        return null;


    const datePart =
        date.trim().split("/");


    const timePart =
        time.trim().split(":");



    if(
        datePart.length !== 2 ||
        timePart.length !== 2
    ){

        return null;

    }



    const day =
        Number(datePart[0]);

    const month =
        Number(datePart[1]);


    const hour =
        Number(timePart[0]);

    const minute =
        Number(timePart[1]);



    if(
        Number.isNaN(day) ||
        Number.isNaN(month) ||
        Number.isNaN(hour) ||
        Number.isNaN(minute)
    ){

        return null;

    }



    if(
        month < 1 ||
        month > 12 ||
        day < 1 ||
        day > 31 ||
        hour < 0 ||
        hour > 23 ||
        minute < 0 ||
        minute > 59
    ){

        return null;

    }



    const year =
        new Date().getFullYear();



    return new Date(
        year,
        month - 1,
        day,
        hour,
        minute
    );

}



function formatDeadline(date){

    if(!date)
        return "-";


    const parts =
        date.split("/");


    const day =
        parts[0];


    const month =
        Number(parts[1]);



    return `${day} ${months[month - 1]}`;

}



module.exports = {

    parseDeadline,

    formatDeadline

};