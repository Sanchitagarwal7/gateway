require('dotenv').config();

const express = require("express")
const Razorpay = require('razorpay');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const { validateWebhookSignature } = require('razorpay/dist/utils/razorpay-utils'); //required by razorpay

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//reach static files
app.use(express.static(path.join(__dirname)));

//instantialize razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_ID,
    key_secret: process.env.RAZORPAY_SECRET,
});

//reads from orders file
const readData = function(){
    if(fs.existsSync('orders.json')){
        const data = fs.readFileSync('orders.json'); //readFile takes a callback function whereas this doesnt
        return JSON.parse(data);
    }
    return [];
}

//writes from orders file
const writeData = function(data){
    fs.writeFileSync('orders.json', JSON.stringify(data, null, 2));
}

//if does not exists then initialise
if(!fs.existsSync('orders.json')){
    writeData([]);
}

//create order 
app.post('/create-order', async (req, res) => {
    try {
        const {amount, currency, receipt, notes} = req.body;

        const options = {
            amount: amount * 100, //convert amount to paise
            currency,
            receipt,
            notes
        };

        const order = await razorpay.orders.create(options); //creates the order

        // Read current orders, add new order, and write back to the file
        const orders = readData();
        orders.push({
            order_id: order.id,
            amount: order.amount,
            currency: order.currency,
            receipt: order.receipt,
            status: 'created'
        });
        writeData(orders);


        res.json(order); // Send order details to frontend, including order ID

    } catch (error) {
        console.log(error);
        res.status(500).send('Error while creating order');
    }
});

//when payment is successful, redirect here
app.get('/payment-success', (req, res) => {
    res.sendFile(path.join(__dirname, 'success.html'));
});

// Route to handle payment verification
app.post('/verify-payment', (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const secret = razorpay.key_secret;
    const body = razorpay_order_id + '|' + razorpay_payment_id;

    try {
        const isValidSignatire = validateWebhookSignature(body, razorpay_signature, secret);
        if(isValidSignatire){
            const orders = readData();
            const order = orders.find(order => order.order_id === razorpay_order_id);

            if(order){
                order.status = 'paid';
                order.payment_id = razorpay_payment_id;
                writeData(orders);
            }
            res.status(200).json({status: 'ok'});
            console.log("Payment verification was successful.")
        }else{
            res.status(400).json({status: 'verification failed'});
            console.log("Payment verification was failed.")
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: 'error', message: 'Error verifying payment' });
    }
});

//get api from backend to frontend when requested
app.get('/get-api-id', (req, res)=>{
    res.send(process.env.RAZORPAY_ID);
});

//to know app is running
app.listen(PORT, function(){
    console.log(`Running on port ${PORT}`);
})