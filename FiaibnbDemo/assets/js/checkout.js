// Checkout page functionality
let selectedPaymentMethod = null;
let currentBookingId = null;

document.addEventListener('DOMContentLoaded', () => {
    loadCurrentUser();
    loadCart();
    renderCheckoutSummary();
    setupPaymentMethods();
    setupFormValidation();
});

// Load user from localStorage
function loadCurrentUser() {
    const userData = localStorage.getItem('fairbnb_user');
    currentUser = userData ? JSON.parse(userData) : null;
    
    if (!currentUser) {
        showAlert('Please sign in to proceed with checkout.', 'error');
        setTimeout(() => {
            window.location.href = 'signin.html';
        }, 1500);
        return;
    }
}

// Load cart from localStorage
function loadCart() {
    const cartData = localStorage.getItem('fairbnb_cart');
    cart = cartData ? JSON.parse(cartData) : [];
    
    if (cart.length === 0) {
        showAlert('Your cart is empty. Please add items to proceed.', 'error');
        setTimeout(() => {
            window.location.href = 'packages.html';
        }, 1500);
        return;
    }
}

// Render checkout summary
function renderCheckoutSummary() {
    const packagesContainer = document.getElementById('checkout-packages');
    const subtotalElement = document.getElementById('checkout-subtotal');
    const totalElement = document.getElementById('checkout-total');
    
    let subtotal = 0;
    
    packagesContainer.innerHTML = cart.map(item => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        
        return `
            <div class="package-item">
                <img src="${item.image}" alt="${item.title}">
                <div class="package-details">
                    <h4>${item.title}</h4>
                    <p>${item.location}</p>
                    <p>Quantity: ${item.quantity} × ${formatCurrency(item.price)}</p>
                </div>
            </div>
        `;
    }).join('');
    
    subtotalElement.textContent = formatCurrency(subtotal);
    totalElement.textContent = formatCurrency(subtotal);
    
    // Update UPI amount
    document.getElementById('upi-amount').textContent = formatCurrency(subtotal);
}

// Setup payment method selection
function setupPaymentMethods() {
    const paymentMethods = document.querySelectorAll('.payment-method');
    const cardForm = document.getElementById('card-form');
    const upiForm = document.getElementById('upi-form');
    const checkoutBtn = document.getElementById('checkout-btn');
    
    paymentMethods.forEach(method => {
        method.addEventListener('click', () => {
            // Remove selected class from all methods
            paymentMethods.forEach(m => m.classList.remove('selected'));
            
            // Add selected class to clicked method
            method.classList.add('selected');
            
            // Get selected method
            selectedPaymentMethod = method.dataset.method;
            
            // Show/hide payment forms
            cardForm.classList.toggle('active', selectedPaymentMethod === 'card');
            upiForm.classList.toggle('active', selectedPaymentMethod === 'upi');
            
            // Enable checkout button
            checkoutBtn.disabled = false;
        });
    });
}

// Setup form validation
function setupFormValidation() {
    const form = document.getElementById('checkout-form');
    const checkoutBtn = document.getElementById('checkout-btn');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!selectedPaymentMethod) {
            showAlert('Please select a payment method.', 'error');
            return;
        }
        
        // Validate form fields
        const formData = new FormData(form);
        const bookingData = {
            pickup_location: formData.get('pickup_location'),
            transport_mode: formData.get('transport_mode'),
            stay_option: formData.get('stay_option'),
            room_type: formData.get('room_type'),
            guests: parseInt(formData.get('guests'))
        };
        
        // Validate required fields
        for (const [key, value] of Object.entries(bookingData)) {
            if (!value) {
                showAlert(`Please fill in the ${key.replace('_', ' ')} field.`, 'error');
                return;
            }
        }
        
        // Validate payment method specific fields
        if (selectedPaymentMethod === 'card') {
            if (!validateCardDetails()) {
                return;
            }
        }
        
        // Process payment
        await processPayment(bookingData);
    });
}

// Validate card details
function validateCardDetails() {
    const cardNumber = document.getElementById('card_number').value;
    const expiryDate = document.getElementById('expiry_date').value;
    const cvv = document.getElementById('cvv').value;
    const cardholderName = document.getElementById('cardholder_name').value;
    
    if (!cardNumber || !expiryDate || !cvv || !cardholderName) {
        showAlert('Please fill in all card details.', 'error');
        return false;
    }
    
    // Basic validation
    if (cardNumber.replace(/\s/g, '').length < 16) {
        showAlert('Please enter a valid card number.', 'error');
        return false;
    }
    
    if (!/^\d{2}\/\d{2}$/.test(expiryDate)) {
        showAlert('Please enter expiry date in MM/YY format.', 'error');
        return false;
    }
    
    if (cvv.length < 3) {
        showAlert('Please enter a valid CVV.', 'error');
        return false;
    }
    
    return true;
}

// Process payment
async function processPayment(bookingData) {
    const checkoutBtn = document.getElementById('checkout-btn');
    checkoutBtn.disabled = true;
    checkoutBtn.textContent = 'Processing...';
    
    try {
        // First, create the booking
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const booking = {
            userId: currentUser.id,
            packages: [...cart],
            total: total,
            ...bookingData
        };
        
        const bookingResponse = await fetch('/api/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(booking)
        });
        
        if (!bookingResponse.ok) {
            throw new Error('Failed to create booking');
        }
        
        const bookingResult = await bookingResponse.json();
        currentBookingId = bookingResult.bookingId;
        
        // Process payment based on selected method
        if (selectedPaymentMethod === 'card') {
            await processCardPayment();
        } else if (selectedPaymentMethod === 'upi') {
            await processUPIPayment();
        }
        
    } catch (error) {
        console.error('Payment processing error:', error);
        showAlert('Payment failed. Please try again.', 'error');
        checkoutBtn.disabled = false;
        checkoutBtn.textContent = 'Complete Payment';
    }
}

// Process card payment
async function processCardPayment() {
    // Show OTP modal
    showOTPModal();
}

// Process UPI payment
async function processUPIPayment() {
    showAlert('UPI payment initiated. Please wait...', 'info');
    
    // Simulate UPI payment processing
    setTimeout(async () => {
        try {
            await updatePaymentStatus('Paid', 'UPI');
            showAlert('UPI payment successful!', 'success');
            redirectToConfirmation();
        } catch (error) {
            console.error('UPI payment error:', error);
            showAlert('UPI payment failed. Please try again.', 'error');
        }
    }, 10000); // 10 seconds delay
}

// Show OTP modal
function showOTPModal() {
    const modal = document.getElementById('otp-modal');
    const otpInput = document.getElementById('otp-input');
    
    modal.classList.add('active');
    otpInput.focus();
    
    // Clear previous input
    otpInput.value = '';
}

// Close OTP modal
function closeOTPModal() {
    const modal = document.getElementById('otp-modal');
    modal.classList.remove('active');
    
    // Reset checkout button
    const checkoutBtn = document.getElementById('checkout-btn');
    checkoutBtn.disabled = false;
    checkoutBtn.textContent = 'Complete Payment';
}

// Verify OTP
async function verifyOTP() {
    const otpInput = document.getElementById('otp-input');
    const enteredOTP = otpInput.value;
    
    if (!enteredOTP) {
        showAlert('Please enter the OTP.', 'error');
        return;
    }
    
    // Fixed OTP for demo
    if (enteredOTP === '123456') {
        try {
            await updatePaymentStatus('Paid', 'Card');
            closeOTPModal();
            showAlert('Payment successful!', 'success');
            redirectToConfirmation();
        } catch (error) {
            console.error('Payment update error:', error);
            showAlert('Payment verification failed. Please try again.', 'error');
        }
    } else {
        showAlert('Invalid OTP. Please try again.', 'error');
        otpInput.value = '';
        otpInput.focus();
    }
}

// Update payment status
async function updatePaymentStatus(status, method) {
    if (!currentBookingId) {
        throw new Error('No booking ID available');
    }
    
    const response = await fetch(`/api/bookings/${currentBookingId}/payment`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            payment_status: status,
            payment_method: method
        })
    });
    
    if (!response.ok) {
        throw new Error('Failed to update payment status');
    }
    
    return response.json();
}

// Redirect to confirmation page
function redirectToConfirmation() {
    // Clear cart
    cart = [];
    localStorage.setItem('fairbnb_cart', JSON.stringify(cart));
    updateCartCount();
    
    // Redirect to confirmation page
    setTimeout(() => {
        window.location.href = `confirmation.html?bookingId=${currentBookingId}`;
    }, 2000);
}

// Format card number input
document.addEventListener('DOMContentLoaded', () => {
    const cardNumberInput = document.getElementById('card_number');
    if (cardNumberInput) {
        cardNumberInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\s/g, '').replace(/[^0-9]/gi, '');
            let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
            e.target.value = formattedValue;
        });
    }
    
    // Format expiry date input
    const expiryInput = document.getElementById('expiry_date');
    if (expiryInput) {
        expiryInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length >= 2) {
                value = value.substring(0, 2) + '/' + value.substring(2, 4);
            }
            e.target.value = value;
        });
    }
    
    // Format CVV input
    const cvvInput = document.getElementById('cvv');
    if (cvvInput) {
        cvvInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
        });
    }
    
    // Handle Enter key in OTP input
    const otpInput = document.getElementById('otp-input');
    if (otpInput) {
        otpInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                verifyOTP();
            }
        });
    }
});
