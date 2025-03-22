async function payNow() {
  const amount = document.getElementById('amount').value;

  // Create order by calling the server endpoint
  const response = await fetch('/create-order', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ amount, currency: 'INR', receipt: 'receipt#1', notes: {} })
  });

  const order = await response.json();
  const RAZORPAY_ID = await fetch('/get-api-id');

  // Open Razorpay Checkout
  const options = {
    // key: process.env.RAZORPAY_ID, // Replace with your Razorpay key_id
    key: RAZORPAY_ID,
    amount: order.amount,
    currency: order.currency,
    name: 'Sanchit',
    description: 'Transaction',
    order_id: order.id, // This is the order_id created in the backend
    callback_url: 'http://localhost:3000/payment-success', // Your success URL
    prefill: {
      name: null,
      email: null,
      contact: null
    },
    theme: {
      color: '#F37254'
    },
    handler: function (response) {
      fetch('/verify-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature
        })
      }).then(res => res.json())
        .then(data => {
          if (data.status === 'ok') {
            window.location.href = '/payment-success';
          } else {
            alert('Payment verification failed');
          }
        }).catch(error => {
          console.error('Error:', error);
          alert('Error verifying payment');
        });
    }
  };

  const rzp = new Razorpay(options);
  rzp.open();
}