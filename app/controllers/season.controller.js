const moment = require('moment');
const request = require("request");
const db = require('../../config/firebase').season;
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
            let obj = { col1: '', col2: '' };
            snapShot.forEach(doc => {
                orderx.push({ id: doc.id, ...doc.data() })
            })
            orderx = orderx.filter(order => (req.query.payment == 'BANK' && order.bank.indexOf('COD') == -1)
                || (req.query.payment == 'COD' && order.bank.indexOf('COD') > -1)
                || req.query.payment == 'ALL'
            )
                .sort((a, b) => {
                    const aName = a.name.substr(0, 1) + a.orderDate + fourDigit(a.orderNo);
                    const bName = b.name.substr(0, 1) + b.orderDate + fourDigit(b.orderNo);
                    return aName > bName ? 1 : -1;
                })
            if (req.query.file != 'flash' && req.query.file != 'jt') {
                orderx = orderx.map(order => {
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

            } else if (req.query.file == 'flash') {
                orderx = orderx.map(order => {
                    const pc = order.addr.match(/[0-9]{5}/g);
                    let postcode = '';
                    if (pc != null) {
                        postcode = pc[pc.length - 1]
                    }
                    if (order.name.substr(0, 1) == 'F') {
                        // if ((req.query.payment == 'BANK' && order.bank.indexOf('COD') == -1)
                        //     || (req.query.payment == 'COD' && order.bank.indexOf('COD') > -1)
                        //     || req.query.payment == 'ALL'
                        // )
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
                            Remark1: `${order.product.map(p => p.code + '=' + p.amount)}`,
                            Remark2: order.price,
                            Remark3: order.page
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
            } else if (req.query.file == 'jt') {
                orderx = orderx.map(order => {
                    if (order.name.substr(0, 1) == 'J') {
                        // if ((req.query.payment == 'BANK' && order.bank.indexOf('COD') == -1)
                        //     || (req.query.payment == 'COD' && order.bank.indexOf('COD') > -1)
                        //     || req.query.payment == 'ALL'
                        // ) {
                        const xx = queryProvAmpr(order.addr.replace(/\n/g, ' '));
                        return {
                            "น้ำหนักพัสดุ(กิโลกรัม)": 1,
                            "ชื่อสกุลผู้ส่ง": "P.O.P.",
                            "โทรศัพท์ผู้ส่ง": "0970576067",
                            "ที่อยู่ผู้ส่ง": order.id + ' ' + order.page,
                            "ชื่อสกุลผู้รับ": order.name,
                            "โทรศัพท์ผู้รับ": order.tel,
                            "จังหวัดผู้รับ": xx.province,
                            "เขตอำเภอผู้รับ": xx.amphur,
                            "ที่อยู่ผู้รับ": order.addr.replace(/\n/g, ' '),
                            "รายละเอียดพัสดุ": `${order.product.map(p => p.code + '(' + p.amount + ')')}`,
                            // "มูลค่าพัสดุโดยประเมิน": '',
                            "หมายเหตุ": order.price,
                            "จำนวนเงินที่ชำระปลายทาง (COD)": order.bank.indexOf('COD') > -1 ? order.price : ''
                        }
                        // }
                    }
                }).filter(f => f != null)
                // res.json(orderx)
                const XLSX = require('xlsx');
                // /* create workbook & set props*/
                const wb = { SheetNames: [], Sheets: {} };

                // // /* create file 'in memory' */
                // for (var prop in result) {
                var ws = XLSX.utils.json_to_sheet(orderx);

                // wb.Sheets['Order Template']=ws;
                XLSX.utils.book_append_sheet(wb, ws, 'Order Template');
                // }
                // // res.json(ws);
                var wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer', Props: { Author: "Microsoft Excel" } });
                var filename = 'JT_' + req.query.startDate + '_' + req.query.payment + '.xlsx';
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
                admins.push({ ...doc.data(), id: '@' + doc.id })
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
                    db.collection('orders')
                        .where('orderDate', '>=', req.query.startDate.replace(/-/g, ''))
                        .where('orderDate', '<=', req.query.endDate.replace(/-/g, ''))
                        .get()
                        .then(snapShot => {
                            let orders = []
                            snapShot.forEach(doc => {
                                const page = auth.data().pages.indexOf(doc.data().page.replace('@', '')) > -1;
                                const admin = auth.data().adminId == doc.data().userId;
                                if (role == 'owner' || page || admin)
                                    orders.push({
                                        id: doc.id, ...doc.data(),
                                        orderDate: req.query.sum == 'all' ? 'SUM' : doc.data().orderDate,
                                        return: doc.data().return ? true : false,
                                        totalFreight: doc.get('expressName')
                                            ? (doc.get('expressName') == 'FLASH'
                                                ? doc.get('freight') + (doc.get('codFee') * 1.07)
                                                : doc.get('totalFreight')
                                            )
                                            : 0
                                    })
                            })
                            r.expr(orders)
                                // .filter(f => {
                                //     return r.expr(pages).contains(f('page'))
                                // })
                                // .filter(f => {
                                //     return r.branch(r.expr(role).eq('owner'),
                                //         true,
                                //         r.expr(sayhiPages).contains(f('orderDate').add(f('page')))
                                //     )
                                // })
                                .group(g => {
                                    return g.pluck('page', 'orderDate', 'admin')
                                }).ungroup()
                                .map(m => {
                                    return m('group').merge(m2 => {
                                        return {
                                            count: m('reduction').filter({ return: false }).count(),
                                            price: m('reduction').filter({ return: false }).sum('price'),
                                            countReturn: m('reduction').filter({ return: true }).count(),
                                            priceReturn: m('reduction').filter({ return: true }).sum('price'),
                                            freight: m('reduction').sum('totalFreight'),//.add(m('reduction').filter({ return: true }).count().mul(12.5)),
                                            // promote: m('reduction').sum('promote'),
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
                                            priceFbRt: m('reduction').filter({ fb: true }).sum('priceReturn'),
                                            countFbRt: m('reduction').filter({ fb: true }).sum('countReturn'),
                                            priceLine: m('reduction').filter({ fb: false }).sum('price'),
                                            countLine: m('reduction').filter({ fb: false }).sum('count'),
                                            priceLineRt: m('reduction').filter({ fb: false }).sum('priceReturn'),
                                            countLineRt: m('reduction').filter({ fb: false }).sum('countReturn'),
                                            priceAll: m('reduction').sum('price'),
                                            countAll: m('reduction').sum('count'),
                                            priceRt: m('reduction').sum('priceReturn'),
                                            countRt: m('reduction').sum('countReturn'),
                                            freight: m('reduction').sum('freight'),
                                            interestFb: r.expr(sayhis).filter({ date: m('group')('orderDate').add(m('group')('page')) }).sum('fb').default(0),
                                            interestLine: r.expr(sayhis).filter({ date: m('group')('orderDate').add(m('group')('page')) }).sum('line').default(0),
                                            team: r.expr(admins).filter({ id: m('group')('page') })(0)('team'),

                                        }
                                    })
                                })
                                .do(d => {
                                    return d.merge(m => {
                                        return {
                                            // delivery: r.expr(costs).filter(f => {
                                            //     return f('page').eq(m('page'))
                                            //         .and(f('date').eq(m('orderDate')))
                                            // }).sum('delivery'),
                                            priceX: d.filter({ page: m('page'), orderDate: m('orderDate') }).sum('priceAll'),
                                            priceXRt: d.filter({ page: m('page'), orderDate: m('orderDate') }).sum('priceReturn'),
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

                                    res.ireport("topslim/dailySayHi.jrxml", req.query.file || "pdf", pages, {
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
exports.dailyCost = (req, res) => {
    // console.log(moment(req.query.startDate).subtract(1, "days").format('YYYY-MM-DD'))
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
        await db.collection('pages').where('active', '==', true).get().then(snapShot => {
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
            const rates = JSON.parse(body);
            if (rates.result) {
                dataBOT = rates.result.data.data_detail[0];
            } else {
                dataBOT = {
                    rate: 32,
                    period: req.query.endDate
                }
            }
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
                            other: cost ? cost.other : 0,
                            // delivery: cost ? cost.delivery : 0

                        })
                    }
                }
                db.collection('orders')
                    .where('orderDate', '>=', req.query.startDate.replace(/-/g, ''))
                    .where('orderDate', '<=', req.query.endDate.replace(/-/g, ''))
                    // .where('return', '==', false)
                    .get()
                    .then(snapShot => {
                        let orders = []
                        snapShot.forEach(doc => {
                            // if (doc.data().bank.indexOf('CM') == -1)
                            const rate = doc.data().country == 'TH' ? 1 : Number(dataBOT.rate || 32);
                            const typePage = doc.get('page').indexOf('@') > -1 ? 'line' : 'fb';
                            const dChannel = doc.get('channel');
                            let type = '';
                            if (typePage == 'line') {
                                type = 'line';
                                if (dChannel) {
                                    if (dChannel == 'F') {
                                        type = 'fb';
                                    }
                                }
                            } else {
                                type = 'fb'
                            }
                            orders.push({
                                id: doc.id, ...doc.data(),
                                orderDate: req.query.sum == 'all' ? 'SUM' : doc.data().orderDate,
                                // claim: doc.data().bank.indexOf('CM') == -1 ? false : true,
                                type: doc.data().bank.indexOf('CM') > -1 ? 'cm' : type,
                                // (doc.data().page.indexOf('@') == -1 ? 'fb' : 'line'),
                                product: doc.data().product.map(m => {
                                    return {
                                        ...m,
                                        cost: (m.cost * m.amount) * rate//products.find(f => f.id == m.code).cost * m.amount
                                    }
                                }),
                                price: doc.data().price * rate,
                                page: doc.data().page.replace('@', ''),
                                return: doc.data().return ? true : false,
                                delivery: doc.get('expressName')
                                    ? (doc.get('expressName') == 'FLASH'
                                        ? doc.get('freight') + (doc.get('codFee') * 1.07)
                                        : doc.get('totalFreight')
                                    )
                                    : 0
                            })
                        })
                        orders = JSON.parse(JSON.stringify(orders));
                        r.expr({
                            orders,
                            results
                        })
                            .merge(m => {
                                return {
                                    orders: m('orders').group(g => {
                                        return g.pluck('page', 'type', 'return', 'orderDate')
                                    }).ungroup()
                                        .map(m2 => {
                                            return m2('group').merge(m3 => {
                                                return {
                                                    price: m2('reduction').sum('price'),
                                                    cost: m2('reduction').map(m4 => {
                                                        return { cost: m4('product').sum('cost') }
                                                    }).sum('cost'),
                                                    delivery: m2('reduction').sum('delivery')
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
                                                    costFb: m2('reduction').filter({ type: 'fb', return: false }).sum('cost'),
                                                    costLine: m2('reduction').filter({ type: 'line', return: false }).sum('cost'),
                                                    costCm: m2('reduction').filter({ type: 'cm', return: false }).sum('cost'),
                                                    cost: m2('reduction').filter({ return: false }).sum('cost'),
                                                    priceFb: m2('reduction').filter({ type: 'fb', return: false }).sum('price'),
                                                    priceLine: m2('reduction').filter({ type: 'line', return: false }).sum('price'),
                                                    priceCm: m2('reduction').filter({ type: 'cm', return: false }).sum('price'),
                                                    price: m2('reduction').filter({ return: false }).sum('price'),
                                                    delivery: m2('reduction').sum('delivery')//.add(m2('reduction').filter({ return: true }).count().mul(12.5)),
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
                                                    // delivery: m2('reduction').sum('delivery'),
                                                    other: m2('reduction').sum('other'),
                                                    ads: m2('reduction').sum('adsFb').add(m2('reduction').sum('adsLine'))//.add(m2('reduction').sum('delivery'))
                                                }
                                            })
                                        })
                                }
                            })
                            .do(d => {
                                return d('results').merge(m => {
                                    return m.pluck('adsFb', 'adsLine', 'other', 'ads', 'team', 'orderDate', 'page')
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
                                                delivery: 0
                                            })
                                        })
                                })
                            })
                            .merge(m => {
                                return {
                                    balance: m('price').sub(m('cost')).sub(m('ads')).sub(m('other')).sub(m('delivery'))
                                }
                            })
                            .orderBy('orderDate', 'team', r.desc('balance'))
                            .run()
                            .then(result => {
                                // res.json(result)
                                // console.log(dataBOT.rate)
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
exports.comAdmin = (req, res) => {
    async function comAdmin() {
        let admins = [];
        let pages = [];
        let coms = [];
        var r = req.r;
        const reqCom = req.params.cost;
        await db.collection('coms').get().then(snapShot => {
            snapShot.forEach(doc => {
                coms.push({ id: doc.id, ...doc.data() })
            })
        })
        await db.collection('admins').get().then(snapShot => {
            // console.log(coms)
            snapShot.forEach(doc => {
                const com = coms.find(f => f.id == doc.data().comId);
                admins.push({ adminId: doc.id, coms: com ? com.rates : [] })
            })
            // console.log(pages)
        })
        await db.collection('pages').get().then(snapShot => {
            // console.log(coms)
            snapShot.forEach(doc => {
                // const com = coms.find(f => f.id == doc.data().comId);
                pages.push({ pageId: doc.id, ...doc.data() })
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
                        // .where('return', '==', false)
                        .get()
                        .then(snapShot => {
                            let orders = []
                            snapShot.forEach(doc => {
                                // if (doc.data().bank.indexOf('CM') == -1)
                                const page = doc.data().page.replace('@', '');
                                const userId = doc.data().edit == true
                                    ? pages.find(f => f.pageId == page).adminId
                                    : doc.data().userId
                                orders.push({
                                    id: doc.id, ...doc.data(),
                                    page,
                                    edit: doc.data().edit == null ? false : doc.data().edit,
                                    return: doc.data().return ? true : false,
                                    totalFreight: doc.get('expressName')
                                        ? (doc.get('expressName') == 'FLASH'
                                            ? doc.get('freight') + (doc.get('codFee') * 1.07)
                                            : doc.get('totalFreight')
                                        ) : 0,
                                    userId
                                })
                            })
                            let query = r.expr(orders)
                                .group(g => {
                                    return g.pluck('userId', 'page')
                                })
                                .ungroup()
                                .map(m => {
                                    return m('group').merge({
                                        admin: m('reduction')(0)('admin'),
                                        price: m('reduction').filter({ edit: false, return: false }).sum('price').sub(
                                            m('reduction').filter({ edit: false }).sum('totalFreight')
                                                .add(
                                                    m('reduction').filter({ edit: false, return: true }).count().mul(12.5)
                                                )
                                        ),
                                        price2: m('reduction').filter({ edit: true, return: false }).sum('price').sub(
                                            m('reduction').filter({ edit: true }).sum('totalFreight')
                                                .add(
                                                    m('reduction').filter({ edit: true, return: true }).count().mul(12.5)
                                                )
                                        ),
                                        sumPage: m('reduction').filter({ return: false }).sum('price').sub(
                                            m('reduction').sum('totalFreight')
                                                .add(
                                                    m('reduction').filter({ return: true }).count().mul(12.5)
                                                )
                                        )
                                    })
                                })
                                .do(d => {
                                    return d.merge(m => {
                                        return {
                                            sumPage: d.filter({ page: m('page') }).sum('sumPage'),
                                            sumAdmin: d.filter({ userId: m('userId') }).sum('price').add(
                                                d.filter({ userId: m('userId') }).sum('price2')
                                            ),
                                        }
                                    }).merge(m => {
                                        return {
                                            rates: r.expr(admins).filter(f => {
                                                return f('adminId').eq(m('userId'))
                                            })(0)('coms').default([])
                                        }
                                    }).merge(m => {
                                        return {
                                            rate: m('rates').filter(f => {
                                                return f('min').le(m('sumAdmin'))
                                                    .and(f('max').ge(m('sumAdmin')))
                                            })(0)('percent').default(0)
                                        }
                                    }).without('rates')
                                        .merge(m => {
                                            return {
                                                com: m('rate').mul(m('price')),
                                                com2: m('rate').mul(m('price2')),
                                            }
                                        })
                                        .merge(m => {
                                            return {
                                                sumCom: m('com').add(m('com2')),
                                                sumPrice: m('price').add(m('price2')),
                                            }
                                        })
                                })
                            // .orderBy(r.desc('sumAdmin'), r.desc('sumPrice'))
                            // .orderBy(r.desc('sumPage'), r.desc('price'))
                            query = reqCom == 'page' ? query.orderBy(r.desc('sumPage'), r.desc('price'))
                                : query.orderBy(r.desc('sumAdmin'), r.desc('sumPrice'))
                            query.run()
                                .then(result => {
                                    // res.json(result)
                                    result = result.map(m => {
                                        return {
                                            ...m,
                                            admin: reqCom == 'page' ? m.page : m.admin,
                                            page: reqCom == 'page' ? m.admin : m.page
                                        }
                                    })
                                    res.ireport("comAdmin.jasper", req.query.file || "pdf", result, {
                                        OUTPUT_NAME: 'comAdmin' + req.query.startDate.replace(/-/g, '') + "_" + req.query.endDate.replace(/-/g, ''),
                                        START_DATE: moment(req.query.startDate).format('LL'),
                                        END_DATE: moment(req.query.endDate).format('LL'),
                                        COST: reqCom
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
                        .where('return', '==', false)
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
        .where('return', '==', false)
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
                            .where('return', '==', false)
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
                                            orderDate: req.query.sum == 'all' ? 'SUM' : doc.data().orderDate
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
                }
            })
    }

    getDailySale();


}
exports.dailyCod = (req, res) => {
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
                            .where('cod', '==', true)
                            // .where('return', '==', false)
                            .where('country', '==', 'TH')
                            .get()
                            .then(snapShot => {
                                let orders = []
                                snapShot.forEach(doc => {
                                    // for (var i = 0; i < doc.data().banks.length; i++) {
                                    //     const bank = doc.data().banks[i].name.toUpperCase().match(/[a-zA-Z]+/g, '');
                                    // if (doc.data().bank.indexOf('COD') > -1) {
                                    let name1 = doc.data().name.substr(0, 1);
                                    orders.push({
                                        // bank: bank == null ? "ลืมใส่" : bank[0],
                                        bank: name1,
                                        price: doc.data().price,
                                        received: doc.get('received') ? (doc.data().received == true ? doc.data().price : 0) : 0,
                                        returned: doc.get('return') == true ? doc.data().price : 0,
                                        // returned: (doc.data().return == true ? doc.data().price : 0),
                                        orderDate: req.query.sum == 'all' ? 'SUM' : doc.data().orderDate
                                    })
                                    // }
                                    // }
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
                                                priceAll: m('reduction').sum('price'),
                                                sumRev: m('reduction').sum('received'),
                                                countRev: m('reduction').filter(f => {
                                                    return f('received').ne(0)
                                                }).count(),
                                                sumRet: m('reduction').sum('returned'),
                                                countRet: m('reduction').filter(f => {
                                                    return f('returned').ne(0)
                                                }).count(),
                                                // sumRet: m('reduction').sum('returned'),
                                                // countRet: m('reduction').filter(f => {
                                                //     return f('return').ne(0)
                                                // }).count(),
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

                                        res.ireport("dailyCod.jrxml", req.query.file || "pdf", datas, {
                                            OUTPUT_NAME: 'dailyCOD' + req.query.startDate.replace(/-/g, '') + "_" + req.query.endDate.replace(/-/g, ''),
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
                            .where('return', '==', false)
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
                                            if (['CM'].indexOf(bank[0]) == -1) {
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
exports.dailyChannel = (req, res) => {
    var optionsBOT = {
        method: 'GET',
        url: 'https://apigw1.bot.or.th/bot/public/Stat-ReferenceRate/v2/DAILY_REF_RATE/',
        qs: { start_period: moment(req.query.startDate).subtract(1, "days").format('YYYY-MM-DD'), end_period: req.query.endDate },
        headers: { accept: 'application/json', 'x-ibm-client-id': '870190f3-cac0-49ae-9220-058741681a02' }
    };
    async function getDailyChannel() {
        let pages = [];
        // let admins = [];
        // let products = [];
        let costs = [];
        let dataBOT = {};
        var r = req.r;
        await db.collection('pages').get().then(snapShot => {
            snapShot.forEach(doc => {
                pages.push({ ...doc.data(), page: doc.id })
            })
        })
        await request(optionsBOT, function (error, response, body) {
            if (error) {
                return console.error('Failed: %s', error.message);
            }
            const rates = JSON.parse(body);
            if (rates.result) {
                dataBOT = rates.result.data.data_detail[0];
            } else {
                dataBOT = {
                    rate: 32,
                    period: req.query.endDate
                }
            }
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
            if (auth.exists) {

                db.collection('orders')
                    .where('orderDate', '>=', req.query.startDate.replace(/-/g, ''))
                    .where('orderDate', '<=', req.query.endDate.replace(/-/g, ''))
                    .where('return', '==', false)
                    .get()
                    .then(snapShot => {
                        const dates = enumerateDaysBetweenDates(req.query.startDate, req.query.endDate);
                        const results = [];
                        for (let d = 0; d < dates.length; d++) {
                            for (let p = 0; p < pages.length; p++) {
                                const cost = costs.find(f => f.id == dates[d] + pages[p].page)
                                const page = auth.data().pages.indexOf(pages[p].page) > -1;
                                if (auth.data().role == 'owner' || page)
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

                        let orders = []
                        snapShot.forEach(doc => {
                            const rate = doc.data().country == 'TH' ? 1 : Number(dataBOT.rate || 32);
                            const typePage = doc.get('page').indexOf('@') > -1 ? 'line' : 'fb';
                            const dChannel = doc.get('channel');
                            let channel = '';
                            let type = '';
                            if (typePage == 'line') {
                                type = 'line';
                                channel = 'line-old'
                                if (dChannel) {
                                    if (dChannel == 'N') {
                                        channel = 'line-new'
                                    } else if (dChannel == 'F') {
                                        type = 'fb';
                                        channel = 'line-fb';
                                    }
                                }
                            } else {
                                type = 'fb'
                                channel = 'fb-old'
                                if (dChannel) {
                                    if (dChannel == 'N') {
                                        channel = 'fb-new'
                                    }
                                }
                            }

                            const page = auth.data().pages.indexOf(doc.data().page.replace('@', '')) > -1;
                            // console.log(auth.data().pages, page, doc.data().page)
                            if (auth.data().role == 'owner' || page == true) {
                                orders.push({
                                    id: doc.id, ...doc.data(),
                                    orderDate: req.query.sum == 'all' ? 'SUM' : doc.data().orderDate,
                                    // claim: doc.data().bank.indexOf('CM') == -1 ? false : true,
                                    type: doc.data().bank.indexOf('CM') > -1 ? 'cm' : type,
                                    // (doc.data().page.indexOf('@') == -1 ? 'fb' : 'line'),
                                    product: doc.data().product.map(m => {
                                        return {
                                            ...m,
                                            cost: (m.cost * m.amount) * rate//products.find(f => f.id == m.code).cost * m.amount
                                        }
                                    }),
                                    price: doc.data().price * rate,
                                    page: doc.data().page.replace('@', ''),
                                    channel
                                })
                            }
                        })
                        // res.json(orders)
                        orders = JSON.parse(JSON.stringify(orders));
                        r.expr({
                            orders,
                            results
                        })
                            .merge(m => {
                                return {
                                    orders: m('orders').group(g => {
                                        return g.pluck('page', 'type', 'channel', 'orderDate')
                                    }).ungroup()
                                        .map(m2 => {
                                            return m2('group').merge(m3 => {
                                                return {
                                                    price: m2('reduction').sum('price'),
                                                    cost: m2('reduction').map(m4 => {
                                                        return { cost: m4('product').sum('cost') }
                                                    }).sum('cost')
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
                                                    priceFbOld: m2('reduction').filter({ channel: 'fb-old' }).sum('price'),
                                                    priceFbNew: m2('reduction').filter({ channel: 'fb-new' }).sum('price'),
                                                    priceLineOld: m2('reduction').filter({ channel: 'line-old' }).sum('price'),
                                                    priceLineNew: m2('reduction').filter({ channel: 'line-new' }).sum('price'),
                                                    priceLineFb: m2('reduction').filter({ channel: 'line-fb' }).sum('price'),
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
                                                priceFbOld: 0,
                                                priceFbNew: 0,
                                                priceLine: 0,
                                                priceLineOld: 0,
                                                priceLineNew: 0,
                                                priceLineFb: 0,
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
                                //         console.log(dataBOT.rate)
                                res.ireport("dailyChannel.jasper", req.query.file || "pdf", result, {
                                    OUTPUT_NAME: 'dailyChannel' + req.query.startDate.replace(/-/g, '') + "_" + req.query.endDate.replace(/-/g, ''),
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
    getDailyChannel();
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
        .where('orderDate', '>=', req.query.startDate.replace(/-/g, ''))
        .where('orderDate', '<=', req.query.endDate.replace(/-/g, ''))
        .where('return', '==', false)
        .where('country', '==', 'TH')
        .get()
        .then(snapShot => {
            let orders = []
            snapShot.forEach(doc => {
                if (doc.data().bank.indexOf('CM') == -1)
                    orders.push({
                        id: doc.id,
                        ...doc.data(),
                        page: doc.data().page.replace('@', ''),
                        source: doc.data().page.indexOf('@') > -1 ? 'LINE' : 'FACEBOOK',
                        postcode: doc.data().addr.match(/\d{5}/g) == null ? '' : doc.data().addr.match(/\d{5}/g)[0]
                    })
            })
            // res.json(orders)
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
                                    source: m2('reduction')(0)('source'),
                                    count: m2('reduction').count(),
                                    product: m2('reduction').map(pd => {
                                        return pd('product')
                                    }).reduce((le, ri) => {
                                        return le.add(ri)
                                    }).group('code').sum('amount').ungroup().orderBy(r.desc('reduction'))
                                        .map(pd => {
                                            return pd('group').add('=', pd('reduction').coerceTo('string'))
                                        })
                                        .reduce((le, ri) => {
                                            return le.add(',', ri)
                                        })
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
                    var filename = "season_customer.xlsx";
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
exports.fixCodAmount = (req, res) => {
    db.collection('orders')
        .where('orderDate', '==', req.query.date)
        .get()
        .then(snapShot => {
            let ords = [];
            snapShot.forEach(doc => {
                // if (typeof doc.data().codAmount == 'undefined')
                ords.push({ id: doc.id, ...doc.data() })
            })
            ords.filter(f => isNaN(f.codAmount)).map(m => {
                db.collection('orders').doc(m.id).update({ codAmount: 0 })
            })
            res.json(true)
        })
}
const queryProvAmpr = (addr) => {
    let amphur = 'ไม่พบอำเภอ';
    let province = 'ไม่พบจังหวัด';
    let arrays = [];
    if (addr.indexOf(' เขต') > -1) {
        province = 'กรุงเทพมหานคร';
        arrays = addr.split(' เขต');
        amphur = 'เขต' + arrays[1].split(' ')[0];
    } else {
        arrays = addr.replace(' อำเภอ', ' อ.').split(' อ.');
        if (arrays.length > 1)
            amphur = arrays[1].split(' ')[0];
        arrays = addr.replace(' จังหวัด', ' จ.').split(' จ.');
        if (arrays.length > 1)
            province = arrays[1].split(' ')[0];

        if (amphur == 'เมือง')
            amphur += province;
    }
    return { amphur, province }
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
        return '0' + n.toString();
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