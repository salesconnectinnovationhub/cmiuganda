const paymentForm = document.getElementById('paymentsForm');
paymentForm.addEventListener('submit', (e) => {
    e.preventDefault();
    validateForm();
})
function validateForm() {
    var fullname = document.getElementById("fullname").value;
    var email = document.getElementById("email").value;
    var phone = document.getElementById("phone").value;
    var amount = document.getElementById("amount").value;
    var paymentReason = document.getElementById("paymentReason").value;

    // Check if any of the required fields are empty
    if (fullname.trim() === '' || email.trim() === '' || phone.trim() === '' || amount.trim() === '' || paymentReason.trim() === '') {
        alert("Please fill out all required fields.");
        return false;
    }

    // Validate email format
    var emailRegex = /^\w+@[a-zA-Z_]+?\.[a-zA-Z]{2,3}$/;
    if (!email.match(emailRegex)) {
        alert("Please enter a valid email address.");
        return false;
    }

    // Validate phone number format
    var phoneRegex = /^\d{10}$/;
    if (!phone.match(phoneRegex)) {
        alert("Please enter a valid 10-digit phone number.");
        return false;
    }

    // Validate amount as positive number
    var amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
        alert("Please enter a positive number for the amount.");
        return false;
    }

    // If form is valid, redirect to PayPal URL
    var redirectUrl = "https://www.paypal.com/cgi-bin/webscr" +
        "?cmd=_xclick" +
        "&business=cmi.groupuganda@gmail.com" + // Replace with your live PayPal account email
        "&item_name=" + encodeURIComponent(paymentReason) +
        "&amount=" + encodeURIComponent(amount) +
        "&currency_code=USD" +
        "&custom=" + encodeURIComponent(fullname) +
        "&return=www.cmigroupuganda.com/success.html" + 
        "&payment_reason=" + encodeURIComponent(paymentReason) + 
        "&amount=" + encodeURIComponent(amount) + 
        "&currency_code=USD" + 
        "&fullname=" + encodeURIComponent(fullname) + 
        "&cancel_return=www.cmigroupuganda.com/cancel.html";
    window.location.href = redirectUrl;
}