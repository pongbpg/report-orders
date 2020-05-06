const db = require('../../config/mariadb').db;
exports.invoiceBymonth = (req, res) => {
    db.query('call getIntvoiceByMonth(?,?,?,?)', [req.params.orderType, req.params.accId, req.params.year, req.params.month])
        .then(rows => {
            const data = rows[0] || [];
            if (data.length > 0) {
                // res.json(data)
                // db.query('select accountLogo from accounts where accountId=?', [data[0].accountId])
                //     .then(rows2 => {
                //         const LOGO64 = rows2[0].accountLogo.replace('data:image/png;base64,', '');
                res.ireport("storewerk/invoice.jasper", req.query.file || "pdf", data, {
                    OUTPUT_NAME: 'receipts',
                    IS_COPY: req.query.copy || "Y",
                    // LOGO64
                });
                // })
            } else {
                res.json(null)
            }
        })
}
exports.invoice = (req, res) => {
    db.query('call getOrderById(?)', [req.query.orderId])
        .then(rows => {
            const data = rows[0] || [];
            if (data.length > 0) {
                // for (var i = 10 - data.length; i > 0; i--) {
                //     data.push({
                //         orderId1: data[0]['orderId1'],
                //         orderDate1: data[0]['orderDate1'],
                //         subTotal: data[0]['subTotal'],
                //         shipping: data[0]['shipping'],
                //         discount: data[0]['discount'],
                //         total: data[0]['total'],
                //         vatPercent: data[0]['vatPercent'],
                //         vatPrice: data[0]['vatPrice'],
                //         netTotal: data[0]['netTotal']
                //     })
                // }
                // res.json(data)
                // db.query('select accountLogo from accounts where accountId=?', [data[0].accountId])
                //     .then(rows2 => {
                //         const LOGO64 = rows2[0].accountLogo.replace('data:image/png;base64,', '');
                res.ireport("storewerk/invoice.jasper", req.query.file || "pdf", data, {
                    OUTPUT_NAME: 'receipts',
                    IS_COPY: req.query.copy || "Y",
                    // LOGO64
                });
                // })
            } else {
                res.json(null)
            }
        })
}
exports.dbSale = (req, res) => {
    db.query('call rptSaleByMonth(?,?)', [req.params.year, req.params.month])
        .then(rows => {
            const data = rows[0] || [];
            if (data.length > 0) {
                res.json(data)
            } else {
                res.json(null)
            }
        })
}