module.exports = function (app) {
    var ctrl = require('../controllers/storekub.controller');

    app.get('/invoice', ctrl.invoice);
    app.get('/test', ctrl.test);
}