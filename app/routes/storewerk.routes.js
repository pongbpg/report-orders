module.exports = function (app) {
    var ctrl = require('../controllers/storewerk.controller');

    app.get('/invoice/:orderType/:accId', ctrl.invoiceBymonth);
    app.post('/invoice/:orderType/:accId', ctrl.invoiceBymonth2);
    app.get('/invoice', ctrl.invoice);
    app.get('/dashboard/sale/:year/:month', ctrl.dbSale);
}