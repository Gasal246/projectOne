var express = require("express");
var router = express.Router();
var Usercopy = require("../public/models/usermodel");
var bcrypt = require("bcrypt");
var nodemailer = require("nodemailer");

// Set up nodemailer transporter (configure with your email service)
var transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: "gasalgasal246@gmail.com",
    pass: "szglvviqkkjbywad",
  },
});

/* GET home page. */
router.get("/", function (req, res, next) {
  if (req.cookies.user) {
    res.render("user/index", { cdata: req.cookies.user });
  } else {
    res.render("user/index");
  }
});
router.get("/registernow", (req, res) => {
  res.render("user/register");
});

router.post("/registeruser", (req, res) => {
  if (req.body.checkbox == "on") {
    try {
      const verificationCode = Math.floor(100000 + Math.random() * 900000);

      Usercopy.findOne({ Email: req.body.email }).then(async (data) => {
        if (data) {
          console.log("User already registered bro");
        } else {
          const bpassword = await bcrypt.hash(req.body.password, 10);
          const user = new Usercopy({
            Email: req.body.email,
            Username: req.body.uname,
            Password: bpassword,
            Phone: req.body.phone,
            Addedon: Date.now(),
            verifycode: verificationCode
          });
          user
            .save()
            .then((data) => {
              console.log("saved to db" + data);
              const cdata = {
                name: data.Username,
                email: data.Email,
                phone: data.Phone,
              };
              res.cookie("user", cdata, { maxAge: 3600000, httpOnly: true });
              const mailOptions = {
                from: "gasalgasal246@gmail.com",
                to: data.Email,
                subject: "Account Verification",
                text: `Your verification code is: ${verificationCode}`,
              };
              transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                  console.log("Error sending email: " + error);
                } else {
                  console.log("Email sent: " + info.response);
                }
              });
              res.redirect("/verify");
            })
            .catch((err) => {
              console.log("ERROR ON SAVING DATA " + err);
            });
        }
      });
    } catch (e) {
      console.log("FAIL TO EXECUTE YOUR ROUTE: " + e);
    }
  }
});

router.get('/verify', (req, res) => {
  res.render('user/verify', {error: null, cookies: req.cookies.user});
})

router.post("/verify", async (req, res) => {
  const verificationCode = req.body.vcode;
  const userEmail = req.cookies.user.email;

  // Check if verification code matches
  const user = await Usercopy.findOne({ Email: userEmail, verifycode: verificationCode });

  if (user) {
    await Usercopy.updateOne({ Email: userEmail }, { $set: { verify: true } });
    res.redirect('/')
  } else {
    res.render('user/verify', {error: "Invalid verification code. Please try again.", cookies: req.cookies.user});
  }
});

router.post("/resendVerification/:email", async (req, res) => {
  const userEmail = req.params.email;
  // Generate a new verification code
  const newVerificationCode = Math.floor(100000 + Math.random() * 900000);
  // Update user's verification code in the database
  await Usercopy.updateOne({ Email: userEmail }, { $set: { verifycode: newVerificationCode } });
  // Send verification email with the new code
  const mailOptions = {
    from: "gasalgasal246@gmail.com",
    to: userEmail,
    subject: "New Verification Code",
    text: `Your new verification code is: ${newVerificationCode}`,
  };
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log("Error sending email: " + error);
    } else {
      console.log("Email sent: " + info.response);
    }
  });
  res.redirect("/verify");
});

module.exports = router;
