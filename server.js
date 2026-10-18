const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

app.use(express.json());
app.use(cors());

// Root route
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'running',
    app: 'VINS Bills Backend',
    message: 'Backend server is online'
  });
});

// Health route
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    database: mongoose.connection.readyState === 1
      ? 'connected'
      : 'disconnected'
  });
});

// MongoDB connection
const MONGO_URI = process.env.MONGODB_URI;

const CashSchema = new mongoose.Schema({
  receiptNo: String,
  subscriber: String,
  amount: Number,
  paymentMethod: String,
  date: { type: Date, default: Date.now }
});

const CashRecord = mongoose.model('CashRecord', CashSchema);

const OtpSchema = new mongoose.Schema({
  mobile: { type: String, required: true },
  otp: { type: String, required: true },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300
  }
});

const OTPModel = mongoose.model('OTP', OtpSchema);

const UserSchema = new mongoose.Schema({
  name: { type: String, default: 'Vins Admin' },
  mobile: { type: String, unique: true },
  role: { type: String, default: 'Admin Master' }
});

const UserModel = mongoose.model('User', UserSchema);

// OTP route with Textbee SMS integration
app.post('/api/auth/send-otp', async (req, res) => {
  const { mobile, adminName } = req.body;

  if (!mobile) {
    return res.status(400).json({
      success: false,
      message: 'Mobile number required'
    });
  }

  // Format clean 10-digit mobile number
  const cleanMobile = mobile.replace(/\D/g, '').slice(-10);
  const formattedPhone = `+91${cleanMobile}`;

  // Generate 6-digit random OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    await OTPModel.deleteMany({ mobile: cleanMobile });
    await OTPModel.create({ mobile: cleanMobile, otp });

    // Textbee Configuration from Environment Variables
    const apiKey = process.env.TEXTBEE_API_KEY;
    const deviceId = process.env.TEXTBEE_DEVICE_ID;

    if (!apiKey || !deviceId) {
      console.warn('Textbee API credentials missing in environment variables.');
      return res.status(500).json({
        success: false,
        message: 'SMS gateway not configured on server (Missing API Key/Device ID)'
      });
    }

    const messageText = `Your VinsNetBill ISP verification code is ${otp}. Valid for 10 minutes. Do not share this OTP with anyone. - Telecom DLT: VINSBL`;

    // Dispatch SMS via Textbee Gateway
    const textbeeResponse = await fetch(`[https://api.textbee.dev/api/v1/gateway/devices/$](https://api.textbee.dev/api/v1/gateway/devices/$){deviceId}/send-sms`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        recipients: [formattedPhone],
        message: messageText
      })
    });

    const textbeeData = await textbeeResponse.json();

    if (!textbeeResponse.ok) {
      console.error('Textbee API Error:', textbeeData);
      return res.status(500).json({
        success: false,
        message: textbeeData.message || 'Failed to dispatch SMS via Textbee'
      });
    }

    console.log(`OTP ${otp} successfully sent to ${formattedPhone} via Textbee.`);

    res.json({
      success: true,
      message: 'SMS OTP dispatched successfully to mobile number'
    });
  } catch (error) {
    console.error('Error generating/sending OTP:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Error generating OTP'
    });
  }
});

// Also support alternative endpoint path used by frontend
app.post('/api/send-sms-otp', async (req, res) => {
  const { phone, adminName } = req.body;
  req.body.mobile = phone;
  return app._router.handle(req, res);
});

app.post('/api/auth/verify-otp', async (req, res) => {
  const { mobile, otp } = req.body;
  const cleanMobile = mobile ? mobile.replace(/\D/g, '').slice(-10) : '';

  try {
    const validOtp = await OTPModel.findOne({ mobile: cleanMobile, otp: otp ? otp.trim() : '' });

    if (!validOtp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    let user = await UserModel.findOne({ mobile: cleanMobile });

    if (!user) {
      user = await UserModel.create({
        name: 'Vins Admin',
        mobile: cleanMobile,
        role: 'Admin Master'
      });
    }

    await OTPModel.deleteOne({ _id: validOtp._id });

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Verification failed'
    });
  }
});

// Cash record routes
app.get('/api/cash-records', async (req, res) => {
  try {
    const records = await CashRecord.find().sort({ date: -1 });
    res.json({ success: true, records });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/cash-records', async (req, res) => {
  try {
    const record = await CashRecord.create(req.body);
    res.json({ success: true, record });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

async function startServer() {
  const PORT = process.env.PORT || 5000;

  if (!MONGO_URI) {
    console.error('Missing MONGODB_URI environment variable');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB successfully');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

startServer();
