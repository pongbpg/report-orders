const moment = require('moment');
const db = require('../../config/firebase').demo;
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
                        name: m('reduction')(m('reduction').count().sub(1))('name'),
                        addr: m('reduction')(m('reduction').count().sub(1))('addr'),
                        fb: m('reduction')(m('reduction').count().sub(1))('fb'),
                        amount: m('reduction').getField('product')//.pluck('amount')
                            .map(m2 => { return m2('amount') })
                            .reduce((le, ri) => { return le.add(ri) })
                            .reduce((le, ri) => { return le.add(ri) }).default(0),
                        id: m('reduction')(0)('id'),
                        //     .reduce((le, ri) => { return le.add(',').add(ri) }),
                        list: m('reduction').pluck('id', 'product', 'bank', 'price')
                            .map(m2 => {
                                // m2('id').add(' ', m2('bank'), ' ', m2('price').coerceTo('string'), '฿\n') .add()
                                return m2('product').map(m3 => { return m3('code').add(':', m3('name'), ' ', m3('amount').coerceTo('string'), 'ตัว') })
                                    .reduce((le, ri) => {
                                        return le.add(',\n', ri)
                                    })
                            })
                            .reduce((le, ri) => { return le.add(', ').add(ri) }),
                        // price: m('reduction').getField('price')
                        //     .reduce((le, ri) => { return le.coerceTo('string').add(',').add(ri.coerceTo('string')) }),
                    }
                })
                .orderBy('id')
                .run()
                .then(result => {
                    // res.json(result)
                    result.map(order => {

                        const text = `${index + 1}. ${order.name} โทร.${order.tel} (${order.amount})\n${order.addr.replace(/\n/g, ' ')}\nFB: ${order.fb}${req.query.detail == 'show' ? '\n' + order.list : ''}`;
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
                        .where('cutoffDate', '==', req.query.cutoffDate)
                        // .where('orderDate', '>=', req.query.startDate.replace(/-/g, ''))
                        // .where('orderDate', '<=', req.query.endDate.replace(/-/g, ''))
                        .get()
                        .then(snapShot => {
                            let orders = []
                            snapShot.forEach(doc => {
                                const timestamp = new Date(doc.data().timestamp.toMillis());
                                let orderTime = twoDigit(timestamp.getHours()) + '.' + twoDigit(timestamp.getMinutes());

                                for (var i = 0; i < doc.data().banks.length; i++) {
                                    const bank = doc.data().banks[i].name.toUpperCase().match(/[a-zA-Z]+/g, '');
                                    const time = doc.data().banks[i].time.match(/[0-9][0-9][.][0-9][0-9]/g, '');
                                    if (bank != null) {
                                        if (['CM'].indexOf(bank[0]) == -1) {
                                            orders.push({
                                                id: doc.id,
                                                // ...doc.data(),
                                                bank: bank[0],
                                                time: time[0],
                                                orderTime: orderTime < time[0] ? moment(timestamp).format('l LT') : orderTime,
                                                orderDate: orderTime < time[0] ? moment(doc.data().orderDate).subtract(1, 'days').format('YYYYMMDD') : doc.data().orderDate,
                                                price: doc.data().banks[i].price,
                                                admin: doc.data().admin,
                                                fb: doc.data().fb,
                                                tel: doc.data().tel,
                                                product: doc.data().product.map(p => p.code + ':' + p.name + '=' + p.amount)
                                                    .reduce((le, ri) => le + '\n' + ri)
                                            })
                                        }
                                    }
                                }

                            })
                            var expr = r.expr(orders)
                                .orderBy('bank', 'orderDate', 'time');
                            if (req.query.order == 'id') {
                                expr = r.expr(orders)
                                    .orderBy('bank', 'id')
                            }
                            expr.pluck('bank', 'orderDate', 'time', 'fb', 'price', 'id', 'name', 'admin', 'tel', 'orderTime', 'product')
                                .run()
                                .then(result => {
                                    const datas = result.map(m => {
                                        const orderDate = m.orderDate.substr(0, 4) + '-' + m.orderDate.substr(4, 2) + '-' + m.orderDate.substr(6, 2)
                                        return {
                                            ...m,
                                            orderDate: moment(orderDate).format('ll')
                                        }
                                    })

                                    res.ireport("demo/dailyStatement.jrxml", req.query.file || "pdf", datas, {
                                        OUTPUT_NAME: 'dailyStatement' + req.query.cutoffDate,
                                        START_DATE: moment(req.query.cutoffDate).format('LL'),
                                        END_DATE: moment(req.query.cutoffDate).format('LL'),
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
exports.dailyProduct = (req, res) => {
    var r = req.r;
    let orders = [];
    db.collection('orders')
        .where('cutoffDate', '==', req.query.cutoffDate)
        .get()
        .then(snapShot => {
            // const pages = [req.query.page, '@' + req.query.page]
            snapShot.forEach(doc => {
                // if (pages.indexOf(doc.data().page) > -1 || req.query.page == 'ALL') {
                orders.push({ id: doc.id, ...doc.data() })
                // }
            })
            r.expr(orders)
                .merge(m => {
                    return {
                        product: m('product').merge(m3 => {
                            return {
                                claim: r.branch(m('bank').match('CM').eq(null), false, true),
                                cost: m3('cost').mul(m3('amount'))
                            }
                        })
                    }
                })
                .getField('product')
                .reduce((le, ri) => {
                    return le.add(ri)
                }).default([])
                .group('code')
                .ungroup()
                .map(m => {
                    return {
                        code: m('group'),
                        amountSale: m('reduction').filter({ claim: false }).sum('amount'),
                        amountCm: m('reduction').filter({ claim: true }).sum('amount'),
                        amount: m('reduction').sum('amount'),
                        costSale: m('reduction').filter({ claim: false }).sum('cost'),
                        costCm: m('reduction').filter({ claim: true }).sum('cost'),
                        cost: m('reduction').sum('cost'),
                        name: m('reduction')(0)('name'),
                        typeId: '',//m('reduction')(0)('typeId'),
                        typeName: ''//m('reduction')(0)('typeName')
                    }
                })
                .orderBy('typeId', 'code')
                .run()
                .then(datas => {
                    // res.json(datas)
                    res.ireport("demo/dailyProduct.jasper", req.query.file || "pdf", datas, {
                        PAGE: (req.query.page == 'ALL' ? 'ทั้งหมด' : req.query.page),
                        OUTPUT_NAME: 'dailySale' + req.query.cutoffDate,
                        START_DATE: moment(req.query.cutoffDate).format('LL'),
                        END_DATE: moment(req.query.cutoffDate).format('LL'),
                    });
                })
        })
}
exports.cutoffSale = (req, res) => {
    var r = req.r;
    return db.collection('orders')
        // .where('orderDate', '>=', req.query.startDate.replace(/-/g, ''))
        // .where('orderDate', '<=', req.query.endDate.replace(/-/g, ''))
        .where('cutoffDate', '==', req.query.cutoffDate)
        .get()
        .then(snapShot => {
            let orders = []
            snapShot.forEach(doc => {
                orders.push({ id: doc.id, ...doc.data() })
            })
            r.expr(orders)
                .group(g => {
                    return g.pluck('orderDate', 'admin')
                }).ungroup()
                .map(m => {
                    return m('group').merge(m2 => {
                        return {
                            count: m('reduction').count(),
                            price: m('reduction').sum('price'),
                            amount: m('reduction').merge(m3 => {
                                return {
                                    amount: m3('product').sum('amount')
                                }
                            }).sum('amount')
                            // promote: m('reduction').sum('promote'),
                            // interest: m('reduction').sum('interest')
                        }
                    })
                })
                .group(g => {
                    return g.pluck('orderDate', 'admin')
                })
                .ungroup()
                .map(m => {
                    return m('group').merge(m2 => {
                        return {
                            // priceFb: m('reduction').filter({ fb: true }).sum('price'),
                            // countFb: m('reduction').filter({ fb: true }).sum('count'),
                            // promoteFb: m('reduction').filter({ fb: true }).sum('promote'),
                            // interestFb: m('reduction').filter({ fb: true }).sum('interest'),
                            // priceLine: m('reduction').filter({ fb: false }).sum('price'),
                            // countLine: m('reduction').filter({ fb: false }).sum('count'),
                            // promoteLine: m('reduction').filter({ fb: false }).sum('promote'),
                            // interestLine: m('reduction').filter({ fb: false }).sum('interest'),
                            priceAll: m('reduction').sum('price'),
                            amountAll: m('reduction').sum('amount'),
                            countAll: m('reduction').sum('count'),
                            // interestFb: r.expr(sayhis).filter({ date: m('group')('orderDate').add(m('group')('page')) }).sum('fb').default(0),
                            // interestLine: r.expr(sayhis).filter({ date: m('group')('orderDate').add(m('group')('page')) }).sum('line').default(0),
                            // team: r.expr(admins).filter({ id: m('group')('page') })(0)('team'),
                            // cc: r.expr(sayhis)
                        }
                    })
                })
                .do(d => {
                    return d.merge(m => {
                        return {
                            priceX: d.filter({ orderDate: m('orderDate') }).sum('priceAll'),
                            countAdmin: d.filter({ orderDate: m('orderDate') }).group('admin').ungroup().count()
                        }
                    })
                })
                .orderBy('orderDate', r.desc('priceX'), r.desc('priceAll'))
                .run()
                .then(result => {
                    const pages = result.map(m => {
                        const orderDate = m.orderDate.substr(0, 4) + '-' + m.orderDate.substr(4, 2) + '-' + m.orderDate.substr(6, 2)
                        // console.log(m.page)
                        return {
                            ...m,
                            orderDate: moment(orderDate).format('ll'),
                            // page: m.page + ' ' + admins.find(f => f.id === m.page).admin,
                        }
                    })

                    res.ireport("cutoffSale.jrxml", req.query.file || "pdf", pages, {
                        OUTPUT_NAME: 'ยอดขายรอบวันที่_' + req.query.cutoffDate,
                        CUTOFF_DATE: moment(req.query.cutoffDate).format('LL')
                    });
                    // res.json(pages)
                })
        })
}
exports.dailyBank = (req, res) => {
    async function getDailySale() {
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
                                const bank = doc.data().bank.match(/[a-zA-Z]+/g, '')[0];
                                orders.push({
                                    bank,
                                    price: doc.data().price,
                                    orderDate: req.query.sum == 'all' ? 'SUM' : doc.data().orderDate
                                })
                            })
                            r.expr(orders)
                                .group(g => {
                                    return g.pluck('bank', 'orderDate')
                                })
                                .ungroup()
                                .map(m => {
                                    return m('group').merge(m2 => {
                                        return {
                                            countAll: m('reduction').count(),
                                            priceAll: m('reduction').sum('price')
                                        }
                                    })
                                    // .merge(r.branch(m('group')('bank').eq('COD'), {
                                    //     bank: 'COD'
                                    // }, {
                                    //         bank: m('group')('bank')
                                    //     }))
                                })
                                .orderBy('orderDate', r.desc('priceAll'))
                                .run()
                                .then(result => {
                                    const datas = result.map(m => {
                                        const orderDate = m.orderDate.substr(0, 4) + '-' + m.orderDate.substr(4, 2) + '-' + m.orderDate.substr(6, 2)
                                        return {
                                            ...m,
                                            orderDate: req.query.sum == 'all' ? 'SUM' : moment(orderDate).format('ll')
                                        }
                                    })

                                    res.ireport("dailyBank.jrxml", req.query.file || "pdf", datas, {
                                        OUTPUT_NAME: 'dailySale' + req.query.startDate.replace(/-/g, '') + "_" + req.query.endDate.replace(/-/g, ''),
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

    getDailySale();


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