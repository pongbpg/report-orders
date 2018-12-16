const admin = require('firebase-admin');
admin.initializeApp({
    credential: admin.credential.cert({
        "type": "service_account",
        "project_id": "bot-orders",
        "private_key_id": "0f2feafb9984394ade8a93d41396e070a82a4b00",
        "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDPpujz1uypAbBJ\nLSLTq7vAIpm5bvps+cFbTOQtbeFtCBPikIaR61usZLznl47OPRjmdsXSw/n2UkAD\nX69vwkFLk2PEhcVc4DXddtiZhyIEmSGBZZhe0WmWYeqQ1knRW4Q7bX6rhtMSST3B\nryp0/6W7sE3fKOl0zil3ee1UHAeSIg2KHksmf58L2k0PGlr2eFXKt9h7v5bHyj8L\n0aqafduZ5Oxd8Or2HQ02RUB0IFRH6KOSCIrEVk4I1JaySTKgJFMB6R6WivpAXFWN\nUgu1u6/ZXoTP0yNxoQD6C5pE+zi4h+mPHi2a8KaHSI3R3/aSX1SoUt8FK5XnOTmU\nwqtPBet3AgMBAAECggEABozfVax2nrDc8hH9wpZCP+ys02VQJQE5O5C7X0DTbEW6\n9YSq72NwlYmVTpZAp6TUakCzkNMkdBlix43MfPFbGe/g+na1zm422huWTZGDszLE\nFHmIoEUULZg9IVXWfPIuw6klO8fu/z6sN2CNLaT612bXrgMeX37kCU7L+8E+mToc\ngLGYxnrDXMRhKHYeIm0tbYQHtelnq4z7eN/gVVaoy8v2YMmVEDNNtK8up1Nr9dfZ\nPO4EXHwdT0LhXOU0+B3fUBM0rU7UZ5IQE4nZlvLwWrCVU89sbT16F2YQrIS+RrKf\nu7YWdtUr2j6+KsxfGzBpi2s0yBJcxO2zw2Eh+ywiMQKBgQD69ETHc/UFxaMxSNsR\n6HdZHh2qop14yztKDjbOBeyV//T3t0RvJT75bIrruq86RUrQI51N6i4GlNh2iJme\nYgdM9ECbxX0QHjxfDyreoNoJZlFfse3Aktc5Vm02IzBCGF9hCVzWj+As3jdn1LWT\naxJByirD81NG8hh3WYZpR3LMpQKBgQDT08C7PzAjnES9On2KNHoHfErww/GgjRy9\nnVhWsUGCDpMkr+y6qpl8jPDQ577Kb8bNzcdKaVRjbwITJacXwJwP92MSj+XUNPjL\nHmZF1NYtzSqye6q+Vyn0mu5ggokm6AiyVfqHOSy012N8etQhVG9oaihpQVZDpyN6\n2nQkxIbQ6wKBgGTJ0AnO/3xW+QjlOt7BX5WSK9YJQ3dtIB3JAafS50cDKo6Gs1x0\nOAuS1WSBcLjVdYuMkjPltqB8DUfl6tSaiFYWzxAAzA66JgMDo3MQZSFbT5lAa71o\n/DmSBYC1tz8EbOIbEYc295DtmpD/9AEGAqobmPtj8XFP8BWXBg2oXWnlAoGAH5W3\nazQkzWqDpWOPTIg+mdcipXvSD4p6+pr3jRWpGudpcVL6DWtar4OkdMHZZP39urow\nORwzhRAMUyaOH7CMlKTilOX38whjAIZr4YW22eV5tFtUPkVo8BwZ5zIPmUmH4m+H\nh5oy3FQxdWIrNz0Lz5nkpK0lW7kURUFFiCX1pDkCgYAIwz26VFwfiRd3utmO6uVr\n4D8XcdPwfsMto+A8l9Njq8nGuikrc3fnsTTA+Phd5szsKgJmgiuqgJi+Gb7jMN7b\nRP6dRYCAUm0uZg+QhO6Uj3RU8PkMjvizvRqi58W9igWnetxLyMw+Na231Gi7bGmX\nyjjEEcxx/yaAotNG5lw9Ow==\n-----END PRIVATE KEY-----\n",
        "client_email": "firebase-adminsdk-gl6fx@bot-orders.iam.gserviceaccount.com",
        "client_id": "101969765057138401575",
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
        "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-gl6fx%40bot-orders.iam.gserviceaccount.com"
    }),
    databaseURL: 'https://bot-orders.firebaseio.com'
});
var jyDB = admin.initializeApp({
    credential: admin.credential.cert({
        "type": "service_account",
        "project_id": "jaoyingdb",
        "private_key_id": "2cf451d3de9be259c04fd265f48cfb3982f4b66d",
        "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCuGECaVFsAFX0e\njtkBHJDraGf0zUUN/dzLsR4qRQ0wyeHSCs4tSC5CxJb2HVAxQeuHhCWtfvbnDbZ4\npRyEdX9QvlgfpiYJ82YJ2ZpMMKUbD4gL39tNLqp4+eKrGITg90T5JiFehouiOURP\n9nMkLSIkIInlIf6Blmzc3iGmVquh/LZOORAhjUKBhG8dj7H7zH3b9hz0WPOYhnZU\nX4pmOSCgMBKHOL9nLFcPVpdayl8d/WfyMP1QO4I5UMvXy92kbp5LfZ8ZEIP8IybR\nWvbzd/DFZhuvRR0nlyJ1khSxb+OioyWLAzxpUUfuOIdxtcMgjMYRNKvp/eRDo2+1\n9irThfdbAgMBAAECggEAUUZiNopGF4JwsIjotxOidjv+ODNyVwdagj90QTCOaWX+\nRiQkP9CQRDxp64kgzHYlYlUnj9kTpCdrNeSDLTV7U/MgydmzrXaTfuq3FXWqRrlX\n/o8p3tz32dVy5ARk2G+npBcQggQXAQtyIFCCTXPCmhIUvkNCATZ8KRqMpA6XPt4p\nUOSNenN64rP8BzGdc1nLKFQ6MEjHJFfEfiNlEiwIp9QKW2yME8qIjnjFhSuZdIua\n0BYJ8UWvBP7QApEroZBVIthbcF/00TvWBlsBBNqOEv+75pNEAesUior+hwDFjOn/\n+r+XnDQODym5pHWeAk6OLO4j3r2CfN1Vl7N3ZY2iJQKBgQDmbFkIwsQ1LNTigbFl\nsS2PCwwgoc2/PZV60e5w+4AZqaDkHXW8xAkOOepR++283LdgP+WCavONo9Tp1qXv\n88L/q0aPLTtEmykI4l0T6SsO+no1H2sfCX5pwsv1MWEausoprPrIuwHQJ4P6kcbr\npTKfO6E0mf2h8DfSD09AHOAwBQKBgQDBa0mKcoDMUNeScHhvGXlJ4DGM7vPzUeBN\nwZLWpDvwN8nnvmJ6NwLd7OT9TL7qnz7dXW98/kKrRumoJnKkUvyiQGXMmtShh3gg\nHaWyelqUbKuXQS1Yr+/X+VwUh+H/qMqn5VDr+Fi6bHQsohaoUx81c7S4GvIA6n4Q\n4mXYDvwH3wKBgBoZRZBfdxfKxyYMqIorIkzkZHBBw2sYz5iEtKwpYF4Hv4h26cIC\ntj/dQXQdw9SzbzXApv85m/J8Dv6ZaFwgUQLiZHCNH/xqUqCF+yLpMw5UQolH0LtI\nOQBDpxRTjnsXkxRbWmBoBhGMmD9GSbChGnW8rEqn8nloGvp473IEk0P9AoGAVS4o\nnv46VsCrj2RUxajUT4Kaj9SUPu4p+FRtlHWTqAEJvDOOLwCXFKFFX4Ay/CTRjK+f\nb86SEdgTAuibyF57wADYVDlDtzdv4cTsuiNETOVm1B/yFoK0/8pjkO8eynbNeQ92\nidU/TiqBJz7i95JTxjiEuCe1uE2M42axL2u59sUCgYAYJK41LCTnxEvYSXLSmeQj\nuoxUKhn9CbL3NfUhzUH923BKOJK5epDtDxRP8PWv2k5EkvsrOZw5H/v0CLFXpmiN\n0Vr/LoxocOC75m7IQjqZWYqp8dqJ0ndu4Uqf4SDzqFicru3uUCyURjAPas06qS/h\n8An3kdg5H6D0XeFsNJLn0w==\n-----END PRIVATE KEY-----\n",
        "client_email": "firebase-adminsdk-leda9@jaoyingdb.iam.gserviceaccount.com",
        "client_id": "105580220196218695728",
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
        "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-leda9%40jaoyingdb.iam.gserviceaccount.com"
    }),
    databaseURL: 'https://jaoyingdb.firebaseio.com'
}, "jaoyingdb");
var topslimDB = admin.firestore();
var jaoyingDB = jyDB.firestore();
const settings = {/* your settings... */ timestampsInSnapshots: true };
topslimDB.settings(settings);
jaoyingDB.settings(settings);

exports.topslim = topslimDB;
exports.jaoying = jaoyingDB;