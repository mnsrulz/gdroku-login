var restify = require('restify');
var gddirect = require('gddirecturl');
var gauth = require('./gauth')
var simpleclouduploader = require('simpleclouduploader');
var nurlresolver = require('nurlresolver');
async function gdriveHandler(req, res, next) {
    try {
        var o = await gddirect.getMediaLink(req.params.gdriveid);
        res.send(o);
    } catch (error) {
        res.send('error');
    }
}

async function gdrivestreamHandler(req, res, next) {
    try {
        var o = await gddirect.getMediaLink(req.params.gdriveid);
        res.redirect(o.src, next)
    } catch (error) {
        console.log('Unable to fetch the stream of google id');
        res.send('error');
    }
}

async function tokenHandler(req, res, next) {
    try {
        var o = gauth.generateAuthUrl();
        res.redirect(o, next);
    } catch (error) {
        console.log(error);
        console.log('Unable to generate the auth url for google');
        res.send('Unable to generate the auth url for google');
    }
}

async function tokenCallbackHandler(req, res, next) {
    try {
        var code = req.query.code;
        const { tokens } = await gauth.getToken(code);
        res.send(tokens);
    } catch (error) {
        console.log(error);
        console.log('Unable to get the token for google');
        res.send('Unable to get the token for google');
    }
}

async function copyToGDrive(req, res, next) {
    var streamUrl = req.body.streamUrl;
    var title = req.body.streamTitle;
    var accessToken = req.body.accessToken;

    simpleclouduploader.copyToGDrive(streamUrl, title, {
        accessToken: accessToken
    });
    res.send('Your request has been queued and process soon.');
}

async function urlResolveHandler(req, res, next) {
    try {
        var u = req.query.u;
        var r = req.query.r || 0;
        const result = r === 0 ? await nurlresolver.resolve(u) : await nurlresolver.resolveRecursive(u);
        res.send(result);
    } catch (error) {
        console.log(error);
        console.log('Unable to resolve the url');
        res.send('Unable to resolve given url');
    }
}

var server = restify.createServer();
server.use(restify.plugins.queryParser());
server.use(restify.plugins.bodyParser({ mapParams: false }));
server.get('/api/gddirect/:gdriveid', gdriveHandler);
server.get('/api/gddirectstreamurl/:gdriveid', gdrivestreamHandler);
server.get('/api/urlresolve', urlResolveHandler);

server.get('/auth/google/token', tokenHandler);
server.get('/auth/google/callback', tokenCallbackHandler);

server.post('/api/copytogdrive', copyToGDrive)

server.get('/', function (req, res) {
    res.send('Welcome to api ghost!!!');
});


var deviceOAuth = require('./routes/deviceOAuth');
deviceOAuth(server);

var port = normalizePort(process.env.PORT || '3000');

server.listen(port, function () {
    console.log('%s listening at %s', server.name, server.url);
});

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
