const bcrypt = require('bcrypt');
const fs = require('fs');
const http = require('http');
const mime = require('mime-types');

// constant numbers
const SERVER_PORT = 8080;
const SALT_ROUNDS = 10;

class User {
    constructor(username, passwordHash) {
        this.username = username;
        this.passwordHash = passwordHash; // NEVER store passwords in plain text!!
    }
}

// TODO: read this from a database
const users = [
    new User('May', bcrypt.hashSync('password123', SALT_ROUNDS)),
    new User('Jehun', bcrypt.hashSync('123password', SALT_ROUNDS))
];

function getUser(username) {
    username = username.toLowerCase(); // usernames shouldn't be case sensitive
    for (let user of users) {
        if (user.username.toLowerCase() === username) {
            return user;
        }
    }
    return null;
}

function sendFile(response, fileUrl) {
    // TODO: make this async
    const fileContents = fs.readFileSync(fileUrl);
    response.writeHead(200, {
        'Content-Type': mime.lookup(fileUrl) || 'application/octet-stream'
    });
    response.write(fileContents);
    response.end();
}

const requestListener = function (req, res) {
    switch (req.method) {
        case 'GET':
            // cases where the request is requesting some URL
            let url = `./site${req.url}`;
            // TODO: there has to be a better way to do this
            if (url.charAt(url.length - 1) === '/') {
                url += 'index.html';
            }
            console.log(`GET ${req.url} (resolved as ${url})`);
            try {
                sendFile(res, url);
            } catch (err) { // make sure the program doesn't just crash when you don't find a file
                console.log(err);
                res.writeHead(404);
                res.end('404 - File Not Found');
            }
            break;
        case 'POST':
            // cases where the request is sending some data (i.e., a login form)
            let body = '';
            req.on('data', (data) => {
                body += data; // concatenate new data from the request into the body
            });
            req.on('end', () => {
                console.log(`POST sending ${body}`);
                const formValues = new URLSearchParams(body);
                const username = formValues.get('username');
                const password = formValues.get('password');
                const user = getUser(username);
                if (user === null) {
                    // "incorrect username/password"
                    // if i remember right it's bad practice to specify which is wrong
                    // or if there's a user with that name
                    // TODO: how do you do this right
                    sendFile(res, './site/wrong_info.html');
                } else {
                    bcrypt.compare(password, user.passwordHash, (error, result) => {
                        if (result) {
                            // correct password!
                            res.writeHead(200, {
                                'Content-Type': 'text/plain'
                            });
                            res.write(`Welcome, ${user.username}.`);
                            res.end();
                        } else {
                            // incorrect password
                            sendFile(res, './site/wrong_info.html');
                        }
                    })
                }
            });
            break;
    }
}

const server = http.createServer(requestListener);
server.listen(SERVER_PORT);
console.log(`Listening on http://localhost:${SERVER_PORT}`);
