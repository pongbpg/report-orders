module.exports = function (app) {
    var ctrl = require('../controllers/topslim.controller');
    app.get('/delivery', ctrl.delivery);
    app.get('/dailyTrack', ctrl.dailyTrack);
    app.get('/dailySayHi', ctrl.dailySayHi);
    // app.get('/dailySale', ctrl.dailySale);
    app.get('/dailyProduct', ctrl.dailyProduct);
    app.get('/dailyBank', ctrl.dailyBank);
    app.get('/dailyStatement', ctrl.dailyStatement);
    app.get('/dailyCost', ctrl.dailyCost);
    app.get('/dailyChannel', ctrl.dailyChannel);
    app.get('/com/admin', ctrl.comAdmin);
    app.get('/item/admin', ctrl.itemAdmin);
    app.get('/error/price', ctrl.errorPrice);
    app.get('/infoCustomer',ctrl.infoCustomer);
    app.get('/receipts',ctrl.receipts);

}