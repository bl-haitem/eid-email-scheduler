const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const dotenv = require("dotenv");
const admin = require("firebase-admin");
const schedule = require("node-schedule");

dotenv.config();
const app = express();
const port = 3000;

app.use(cors());
app.use(express.static("public"));
app.use(express.json());


const serviceAccount = require("./firebase-admin.json"); 
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();


const transporter = nodemailer.createTransport({
  host: "live.smtp.mailtrap.io",
  port: 587, 
  auth: {
    user: process.env.MAILTRAP_USER,
    pass: process.env.MAILTRAP_PASS,
  },
});



app.post("/schedule-email", async (req, res) => {
  const { recipient, subject, message, sendTime } = req.body;

 
  if (!recipient || !subject || !message || !sendTime) {
    return res.status(400).json({ error: "⚠️ جميع الحقول مطلوبة" });
  }

  const sendDate = new Date(sendTime);
  
  if (sendDate < new Date()) {
    return res.status(400).json({ error: "⚠️ لا يمكن جدولة إيميل في وقت ماضي!" });
  }

  
  const docRef = await db.collection("emails").add({
    recipient,
    subject,
    message,
    sendTime: sendDate.toISOString(),
    sent: false,
  });

  console.log(`📅 تم جدولة الإيميل إلى ${recipient} في ${sendDate}`);

  schedule.scheduleJob(sendDate, async function () {
    try {
      const info = await transporter.sendMail({
        from: "eid@demomailtrap.co",
        to: recipient,
        subject: subject,
        text: message,
      });

      console.log(`✅ تم إرسال الإيميل إلى ${recipient}: ${info.messageId}`);

     
      await db.collection("emails").doc(docRef.id).update({ sent: true });
    } catch (error) {
      console.error(`❌ فشل إرسال الإيميل إلى ${recipient}:`, error);
    }
  });

  res.status(200).json({ success: "📬 تم جدولة الإيميل بنجاح!" });
});

app.listen(port, () => {
  console.log(`🚀 السيرفر يعمل على http://localhost:${port}`);
});
app.get("/", (req, res) => {
  res.send("السيرفر يعمل!");
});
