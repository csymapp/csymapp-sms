const mqtt = require("mqtt"),
    dotenv = require('dotenv').config(),
    exec = require('child_process').exec,
    phone = require("phone")


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

async function sendMessage(topic, message) {
    let phoneNumber = '+' + topic.split("/")[1],
        isValidPhone = phone(phoneNumber)
    if (!(isValidPhone.length)) return;
    message = decodeURIComponent(message);

    exec('cat .log',
        (error, stdout, stderr) => {
            if (error !== null) {
                // console.log(`exec error: ${error}`);
            } else {
                let numSent = parseInt(stdout)
                console.log(`${numSent}->${isValidPhone[0]}:${message}`)
                exec(`termux-sms-send -n ${isValidPhone[0]} ${message}`,
                    (error, stdout, stderr) => {
                        if (error !== null) {
                            // console.log(`exec error: ${error}`);
                        } else {
                            numSent++
                            exec(`echo ${numSent} > .log`,
                                (error, stdout, stderr) => {})
                            client.publish(`csymapp-sms-monitor/${process.env.MY_NUMBER}`, `${numSent}`)
                        }
                    })
            }
        })
}

client.on('message', function (topic, message, packet) {
    sendMessage(topic, message)
});

client.subscribe("csymapp-sms/#", {
    qos: 1
});