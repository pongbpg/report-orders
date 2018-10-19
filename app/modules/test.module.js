module.exports = function (app) {
    app.use(function (req, res, next) {
        
        console.log("test modulessssssssssssssssssss");
        req.x=function(){return "Hello"};
        next();
    });
 
}