const paymentForm = document.getElementById('paymentsForm');
if (paymentForm) {
    paymentForm.addEventListener('submit', (event) => {
        event.preventDefault();
        validateForm();
    });
}

function validateForm() {
    if (!paymentForm || !paymentForm.reportValidity()) return;

    const fullname = document.getElementById("fullname").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const amount = Number(document.getElementById("amount").value);
    const paymentReason = document.getElementById("paymentReason").value.trim();

    if (!/^\d{10}$/.test(phone)) {
        alert("Please enter a valid 10-digit phone number.");
        return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
        alert("Please enter a positive number for the amount.");
        return;
    }

    const params = new URLSearchParams({
        cmd: "_xclick",
        business: "cmi.groupuganda@gmail.com",
        item_name: paymentReason,
        amount: amount.toFixed(2),
        currency_code: "USD",
        custom: fullname,
        return: "https://cmigroupuganda.com/success.html",
        cancel_return: "https://cmigroupuganda.com/cancel.html",
    });
    window.location.href = `https://www.paypal.com/cgi-bin/webscr?${params}`;
}