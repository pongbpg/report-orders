module.exports = function (app) {
    var ctrl = require('../controllers/report.controller');
    app.get('/delivery', ctrl.delivery);
    app.get('/dailySale', ctrl.dailySale);
    app.get('/dailyTrack', ctrl.dailyTrack);
    app.get('/setpages', ctrl.setpages);
}