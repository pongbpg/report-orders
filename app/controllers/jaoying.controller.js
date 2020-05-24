const moment = require('moment');
const db = require('../../config/firebase').jaoying;
moment.locale('th');
exports.delivery = (req, res) => {
    var r = req.r;
    db.collection('orders')
        .where('cutoffDate', '==', req.query.startDate)
        // .where('cutoff', '==', true)
        // .orderBy('name', 'asc')
        // .limit(1)
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
                    if (req.query.file != 'flash') {
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
                        res.ireport("delivery2.jrxml", req.query.file || "pdf", orders, {
                            OUTPUT_NAME: 'delivery_' + req.query.startDate,
                            SHOW_DETAIL: req.query.detail
                        });
                    } else {
                        result = result.map(order => {
                            const pc = order.addr.match(/[0-9]{5}/g);
                            let postcode = '';
                            if (pc != null) {
                                postcode = pc[pc.length - 1]
                            }
                            // if (postcode != '')
                            return {
                                Customer_order_number: order.id,
                                Consignee_name: `${order.name} (${order.amount})`,
                                Address: order.addr.replace(/\n/g, ' '),
                                Postal_code: postcode,
                                Phone_number: order.tel,
                                Phone_number2: '',
                                Item_type: '',
                                Weight_kg: 1,
                                Length: '',
                                Width: '',
                                Height: '',
                                Freight_insurance: '',
                                Value_insurance: '',
                                Declared_value: '',
                                Speed_service: '',
                                Remark1: 'FB: ' + order.fb,
                                Remark2: '',
                                Remark3: ''
                                // Remark1: `${order.product.map(p => p.code + '=' + p.amount)}`,
                                // Remark2: order.price,
                                // Remark3: order.page
                            }
                        }).filter(f => f != null)

                        // res.json(orderx)
                        const XLSX = require('xlsx');
                        // /* create workbook & set props*/
                        const wb = { SheetNames: [], Sheets: {} };

                        // // /* create file 'in memory' */
                        // for (var prop in result) {
                        var ws = XLSX.utils.json_to_sheet(result);
                        ws['B1'].v = '*Consignee_name';
                        ws['C1'].v = '*Address';
                        ws['D1'].v = '*Postal_code';
                        ws['E1'].v = '*Phone_number';
                        ws['H1'].v = '*Weight_kg';

                        // wb.Sheets['Order Template']=ws;
                        XLSX.utils.book_append_sheet(wb, ws, 'Order Template');
                        // }
                        // // res.json(ws);
                        var wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer', Props: { Author: "Microsoft Excel" } });
                        var filename = 'FLASH_' + req.query.startDate + '.xlsx';
                        res.setHeader('Content-Disposition', 'attachment; filename=' + filename);
                        res.type('application/octet-stream');
                        res.send(wbout);
                    }
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
exports.receipts = (req, res) => {
    let filename = '';
    let orders = [];
    async function getReceipt() {
        if (req.query.id) {
            filename = req.query.id;
            await db.collection('orders')
                .doc(req.query.id)
                .get()
                .then(doc => {
                    if (doc.exists) {
                        orders.push(initData(doc))
                    }
                })
        } else {
            filename = req.query.cutoffDate.replace(/-/g, '');
            const qBank = req.query.bank.toUpperCase();
            const lBank = qBank.length;
            await db.collection('orders')
                .where('cutoffDate', '==', req.query.cutoffDate.replace(/-/g, ''))
                // .where('orderDate', '<=', req.query.endDate.replace(/-/g, ''))
                // .where('return', '==', false)
                // .where('country', '==', 'TH')
                // .limit(2)
                .get()
                .then(snapShot => {

                    snapShot.forEach(doc => {
                        orders.push(initData(doc))
                    })
                    let orderNo = [];
                    orders = orders.filter(f => {
                        const cond = f.bank.substr(0, lBank) == qBank;
                        return cond
                    }).map(m => {
                        // console.log(orderNo[m.orderDate])
                        if (typeof orderNo[m.orderDate] === 'undefined') {
                            orderNo[m.orderDate] = 1;
                        } else {
                            orderNo[m.orderDate] = orderNo[m.orderDate] + 1;
                        }

                        return {
                            ...m,
                            orderNo: m.id.substr(0, 8) + '-' + (fourDigit(orderNo[m.orderDate]))
                        }
                    })
                        .sort((a, b) => a.orderNo > b.orderNo ? 1 : -1)

                })
        }
        function initData(doc) {
            const plen = doc.data().product.length;
            const itemName = (name) => {
                if (name.indexOf('เสื้อ') > -1) {
                    return 'เสื้อยืดคละแบบ'
                } else if (name.toLowerCase().indexOf('set') > -1) {
                    return 'ชุดเซท'
                } else if (name.indexOf('เดรส') > -1) {
                    return 'เดรสคละแบบ'
                } else if (name.indexOf('กางเกง') > -1) {
                    return 'กางเกง'
                } else if (name.indexOf('หมวก') > -1) {
                    return 'หมวก'
                } else if (name.indexOf('กระเป๋า') > -1) {
                    return 'กระเป๋าแฟชั่น'
                } else if (name.indexOf('ผ้าพันคอ') > -1) {
                    return 'ผ้าคลุมไหล่'
                } else if (['นาฬิกา', 'กำไร', 'รองเท้า'].map(m => name.indexOf(m) > -1).filter(f => f === true).length > 0) {
                    return 'แอคเซทเซอรี่'
                } else {
                    return name
                }
            }
            let order = {
                id: doc.id,// ...doc.data(),
                name: doc.data().name,
                tel: doc.data().tel,
                addr: doc.data().addr,
                price: doc.data().price,
                // orderNo: doc.data().orderDate + fourDigit(doc.data().orderNo),
                orderDate: moment(doc.data().orderDate).format('DD/MM/YYYY'),
                thaiDate: moment(doc.data().orderDate).format('ll'),
                product: doc.data().product.map((p, i) => {
                    return {
                        amount: p.amount,
                        code: p.code,
                        name: itemName(p.name) + ' ' + p.code,
                        sale: p.price || 0,
                        no: i + 1
                    }
                }),
                remark: doc.data().fb + '/' + doc.data().bank,
                bank: doc.data().bank
            }
            if (plen <= 12) {
                for (let i = plen; i <= 12; i++) {
                    order.product.push({ no: "", amount: 0, code: "", name: "", sale: 0 })
                }
            }
            return order;
        }

        // res.json(orders)
        res.ireport("jaoying/receipt.jasper", req.query.file || "pdf", orders, {
            OUTPUT_NAME: 'receipts' + filename,
            IS_COPY: req.query.copy || "Y"
        });
    }
    getReceipt();

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
    // db.collection('products')
    //     .get()
    //     .then(snapShot => {
    //         snapShot.forEach(doc => {
    //             doc.ref.update({ id: doc.id })
    //         })
    res.json(true)
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
const fourDigit = (n) => {
    if (n < 10) {
        return '000' + n.toString();
    } else if (n < 100) {
        return '00' + n.toString();
    } else if (n < 1000) {
        return '0' + n.toString()
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