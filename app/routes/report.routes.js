module.exports = function (app) {
    var ctrl = require('../controllers/report.controller');
    app.get('/rpt01', ctrl.rpt01);
    app.get('/test', ctrl.test);
}