var utils = {
    ObjSort: (obj) => {
        if (!obj) return;
        var _arr = [],
            objarr = Object.keys(obj);
        var result = [];
        objarr.forEach(e => {
            _arr.push(obj[e])
        });
        utils.bubbleSort(_arr).forEach(e => {
            objarr.forEach(element => {
                if (e == obj[element]) {
                    result.push(element)
                }
            })
        })
        return result;
    },
    bubbleSort: function (array) {
        var i = 0, len = array.length, j, d; for (; i < len; i++) {
            for (j = 0; j < len; j++) {
                if (array[i] > array[j]) {
                    d = array[j]; array[j] = array[i]; array[i] = d;
                }
            }
        }
        return array;
    }
}
module.exports = utils;