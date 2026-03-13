const fs = require("fs");

// ============================================================
// Function 1: getShiftDuration(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getShiftDuration(startTime, endTime) {
    function convertToSeconds(time) {
        let parts = time.trim().split(" ");
        let [h, m, s] = parts[0].split(":").map(Number);
        let period = parts[1].toLowerCase();
        if (period == "pm" && h != 12) h = h + 12;
        if (period == "am" && h == 12) h = 0;
        return h * 3600 + m * 60 + s;
    }

    let diff = convertToSeconds(endTime) - convertToSeconds(startTime);
    let h = Math.floor(diff / 3600);
    let m = Math.floor((diff % 3600) / 60);
    let s = diff % 60;

    let minutes = m < 10 ? "0" + m : "" + m;
    let seconds = s < 10 ? "0" + s : "" + s;
    return h + ":" + minutes + ":" + seconds;
}


// ============================================================
// Function 2: getIdleTime(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getIdleTime(startTime, endTime) {
    function convertToSeconds(time) {
        let parts = time.trim().split(" ");
        let [h, m, s] = parts[0].split(":").map(Number);
        let period = parts[1].toLowerCase();
        if (period == "pm" && h != 12) h = h + 12;
        if (period == "am" && h == 12) h = 0;
        return h * 3600 + m * 60 + s;
    }
    let start = convertToSeconds(startTime);
    let end = convertToSeconds(endTime);
    let idleBefore = start < 8 * 3600 ? 8 * 3600 - start : 0;
    let idleAfter = end > 22 * 3600 ? end - 22 * 3600 : 0;
    let total = idleBefore + idleAfter;
    let h = Math.floor(total / 3600);
    let m = Math.floor((total % 3600) / 60);
    let s = total % 60;
    let minutes = m < 10 ? "0" + m : "" + m;
    let seconds = s < 10 ? "0" + s : "" + s;
    return h + ":" + minutes + ":" + seconds;
}

// ============================================================
// Function 3: getActiveTime(shiftDuration, idleTime)
// shiftDuration: (typeof string) formatted as h:mm:ss
// idleTime: (typeof string) formatted as h:mm:ss
// Returns: string formatted as h:mm:ss
// ============================================================
function getActiveTime(shiftDuration, idleTime) {
    function convertToSeconds(time) {
        let [h, m, s] = time.trim().split(":").map(Number);
        return h * 3600 + m * 60 + s;
    }
    let total = convertToSeconds(shiftDuration) - convertToSeconds(idleTime);
    let h = Math.floor(total / 3600);
    let m = Math.floor((total % 3600) / 60);
    let s = total % 60;
    let minutes = m < 10 ? "0" + m : "" + m;
    let seconds = s < 10 ? "0" + s : "" + s;
    return h + ":" + minutes + ":" + seconds;
}

// ============================================================
// Function 4: metQuota(date, activeTime)
// date: (typeof string) formatted as yyyy-mm-dd
// activeTime: (typeof string) formatted as h:mm:ss
// Returns: boolean
// ============================================================
function metQuota(date, activeTime) {
    function convertToSeconds(time) {
        let [h, m, s] = time.trim().split(":").map(Number);
        return h * 3600 + m * 60 + s;
    }
    let active = convertToSeconds(activeTime);
    let dateParts = date.split("-");
    let month = Number(dateParts[1]);
    let day = Number(dateParts[2]);
    let year = Number(dateParts[0]);
    let quota;
    if (year == 2025 && month == 4 && day >= 10 && day <= 30) {
        quota = 6 * 3600;
    } else {
        quota = 8 * 3600 + 24 * 60;
    }
    return active >= quota;
}

// ============================================================
// Function 5: addShiftRecord(textFile, shiftObj)
// textFile: (typeof string) path to shifts text file
// shiftObj: (typeof object) has driverID, driverName, date, startTime, endTime
// Returns: object with 10 properties or empty object {}
// ============================================================
function addShiftRecord(textFile, shiftObj) {
    let content = fs.readFileSync(textFile, "utf8");
    let lines = content.trim().split("\n");
    let header = lines[0];
    let records = lines.slice(1);

    for (let i = 0; i < records.length; i++) {
        let cols = records[i].split(",");
        if (cols[0].trim() == shiftObj.driverID && cols[2].trim() == shiftObj.date) {
            return {};
        }
    }

    let shiftDuration = getShiftDuration(shiftObj.startTime, shiftObj.endTime);
    let idleTime = getIdleTime(shiftObj.startTime, shiftObj.endTime);
    let activeTime = getActiveTime(shiftDuration, idleTime);
    let quota = metQuota(shiftObj.date, activeTime);

    let newRecord = {
        driverID: shiftObj.driverID,
        driverName: shiftObj.driverName,
        date: shiftObj.date,
        startTime: shiftObj.startTime,
        endTime: shiftObj.endTime,
        shiftDuration: shiftDuration,
        idleTime: idleTime,
        activeTime: activeTime,
        metQuota: quota,
        hasBonus: false
    };

    let newLine = Object.values(newRecord).join(",");
    let lastIndex = -1;
    for (let i = 0; i < records.length; i++) {
        if (records[i].split(",")[0].trim() == shiftObj.driverID) {
            lastIndex = i;
        }
    }

    if (lastIndex == -1) {
        records.push(newLine);
    } else {
        records.splice(lastIndex + 1, 0, newLine);
    }

    fs.writeFileSync(textFile, header + "\n" + records.join("\n"));
    return newRecord;
}

// ============================================================
// Function 6: setBonus(textFile, driverID, date, newValue)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// date: (typeof string) formatted as yyyy-mm-dd
// newValue: (typeof boolean)
// Returns: nothing (void)
// ============================================================
function setBonus(textFile, driverID, date, newValue) {
    let content = fs.readFileSync(textFile, "utf8");
    let lines = content.trim().split("\n");
    for (let i = 1; i < lines.length; i++) {
        let cols = lines[i].split(",");
        if (cols[0].trim() == driverID && cols[2].trim() == date) {
            cols[9] = newValue;
            lines[i] = cols.join(",");
        }
    }
    fs.writeFileSync(textFile, lines.join("\n"));
}

// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof string) formatted as mm or m
// Returns: number (-1 if driverID not found)
// ============================================================
function countBonusPerMonth(textFile, driverID, month) {
    let content = fs.readFileSync(textFile, "utf8");
    let lines = content.trim().split("\n");
    let found = false;
    let count = 0;
    for (let i = 1; i < lines.length; i++) {
        let cols = lines[i].split(",");
        if (cols[0].trim() == driverID) {
            found = true;
            let recordMonth = Number(cols[2].trim().split("-")[1]);
            if (recordMonth == Number(month) && cols[9].trim() == "true") {
                count++;
            }
        }
    }
    if (found == false) return -1;
    return count;
}

// ============================================================
// Function 8: getTotalActiveHoursPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getTotalActiveHoursPerMonth(textFile, driverID, month) {
    let content = fs.readFileSync(textFile, "utf8");
    let lines = content.trim().split("\n");
    let total = 0;
    for (let i = 1; i < lines.length; i++) {
        let cols = lines[i].split(",");
        if (cols[0].trim() == driverID) {
            let recordMonth = Number(cols[2].trim().split("-")[1]);
            if (recordMonth == month) {
                let [h, m, s] = cols[7].trim().split(":").map(Number);
                total += h * 3600 + m * 60 + s;
            }
        }
    }
    let h = Math.floor(total / 3600);
    let m = Math.floor((total % 3600) / 60);
    let s = total % 60;
    let hours = h < 10 ? "0" + h : "" + h;
    let minutes = m < 10 ? "0" + m : "" + m;
    let seconds = s < 10 ? "0" + s : "" + s;
    return hours + ":" + minutes + ":" + seconds;
}
// ============================================================
// Function 9: getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month)
// textFile: (typeof string) path to shifts text file
// rateFile: (typeof string) path to driver rates text file
// bonusCount: (typeof number) total bonuses for given driver per month
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month) {
    let shifts = fs.readFileSync(textFile, "utf8").trim().split("\n");
    let rates = fs.readFileSync(rateFile, "utf8").trim().split("\n");
    
    let dayOff = "";
    for (let i = 0; i < rates.length; i++) {
        let cols = rates[i].split(",");
        if (cols[0].trim() == driverID) {
            dayOff = cols[1].trim();
        }
    }

    let days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    let total = 0;

    for (let i = 1; i < shifts.length; i++) {
        let cols = shifts[i].split(",");
        if (cols[0].trim() == driverID) {
            let recordMonth = Number(cols[2].trim().split("-")[1]);
            if (recordMonth == month) {
                let dateParts = cols[2].trim().split("-");
                let dateObj = new Date(Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2]));
                let dayName = days[dateObj.getDay()];
                if (dayName != dayOff) {
                    let day = Number(dateParts[2]);
                    let year = Number(dateParts[0]);
                    if (year == 2025 && recordMonth == 4 && day >= 10 && day <= 30) {
                        total += 6 * 3600;
                    } else {
                        total += 8 * 3600 + 24 * 60;
                    }
                }
            }
        }
    }

    total -= bonusCount * 2 * 3600;
    let h = Math.floor(total / 3600);
    let m = Math.floor((total % 3600) / 60);
    let s = total % 60;
    let hours = h < 10 ? "0" + h : "" + h;
    let minutes = m < 10 ? "0" + m : "" + m;
    let seconds = s < 10 ? "0" + s : "" + s;
    return hours + ":" + minutes + ":" + seconds;
}

// ============================================================
// Function 10: getNetPay(driverID, actualHours, requiredHours, rateFile)
// driverID: (typeof string)
// actualHours: (typeof string) formatted as hhh:mm:ss
// requiredHours: (typeof string) formatted as hhh:mm:ss
// rateFile: (typeof string) path to driver rates text file
// Returns: integer (net pay)
// ============================================================
function getNetPay(driverID, actualHours, requiredHours, rateFile) {
    let rates = fs.readFileSync(rateFile, "utf8").trim().split("\n");
    let basePay = 0;
    let tier = 0;
    for (let i = 0; i < rates.length; i++) {
        let cols = rates[i].split(",");
        if (cols[0].trim() == driverID) {
            basePay = Number(cols[2].trim());
            tier = Number(cols[3].trim());
        }
    }

    let allowedMissing = 0;
    if (tier == 1) allowedMissing = 50;
    if (tier == 2) allowedMissing = 20;
    if (tier == 3) allowedMissing = 10;
    if (tier == 4) allowedMissing = 3;

    function convertToSeconds(time) {
        let [h, m, s] = time.trim().split(":").map(Number);
        return h * 3600 + m * 60 + s;
    }

    let actual = convertToSeconds(actualHours);
    let required = convertToSeconds(requiredHours);

    if (actual >= required) return basePay;

    let missingSeconds = required - actual;
    let missingHours = missingSeconds / 3600;
    missingHours = missingHours - allowedMissing;

    if (missingHours <= 0) return basePay;

    let billableHours = Math.floor(missingHours);
    let deductionRate = Math.floor(basePay / 185);
    let deduction = billableHours * deductionRate;
    return basePay - deduction;
}

module.exports = {
    getShiftDuration,
    getIdleTime,
    getActiveTime,
    metQuota,
    addShiftRecord,
    setBonus,
    countBonusPerMonth,
    getTotalActiveHoursPerMonth,
    getRequiredHoursPerMonth,
    getNetPay
};
