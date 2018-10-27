const admin = require('firebase-admin');
const moment = require('moment');
moment.locale('th');
admin.initializeApp({
    credential: admin.credential.cert({
        "type": "service_account",
        "project_id": "bot-orders",
        "private_key_id": "0f2feafb9984394ade8a93d41396e070a82a4b00",
        "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDPpujz1uypAbBJ\nLSLTq7vAIpm5bvps+cFbTOQtbeFtCBPikIaR61usZLznl47OPRjmdsXSw/n2UkAD\nX69vwkFLk2PEhcVc4DXddtiZhyIEmSGBZZhe0WmWYeqQ1knRW4Q7bX6rhtMSST3B\nryp0/6W7sE3fKOl0zil3ee1UHAeSIg2KHksmf58L2k0PGlr2eFXKt9h7v5bHyj8L\n0aqafduZ5Oxd8Or2HQ02RUB0IFRH6KOSCIrEVk4I1JaySTKgJFMB6R6WivpAXFWN\nUgu1u6/ZXoTP0yNxoQD6C5pE+zi4h+mPHi2a8KaHSI3R3/aSX1SoUt8FK5XnOTmU\nwqtPBet3AgMBAAECggEABozfVax2nrDc8hH9wpZCP+ys02VQJQE5O5C7X0DTbEW6\n9YSq72NwlYmVTpZAp6TUakCzkNMkdBlix43MfPFbGe/g+na1zm422huWTZGDszLE\nFHmIoEUULZg9IVXWfPIuw6klO8fu/z6sN2CNLaT612bXrgMeX37kCU7L+8E+mToc\ngLGYxnrDXMRhKHYeIm0tbYQHtelnq4z7eN/gVVaoy8v2YMmVEDNNtK8up1Nr9dfZ\nPO4EXHwdT0LhXOU0+B3fUBM0rU7UZ5IQE4nZlvLwWrCVU89sbT16F2YQrIS+RrKf\nu7YWdtUr2j6+KsxfGzBpi2s0yBJcxO2zw2Eh+ywiMQKBgQD69ETHc/UFxaMxSNsR\n6HdZHh2qop14yztKDjbOBeyV//T3t0RvJT75bIrruq86RUrQI51N6i4GlNh2iJme\nYgdM9ECbxX0QHjxfDyreoNoJZlFfse3Aktc5Vm02IzBCGF9hCVzWj+As3jdn1LWT\naxJByirD81NG8hh3WYZpR3LMpQKBgQDT08C7PzAjnES9On2KNHoHfErww/GgjRy9\nnVhWsUGCDpMkr+y6qpl8jPDQ577Kb8bNzcdKaVRjbwITJacXwJwP92MSj+XUNPjL\nHmZF1NYtzSqye6q+Vyn0mu5ggokm6AiyVfqHOSy012N8etQhVG9oaihpQVZDpyN6\n2nQkxIbQ6wKBgGTJ0AnO/3xW+QjlOt7BX5WSK9YJQ3dtIB3JAafS50cDKo6Gs1x0\nOAuS1WSBcLjVdYuMkjPltqB8DUfl6tSaiFYWzxAAzA66JgMDo3MQZSFbT5lAa71o\n/DmSBYC1tz8EbOIbEYc295DtmpD/9AEGAqobmPtj8XFP8BWXBg2oXWnlAoGAH5W3\nazQkzWqDpWOPTIg+mdcipXvSD4p6+pr3jRWpGudpcVL6DWtar4OkdMHZZP39urow\nORwzhRAMUyaOH7CMlKTilOX38whjAIZr4YW22eV5tFtUPkVo8BwZ5zIPmUmH4m+H\nh5oy3FQxdWIrNz0Lz5nkpK0lW7kURUFFiCX1pDkCgYAIwz26VFwfiRd3utmO6uVr\n4D8XcdPwfsMto+A8l9Njq8nGuikrc3fnsTTA+Phd5szsKgJmgiuqgJi+Gb7jMN7b\nRP6dRYCAUm0uZg+QhO6Uj3RU8PkMjvizvRqi58W9igWnetxLyMw+Na231Gi7bGmX\nyjjEEcxx/yaAotNG5lw9Ow==\n-----END PRIVATE KEY-----\n",
        "client_email": "firebase-adminsdk-gl6fx@bot-orders.iam.gserviceaccount.com",
        "client_id": "101969765057138401575",
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
        "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-gl6fx%40bot-orders.iam.gserviceaccount.com"
    }),
    databaseURL: 'https://bot-orders.firebaseio.com'
});
var db = admin.firestore();
const settings = {/* your settings... */ timestampsInSnapshots: true };
db.settings(settings);
exports.delivery = (req, res) => {
    db.collection('orders')
        .where('cutoffDate', '==', req.query.startDate)
        // .where('cutoff', '==', true)
        .orderBy('name', 'asc')
        .get()
        .then(snapShot => {
            let orders = [];
            let index = 0;
            let count = 0;
            let obj = { col1: '', col2: '' };
            snapShot.forEach(doc => {
                const data = doc.data();
                const text = `${index + 1}.${data.name} ${data.tel}\n${data.addr.replace(/\n/g, ' ')}\n${data.bank} ${formatMoney(data.price, 0)} บาท\n${data.product.map(p => p.code + '=' + p.amount)}\nREF:${doc.id}`
                if (index % 2 == 0) {
                    obj.col1 = text
                } else {
                    obj.col2 = text
                }
                if (obj.col2 || (index + 1) == snapShot.size) {
                    orders.push(obj)
                    obj = {};
                }
                index++;
            })
            // res.json(orders)
            res.ireport("delivery.jrxml", req.query.file || "pdf", orders, { OUTPUT_NAME: 'delivery_' + req.query.startDate });
        })

}
exports.dailySale = (req, res) => {
    // var startDate = new Date(req.query.startDate)
    // var endDate = new Date(req.query.endDate)
    // endDate.setDate(endDate.getDate() + 1)
    var r = req.r;
    db.collection('emails').doc(req.query.uid)
        .get()
        .then(auth => {
            if (auth.exists) {
                let pages = [];
                if (auth.data().role == 'owner' || auth.data().role == 'super') {
                    pages = ["@DB", "@SCR01", "@TCT01", "@TD01", "@TD02", "@TS01", "@TS02", "@TS03", "@TST", "DB", "SCR01", "SSN01", "TCT01", "TD01", "TD02", "TS01", "TS02", "TS03", "TST"];
                } else {
                    pages = auth.data().pages || [];
                }
                db.collection('orders')
                    .where('orderDate', '>=', req.query.startDate.replace(/-/g, ''))
                    .where('orderDate', '<=', req.query.endDate.replace(/-/g, ''))
                    .get()
                    .then(snapShot => {
                        let orders = []
                        snapShot.forEach(doc => {
                            orders.push({ id: doc.id, ...doc.data() })
                        })
                        r.expr(orders).filter(f => {
                            return r.expr(pages).contains(f('page'))
                        })
                            .group(g => {
                                return g.pluck('page', 'orderDate')
                            })
                            .ungroup()
                            .map(m => {
                                return m('group').merge(m2 => {
                                    return {
                                        count: m('reduction').count(),
                                        price: m('reduction').sum('price'),
                                        promote: m('reduction').sum('promote'),
                                        interest: m('reduction').sum('interest')
                                    }
                                })
                            }).orderBy('orderDate', r.desc('price'))
                            .run()
                            .then(result => {
                                const pages = result.filter(f => f.page.indexOf('@') == -1)
                                    .map(m => {
                                        const line = result.find(f => f.page == '@' + m.page && f.orderDate == m.orderDate);
                                        const orderDate = m.orderDate.substr(0, 4) + '-' + m.orderDate.substr(4, 2) + '-' + m.orderDate.substr(6, 2)
                                        return {
                                            page: m.page,
                                            orderDate: moment(orderDate).format('ll'),
                                            priceFb: m.price,
                                            countFb: m.count,
                                            countLine: (line ? line.count : 0),
                                            priceLine: (line ? line.price : 0),
                                            promote: m.promote,
                                            interest: m.interest
                                        }
                                    })
                                res.ireport("dailySale.jrxml", req.query.file || "pdf", pages, {
                                    OUTPUT_NAME: 'dailySale' + req.query.startDate.replace(/-/g, '') + "_" + req.query.endDate.replace(/-/g, ''),
                                    START_DATE: moment(req.query.startDate).format('LL'),
                                    END_DATE: moment(req.query.endDate).format('LL'),
                                });

                            })
                    })
            } else {
                res.send('คุณไม่มีสิทธิ์ดูรายงานนี้')
            }
        })
}
exports.dailyTrack = (req, res) => {
    const orderDate = req.query.startDate.substr(0, 4) + '-' + req.query.startDate.substr(4, 2) + '-' + req.query.startDate.substr(6, 2)

    db.collection('orders').where('cutoffDate', '==', req.query.startDate).get()
        .then(snapShot => {
            let orders = [];
            snapShot.forEach(doc => {
                let link = '';
                if (doc.data().name.substr(0, 1).toUpperCase() == 'A') {
                    link = 'https://www.alphafast.com/th/track-alpha';
                } else if (doc.data().name.substr(0, 1).toUpperCase() == 'K') {
                    link = 'https://th.kerryexpress.com/th/track/?track';
                } else if (doc.data().name.substr(0, 1).toUpperCase() == 'M') {
                    link = 'http://track.thailandpost.co.th/tracking/default.aspx';
                } else if (doc.data().name.substr(0, 1).toUpperCase() == 'R') {
                    link = 'http://track.thailandpost.co.th/tracking/default.aspx';
                }
                orders.push({
                    id: doc.id,
                    name: doc.data().name.trim(),
                    tracking: doc.data().tracking,
                    link
                })
            })
            orders = orders.sort((a, b) => {
                return a.link + a.id > b.link + b.id ? 1 : -1;
            })
            // res.json(orders)

            res.ireport("dailyTrack.jrxml", req.query.file || "pdf", orders, {
                OUTPUT_NAME: 'dailyTrack' + req.query.startDate,
                START_DATE: moment(orderDate).format('LL')
            });
        })
}
exports.test = (req, res) => {
    // var d = new Date();
    var startDate = new Date(req.query.startDate)
    var endDate = new Date(req.query.endDate)
    endDate.setDate(endDate.getDate() + 1)
    // console.log('UTC+7 Time:', d);
    db.collection('orders')
        .where('orderDate', '>=', req.query.startDate)
        .where('orderDate', '<=', req.query.endDate)
        .get()
        .then(snapShot => {
            let orders = []
            snapShot.forEach(doc => {
                orders.push({ id: doc.id, ...doc.data() })
            })
            res.json(orders.filter(f => f.page.indexOf('TS02') >= 0))
        })
    // res.json({
    //     startDate,
    //     endDate
    // })
}
const formatMoney = (amount, decimalCount = 2, decimal = ".", thousands = ",") => {
    try {
        decimalCount = Math.abs(decimalCount);
        decimalCount = isNaN(decimalCount) ? 2 : decimalCount;

        const negativeSign = amount < 0 ? "-" : "";

        let i = parseInt(amount = Math.abs(Number(amount) || 0).toFixed(decimalCount)).toString();
        let j = (i.length > 3) ? i.length % 3 : 0;

        return negativeSign + (j ? i.substr(0, j) + thousands : '') + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + thousands) + (decimalCount ? decimal + Math.abs(amount - i).toFixed(decimalCount).slice(2) : "");
    } catch (e) {
        console.log(e)
    }
};
const yyyymmdd = () => {
    function twoDigit(n) { return (n < 10 ? '0' : '') + n; }
    var now = new Date();
    return '' + now.getFullYear() + twoDigit(now.getMonth() + 1) + twoDigit(now.getDate());
}
const twoDigit = (n) => {
    if (n < 10) {
        return '0' + n.toString();
        // } else if (n < 100) {
        //     return '00' + n.toString();
        // } else if (n < 1000) {
        //     return '0' + n.toString()
    } else {
        return n.toString();
    }
}