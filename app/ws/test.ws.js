module.exports = function (ws) {
    var add2 = function (req,res) {
        console.log("call meeee");
        var x = req.params.x;
        var y = req.params.y;
        console.log("add2() called with " + x + " and " + y);

       

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
            department: "it"
        };
        //var type = req.param("type");
        //req.logger.info(type);
        //console.log(res);
        res.ireport("report1.jrxml", "pdf|save", datas, parameters);

          //req.r.table('apps')
          //.getAll()
          //.run()
          //.then(function(data){
            //  console.log(data);
              //console.log(JSON.stringify(data))
            //  return JSON.stringify(data);
             // res.json({name:"ehllo"});
          //});
       // return x + y;
    };

    var sub=function (args){
       // console.log("ddddfs;dfjas;fja;fja;j")
        console.log(args);
    }

    
    ws.sub("com.test.hello",sub);
    ws.reg("com.test.add", add2);
}
