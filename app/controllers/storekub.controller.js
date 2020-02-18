const db = require('../../config/mariadb').db;
exports.invoice = (req, res) => {
    db.query('call getOrderById(?)', [req.query.orderId])
        .then(rows => {
            // res.json(rows[0])
            res.ireport("storekub/invoice.jasper", req.query.file || "pdf", rows[0] || [], {
                OUTPUT_NAME: 'receipts',
                IS_COPY: req.query.copy || "Y"
            });
        })
}