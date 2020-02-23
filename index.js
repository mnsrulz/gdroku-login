const path = require('path');
const views = require('koa-views');
const Koa = require('koa');
const Router = require('koa-router');
const app = new Koa();
const router = new Router();
const bodyParser = require('koa-bodyparser');
const cryptoRandomString = require('crypto-random-string');
const { google } = require('googleapis');

const baseUrl = process.env.baseUrl + '/device';
const googleCallbackAuthUrl = process.env.baseUrl + '/auth/callback';
var deviceCollection = {};
var successResponse = {};

router.get('/', async (ctx) => {
    await ctx.render('home');
});

router.get('/disclaimer', async (ctx) => {
    await ctx.render('disclaimer');
});

router.get('/privacy', async (ctx) => {
    await ctx.render('privacy');
});

router.post('/device/code', async (ctx) => {
    try {
        var params = ctx.request.body;
        var clientId = params.client_id;
        var scope = params.scope;
        const deviceCode = cryptoRandomString({ length: 32, type: 'hex' });
        const userCode = cryptoRandomString({ length: 8, type: 'numeric' });
        var response = {
            'user_code': userCode,
            'verification_url': baseUrl,
            'device_code': deviceCode,
            'interval': 5
        };
        deviceCollection[userCode] = {
            deviceCode,
            clientId,
            scope,
            ts: new Date()
        };
        successResponse[deviceCode] = {
            status: "pending"
        }
        ctx.body = response
    } catch (e) {
        ctx.status = 400;
        ctx.body = {
            error_code: 'UNKNOWN ERROR'
        };
    }
});

router.get('/device', async (ctx) => {
    await ctx.render('device');
});

router.get('/auth/callback', async (ctx) => {
    const params = ctx.request.query;
    const code = params.code;
    const state = params.state;
    successResponse[state].authCode = code;
    await ctx.render('callback-success');
});

router.post('/device', async (ctx) => {
    try {
        var params = ctx.request.body;
        var code = params.code;

        var originalRequest = deviceCollection[code];
        if (originalRequest) {
            const oauth2Client = new google.auth.OAuth2(
                {
                    clientId: originalRequest.clientId,
                    redirectUri: googleCallbackAuthUrl
                }
            );
            const deviceCode = originalRequest.deviceCode;
            const scopes = originalRequest.scope;
            const oauthUrl = oauth2Client.generateAuthUrl({
                // 'online' (default) or 'offline' (gets refresh_token)
                access_type: 'offline',
                prompt: 'consent',
                state: deviceCode,
                // If you only need one scope you can pass it as a string
                scope: scopes
            });
            ctx.redirect(oauthUrl);
        }
        else {
            ctx.body = "Error!!!";
            //throw ex
        }
    } catch (e) {
        ctx.status = 400;
        ctx.body = {
            error_code: 'UNKNOWN ERROR'
        };
    }
});


router.post('/token', async (ctx) => {
    try {
        var params = ctx.request.body;
        var clientId = params.client_id;
        var clientSecret = params.client_secret;
        var code = params.code;

        if (code && successResponse[code]) {
            //var originalRequest = deviceCollection[code];
            const oauth2Client = new google.auth.OAuth2(
                {
                    clientId: clientId,
                    clientSecret: clientSecret,
                    redirectUri: googleCallbackAuthUrl  //check if it is required absolutely
                }
            );
            const { tokens } = await oauth2Client.getToken(successResponse[code].authCode);
            delete successResponse[code];
            //shall we delete other collection too???
            ctx.body = tokens;
        } else {
            ctx.status = 400;
            ctx.body = {
                "error": "invalid_grant",
                "error_description": "invalid_grant"
            };
        }
    } catch (e) {
        ctx.status = 400;
        ctx.body = {
            error_code: 'UNKNOWN ERROR'
        };
    }
});

var port = normalizePort(process.env.PORT || '3000');
app.use(bodyParser());
app.use(views(path.join(__dirname, '/views'), { extension: 'pug' }));
app.use(router.routes());
app.listen(port);

// server.listen(port, function () {
//     console.log('%s listening at %s', server.name, server.url);
// });

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
    var port = parseInt(val, 10);

    if (isNaN(port)) {
        // named pipe
        return val;
    }

    if (port >= 0) {
        // port number
        return port;
    }

    return false;
}
