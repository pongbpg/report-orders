module.exports = function (app) {
    var ctrl = require('../controllers/storewerk.controller');

    app.get('/invoice/:orderType/:accId/:year/:month', ctrl.invoiceBymonth);
    app.get('/invoice', ctrl.invoice);
    app.get('/dashboard/sale/:year/:month', ctrl.dbSale);
}