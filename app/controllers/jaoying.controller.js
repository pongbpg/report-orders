const moment = require('moment');
const db = require('../../config/firebase').jaoying;
moment.locale('th');
exports.delivery = (req, res) => {
    var r = req.r;
    db.collection('orders')
        .where('cutoffDate', '==', req.query.startDate)
        // .where('cutoff', '==', true)
        // .orderBy('name', 'asc')
        .get()
        .then(snapShot => {
            let orderx = [];
            let orders = [];
            let index = 0;
            let count = 0;
            let obj = { col1: '', col2: '' };
            snapShot.forEach(doc => {
                orderx.push({ id: doc.id, ...doc.data() })
            })
            r.expr(orderx)
                .group('tel')
                .ungroup()
                .map(m => {
                    return {
                        tel: m('group'),
                        name: m('reduction')(0)('name'),
                        addr: m('reduction')(0)('addr'),
                        fb: m('reduction')(0)('fb'),
                        amount: m('reduction').getField('product')//.pluck('amount')
                            .map(m2 => { return m2('amount') })
                            .reduce((le, ri) => { return le.add(ri) })
                            .reduce((le, ri) => { return le.add(ri) }).default(0),
                        id: m('reduction')(0)('id'),
                        //     .reduce((le, ri) => { return le.add(',').add(ri) }),
                        list: m('reduction').pluck('id', 'product', 'bank', 'price')
                            .map(m2 => {
                                return m2('id').add(' ', m2('bank'), ' ', m2('price').coerceTo('string'), '฿\n')
                                    .add(m2('product').map(m3 => { return m3('code').add(':',m3('name'),' ', m3('amount').coerceTo('string'), 'ตัว') })
                                        .reduce((le, ri) => {
                                            return le.add(',\n', ri)
                                        })
                                    )
                            })
                            .reduce((le, ri) => { return le.add('\n').add(ri) }),
                        // price: m('reduction').getField('price')
                        //     .reduce((le, ri) => { return le.coerceTo('string').add(',').add(ri.coerceTo('string')) }),
                    }
                })
                .orderBy('id')
                .run()
                .then(result => {
                    // res.json(result)
                    result.map(order => {

                        const text = `${index + 1}. ${order.name} (${order.amount})\nโทร.${order.tel}\n${order.addr.replace(/\n/g, ' ')}\nFB: ${order.fb}\n${req.query.detail == 'show' ? order.list : ''}`;
                        // console.log(index,text)
                        if (index % 2 == 0) {
                            obj.col1 = text
                        } else {
                            obj.col2 = text
                        }
                        if (obj.col2 || (index + 1) == result.length) {
                            orders.push(obj)
                            obj = {};
                        }
                        index++;
                    })
                    // res.json(orders)
                    res.ireport("delivery2.jrxml", req.query.file || "pdf", orders, { OUTPUT_NAME: 'delivery_' + req.query.startDate });
                })

            // res.json(orderx)

        })

}
exports.dailyStatement = (req, res) => {
    async function getDailyStatement() {
        var r = req.r;
        await db.collection('emails').doc(req.query.uid)
            .get()
            .then(auth => {
                if (auth.exists) {

                    db.collection('orders')
                        .where('orderDate', '>=', req.query.startDate.replace(/-/g, ''))
                        .where('orderDate', '<=', req.query.endDate.replace(/-/g, ''))
                        .get()
                        .then(snapShot => {
                            let orders = []
                            snapShot.forEach(doc => {
                                const bank = doc.data().bank.toUpperCase().match(/[a-zA-Z]+/g, '');
                                const time = doc.data().bank.match(/[0-9][0-9][.][0-9][0-9]/g, '');
                                const timestamp = new Date(doc.data().timestamp.toMillis());
                                let orderTime = twoDigit(timestamp.getHours()) + '.' + twoDigit(timestamp.getMinutes());
                                if (bank != null) {
                                    if (['CM', 'COD'].indexOf(bank[0]) == -1) {
                                        // console.log(doc.data().timestamp)
                                        orders.push({
                                            id: doc.id,
                                            ...doc.data(),
                                            bank: bank[0],
                                            time: time[0],
                                            orderTime: orderTime < time[0] ? moment(timestamp).format('l LT') : orderTime,
                                            orderDate: orderTime < time[0] ? moment(doc.data().orderDate).subtract(1, 'days').format('YYYYMMDD') : doc.data().orderDate
                                        })
                                    }
                                }
                            })
                            var expr = r.expr(orders)
                                .orderBy('bank', 'orderDate', 'time');
                            if (req.query.order == 'id') {
                                expr = r.expr(orders)
                                    .orderBy('bank', 'id')
                            }
                            expr.pluck('bank', 'orderDate', 'time', 'fb', 'price', 'id', 'name', 'tel', 'orderTime')
                                .run()
                                .then(result => {
                                    const datas = result.map(m => {
                                        const orderDate = m.orderDate.substr(0, 4) + '-' + m.orderDate.substr(4, 2) + '-' + m.orderDate.substr(6, 2)
                                        return {
                                            ...m,
                                            orderDate: moment(orderDate).format('ll')
                                        }
                                    })

                                    res.ireport("dailyStatement2.jrxml", req.query.file || "pdf", datas, {
                                        OUTPUT_NAME: 'dailyStatement' + req.query.startDate.replace(/-/g, '') + "_" + req.query.endDate.replace(/-/g, ''),
                                        START_DATE: moment(req.query.startDate).format('LL'),
                                        END_DATE: moment(req.query.endDate).format('LL'),
                                    });
                                    // res.json(result)
                                })
                        })
                } else {
                    res.send('คุณไม่มีสิทธิ์ดูรายงานนี้')
                }
            })
    }

    getDailyStatement();


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
const enumerateDaysBetweenDates = (startDate, endDate) => {
    startDate = moment(startDate);
    endDate = moment(endDate);
    var now = startDate, dates = [];
    while (now.isBefore(endDate) || now.isSame(endDate)) {
        dates.push(now.format('YYYYMMDD'));
        now.add(1, 'days');
    }
    return dates;
};