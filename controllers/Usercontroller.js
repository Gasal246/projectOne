const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
var Usercopy = require("../public/models/usermodel");
var AddressCopy = require("../public/models/addressmodel");
var nodemailer = require("nodemailer");
const Orders = require("../public/models/ordermodel");
const Wallets = require("../public/models/walletmodel");

// Set up nodemailer transporter (configure with your email service)
var transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: "gasalgasal246@gmail.com",
    pass: "szglvviqkkjbywad"
  }
});

module.exports = {
  registerUser: async (req, res) => {
    if (req.body.checkbox == "on") {
      try {
        const verificationCode = Math.floor(100000 + Math.random() * 900000);
        Usercopy.findOne({ Email: req.body.email.trim() }).then(
          async (data) => {
            if (data) {
              console.log("User already registered bro");
              res.render("user/index", {
                error: { form: "User already registered.. Login Here." },
                cdata: null
              });
            } else {
              const bpassword = await bcrypt.hash(req.body.password.trim(), 10);
              const user = new Usercopy({
                Email: req.body.email.trim(),
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
                    id: data._id,
                    name: data.Username,
                    email: data.Email,
                    phone: data.Phone
                  };
                  res.cookie("user", cdata, {
                    maxAge: 24 * 60 * 60 * 1000,
                    httpOnly: true
                  });
                  const mailOptions = {
                    from: "gasalgasal246@gmail.com",
                    to: data.Email,
                    subject: "Account Verification",
                    text: `Your verification code is: ${verificationCode}`
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
          }
        );
      } catch (e) {
        const on = "On Register User";
        const err = error.message;
        res.redirect("/error?err=" + err + "&on=" + on);
      }
    }
  },
  verifyUser: async (req, res) => {
    try {
      const verificationCode = req.body.vcode;
      const userEmail = req.cookies.user.email;

      // Check if verification code matches
      const user = await Usercopy.findOne({
        Email: userEmail,
        verifycode: verificationCode
      });

      if (user) {
        await Usercopy.updateOne(
          { Email: userEmail },
          { $set: { verify: true } }
        );
        res.redirect("/");
      } else {
        res.render("user/verify", {
          error: "Invalid verification code. Please try again.",
          cookies: req.cookies.user
        });
      }
    } catch (error) {
      const on = "On Verify User";
      const err = error.message;
      res.redirect("/error?err=" + err + "&on=" + on);
    }
  },
  resendVerification: async (req, res) => {
    try {
      const userEmail = req.params.email;
      // Generate a new verification code
      const newVerificationCode = Math.floor(100000 + Math.random() * 900000);
      // Update user's verification code in the database
      await Usercopy.updateOne(
        { Email: userEmail },
        { $set: { verifycode: newVerificationCode } }
      );
      // Send verification email with the new code
      const mailOptions = {
        from: "gasalgasal246@gmail.com",
        to: userEmail,
        subject: "New Verification Code",
        text: `Your new verification code is: ${newVerificationCode}`
      };
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.log("Error sending email: " + error);
        } else {
          console.log("Email sent: " + info.response);
        }
      });
      res.redirect("/verify");
    } catch (error) {
      const on = "On Recent Verification Code";
      const err = error.message;
      res.redirect("/error?err=" + err + "&on=" + on);
    }
  },
  userLogin: async (req, res) => {
    try {
      Usercopy.findOne({ Email: req.body.email.trim() }).then(async (data) => {
        if (
          data &&
          (await bcrypt.compare(req.body.password.trim(), data.Password))
        ) {
          if (data.Blocked == true) {
            const err = "~ THE SPECIFIED ACCOUND IS BLOCKED BY ADMIN!";
            return res.redirect(`/?err=${err}`);
          }
          const cdata = {
            id: data._id,
            name: data.Username,
            email: data.Email,
            phone: data.Phone
          };
          res.cookie("user", cdata, {
            maxAge: 24 * 60 * 60 * 1000,
            httpOnly: true
          });
          res.redirect("/");
        } else {
          const err = "~ gmail and password not valid!";
          res.redirect(`/?err=${err}`);
        }
      });
    } catch (error) {
      const on = "On User Login";
      const err = error.message;
      res.redirect("/error?err=" + err + "&on=" + on);
    }
  },
  getUser: async (req, res) => {
    try {
      const cancelledOrders = await Orders.find({
        Userid: req.cookies.user.id,
        "Items.cancelled": true
      }).sort({ Orderdate: -1 });

      const theOrders = await Orders.find({Userid: req.cookies.user.id}).populate('Items.Productid').sort({ Orderdate: -1 });
      console.log("The Orders : ", theOrders)
      let activeOrders = []
      if(theOrders.length > 0){
        activeOrders = theOrders.map(order => {
          order.Items = order.Items.filter(item => !item.cancelled);
          return order;
        });
      }
      // console.log("Active Orders : ",activeOrders[0].Items)

      const address = await AddressCopy.findOne({
        Userid: req.cookies.user.id
      });

      const wallet = await Wallets.findOne({ Userid: req.cookies.user.id });

      const userdata = await Usercopy.findOne({
        Email: req.cookies.user.email
      }).then((data) => {
        return {
          id: data._id,
          name: data.Username,
          phone: data.Phone,
          email: data.Email,
          gender: data.Gender,
          dob: data.Dob
        };
      });

      res.render("user/account", {
        cookies: userdata,
        address: address,
        error: req.query.error ? req.query.error : null,
        cancelledOrders: cancelledOrders,
        activeOrders: activeOrders,
        wallet: wallet
      });
    } catch (error) {
      const on = "On User Login";
      const err = error.message;
      res.redirect("/error?err=" + err + "&on=" + on);
    }
  },

  primaryAdrress: async (req, res) => {
    try {
      const userid = req.cookies.user.id;
      const data = await AddressCopy.findOne({ Userid: userid });
      const addressData = {
        Userid: userid,
        Firstaddress: {
          Cname: req.body.cname,
          City: req.body.city,
          Country: req.body.country,
          Landmark: req.body.landmark,
          Pincode: req.body.pincode,
          Place: req.body.place
        }
      };
      if (data) {
        await AddressCopy.updateOne({ Userid: userid }, { $set: addressData });
        res.redirect("/account");
      } else {
        const newAddress = new AddressCopy(addressData);
        await newAddress.save();
        res.redirect("/account");
      }
    } catch (error) {
      const on = "On Primary Address";
      const err = error.message;
      res.redirect("/error?err=" + err + "&on=" + on);
    }
  },
  secondaryAdress: async (req, res) => {
    try {
      const userid = req.cookies.user.id;
      const data = await AddressCopy.findOne({ Userid: userid });
      const addressData = {
        Userid: userid,
        Secondaddress: {
          Cname: req.body.cname,
          City: req.body.city,
          Country: req.body.country,
          Landmark: req.body.landmark,
          Pincode: req.body.pincode,
          Place: req.body.place
        }
      };
      if (data) {
        await AddressCopy.updateOne({ Userid: userid }, { $set: addressData });
        res.redirect("/account");
      } else {
        const newAddress = new AddressCopy(addressData);
        await newAddress.save();
        res.redirect("/account");
      }
    } catch (error) {
      const on = "On Secondary Address";
      const err = error.message;
      res.redirect("/error?err=" + err + "&on=" + on);
    }
  },
  editProfile: async (req, res, next) => {
    try {
      const user = await Usercopy.findOne({ Email: req.cookies.user.email });
      if (user) {
        if (req.body.currentpass) {
          if (await bcrypt.compare(req.body.currentpass, user.Password)) {
            if (req.body.newpass) {
              const newPass = await bcrypt.hash(req.body.newpass, 10);
              user.Password = newPass;
            }
          } else {
            const err = "Your entered current password is incorrect, ";
            return res.redirect(`/account?error=${err}`);
          }
        }

        await bcrypt.compare(req.body.currentpass, user.Password);

        user.Username = req.body.name;
        user.Email = req.body.email;
        user.Gender = req.body.gender;
        user.Dob = req.body.dob;
        user.Phone = req.body.phone;
        await user.save();
        return res.redirect("/account");
      } else {
        return res.status(404).send("User not found.");
      }
    } catch (error) {
      const on = "On Edit Profile";
      const err = error.message;
      res.redirect("/error?err=" + err + "&on=" + on);
    }
  }
};
