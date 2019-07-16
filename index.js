const mqtt = require("mqtt"),
    dotenv = require('dotenv').config(),
    exec = require('child_process').exec,
    phone = require("phone"),
    EventEmitter = require('events'),
    emitter = new EventEmitter();


let client = mqtt.connect(process.env.BROKER, {
    username: process.env.CONN_USER,
    password: process.env.CONN_PASSWORD
})

client.on("connect", function () {
    console.log("connected");
})

client.on("error", function (error) {
    console.log("Can't connect" + error);
})

let processingQueue = false;
let queueItems = [];


async function addtoQueue(topic, message) {
    let phoneNumber = '+' + topic.split("/")[1],
        isValidPhone = phone(phoneNumber)
    if (!(isValidPhone.length)) return;
    message = decodeURIComponent(message);
    queueItems.push(`termux-sms-send -n ${isValidPhone[0]} ${message}`)
    sendMessage()
}

async function sendMessage() {
    if(processingQueue) return;
    processingQueue = true;
    // let phoneNumber = '+' + topic.split("/")[1],
    //     isValidPhone = phone(phoneNumber)
    // if (!(isValidPhone.length)) return;
    // message = decodeURIComponent(message);
    if(!(queueItems.length))return;
    let queueItem = queueItems.shift();

    exec('cat .log',
        (error, stdout, stderr) => {
            if (error !== null) {
                // console.log(`exec error: ${error}`);
            } else {
                let numSent = parseInt(stdout)
                console.log(`${numSent}->${queueItem}`)
                exec(`${queueItem}`,
                    (error, stdout, stderr) => {
                        if (error !== null) {
                            // console.log(`exec error: ${error}`);
                        } else {
                            numSent++
                            exec(`echo ${numSent} > .log`,
                                (error, stdout, stderr) => {})
                            client.publish(`csymapp-sms-monitor/${process.env.MY_NUMBER}`, `${numSent}`)
                        }
                        processingQueue = false;
                        emitter.emit('doneSending')
                    })
            }
        })
}

client.on('message', function (topic, message, packet) {
    addtoQueue(topic, message)
});

client.subscribe("csymapp-sms/#", {
    qos: 1
});

emitter.on('doneSending', function(){
    sendMessage();
})