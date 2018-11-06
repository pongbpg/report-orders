module.exports = function (app) {
    var ctrl = require('../controllers/counter.controller');
    app.get('/', ctrl.page);
}