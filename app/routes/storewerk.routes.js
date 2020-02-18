module.exports = function (app) {
    var ctrl = require('../controllers/storewerk.controller');

    app.get('/invoice', ctrl.invoice);
}