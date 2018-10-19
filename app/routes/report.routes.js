module.exports = function (app) {
    var ctrl = require('../controllers/report.controller');
    app.get('/print', ctrl.print);
}