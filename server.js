const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

app.use(express.json({ limit: '10mb' }));
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

// MongoDB connection URI
const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://vinsshambhavi_db_user:tPwkTJMeYnxBCRnW@vinsnetbill.rpipe8n.mongodb.net/cash_db?retryWrites=true&w=majority';

// Mongoose Schemas & Models
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
  createdAt: { type: Date, default: Date.now, expires: 300 }
});
const OTPModel = mongoose.model('OTP', OtpSchema);

const UserSchema = new mongoose.Schema({
  name: { type: String, default: 'Vins Admin' },
  mobile: { type: String, unique: true },
  role: { type: String, default: 'Admin Master' }
});
const UserModel = mongoose.model('User', UserSchema);

// Additional flexible collections for full cloud synchronization
const CustomerSchema = new mongoose.Schema({ id: String }, { strict: false });
const CustomerModel = mongoose.models.Customer || mongoose.model('Customer', CustomerSchema, 'customers');

const PaymentSchema = new mongoose.Schema({ id: String }, { strict: false });
const PaymentModel = mongoose.models.Payment || mongoose.model('Payment', PaymentSchema, 'payments');

const OperatorSchema = new mongoose.Schema({ id: String }, { strict: false });
const OperatorModel = mongoose.models.Operator || mongoose.model('Operator', OperatorSchema, 'operators');

const SettingSchema = new mongoose.Schema({ id: String }, { strict: false });
const SettingModel = mongoose.models.Setting || mongoose.model('Setting', SettingSchema, 'settings');


// OTP route with Textbee SMS integration
app.post('/api/auth/send-otp', async (req, res) => {
  const { mobile } = req.body;

  if (!mobile) {
    return res.status(400).json({
      success: false,
      message: 'Mobile number required'
    });
  }

  const cleanMobile = mobile.replace(/\D/g, '').slice(-10);
  const formattedPhone = '+91' + cleanMobile;
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    await OTPModel.deleteMany({ mobile: cleanMobile });
    await OTPModel.create({ mobile: cleanMobile, otp });

    const apiKey = 'txb_4iSwwT7OdkmJjL30zspttKp1e8riGa1j';
    const deviceId = '6ad4dff65291071e5721b8b2'; 

    const messageText = 'Your VinsNetBill ISP verification code is ' + otp + '. Valid for 10 minutes. Do not share this OTP with anyone. - Telecom DLT: VINSBL';
    const textbeeUrl = 'https://api.textbee.dev/api/v1/gateway/devices/' + deviceId + '/send-sms';

    const textbeeResponse = await fetch(textbeeUrl, {
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

    const result = await textbeeResponse.json();

    if (!textbeeResponse.ok) {
      console.error('TextBee SMS error:', result);
      return res.status(500).json({
        success: false,
        message: result.message || 'Failed to dispatch SMS via Textbee'
      });
    }

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
        name: cleanMobile === '8147422496' ? 'VINSADMIN (Administrator)' : 'Vins Admin',
        mobile: cleanMobile,
        role: cleanMobile === '8147422496' ? 'Admin Master' : 'Cash Collector'
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


// ==========================================
// MONGODB ATLAS SYNC ENDPOINTS (Push & Pull)
// ==========================================

app.post('/api/mongodb/push', async (req, res) => {
  try {
    const { customers, payments, operators, settings } = req.body;

    if (customers && Array.isArray(customers)) {
      for (const cust of customers) {
        const custId = cust.id || cust._id;
        if (custId) {
          await CustomerModel.updateOne({ id: custId }, { $set: cust }, { upsert: true });
        }
      }
    }

    if (payments && Array.isArray(payments)) {
      for (const pay of payments) {
        const payId = pay.id || pay._id;
        if (payId) {
          await PaymentModel.updateOne({ id: payId }, { $set: pay }, { upsert: true });
        }
      }
    }

    if (operators && Array.isArray(operators)) {
      for (const op of operators) {
        const opId = op.id || op._id;
        if (opId) {
          await OperatorModel.updateOne({ id: opId }, { $set: op }, { upsert: true });
        }
      }
    }

    if (settings) {
      await SettingModel.updateOne({ id: 'isp_profile' }, { $set: settings }, { upsert: true });
    }

    res.json({
      success: true,
      message: 'Successfully synchronized records to MongoDB Atlas.'
    });
  } catch (error) {
    console.error('Mongo push error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to push to MongoDB' });
  }
});

async function handleMongoPull(req, res) {
  try {
    const customers = await CustomerModel.find({}).lean();
    const payments = await PaymentModel.find({}).lean();
    const operators = await OperatorModel.find({}).lean();
    const settingsDoc = await SettingModel.findOne({ id: 'isp_profile' }).lean();

    res.json({
      success: true,
      customers: customers.length > 0 ? customers : undefined,
      payments: payments.length > 0 ? payments : undefined,
      operators: operators.length > 0 ? operators : undefined,
      settings: settingsDoc || undefined,
      message: `Pulled ${customers.length} subscribers and ${payments.length} receipts from MongoDB Atlas.`
    });
  } catch (error) {
    console.error('Mongo pull error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to pull from MongoDB' });
  }
}

app.get('/api/mongodb/pull', handleMongoPull);
app.post('/api/mongodb/pull', handleMongoPull);


// Server Startup
async function startServer() {
  const PORT = process.env.PORT || 5000;

  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB successfully');

    app.listen(PORT, '0.0.0.0', () => {
      console.log('Server running on port ' + PORT);
    });
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

startServer();