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
                                return m2('id').add(' ', m2('bank'), ' ', m2('price').coerceTo('string'), '฿\n')
                                    .add(m2('product').map(m3 => { return m3('code').add(':', m3('name'), ' ', m3('amount').coerceTo('string'), 'ตัว') })
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

                        const text = `${index + 1}. ${order.name} (${order.amount})\nโทร.${order.tel}\n${order.addr.replace(/\n/g, ' ')}\nFB: ${order.fb}${req.query.detail == 'show' ? '\n' + order.list : ''}`;
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
                            expr.pluck('bank', 'orderDate', 'time', 'fb', 'price', 'id', 'name', 'admin', 'tel', 'orderTime')
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
                            // count: m('reduction').count(),
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
                            // countAll: m('reduction').sum('count'),
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
                            // countAdmin: d.filter({ orderDate: m('orderDate') }).group('admin').ungroup().count()
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
exports.test = (req, res) => {
    // res.json(decodeURI(req.body.txt))
    const txt = decodeURI(req.body.txt);
    let orders = [];
    let banks = [];
    let data = Object.assign(...txt.split('#').filter(f => f != "")
        .map(m => {
            if (m.split(':').length == 2) {
                const dontReplces = ["name", "fb", "addr"];
                let key = m.split(':')[0].toLowerCase();
                switch (key) {
                    case 'n': key = 'name'; break;
                    case 't': key = 'tel'; break;
                    case 'a': key = 'addr'; break;
                    case 'o': key = 'product'; break;
                    case 'b': key = 'banks'; break;
                    // case 'p': key = 'price'; break;
                    case 'f': key = 'fb'; break;
                    // case 'l': key = 'fb'; break;
                    // case 'z': key = 'page'; break;
                    // case 'd': key = 'delivery'; break;
                    // case 'cutoffdate': key = 'cutoffDate'; break;
                    default: key;
                }
                let value = m.split(':')[1];
                if (!dontReplces.includes(key)) value = value.replace(/\s/g, '');
                if (key !== 'addr' && key !== 'fb') value = value.replace(/\n/g, '').toUpperCase();
                if (key == 'tel') {
                    value = value.replace(/\D/g, ''); //เหลือแต่ตัวเลข
                    if (value.length != 10) {
                        value = 'undefined'
                    }
                }
                if (key !== 'price' && key !== 'delivery') {
                    value = value.trim();
                    if (key == 'product') {
                        const str = value;
                        // let orders = [];
                        let arr = str.split(',');
                        for (var a in arr) {
                            if (arr[a].split('=').length == 2) {
                                const code = arr[a].split('=')[0].toUpperCase();
                                const amount = Number(arr[a].split('=')[1].replace(/\D/g, ''));
                                const orderIndex = orders.findIndex(f => f.code == code);
                                if (orderIndex > -1 && amount > 0) {
                                    orders[orderIndex]['amount'] = orders[orderIndex]['amount'] + amount
                                } else {
                                    orders.push({
                                        code,
                                        amount,
                                        name: ''
                                    })
                                }
                            } else {
                                const orderIndex = orders.findIndex(f => f.code == 'รหัสสินค้า');
                                if (orderIndex > -1) {

                                } else {
                                    orders.push({
                                        code: 'รหัสสินค้า',
                                        amount: 'undefined'
                                    })
                                }
                            }
                        }
                        value = orders
                    } else if (key == 'name') {
                        if (value.length < 2) {
                            value = 'undefined';
                        }
                    } else if (key == 'banks') {
                        const str = value;
                        let arr = str.split(',');
                        for (var a in arr) {
                            if (arr[a].split('=').length == 2) {
                                const bank1 = arr[a].split('=')[0].toUpperCase();
                                let price = Number(arr[a].split('=')[1].replace(/\D/g, ''));
                                let name = '';
                                let time = '00.00';
                                if (bank1.match(/[a-zA-Z]+/g, '') == null) {
                                    name = 'ธนาคาร';
                                    time = 'undefined';
                                }
                                if (bank1.match(/\d{2}\.\d{2}/g) == null && ['COD', 'CM'].indexOf(bank1) == -1) {
                                    name = bank1.match(/[a-zA-Z]+/g, '')[0];
                                    time = 'เวลาโอน';
                                    price = 'undefined';
                                }
                                if (time != 'undefined' && price != 'undefined') {
                                    name = bank1.match(/[a-zA-Z]+/g, '')[0];
                                    time = ['COD', 'CM'].indexOf(bank1) == -1 ? bank1.match(/\d{2}\.\d{2}/g)[0] : time;
                                }
                                banks.push({
                                    name,
                                    time,
                                    price
                                })
                            } else {
                                banks.push({
                                    name: 'ธนาคาร',
                                    price: 'undefined'
                                })
                            }
                        }
                        value = banks
                    }
                } else {
                    value = Number(value.replace(/\D/g, ''));
                }
                return { [key]: value };
            }
        })
    );
    data.price = data.banks ? data.banks.map(b => b.price).reduce((le, ri) => Number(le) + Number(ri)) || 0 : 0
    data.bank = data.banks ? data.banks.map(bank => {
        return bank.name.indexOf('COD') > -1 && ['A', 'K', 'C'].indexOf(data.name.substr(0, 1)) == -1 ? `${bank.name}undefined` : bank.name + (bank.time == '00.00' ? '' : bank.time) + '=' + bank.price
    }).reduce((le, ri) => le + ',' + ri) : 'undefined';
    // data = data.map(m => {
    //     return {
    //         ...m,
    //         price: m.banks//.map(b => b.price).reduce((le, ri) => le + ri)
    //     }
    // })
    res.json(data)
    // const refs = orders.map(order => db.collection('products').doc(order.code));
    // db.getAll(...refs)
    //     .then(snapShot => {
    //         let products = [];
    //         snapShot.forEach(doc => {
    //             if (doc.exists)
    //                 products.push({ id: doc.id, ...doc.data() })
    //         })
    //         for (var order in data.product) {
    //             const code = data.product[order]['code'];
    //             const amount = data.product[order]['amount'];
    //             const product = products.find(f => f.id === data.product[order]['code'])
    //             if (product) {
    //                 if (product.amount >= amount) {
    //                     data.product[order]['name'] = product.name;
    //                 } else {
    //                     data.product[order]['code'] = code + `เหลือเพียง${product.amount}ชิ้น`;
    //                     data.product[order]['amount'] = 'undefined';
    //                 }
    //             } else {
    //                 data.product[order]['code'] = ' รหัส' + code + 'ไม่มีในรายการสินค้า';
    //                 data.product[order]['amount'] = 'undefined';
    //             }
    //         }
    //         res.json(data)
    //     })
}
exports.test2 = (req, res) => {
    const r = req.r;
    db.collection('orders')
        .where('cutoffDate', '==', '20190104')
        .where('tel', '==', '0881883434')
        .get()
        .then(snapShot => {
            let orders = [];
            snapShot.forEach(doc => {
                orders.push({ id: doc.id, ...doc.data() })
            })
            const len = orders.length - 1;
            const data = 'ชื่อ: ' + orders[len].name +
                '\nโทร: ' + orders[len].tel +
                '\nที่อยู่: ' + orders[len].addr +
                '\nFB: ' + orders[len].fb +
                '\nรายการสั่งซื้อ' + orders.map((order, i) => {
                    return '\n#' + (i + 1) + ' ' + order.id +
                        order.product.map(product => {
                            return '\n' + product.code + ': ' + product.name + ' ' + product.amount + ' ชิ้น'
                        }) + '\n' + order.bank + ' ' + formatMoney(order.price, 0) + ' บาท'
                }) +
                '\nยอดรวม: ' + formatMoney(orders.map(order => order.price).reduce((le, ri) => le + ri), 0) + ' บาท'
            res.json(data)
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