module.exports = function (app) {
    var ctrl = require('../controllers/topslim.controller');
    app.get('/delivery', ctrl.delivery);
    app.get('/dailyTrack', ctrl.dailyTrack);
    app.get('/dailySayHi', ctrl.dailySayHi);
    // app.get('/dailySale', ctrl.dailySale);
    app.get('/dailyProduct', ctrl.dailyProduct);
    app.get('/dailyBank', ctrl.dailyBank);
    app.get('/dailyCod', ctrl.dailyCod);
    // app.get('/dailyStatement', ctrl.dailyStatement);
    app.get('/statement', ctrl.statement);
    app.get('/dailyStatementProduct', ctrl.dailyStatementProduct);
    app.get('/dailyCost', ctrl.dailyCost);
    app.get('/dailyChannel', ctrl.dailyChannel);
    app.get('/com/:cost', ctrl.comAdmin);
    app.get('/item/admin', ctrl.itemAdmin);
    app.get('/error/price', ctrl.errorPrice);
    app.get('/infoCustomer', ctrl.infoCustomer);
    app.get('/receipts', ctrl.receipts);
    app.get('/covid', ctrl.covid)
    app.post('/jt', ctrl.jt)
    app.get('/fixCodAmount', ctrl.fixCodAmount)
    app.get('/page', ctrl.page)
    app.get('/page2', ctrl.page2)
}