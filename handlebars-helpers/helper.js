module.exports = {
    ifeq: function (a, b, options) {
        if (a === b) {
            return options.fn(this);
        }
        return options.inverse(this);
    },
    ifnoteq: function (a, b, options) {
        if (a !== b) {
            return options.fn(this);
        }
        return options.inverse(this);
    },
    add: function (a, b) {
        return a + b;
    },
    JSON: function(obj) {
        return JSON.stringify(obj, null, 3);
    },    
}
