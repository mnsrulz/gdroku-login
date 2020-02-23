const { google } = require('googleapis');
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI_DEVICE
);

function generateAuthUrlForDevice(deviceCode) {
    // generate a url that asks permissions for Blogger and Google Calendar scopes
    var scopes = [
        // 'https://www.googleapis.com/auth/youtube.upload',
        // 'https://www.googleapis.com/auth/calendar'
    ];

    scopes = scopes.concat(process.env.GOOGLE_SCOPES.split(','));
    return oauth2Client.generateAuthUrl({
        // 'online' (default) or 'offline' (gets refresh_token)
        access_type: 'offline',
        prompt: 'consent',
        state: deviceCode,
        // If you only need one scope you can pass it as a string
        scope: scopes
    });
}

async function getToken(code) {
    return await oauth2Client.getToken(code);
}


function fn(server) {
    var deviceCollection = [];
    var successResponse = [];
    server.post('/device/code', (req, res, next) => {
        const deviceCode = makeid(36);
        const userCode = makeid(8);
        var response = {
            'user_code': userCode,
            'verification_url': 'http://192.168.2.6/device/login?code=' + userCode,
            'device_code': deviceCode,
            'interval': 5
        };
        deviceCollection[userCode] = deviceCode;
        res.send(response);
        return next();
    });

    server.get('/device/login', (req, res, next) => {
        var userCode = req.query.code;
        var deviceCode = deviceCollection[userCode];
        if (deviceCode) {
            delete deviceCollection[userCode];
            var o = generateAuthUrlForDevice(deviceCode);
            res.redirect(o, next);
        }else{
            res.send('invalid code');
        }
        return next();
    });

    server.post('/device/token', (req, res, next) => {
        var deviceCode = req.body.device_code;
        var token = successResponse[deviceCode];
        delete successResponse[deviceCode];
        if (token) {
            res.send(token);
        } else {
            res.send({
                error: 'authorization_pending',
                error_description: 'authorization_pending'
            });
        }
        return next();
    })

    server.get('/device/callback', async (req, res, next) => {
        try {
            var code = req.query.code;
            var state = req.query.state;
            const { tokens } = await getToken(code);
            // var token = await getToken(code);
            successResponse[state] = tokens;
            res.send('Authorization succeded, your app will automatically refresh.');
            return next();
        } catch (error) {
            res.send(error);
        }
    })
};

function makeid(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}


module.exports = fn;