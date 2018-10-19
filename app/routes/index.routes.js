module.exports = function (app) {
    var index = require('../controllers/index.controller');
    app.get('/', index.render);
    app.get('/db', index.db);
    app.get('/jdbc', index.jdbc);
    app.get('/userinfo', index.userinfo);
    app.get('/report', index.report);
    app.get('/ajv', index.ajv);
    app.get('/pusher', index.pusher);
    app.get('/sha1', index.sha1);
    app.get('/ws', index.ws);

    //console.log(app.ws)
   // app.ws.register("com.test.add", function(req,res){ res.json({name:"Hello"}) });

}