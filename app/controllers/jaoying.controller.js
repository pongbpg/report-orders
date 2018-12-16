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
                        // product: m('reduction').getField('product')
                        //     .reduce((le, ri) => { return le.add(ri) }).default([]),
                        id: m('reduction')(0)('id'),
                        //     .reduce((le, ri) => { return le.add(',').add(ri) }),
                        list: m('reduction').pluck('id', 'product', 'bank', 'price')
                            .map(m2 => {
                                return m2('id').add(' ', m2('bank'), ' ', m2('price').coerceTo('string'), '฿\n')
                                    .add(m2('product').map(m3 => { return r.expr('แบบ ').add(m3('code'), '=', m3('amount').coerceTo('string'), 'ตัว') })
                                        .reduce((le, ri) => {
                                            return le.add(',', ri)
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
                        const text = `${index + 1}.${order.name} ${order.tel}\n${order.addr}\n${order.list}`;
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
                    // res.json(result)
                    res.ireport("delivery.jrxml", req.query.file || "pdf", orders, { OUTPUT_NAME: 'delivery_' + req.query.startDate });
                })

            // res.json(orderx)

        })

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