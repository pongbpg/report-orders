const moment = require('moment');
const request = require("request");
const db = require('../../config/firebase').topslim;
const admin = require('firebase-admin');
moment.locale('th');
exports.delivery = (req, res) => {
    db.collection('orders')
        .where('cutoffDate', '==', req.query.startDate)
        .where('country', '==', req.query.country)
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
            if (req.query.file != 'flash') {
                orderx.sort((a, b) => {
                    const aName = a.name.substr(0, 1) + a.id;
                    const bName = b.name.substr(0, 1) + b.id;
                    return aName > bName ? 1 : -1;
                }).map(order => {
                    // const data = doc.data();
                    const text = `${index + 1}.${order.name} ${order.tel}\n${order.addr.replace(/\n/g, ' ')}\n${order.bank}${order.banks.length > 1 ? ' (' + formatMoney(order.price, 0) + ')' : ''} บาท\n${order.product.map(p => p.code + '=' + p.amount)}\nREF:${order.id} (${order.page})`
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

            } else {
                orderx = orderx.map(order => {
                    const pc = order.addr.match(/[0-9]{5}/g);
                    let postcode = '';
                    if (pc != null) {
                        postcode = pc[pc.length - 1]
                    }
                    if (order.name.substr(0, 1) == 'F') {
                        return {
                            Customer_order_number: order.id,
                            Consignee_name: order.name,
                            Address: order.addr.replace(/\n/g, ' '),
                            Postal_code: postcode,
                            Phone_number: order.tel,
                            Phone_number2: '',
                            COD: order.bank.indexOf('COD') > -1 ? order.price : '',
                            Weight_kg: 1,
                            Length: '',
                            Width: '',
                            Height: '',
                            Remark1: '',
                            Remark2: '',
                            Remark3: ''
                        }
                    }
                }).filter(f => f != null)

                // res.json(orderx)
                const XLSX = require('xlsx');
                // /* create workbook & set props*/
                const wb = { SheetNames: [], Sheets: {} };

                // // /* create file 'in memory' */
                // for (var prop in result) {
                var ws = XLSX.utils.json_to_sheet(orderx);
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
                admins.push({ id: '@' + doc.id, ...doc.data() })
            })
        })
        await db.collection('sayhis')
            .where('date', '>=', req.query.startDate.replace(/-/g, ''))
            .where('date', '<=', req.query.endDate.replace(/-/g, ''))
            .get().then(snapShot => {
                snapShot.forEach(doc => {
                    sayhis.push({
                        id: doc.id,
                        ...doc.data(),
                        date: (req.query.sum == 'all' ? 'SUM' : doc.data().date) + doc.data().page
                    })
                    sayhiPages.push((req.query.sum == 'all' ? 'SUM' + doc.data().page : doc.id))
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
                        auth.data().pages.forEach(page => {
                            // console.log(page)
                            pages.push(page)
                            pages.push('@' + page)
                        })
                        // console.log(pages)
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
                                            interestFb: r.expr(sayhis).filter({ date: m('group')('orderDate').add(m('group')('page')) }).sum('fb').default(0),
                                            interestLine: r.expr(sayhis).filter({ date: m('group')('orderDate').add(m('group')('page')) }).sum('line').default(0),
                                            team: r.expr(admins).filter({ id: m('group')('page') })(0)('team'),
                                            // cc: r.expr(sayhis)
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
                                    // res.json(result)
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
        let coms = [];
        var r = req.r;
        await db.collection('coms').get().then(snapShot => {
            snapShot.forEach(doc => {
                coms.push({ id: doc.id, ...doc.data() })
            })
        })
        await db.collection('pages').get().then(snapShot => {
            // console.log(coms)
            snapShot.forEach(doc => {
                const com = coms.find(f => f.id == doc.data().comId);
                pages.push({ id: doc.id, ...doc.data(), coms: com ? com.rates : [] })
            })
            // console.log(pages)
        })


        await db.collection('emails').doc(req.query.uid)
            .get()
            .then(auth => {
                if (auth.data().role == 'owner') {
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
                                        page: doc.data().page.replace('@', ''),
                                        edit: doc.data().edit == null ? false : doc.data().edit
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
                                        price: m('reduction').filter({ edit: false }).sum('price'),
                                        price2: m('reduction').filter({ edit: true }).sum('price'),
                                        sumPage: m('reduction').sum('price')
                                    })
                                })
                                .do(d => {
                                    return d
                                        .merge(m => {
                                            return {
                                                sumPage: d.filter({ page: m('page') }).sum('sumPage'),
                                                rates: r.expr(pages).filter(f => {
                                                    return f('id').eq(m('page'))
                                                })(0)('coms').default([]),
                                                comId: r.expr(pages).filter(f => {
                                                    return f('id').eq(m('page'))
                                                })(0)('comId').default(0)
                                            }
                                        })
                                        .merge(m => {
                                            return {
                                                rate: m('rates').filter(f => {
                                                    return f('min').le(m('sumPage'))
                                                        .and(f('max').ge(m('sumPage')))
                                                })(0)('percent').default(0)
                                            }
                                        })
                                        .merge(m => {
                                            return {
                                                com: m('rate').mul(m('price')),
                                                com2: m('rate').mul(m('price2'))
                                            }
                                        })
                                        .without('rates')
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
exports.itemAdmin = (req, res) => {
    async function itemAdmin() {
        var r = req.r;
        await db.collection('emails').doc(req.query.uid)
            .get()
            .then(auth => {
                if (auth.data().role == 'owner') {
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
                                        page: doc.data().page.replace('@', ''),
                                        edit: doc.data().edit == null ? false : doc.data().edit
                                    })
                            })
                            // const fs = require('fs');
                            // let rawdata = fs.readFileSync('./item.json');
                            let obj = [];
                            // JSON.parse(rawdata)
                            orders.map(m => {
                                m.product.map(m2 => {
                                    obj.push({
                                        ...m2,
                                        admin: m.admin,
                                        userId: m.userId,
                                        edit: m.edit,
                                        page: m.page
                                    })
                                })
                            })
                            // obj = obj.sort((a, b) => {
                            //     const x = a.userId + a.typeId + a.code
                            //     const y = b.userId + b.typeId + b.code
                            //     return x > y ? 1 : -1;
                            // })
                            r.expr(obj)
                                .group(g => {
                                    return g.pluck('page', 'userId', 'code')
                                })
                                .ungroup()
                                .map(m => {
                                    return m('group').merge(m2 => {
                                        return {
                                            amount1: m('reduction').filter({ edit: false }).sum('amount'),
                                            amount2: m('reduction').filter({ edit: true }).sum('amount'),
                                            admin: m('reduction')(0)('admin'),
                                            typeId: m('reduction')(0)('typeId'),
                                            typeName: m('reduction')(0)('typeName'),
                                            pName: m('reduction')(0)('name'),
                                        }
                                    })
                                })
                                .orderBy('page', 'userId', 'typeId', 'code')
                                .then(result => {
                                    // res.json(result)
                                    res.ireport("itemAdmin.jasper", req.query.file || "pdf", result, {
                                        OUTPUT_NAME: 'itemAdmin' + req.query.startDate.replace(/-/g, '') + "_" + req.query.endDate.replace(/-/g, ''),
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

    itemAdmin();


}
exports.dailyCost = (req, res) => {
    console.log(moment(req.query.startDate).subtract(1, "days").format('YYYY-MM-DD'))
    var optionsBOT = {
        method: 'GET',
        url: 'https://apigw1.bot.or.th/bot/public/Stat-ReferenceRate/v2/DAILY_REF_RATE/',
        qs: { start_period: moment(req.query.startDate).subtract(1, "days").format('YYYY-MM-DD'), end_period: req.query.endDate },
        headers: { accept: 'application/json', 'x-ibm-client-id': '870190f3-cac0-49ae-9220-058741681a02' }
    };
    async function getDailyCost() {
        let pages = [];
        let admins = [];
        // let products = [];
        let costs = [];
        let dataBOT = {};
        var r = req.r;
        await db.collection('pages').get().then(snapShot => {
            snapShot.forEach(doc => {
                // admins.push({ ...doc.data(), page: doc.id })
                pages.push({ ...doc.data(), page: doc.id })
            })
            // pages = admins.filter(f => f.page.indexOf('@') == -1)
        })
        await request(optionsBOT, function (error, response, body) {
            if (error) {
                return console.error('Failed: %s', error.message);
            }
            const rates = JSON.parse(body).result;
            dataBOT = rates.data.data_detail[0];
            // res.json(data)
        });

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
                            adsLine: cost ? cost.line : 0,
                            delivery: cost ? cost.delivery : 0
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
                            const rate = doc.data().country == 'TH' ? 1 : Number(dataBOT.rate || 32);
                            orders.push({
                                id: doc.id, ...doc.data(),
                                orderDate: req.query.sum == 'all' ? 'SUM' : doc.data().orderDate,
                                // claim: doc.data().bank.indexOf('CM') == -1 ? false : true,
                                type: doc.data().bank.indexOf('CM') > -1 ? 'cm' :
                                    (doc.data().page.indexOf('@') == -1 ? 'fb' : 'line'),
                                product: doc.data().product.map(m => {
                                    return {
                                        ...m,
                                        cost: (m.cost * m.amount) * rate//products.find(f => f.id == m.code).cost * m.amount
                                    }
                                }),
                                price: doc.data().price * rate,
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
                                        return g.pluck('page', 'type', 'orderDate')
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
                                                    costFb: m2('reduction').filter({ type: 'fb' }).sum('cost'),
                                                    costLine: m2('reduction').filter({ type: 'line' }).sum('cost'),
                                                    costCm: m2('reduction').filter({ type: 'cm' }).sum('cost'),
                                                    cost: m2('reduction').sum('cost'),
                                                    priceFb: m2('reduction').filter({ type: 'fb' }).sum('price'),
                                                    priceLine: m2('reduction').filter({ type: 'line' }).sum('price'),
                                                    priceCm: m2('reduction').filter({ type: 'cm' }).sum('price'),
                                                    price: m2('reduction').sum('price'),
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
                                                    adsLine: m2('reduction').sum('adsLine'),
                                                    delivery: m2('reduction').sum('delivery'),
                                                    ads: m2('reduction').sum('adsFb').add(m2('reduction').sum('adsLine')).add(m2('reduction').sum('delivery'))
                                                }
                                            })
                                        })
                                }
                            })
                            .do(d => {
                                return d('results').merge(m => {
                                    return m.pluck('adsFb', 'adsLine', 'delivery', 'ads', 'team', 'orderDate', 'page')
                                        .merge(m2 => {
                                            var x = d('orders').filter({ orderDate: m('orderDate'), page: m('page') });
                                            return r.branch(x.count().ge(1), x(0), {
                                                costFb: 0,
                                                costLine: 0,
                                                costCm: 0,
                                                cost: 0,
                                                priceFb: 0,
                                                priceLine: 0,
                                                priceCm: 0,
                                                price: 0,
                                            })
                                        })
                                })
                                // .reduce((le, ri) => {
                                //     return le.add(ri)
                                // }).default([])
                            })
                            .merge(m => {
                                return {
                                    balance: m('price').sub(m('cost')).sub(m('ads'))
                                }
                            })
                            .orderBy('orderDate', 'team', r.desc('balance'))
                            .run()
                            .then(result => {
                                // res.json(result)
                                console.log(dataBOT.rate)
                                res.ireport("dailyCost.jasper", req.query.file || "pdf", result, {
                                    OUTPUT_NAME: 'dailyCost' + req.query.startDate.replace(/-/g, '') + "_" + req.query.endDate.replace(/-/g, ''),
                                    START_DATE: moment(req.query.startDate).format('LL'),
                                    END_DATE: moment(req.query.endDate).format('LL'),
                                    RATE_AMOUNT: Number(dataBOT.rate).toString(),
                                    RATE_DATE: moment(dataBOT.period).format('LL')
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
    let orders = [];
    db.collection('orders')
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
                        typeId: m('reduction')(0)('typeId'),
                        typeName: m('reduction')(0)('typeName')
                    }
                })
                .orderBy('typeId', 'code')
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

                                    // orders.push({
                                    //     id: doc.id,
                                    //     ...doc.data(),
                                    //     // bank: bank == null ? "ลืมใส่" : bank[0]
                                    // })
                                    for (var i = 0; i < doc.data().banks.length; i++) {
                                        const bank = doc.data().banks[i].name.toUpperCase().match(/[a-zA-Z]+/g, '');
                                        orders.push({
                                            bank: bank == null ? "ลืมใส่" : bank[0],
                                            price: doc.data().banks[i].price,
                                            orderDate: doc.data().orderDate
                                        })
                                    }
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
                                    // const bank = doc.data().bank.toUpperCase().match(/[a-zA-Z]+/g, '');
                                    // const time = doc.data().bank.match(/[0-9][0-9][.][0-9][0-9]/g, '');
                                    const timestamp = new Date(doc.data().timestamp.toMillis());
                                    let orderTime = twoDigit(timestamp.getHours()) + '.' + twoDigit(timestamp.getMinutes());

                                    // console.log(doc.data().timestamp)
                                    for (var i = 0; i < doc.data().banks.length; i++) {
                                        const bank = doc.data().banks[i].name.toUpperCase().match(/[a-zA-Z]+/g, '');
                                        const time = doc.data().banks[i].time.match(/[0-9][0-9][.][0-9][0-9]/g, '');
                                        if (bank != null) {
                                            if (['CM', 'COD'].indexOf(bank[0]) == -1) {
                                                orders.push({
                                                    id: doc.id,
                                                    // ...doc.data(),
                                                    bank: bank[0],
                                                    time: time[0],
                                                    orderTime: orderTime < time[0] ? moment(timestamp).format('l LT') : orderTime,
                                                    orderDate: orderTime < time[0] ? moment(doc.data().orderDate).subtract(1, 'days').format('YYYYMMDD') : doc.data().orderDate,
                                                    price: doc.data().banks[i].price,
                                                    page: doc.data().page,
                                                    name: doc.data().name,
                                                    tel: doc.data().tel
                                                })
                                            }
                                        }
                                    }
                                    // orders.push({
                                    //     id: doc.id,
                                    //     ...doc.data(),
                                    //     bank: bank[0],
                                    //     time: time[0],
                                    //     orderTime: orderTime < time[0] ? moment(timestamp).format('l LT') : orderTime,
                                    //     orderDate: orderTime < time[0] ? moment(doc.data().orderDate).subtract(1, 'days').format('YYYYMMDD') : doc.data().orderDate
                                    // })
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
exports.postcode = (req, res) => {
    const fs = require('fs');
    const rawdata = fs.readFileSync('./postcode.json');
    const postcodes = JSON.parse(rawdata)
    if (postcodes.indexOf(postcode) == -1) {
        value = `${value + ' ' + emoji(0x1000A6)}รหัสไปรษณีย์ไม่ถูกต้องundefined`
    }
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
exports.cod = (req, res) => {
    db.collection('orders')
        .where('orderDate', '>=', '20181201')
        .where('orderDate', '<=', '20181231')
        .where('bank', '==', 'COD')
        .get()
        .then(snapShot => {
            let cost = 0;
            snapShot.forEach(doc => {
                // if (doc.data().bank.indexOf('COD') > -1) {
                cost += 70;
                // }
            })
            res.json(cost)
        })
}
exports.infoCustomer = (req, res) => {
    var r = req.r;
    db.collection('orders')
        // .orderBy('orderDate', 'desc')
        // .limit(10)
        .where('orderDate', '>=', '20190101')
        .where('orderDate', '<=', '20190331')
        .get()
        .then(snapShot => {
            let orders = []
            snapShot.forEach(doc => {
                if (doc.data().bank.indexOf('CM') == -1)
                    // db.collection('orders').doc(doc.id).update({ product2: admin.firestore.FieldValue.delete() })
                    orders.push({
                        id: doc.id,
                        ...doc.data(),
                        page: doc.data().page.replace('@', ''),
                        source: doc.data().page.indexOf('@') > -1 ? 'LINE' : 'FACEBOOK',
                        postcode: doc.data().addr.match(/\d{5}/g) == null ? '' : doc.data().addr.match(/\d{5}/g)[0]
                    })
                // )
            })
            r.expr(orders)
                .group(g => {
                    return g.pluck('page')
                })
                .ungroup()
                .map(m => {
                    return m('group').merge({
                        reduction: m('reduction').group('tel').ungroup()
                            .map(m2 => {
                                return {
                                    // phone: r.expr("'").add(m2('group')),
                                    phone: m2('group'),
                                    value: m2('reduction').sum('price'),
                                    social: m2('reduction')(0)('fb'),
                                    zip: m2('reduction')(0)('postcode'),
                                    name: m2('reduction')(0)('name'),
                                    source: m2('reduction')(0)('source')
                                }
                            })
                            .orderBy(r.desc('value'))
                    })
                })
                .run()
                .then(result => {
                    // res.json(result);
                    const XLSX = require('xlsx');
                    // /* create workbook & set props*/
                    const wb = { SheetNames: [], Sheets: {} };

                    // // /* create file 'in memory' */
                    for (var prop in result) {
                        var ws = XLSX.utils.json_to_sheet(result[prop]['reduction']);
                        XLSX.utils.book_append_sheet(wb, ws, result[prop]['page']);
                    }
                    // // res.json(ws);
                    // XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
                    var wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
                    var filename = "topslim_customer.xlsx";
                    res.setHeader('Content-Disposition', 'attachment; filename=' + filename);
                    res.type('application/octet-stream');
                    res.send(wbout);
                })
        })

}

exports.crp = (req, res) => {
    const fs = require('fs');
    let rawdata = fs.readFileSync('./crp.json');
    let obj = JSON.parse(rawdata).filter(f => f.product.filter(f2 => ['LG', 'SP', 'MN', 'AS'].indexOf(f2.code) > -1));
    var r = req.r;
    r.expr(obj)
        .pluck('id', 'name', 'page', 'tel', 'fb', 'admin')
        .group('tel')
        .ungroup()
        .map(m => {
            return m('reduction')(0)
                .merge({
                    tel: r.expr('T.').add(m('reduction')(0)('tel'))
                })
        })
        .then(result => {
            res.json(result)
        })
}

// exports.updateType = (req, res) => {
//     const fs = require('fs');
//     let rawdata2 = fs.readFileSync('./types.json');
//     const types = JSON.parse(rawdata2)
//     db.collection('orders')
//         .where('orderDate', '>=', '20181201')
//         .where('orderDate', '<=', '20181231')
//         .get()
//         .then(snapShot => {
//             let xx = [];
//             snapShot.forEach(doc => {
//                 let product = doc.data().product.map(p => {
//                     const type = types.find(f => f.id == p.code);
//                     return {
//                         ...p,
//                         typeId: type.typeId,
//                         typeName: type.typeName
//                     }
//                 })
//                 doc.ref.update({ product })
//                 xx.push({ id: doc.id, product })
//             })
//             res.json(xx)
//         })
// }

// exports.upbanks = (req, res) => {
//     db.collection('orders')
//         // .where('userId', '==', 'U4378f6e7db46a7033d10792be291830b')
//         .get()
//         .then(snapShot => {
//             // let orders = []
//             snapShot.forEach(doc => {
//                 if (doc.data().bank) {
//                     if (doc.data().bank.indexOf('=') == -1) {
//                         console.log(doc.id, doc.data())
//                         db.collection('orders').doc(doc.id).update({
//                             banks: [
//                                 {
//                                     name: doc.data().bank,//.match(/[a-zA-Z]+/g, '') == null ? doc.data().bank : doc.data().bank.match(/[a-zA-Z]+/g, '')[0],
//                                     time: '00.00',//doc.data().bank.match(/\d\.\d/g) == -1 ? (doc.data().bank.match(/\d{2}\.\d{2}/g) == null ? '00.00' : doc.data().bank.match(/\d{2}\.\d{2}/g)[0]) : '00.00',
//                                     price: doc.data().price
//                                 }
//                             ],
//                             bank: doc.data().bank + '=' + formatMoney(doc.data().price, 0)
//                         })
//                     }
//                 }
//             })
//             res.json(true)
//         })
// }
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