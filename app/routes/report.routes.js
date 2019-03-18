module.exports = function (app) {
    var ctrl = require('../controllers/report.controller');
    app.get('/delivery', ctrl.delivery);
    app.get('/dailyTrack', ctrl.dailyTrack);
    app.get('/dailySayHi', ctrl.dailySayHi);
    app.get('/dailySale', ctrl.dailySale);
    app.get('/dailyProduct', ctrl.dailyProduct);
    app.get('/dailyBank', ctrl.dailyBank);
    app.get('/dailyStatement', ctrl.dailyStatement);
    app.get('/dailyCost', ctrl.dailyCost);
    app.get('/com/admin', ctrl.comAdmin);
    app.get('/test', ctrl.itemAdmin);
    // app.get('/counter', ctrl.counterPage);
}