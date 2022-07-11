'use strict';

const test = require('ava');
const child_process = require('child_process');
const process = require('../lib/process.js');
const uuid = require('../lib/uuid.js');


function settle(ms) {
    if (ms === undefined) { ms = 250; }
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}


function settleLong(ms) {
    if (ms === undefined) { ms = 1500; }
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}


var processes = [];

function run(command) {
    return new Promise((res, rej) => {
        const child = child_process.exec(`${__dirname}/../bin/${command}`, (err, stdout, stderr) => {
            if (err) { rej(err); } else { res(); }
        });
        processes.push(child);
    });
}


/* Kill the tasks when we're done. We should get an unhandled exception error if
   something is still running and we never caught the exception. */
test.afterEach.always(t => { processes.forEach((p) => p.kill("SIGINT")); processes = []; });


test.serial('trigger race condition', async t => {
    t.timeout(20000)
    const uid = uuid();
    const r0 = run(`ack.js ${uid}`).catch((err) => { /* do nothing */ });
    await settle();

    /* grab the server */
    if (processes.length != 1) {
        t.fail();
    }
    const server = processes[0];

    const r1 = run(`ack.js ${uid}`).then(t.fail); await settle();
    const r2 = run(`ack.js ${uid}`).then(t.fail); await settle();
    const r3 = run(`ack.js ${uid}`).then(t.fail); await settle();
    const r4 = run(`ack.js ${uid}`).then(t.fail); await settle();
    const r5 = run(`ack.js ${uid}`).then(t.fail); await settle();
    const r6 = run(`ack.js ${uid}`).then(t.fail); await settle();

    /* server exists, one of the others becomes the server */
    server.kill('SIGINT');

    /* nobody should exit */
    await settleLong();

    r1.catch(() => {});
    r2.catch(() => {});
    r3.catch(() => {});
    r4.catch(() => {});
    r5.catch(() => {});
    r6.catch(() => {});
    t.pass();
})