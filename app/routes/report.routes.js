module.exports = function (app) {
    var ctrl = require('../controllers/report.controller');
    app.get('/delivery', ctrl.delivery);
    app.get('/dailySale', ctrl.dailySale);
    app.get('/dailyTrack', ctrl.dailyTrack);
    app.get('/dailyBank', ctrl.dailyBank);
    app.get('/test', ctrl.test);
    app.get('/counter', ctrl.counterPage);
}