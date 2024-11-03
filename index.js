const express = require("express");
const app = express();
const stripe = require("stripe")(
  "sk_test_51QCahrGBTeINIOY6MsYzqwdfGrszZBRCaWqo2ESs9WJA4qvDK63IYcC9XK0vTDLN56tWQ83kqLntQBglvfJ0Clvr00Wp3KSygI"
);

app.use(express.json());

// Step 1: Create a Customer and Save the Card
app.post("/save-card", async (req, res) => {
  try {
    const { user, paymentMethodId, address } = req.body;

    // Create a new Stripe customer
    const customer = await stripe.customers.create({
      name: user.name,
      email: user.email,
      address: {
        city: address.city,
        postal_code: address.postal_code,
        country: address.country,
      },
    });

    // Attach PaymentMethod to the Customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customer.id,
    });

    // Set PaymentMethod as Default
    await stripe.customers.update(customer.id, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    res.status(200).json({
      success: true,
      customerId: customer.id,
      paymentMethodId: paymentMethodId,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Step 2: Authorize the Payment Using Saved Card
app.post("/authorize-payment", async (req, res) => {
  try {
    const { customerId, amount, paymentMethodId } = req.body;

    // Create a PaymentIntent with the specified PaymentMethod
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // Convert to cents
      currency: "usd",
      customer: customerId,
      payment_method: paymentMethodId,
      off_session: true,
      confirm: true,
      capture_method: "manual", // Authorize the payment without capturing
    });

    res.status(200).json({ success: true, paymentIntent });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Step 3: Capture the Payment
app.post("/capture-payment", async (req, res) => {
  try {
    const { paymentIntentId } = req.body;

    // Capture the authorized payment
    const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId);

    res.status(200).json({ success: true, paymentIntent });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// New Route: Save a New Card for Existing Customer
app.post("/save-new-card", async (req, res) => {
  try {
    const { customerId, paymentMethodId } = req.body;

    // Attach the new PaymentMethod to the existing Customer
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    // Optionally, set the new PaymentMethod as the default
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    res.status(200).json({
      success: true,
      customerId: customerId,
      paymentMethodId: paymentMethodId,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// New Route: Get All Cards for a Customer
app.get("/get-cards", async (req, res) => {
  try {
    const { customerId } = req.query;

    // List all payment methods for the customer
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: "card",
    });

    res
      .status(200)
      .json({ success: true, paymentMethods: paymentMethods.data });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
