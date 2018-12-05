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
exports.comAdmin = (req, res) => {
    async function comAdmin() {
        let pages = [];
        let admins = [];
        var r = req.r;
        await db.collection('pages').get().then(snapShot => {
            snapShot.forEach(doc => {
                admins.push({ id: doc.id, ...doc.data() })
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
                                        page: doc.data().page.replace('@', '')
                                    })
                            })
                            r.expr(orders)
                                .group(g => {
                                    return g.pluck('userId', 'page')
                                })
                                .ungroup()
                                .map(m => {
                                    return m('group').pluck('page').merge({
                                        admin: m('reduction')(0)('admin'),
                                        price: m('reduction').sum('price')
                                    })
                                })
                                .do(d => {
                                    return d.merge(m => {
                                        return {
                                            sumPage: d.filter({ page: m('page') }).sum('price')
                                        }
                                    }).merge(m => {
                                        return {
                                            rate: r.branch(m('sumPage').ge(1000000), 0.04,
                                                m('sumPage').ge(700000), 0.035,
                                                m('sumPage').ge(500000), 0.03,
                                                m('sumPage').ge(400000), 0.025,
                                                m('sumPage').ge(350000), 0.0225,
                                                m('sumPage').ge(300000), 0.02,
                                                m('sumPage').ge(250000), 0.015,
                                                m('sumPage').ge(200000), 0.0125,
                                                0
                                            )
                                        }
                                    })
                                        .merge(m => {
                                            return {
                                                com: m('rate').mul(m('price'))
                                            }
                                        })
                                })
                                .orderBy('admin', r.desc('com'))
                                .run()
                                .then(result => {
                                    // res.json(result)
                                    res.ireport("comAdmin.jasper", req.query.file || "pdf", result, {
                                        OUTPUT_NAME: 'comAdmin' + req.query.startDate.replace(/-/g, '') + "_" + req.query.endDate.replace(/-/g, ''),
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

    comAdmin();


}
exports.dailyCost = (req, res) => {
    async function getDailyCost() {
        let pages = [];
        let admins = [];
        let products = [];
        let costs = [];
        var r = req.r;
        await db.collection('pages').get().then(snapShot => {
            snapShot.forEach(doc => {
                admins.push({ ...doc.data(), page: doc.id })
            })
            pages = admins.filter(f => f.page.indexOf('@') == -1)
        })
        await db.collection('products').get().then(snapShot => {
            snapShot.forEach(doc => {
                products.push({ id: doc.id, ...doc.data() })
            })
        })
        await db.collection('costs')
            .where('date', '>=', req.query.startDate.replace(/-/g, ''))
            .where('date', '<=', req.query.endDate.replace(/-/g, ''))
            .get().then(snapShot => {
                snapShot.forEach(doc => {
                    costs.push({ id: doc.id, ...doc.data() })
                })
            })
        await db.collection('emails').doc(req.query.uid).get().then(auth => {
            if (auth.data().role == 'owner') {
                const dates = enumerateDaysBetweenDates(req.query.startDate, req.query.endDate);
                const results = [];
                for (let d = 0; d < dates.length; d++) {
                    for (let p = 0; p < pages.length; p++) {
                        const cost = costs.find(f => f.id == dates[d] + pages[p].page)
                        results.push({
                            date: dates[d],
                            ...pages[p],
                            orderDate: req.query.sum == 'all' ? 'SUM' : dates[d],
                            adsFb: cost ? cost.fb : 0,
                            adsLine: cost ? cost.line : 0
                        })
                    }
                }
                db.collection('orders')
                    .where('orderDate', '>=', req.query.startDate.replace(/-/g, ''))
                    .where('orderDate', '<=', req.query.endDate.replace(/-/g, ''))
                    .get()
                    .then(snapShot => {
                        let orders = []
                        snapShot.forEach(doc => {
                            // if (doc.data().bank.indexOf('CM') == -1)
                            orders.push({
                                id: doc.id, ...doc.data(),
                                orderDate: req.query.sum == 'all' ? 'SUM' : doc.data().orderDate,
                                // claim: doc.data().bank.indexOf('CM') == -1 ? false : true,
                                fb: doc.data().page.indexOf('@') == -1 ? true : false,
                                product: doc.data().product.map(m => {
                                    return {
                                        ...m,
                                        cost: products.find(f => f.id == m.code).cost * m.amount
                                    }
                                }),
                                page: doc.data().page.replace('@', '')
                            })
                        })

                        r.expr({
                            orders,
                            results
                        })
                            .merge(m => {
                                return {
                                    orders: m('orders').group(g => {
                                        return g.pluck('page', 'fb', 'orderDate')
                                    }).ungroup()
                                        .map(m2 => {
                                            return m2('group').merge(m3 => {
                                                return {
                                                    price: m2('reduction').sum('price'),
                                                    cost: m2('reduction').map(m4 => {
                                                        return { cost: m4('product').sum('cost') }
                                                    }).sum('cost'),
                                                    // amountOrder: m2('reduction').count()
                                                }
                                            })
                                        })
                                        .group(g => {
                                            return g.pluck('page', 'orderDate')
                                        })
                                        .ungroup()
                                        .map(m2 => {
                                            return m2('group').merge(m3 => {
                                                return {
                                                    costFb: m2('reduction').filter({ fb: true }).sum('cost'),
                                                    costLine: m2('reduction').filter({ fb: false }).sum('cost'),
                                                    priceFb: m2('reduction').filter({ fb: true }).sum('price'),
                                                    priceLine: m2('reduction').filter({ fb: false }).sum('price'),
                                                }
                                            })
                                        }),
                                    results: m('results').group(g => {
                                        return g.pluck('team', 'page', 'orderDate')
                                    }).ungroup()
                                        .map(m2 => {
                                            return m2('group').merge(m3 => {
                                                return {
                                                    adsFb: m2('reduction').sum('adsFb'),
                                                    adsLine: m2('reduction').sum('adsLine')
                                                }
                                            })
                                        })
                                }
                            })
                            .do(d => {
                                return d('results').map(m => {
                                    return d('orders').filter({ orderDate: m('orderDate'), page: m('page') })
                                        .merge(m.pluck('adsFb', 'adsLine', 'team'))
                                }).reduce((le, ri) => {
                                    return le.add(ri)
                                }).default([])
                            })
                            .orderBy('orderDate', 'team', 'page')
                            .run()
                            .then(result => {
                                // res.json(result)
                                res.ireport("dailyCost.jasper", req.query.file || "pdf", result, {
                                    OUTPUT_NAME: 'dailyCost' + req.query.startDate.replace(/-/g, '') + "_" + req.query.endDate.replace(/-/g, ''),
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
    getDailyCost();
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