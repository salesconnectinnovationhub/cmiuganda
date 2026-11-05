document.addEventListener('DOMContentLoaded', () => {
  const payPage = window.location.pathname.toLowerCase().endsWith('/pay.html');
  if (payPage) {
    window.location.replace('payments.html');
    return;
  }

  const form = document.getElementById('paymentsForm');
  const paymentStatus = document.getElementById('payment-status');

  if (!form || !paymentStatus) {
    return;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();

    const fullname = document.getElementById('fullname').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const amountField = document.getElementById('amount');
    const reference = document.getElementById('reference').value.trim();
    const reason = document.getElementById('paymentReason').value.trim();
    const currency = document.getElementById('currency').value;
    const amount = Number(amountField.value);

    if (!fullname || !email || !phone || !reference || !reason || !Number.isFinite(amount) || amount <= 0) {
      paymentStatus.textContent = 'Please complete all required payment details before continuing.';
      paymentStatus.style.color = '#b3261e';
      return;
    }

    if (!/^[0-9+\-\s]{7,20}$/.test(phone)) {
      paymentStatus.textContent = 'Please enter a valid phone number.';
      paymentStatus.style.color = '#b3261e';
      return;
    }

    paymentStatus.textContent = 'Opening the secure PesaPal checkout in a new tab.';
    paymentStatus.style.color = '#0a7a46';

    const checkoutUrl = new URL('https://www.pesapal.com/');
    checkoutUrl.searchParams.set('amount', amount.toFixed(2));
    checkoutUrl.searchParams.set('currency', currency);
    checkoutUrl.searchParams.set('reference', reference);
    checkoutUrl.searchParams.set('phone', phone);
    checkoutUrl.searchParams.set('note', `${fullname} | ${email} | ${reason}`);

    window.cmiTrackConversion?.('payment_start');
    window.open(checkoutUrl.toString(), '_blank', 'noopener,noreferrer');
  });
});