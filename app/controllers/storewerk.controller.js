const db = require('../../config/mariadb').db;
exports.invoiceBymonth = (req, res) => {
    db.query('call getIntvoiceByMonth(?,?)', [req.params.year, req.params.month])
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