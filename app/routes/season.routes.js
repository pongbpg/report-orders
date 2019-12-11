module.exports = function (app) {
    var ctrl = require('../controllers/season.controller');
    app.get('/delivery', ctrl.delivery);
    app.get('/dailyTrack', ctrl.dailyTrack);
    app.get('/dailySayHi', ctrl.dailySayHi);
    // app.get('/dailySale', ctrl.dailySale);
    app.get('/dailyProduct', ctrl.dailyProduct);
    app.get('/dailyBank', ctrl.dailyBank);
    app.get('/dailyCod', ctrl.dailyCod);
    app.get('/dailyStatement', ctrl.dailyStatement);
    app.get('/dailyCost', ctrl.dailyCost);
    app.get('/dailyChannel', ctrl.dailyChannel);
    app.get('/com/:cost', ctrl.comAdmin);
    app.get('/item/admin', ctrl.itemAdmin);
    app.get('/infoCustomer', ctrl.infoCustomer);
    // app.get('/cod2', ctrl.cod2)
    // app.get('/test', ctrl.updateRt);
}