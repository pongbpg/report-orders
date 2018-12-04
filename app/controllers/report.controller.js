const moment = require('moment');
const db = require('../../config/firebase');
moment.locale('th');
exports.delivery = (req, res) => {
    db.collection('orders')
        .where('cutoffDate', '==', req.query.startDate)
        // .where('cutoff', '==', true)
        .orderBy('name', 'asc')
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
            orderx.sort((a, b) => {
                const aName = a.name.substr(0, 1) + a.id;
                const bName = b.name.substr(0, 1) + b.id;
                return aName > bName ? 1 : -1;
            }).map(order => {
                // const data = doc.data();
                const text = `${index + 1}.${order.name} ${order.tel}\n${order.addr.replace(/\n/g, ' ')}\n${order.bank} ${formatMoney(order.price, 0)} บาท\n${order.product.map(p => p.code + '=' + p.amount)}\nREF:${order.id} (${order.page})`
                if (index % 2 == 0) {
                    obj.col1 = text
                } else {
                    obj.col2 = text
                }
                if (obj.col2 || (index + 1) == orderx.length) {
                    orders.push(obj)
                    obj = {};
                }
                index++;
            })
            // res.json(orders)
            res.ireport("delivery.jrxml", req.query.file || "pdf", orders, { OUTPUT_NAME: 'delivery_' + req.query.startDate });
        })

}
exports.dailyTrack = (req, res) => {
    const orderDate = req.query.startDate.substr(0, 4) + '-' + req.query.startDate.substr(4, 2) + '-' + req.query.startDate.substr(6, 2)

    db.collection('orders').where('cutoffDate', '==', req.query.startDate).get()
        .then(snapShot => {
            let orders = [];
            snapShot.forEach(doc => {
                // let link = '';
                // if (doc.data().tracking.length == 5 || doc.data().tracking.length == 8 || doc.data().tracking.length == 12) {
                //     link = 'https://www.alphafast.com/th/track-alpha';
                // } else if (doc.data().tracking.substr(0, 1).toUpperCase() == 'K' && doc.data().tracking.length == 13) {
                //     link = 'https://th.kerryexpress.com/th/track/?track';
                // } else if (doc.data().tracking.indexOf('TH') > -1 && doc.data().tracking.length == 13) {
                //     link = 'http://track.thailandpost.co.th/tracking/default.aspx';
                // }
                orders.push({
                    id: doc.id,
                    name: (req.query.id ? doc.id + ' ' : '') + doc.data().name.trim(),
                    tracking: doc.data().tracking,
                    link: doc.data().expressLink
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
exports.dailySayHi = (req, res) => {
    async function getDailySayHi() {
        let pages = [];
        let admins = [];
        let sayhis = [];
        let sayhiPages = [];
        var r = req.r;
        await db.collection('pages').get().then(snapShot => {
            snapShot.forEach(doc => {
                admins.push({ id: doc.id, ...doc.data() })
            })
        })
        await db.collection('sayhis')
            .where('date', '>=', req.query.startDate.replace(/-/g, ''))
            .where('date', '<=', req.query.endDate.replace(/-/g, ''))
            .get().then(snapShot => {
                snapShot.forEach(doc => {
                    sayhis.push({ id: doc.id, ...doc.data() })
                    sayhiPages.push(doc.id)
                    sayhiPages.push((req.query.sum == 'all' ? 'SUM' : doc.data().date) + '@' + doc.data().page)
                })
            })
        await db.collection('emails').doc(req.query.uid)
            .get()
            .then(auth => {
                if (auth.exists) {
                    const role = auth.data().role;
                    if (role == 'owner') {
                        pages = admins.map(m => m.id)
                        // pages = ["@DB", "@SCR01", "@TCT01", "@TD01", "@TD02", "@TS01", "@TS02", "@TS03", "@TST", "@TPF01", "@TO01",
                        //     "DB", "SCR01", "SSN01", "TCT01", "TD01", "TD02", "TS01", "TS02", "TS03", "TST", "TPF01", "TO01"];
                    } else {
                        pages = auth.data().pages || [];
                    }
                    // console.log(admins)
                    db.collection('orders')
                        .where('orderDate', '>=', req.query.startDate.replace(/-/g, ''))
                        .where('orderDate', '<=', req.query.endDate.replace(/-/g, ''))
                        .get()
                        .then(snapShot => {
                            let orders = []
                            snapShot.forEach(doc => {
                                if (doc.data().bank.indexOf('CM') == -1)
                                    orders.push({
                                        id: doc.id, ...doc.data(),
                                        orderDate: req.query.sum == 'all' ? 'SUM' : doc.data().orderDate
                                    })
                            })
                            r.expr(orders).filter(f => {
                                return r.expr(pages).contains(f('page'))
                            }).filter(f => {
                                return r.branch(r.expr(role).eq('owner'),
                                    true,
                                    r.expr(sayhiPages).contains(f('orderDate').add(f('page')))
                                )
                            }).group(g => {
                                return g.pluck('page', 'orderDate', 'admin')
                            }).ungroup()
                                .map(m => {
                                    return m('group').merge(m2 => {
                                        return {
                                            count: m('reduction').count(),
                                            price: m('reduction').sum('price'),
                                            promote: m('reduction').sum('promote'),
                                            interest: m('reduction').sum('interest')
                                        }
                                    }).merge(r.branch(m('group')('page').match('@').eq(null), {
                                        fb: true,
                                        page: m('group')('page')
                                    }, {
                                            fb: false,
                                            page: m('group')('page').split('@')(1)
                                        }))
                                })
                                .group(g => {
                                    return g.pluck('page', 'orderDate', 'admin')
                                })
                                .ungroup()
                                .map(m => {
                                    return m('group').merge(m2 => {
                                        return {
                                            priceFb: m('reduction').filter({ fb: true }).sum('price'),
                                            countFb: m('reduction').filter({ fb: true }).sum('count'),
                                            // promoteFb: m('reduction').filter({ fb: true }).sum('promote'),
                                            // interestFb: m('reduction').filter({ fb: true }).sum('interest'),
                                            priceLine: m('reduction').filter({ fb: false }).sum('price'),
                                            countLine: m('reduction').filter({ fb: false }).sum('count'),
                                            // promoteLine: m('reduction').filter({ fb: false }).sum('promote'),
                                            // interestLine: m('reduction').filter({ fb: false }).sum('interest'),
                                            priceAll: m('reduction').sum('price'),
                                            countAll: m('reduction').sum('count'),
                                            interestFb: r.expr(sayhis).filter({ id: m('group')('orderDate').add(m('group')('page')) })(0)('fb').default(0),
                                            interestLine: r.expr(sayhis).filter({ id: m('group')('orderDate').add(m('group')('page')) })(0)('line').default(0),
                                            team: r.expr(admins).filter({ id: m('group')('page') })(0)('team'),
                                        }
                                    })
                                })
                                .do(d => {
                                    return d.merge(m => {
                                        return {
                                            priceX: d.filter({ page: m('page'), orderDate: m('orderDate') }).sum('priceAll'),
                                            countAdmin: d.filter({ page: m('page'), orderDate: m('orderDate') }).group('admin').ungroup().count()
                                        }
                                    })
                                })
                                .orderBy('orderDate', 'team', r.desc('priceX'), 'page', r.desc('priceAll'))
                                .run()
                                .then(result => {
                                    const pages = result.map(m => {
                                        const orderDate = m.orderDate.substr(0, 4) + '-' + m.orderDate.substr(4, 2) + '-' + m.orderDate.substr(6, 2)
                                        // console.log(m.page)
                                        return {
                                            ...m,
                                            orderDate: req.query.sum == 'all' ? 'SUM' : moment(orderDate).format('ll'),
                                            page: m.page + ' ' + admins.find(f => f.id === m.page).admin,
                                        }
                                    })

                                    res.ireport("dailySayHi.jrxml", req.query.file || "pdf", pages, {
                                        OUTPUT_NAME: 'dailySayHi' + req.query.startDate.replace(/-/g, '') + "_" + req.query.endDate.replace(/-/g, ''),
                                        START_DATE: moment(req.query.startDate).format('LL'),
                                        END_DATE: moment(req.query.endDate).format('LL'),
                                    });
                                    // res.json(pages)
                                })
                        })
                } else {
                    res.send('คุณไม่มีสิทธิ์ดูรายงานนี้')
                }
            })
    }

    getDailySayHi();


}
exports.dailySale = (req, res) => {
    async function getDailySale() {
        let pages = [];
        let admins = [];
        let sayhis = [];
        var r = req.r;
        await db.collection('pages').get().then(snapShot => {
            snapShot.forEach(doc => {
                admins.push({ id: doc.id, ...doc.data() })
            })
        })
        // await db.collection('sayhis')
        //     .where('date', '>=', req.query.startDate.replace(/-/g, ''))
        //     .where('date', '<=', req.query.endDate.replace(/-/g, ''))
        //     .get().then(snapShot => {
        //         snapShot.forEach(doc => {
        //             sayhis.push({ id: doc.id, ...doc.data() })
        //         })
        //     })
        await db.collection('emails').doc(req.query.uid)
            .get()
            .then(auth => {
                if (auth.exists) {
                    if (['owner', 'stock'].indexOf(auth.data().role) > -1) {
                        // pages = admins.map(m => m.id)
                        // pages = ["@DB", "@SCR01", "@TCT01", "@TD01", "@TD02", "@TS01", "@TS02", "@TS03", "@TST", "@TPF01", "@TO01",
                        //     "DB", "SCR01", "SSN01", "TCT01", "TD01", "TD02", "TS01", "TS02", "TS03", "TST", "TPF01", "TO01"];

                        db.collection('orders')
                            .where('orderDate', '>=', req.query.startDate.replace(/-/g, ''))
                            .where('orderDate', '<=', req.query.endDate.replace(/-/g, ''))
                            .get()
                            .then(snapShot => {
                                let orders = []
                                snapShot.forEach(doc => {
                                    if (doc.data().bank.indexOf('CM') == -1)
                                        orders.push({
                                            id: doc.id, ...doc.data(),
                                            orderDate: req.query.sum == 'all' ? 'SUM' : doc.data().orderDate
                                        })
                                })
                                r.expr(orders)
                                    // .filter(f => {
                                    //     return r.expr(pages).contains(f('page'))
                                    // })
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
                                        }).merge(r.branch(m('group')('page').match('@').eq(null), {
                                            fb: true,
                                            page: m('group')('page')
                                        }, {
                                                fb: false,
                                                page: m('group')('page').split('@')(1)
                                            }))
                                    })
                                    .group(g => {
                                        return g.pluck('page', 'orderDate')
                                    })
                                    .ungroup()
                                    .map(m => {
                                        return m('group').merge(m2 => {
                                            // const orderDate = m('group')('orderDate').substr(0, 4) + '-' + m.orderDate.substr(4, 2) + '-' + m.orderDate.substr(6, 2)
                                            return {
                                                // orderDate:moment(m('group')('orderDate')).format('ll'),
                                                priceFb: m('reduction').filter({ fb: true }).sum('price'),
                                                countFb: m('reduction').filter({ fb: true }).sum('count'),
                                                promoteFb: m('reduction').filter({ fb: true }).sum('promote'),
                                                interestFb: m('reduction').filter({ fb: true }).sum('interest'),
                                                priceLine: m('reduction').filter({ fb: false }).sum('price'),
                                                countLine: m('reduction').filter({ fb: false }).sum('count'),
                                                promoteLine: m('reduction').filter({ fb: false }).sum('promote'),
                                                interestLine: m('reduction').filter({ fb: false }).sum('interest'),
                                                priceAll: m('reduction').sum('price'),
                                                countAll: m('reduction').sum('count'),
                                                promoteAll: m('reduction').sum('promote'),
                                                interestAll: m('reduction').sum('interest'),
                                                team: r.expr(admins).filter({ id: m('group')('page') })(0)('team')
                                            }
                                        })
                                    })
                                    .orderBy('orderDate', 'team', r.desc('priceAll'))
                                    .run()
                                    .then(result => {
                                        const pages = result.map(m => {
                                            const orderDate = m.orderDate.substr(0, 4) + '-' + m.orderDate.substr(4, 2) + '-' + m.orderDate.substr(6, 2)
                                            // console.log(m.page)
                                            return {
                                                ...m,
                                                orderDate: req.query.sum == 'all' ? 'SUM' : moment(orderDate).format('ll'),
                                                page: m.page + ' ' + admins.find(f => f.id === m.page).admin,
                                            }
                                        })

                                        res.ireport("dailySale.jrxml", req.query.file || "pdf", pages, {
                                            OUTPUT_NAME: 'dailySale' + req.query.startDate.replace(/-/g, '') + "_" + req.query.endDate.replace(/-/g, ''),
                                            START_DATE: moment(req.query.startDate).format('LL'),
                                            END_DATE: moment(req.query.endDate).format('LL'),
                                        });
                                        // res.json(pages)
                                    })
                            })
                    } else {
                        res.send('คุณไม่มีสิทธิ์ดูรายงานนี้')
                    }
                } else {
                    res.send('คุณไม่มีสิทธิ์ดูรายงานนี้')
                }
            })
    }

    getDailySale();


}
exports.dailyProduct = (req, res) => {
    var r = req.r;
    async function asyncFunc() {
        let orders = [], products = [];
        await db.collection('products').get().then(snapShot => {
            snapShot.forEach(doc => {
                products.push({ id: doc.id, ...doc.data() })
            })
        })
        await db.collection('orders')
            .where('orderDate', '>=', req.query.startDate.replace(/-/g, ''))
            .where('orderDate', '<=', req.query.endDate.replace(/-/g, ''))
            .get()
            .then(snapShot => {
                const pages = [req.query.page, '@' + req.query.page]
                snapShot.forEach(doc => {
                    if (pages.indexOf(doc.data().page) > -1 || req.query.page == 'ALL') {
                        orders.push({ id: doc.id, ...doc.data() })
                    }
                })
            })
        return {
            orders,
            products
        }
    }
    asyncFunc()
        .then(result => {
            r.expr(result)
                .merge(m => {
                    return {
                        orders: m('orders').map(m2 => {
                            return {
                                product: m2('product').merge(m3 => {
                                    return {
                                        fb: r.branch(m2('page').match('@').eq(null), true, false),
                                    }
                                }).without('name'),
                            }
                        })
                            .getField('product')
                            .reduce((le, ri) => {
                                return le.add(ri)
                            }).default([])
                            .group('code')
                            .ungroup()
                            .map(m2 => {
                                return {
                                    code: m2('group'),
                                    amountFb: m2('reduction')
                                        .filter({ fb: true }).sum('amount'),
                                    amountLine: m2('reduction').filter({ fb: false }).sum('amount'),
                                    amount: m2('reduction').sum('amount'),
                                    priceFb: m('orders').filter(f => {
                                        return f('page').match('@').eq(null)
                                    }).sum('price'),
                                    priceLine: m('orders').filter(f => {
                                        return f('page').match('@').ne(null)
                                    }).sum('price'),
                                    price: m('orders').sum('price'),
                                    name: m('products').filter({ id: m2('group') })(0)('name')
                                }
                            }),
                    }
                })
                .getField('orders')
                .orderBy(r.desc('amount'))
                .run()
                .then(datas => {
                    // res.json(datas)
                    res.ireport("dailyProduct.jasper", req.query.file || "pdf", datas, {
                        PAGE: (req.query.page == 'ALL' ? 'ทั้งหมด' : req.query.page),
                        OUTPUT_NAME: 'dailySale' + req.query.startDate.replace(/-/g, '') + "_" + req.query.endDate.replace(/-/g, ''),
                        START_DATE: moment(req.query.startDate).format('LL'),
                        END_DATE: moment(req.query.endDate).format('LL'),
                    });
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
                    if (['owner', 'stock'].indexOf(auth.data().role) > -1) {
                        db.collection('orders')
                            .where('orderDate', '>=', req.query.startDate.replace(/-/g, ''))
                            .where('orderDate', '<=', req.query.endDate.replace(/-/g, ''))
                            .get()
                            .then(snapShot => {
                                let orders = []
                                snapShot.forEach(doc => {
                                    const bank = doc.data().bank.toUpperCase().match(/[a-zA-Z]+/g, '');
                                    orders.push({
                                        id: doc.id,
                                        ...doc.data(),
                                        bank: bank == null ? "ลืมใส่" : bank[0]
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
                                                orderDate: moment(orderDate).format('ll')
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
                }
            })
    }

    getDailySale();


}
exports.dailyStatement = (req, res) => {
    async function getDailyStatement() {
        var r = req.r;
        await db.collection('emails').doc(req.query.uid)
            .get()
            .then(auth => {
                if (auth.exists) {
                    if (['owner', 'stock'].indexOf(auth.data().role) > -1) {
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
                                r.expr(orders)
                                    .orderBy('bank', 'orderDate', 'time')
                                    .pluck('bank', 'orderDate', 'time', 'page', 'price', 'id', 'name', 'tel', 'orderTime')
                                    .run()
                                    .then(result => {
                                        const datas = result.map(m => {
                                            const orderDate = m.orderDate.substr(0, 4) + '-' + m.orderDate.substr(4, 2) + '-' + m.orderDate.substr(6, 2)
                                            return {
                                                ...m,
                                                orderDate: moment(orderDate).format('ll')
                                            }
                                        })

                                        res.ireport("dailyStatement.jrxml", req.query.file || "pdf", datas, {
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
                }
            })
    }

    getDailyStatement();


}
exports.excel = (req, res) => {
    var XLSX = require('xlsx');
    var workbook = XLSX.readFile('../report-orders/app/files/stock20181031.xlsx');
    var ws = workbook.Sheets;
    var data = XLSX.utils.sheet_to_json(ws['Sheet2'])

    async function callback() {
        for (var i = 0; i < data.length; i++) {
            await db.collection('products').doc(data[i].id).set({ ...data[i] }, { merge: true })
        }
    }
    callback();
    res.json(true)
}
exports.test = (req, res) => {
    // db.collection('pages')
    //     .get()
    //     .then(snapShot => {
    //         snapShot.forEach(doc => {
    //             db.collection('pages').doc(doc.id).update({ team: 'Nuiz' })
    //         })
    res.json(true)
    // })
}
exports.movePage = (req, res) => {
    db.collection('orders').where('userId', '==', 'U45b67ab5094188b650a0ef2c07773e42')
        // .where('userId', '==', 'U4378f6e7db46a7033d10792be291830b')
        .get()
        .then(snapShot => {
            let orders = []
            snapShot.forEach(doc => {
                orders.push({ id: doc.id, ...doc.data() })
                // db.collection('orders').doc(doc.id).update({ admin: 'tas' })
            })
            res.json(orders)
        })
}
exports.counterPage = (req, res) => {
    if (req.query.page) {
        const page = req.query.page.toUpperCase();
        db.collection('pages').doc(page).get()
            .then(doc => {
                if (doc.exists) {
                    let counters = doc.data().counters || [];
                    const id = doc.data().id;
                    const index = counters.findIndex(f => f.date == yyyymmdd())
                    if (index > -1) {
                        counters[index]['count'] = counters[index]['count'] + 1;
                        counters[index]['params'] = req.query
                    } else {
                        counters.push({
                            date: yyyymmdd(),
                            count: 1,
                            params: req.query
                        })
                    }
                    db.collection('pages').doc(page).set({ counters }, { merge: true })
                        .then(result => {
                            res.redirect('http://m.me/' + id)
                        })
                } else {
                    res.redirect('http://m.me/tpf001')
                }
            })
    } else {
        res.redirect('http://m.me/tpf001')
    }
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