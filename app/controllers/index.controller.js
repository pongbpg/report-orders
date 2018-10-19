//const sha1 = require('js-sha1');
exports.render = function (req, res) {
    /*res.render('index', {
        'title': "Hello",
        'message': "Hello First Viwer"
    });*/
    
    res.send("Hello");
}

exports.ws = function (req, res) {
   
    req.ws.call("com.test.add",{x:2,y:3}).then(function(data){
        req.ws.pub("com.test.hello",data);
        res.send(data);
    });

}



exports.db = function (req, res) {
    var r = req.r;
   console.log(req.x());
    //console.log(r);
    var x = function (data) {
        res.json(data);
    }
   // console.log("xxx");
    //try {
       // r.db("oauth")
            r.table("users").coerceTo('Array')
            .pager(req)
            .run()
            .then(function (data) {
                x(data);

            });
   // } catch (f) {
       // console.log(f);
      //  next();
    //}

    //  ฝฝ ฝฝฝฝ.finally(function (data) {
    //       res.json(data);
    //   }).catch(function (err) {
    //   res.send(err);
    //  })


}

exports.jdbc = function (req, res) {
    req.jdbc.query("mssql", "SELECT *  FROM  contract_type", [], function (err, data) {
        res.send(data);

        
    });
}

exports.report = function (req, res) {
    var datas = [
        {
            name: "somchit",
            surname: "chanudom",
            address: "5/424",
            subject: [{
                name: "test",
                title: "xxxx"
            }],
            exports: [
                "a", "b", "c"
            ]
        },
        {
            name: "somchit",
            surname: "chanudom",
            address: "5/424",
            subject: [{
                name: "test",
                title: "xxxx"
            }]
            ,
            exports: [
                "a", "b", "c"
            ]
        }, {
            name: "somchit",
            surname: "chanudom",
            address: "5/424",
            subject: [{
                name: "test",
                title: "xxxx"
            }]
            ,
            exports: [
                "a", "b", "c"
            ]
        }
    ];
    var parameters = {
        department: "it",
        OUTPUT_NAME:"ทดสอบ"
    };
    //var type = req.param("type");
    //req.logger.info(type);
    res.ireport("report1.jrxml", "pdf", datas, parameters);
}

exports.userinfo = function (req, res) {
    if (!req.user) {
        res.send("Not Login");
    } else {
        res.json(req.user);
    }
}

exports.ajv = function (req, res) {

    var u = {
        id: 1333
    };

    var valid = req.ajv.validate('user', u);
    if (!valid) req.logger.info(req.ajv.errorsText());

    res.send(req.ajv.errorsText());
}


exports.pusher = function (req, res) {
    req.logger.info("pusher");
    res.pusher([
        "/bower_components/polymer/polymer.html",
        "/bower_components/polymer/polymer-mini.html",
        "/bower_components/polymer/polymer-micro.html",
        "/images/icon/app-icon-32.png",
        "/bower_components/gl-font/fonts/csChatThai/CSChatThaiUI.ttf"

    ], function (err) {
        console.log(err);
        res.end("");
    })
};

 exports.sha1= function(req, res) {
        var password = req.query.password;
        var data = sha1(password);
        res.send(data);
    }