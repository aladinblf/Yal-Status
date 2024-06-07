const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
const port = 3000; // You can change this port if necessary

app.use(bodyParser.json());

const TELEGRAM_BOT_TOKEN = 'your-telegram-bot-token';
const TELEGRAM_CHAT_ID = 'your-telegram-chat-id';
const YALIDINE_SECRET_KEY = 'your-yalidine-secret-key';

// Endpoint to validate webhook
app.get('/', (req, res) => {
    if (req.query.subscribe && req.query.crc_token) {
        res.send(req.query.crc_token);
    } else {
        res.status(400).send('Invalid request');
    }
});

// Endpoint to handle incoming webhooks
app.post('/', (req, res) => {
    const yalidineSignature = req.headers['x-yalidine-signature'];
    const payload = JSON.stringify(req.body);
    const computedSignature = crypto
        .createHmac('sha256', YALIDINE_SECRET_KEY)
        .update(payload)
        .digest('hex');

    if (yalidineSignature === computedSignature) {
        const events = req.body.events;
        events.forEach(event => {
            const message = createCustomMessage(req.body.type, event);
            sendToTelegram(message);
        });
        res.status(200).send('Webhook received');
    } else {
        res.status(400).send('Invalid signature');
    }
});

// Function to create custom messages based on event type
function createCustomMessage(eventType, event) {
    let message = `Event Type: ${eventType}\n`;
    message += `Event ID: ${event.event_id}\n`;
    message += `Occurred At: ${event.occurred_at}\n`;

    if (eventType === 'parcel_created') {
        message += `Order ID: ${event.data.order_id}\n`;
        message += `Tracking: ${event.data.tracking}\n`;
        message += `Label: ${event.data.label}\n`;
    } else if (eventType === 'parcel_status_updated') {
        message += `Tracking: ${event.data.tracking}\n`;
        message += `Status: ${event.data.status}\n`;
        if (event.data.reason) {
            message += `Reason: ${event.data.reason}\n`;
        }
    }
    // Add other event types as needed
    return message;
}

// Function to send messages to Telegram
async function sendToTelegram(message) {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    try {
        await axios.post(url, {
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
        });
    } catch (error) {
        console.error('Error sending message to Telegram', error);
    }
}

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
